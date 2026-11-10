#!/usr/bin/env python3
"""
Pilates Member & Class CSV Import Dry-Run Validator CLI (pilates-csv-import).
Standard-library-only implementation supporting:
- UTF-8 and UTF-8-BOM detection & decoding (including double-BOM resilience)
- Streaming RFC-4180 CSV tokenization with row-level malformed quote recovery,
  multi-line quoted fields/headers, escaped quotes, NUL/control-char handling,
  and Korean/English headers (NFC/NFD canonical normalization)
- Empty & duplicate header detection (exact & normalized collisions)
- Configurable & automatic column mapping with 1:N, N:1, missing-column, and
  ambiguous-alias conflict detection
- Configurable file byte, row count, and per-field character limits with recovery
- Invalid calendar date & time range validation
- Duplicate row detection (CRLF/LF & NFC-normalized exact rows & entity keys) with
  exact data row_number and physical CSV line_number / first_seen_line tracking
- Formula injection (CSV injection) defense including formulas hidden behind
  spaces, tabs, newlines, Unicode whitespace, zero-width chars, and control chars
- Safe dry-run preview JSON generation (strictly zero DB writes)
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
import datetime
import json
import os
import pathlib
import re
import sys
import tempfile
from typing import Any, Dict, Iterator, List, Optional, Tuple
import unicodedata


DEFAULT_MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MiB
DEFAULT_MAX_ROWS = 10_000
DEFAULT_MAX_FIELD_CHARS = 10_000
DEFAULT_MAX_PREVIEW_ROWS = 50
PREVIEW_CELL_TRUNCATE_CHARS = DEFAULT_MAX_FIELD_CHARS


MEMBER_SCHEMA: Dict[str, Dict[str, Any]] = {
    "member_id": {
        "required": True,
        "type": "str",
        "aliases": ["회원번호", "회원ID", "회원아이디", "member_id", "id", "회원코드"],
    },
    "name": {
        "required": True,
        "type": "str",
        "aliases": ["이름", "회원명", "성명", "name", "member_name"],
    },
    "phone": {
        "required": True,
        "type": "phone",
        "aliases": ["연락처", "전화번호", "휴대폰", "핸드폰", "phone", "mobile"],
    },
    "birth_date": {
        "required": False,
        "type": "date",
        "aliases": ["생년월일", "생일", "birth_date", "birthdate", "dob"],
    },
    "registration_date": {
        "required": True,
        "type": "date",
        "aliases": ["등록일", "가입일", "시작일", "registration_date", "join_date", "start_date"],
    },
    "expiry_date": {
        "required": False,
        "type": "date",
        "aliases": ["만료일", "종료일", "유효기간", "expiry_date", "end_date", "expire_date"],
    },
    "membership_type": {
        "required": True,
        "type": "str",
        "aliases": ["회원권종류", "회원권", "수강권", "권종", "membership_type", "plan"],
    },
    "remaining_sessions": {
        "required": True,
        "type": "non_negative_int",
        "aliases": ["잔여횟수", "남은횟수", "잔여세션", "remaining_sessions", "sessions_left"],
    },
    "instructor": {
        "required": False,
        "type": "str",
        "aliases": ["담당강사", "강사", "강사명", "instructor", "trainer"],
    },
    "notes": {
        "required": False,
        "type": "str",
        "aliases": ["메모", "비고", "특이사항", "노트", "notes", "memo", "remark"],
    },
}

CLASS_SCHEMA: Dict[str, Dict[str, Any]] = {
    "class_id": {
        "required": True,
        "type": "str",
        "aliases": ["수업코드", "수업ID", "수업번호", "강좌코드", "class_id", "id"],
    },
    "class_name": {
        "required": True,
        "type": "str",
        "aliases": ["수업명", "강좌명", "프로그램명", "class_name", "title", "name"],
    },
    "class_date": {
        "required": True,
        "type": "date",
        "aliases": ["수업일자", "수업일", "날짜", "일자", "class_date", "date"],
    },
    "start_time": {
        "required": True,
        "type": "time",
        "aliases": ["시작시간", "시작시각", "start_time", "start"],
    },
    "end_time": {
        "required": True,
        "type": "time",
        "aliases": ["종료시간", "종료시각", "end_time", "end"],
    },
    "instructor": {
        "required": True,
        "type": "str",
        "aliases": ["담당강사", "강사명", "강사", "instructor", "teacher"],
    },
    "equipment": {
        "required": False,
        "type": "str",
        "aliases": ["기구종류", "기구", "룸", "강의실", "equipment", "room"],
    },
    "capacity": {
        "required": True,
        "type": "positive_int",
        "aliases": ["정원", "최대인원", "수강정원", "capacity", "max_capacity"],
    },
    "booked_count": {
        "required": False,
        "type": "non_negative_int",
        "aliases": ["예약인원", "신청인원", "현재인원", "booked_count", "enrolled"],
    },
    "description": {
        "required": False,
        "type": "str",
        "aliases": ["수업설명", "비고", "메모", "안내", "description", "notes"],
    },
}

SCHEMAS: Dict[str, Dict[str, Dict[str, Any]]] = {
    "member": MEMBER_SCHEMA,
    "class": CLASS_SCHEMA,
}

FORMULA_TRIGGERS = ("=", "+", "-", "@", "\t", "\r")
FORMULA_OPERATOR_CHARS = ("=", "+", "-", "@")
ZERO_WIDTH_CHARS = frozenset({"\ufeff", "\u200b", "\u200c", "\u200d", "\u200e", "\u200f", "\u2060", "\u180e"})
DATE_PATTERN = re.compile(r"^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$")
TIME_PATTERN = re.compile(r"^(\d{1,2}):(\d{2})(?::(\d{2}))?$")
PHONE_PATTERN = re.compile(r"^01[016789]-?\d{3,4}-?\d{4}$")


class MappingConfigError(ValueError):
    """Raised when --mapping input has invalid syntax or duplicate keys."""


@dataclass
class CsvFieldIssue:
    col_index: int
    code: str
    line_number: int
    message: str
    raw_snippet: str
    unclosed_eof: bool = False


@dataclass
class ParsedCsvRecord:
    fields: List[str]
    start_line: int
    end_line: int
    issues: List[CsvFieldIssue]
    is_blank_line: bool = False


def is_stealth_prefix_char(ch: str) -> bool:
    """
    Return True for any character that spreadsheet engines or text consumers may
    ignore/strip before evaluating a leading formula token: ASCII/Unicode spaces,
    tabs, newlines, C0/DEL/C1 control characters, and Unicode format/zero-width chars.
    """
    if ch.isspace() or ch in ZERO_WIDTH_CHARS:
        return True
    cat = unicodedata.category(ch)
    return cat in ("Cc", "Cf", "Zs", "Zl", "Zp")


def has_disallowed_control_char(value: str) -> bool:
    """Return True if value contains non-whitespace C0, DEL, or C1 control characters."""
    for ch in value:
        codepoint = ord(ch)
        if (codepoint < 0x20 and ch not in ("\t", "\n", "\r")) or (0x7F <= codepoint <= 0x9F):
            return True
    return False


def strip_disallowed_control_chars(value: str) -> str:
    """Remove non-whitespace C0/DEL/C1 control characters for safe JSON preview output."""
    return "".join(
        ch
        for ch in value
        if not ((ord(ch) < 0x20 and ch not in ("\t", "\n", "\r")) or (0x7F <= ord(ch) <= 0x9F))
    )


def strip_cell_whitespace(value: str) -> str:
    """Strip outer whitespace and zero-width format characters from a non-formula cell and normalize NFC."""
    start = 0
    end = len(value)
    while start < end and (value[start].isspace() or value[start] in ZERO_WIDTH_CHARS):
        start += 1
    while end > start and (value[end - 1].isspace() or value[end - 1] in ZERO_WIDTH_CHARS):
        end -= 1
    return unicodedata.normalize("NFC", value[start:end])


def normalize_newlines(value: str) -> str:
    """Normalize CRLF and standalone CR to LF."""
    return value.replace("\r\n", "\n").replace("\r", "\n")


def normalize_header_token(header: str) -> str:
    """Normalize a column header token for matching (NFC, strip BOM/zero-width, whitespace, punctuation)."""
    cleaned = strip_cell_whitespace(header.lstrip("\ufeff"))
    cleaned = "".join(ch for ch in cleaned if ch not in ZERO_WIDTH_CHARS)
    cleaned = unicodedata.normalize("NFC", cleaned)
    return re.sub(r"[\s_\-()]+", "", cleaned).lower()


def detect_encoding_and_decode(raw_bytes: bytes) -> Tuple[str, str]:
    """Detect UTF-8 BOM vs plain UTF-8 and return (encoding_name, decoded_text)."""
    if raw_bytes.startswith(b"\xef\xbb\xbf"):
        decoded = raw_bytes.decode("utf-8-sig")
        return "UTF-8-BOM", decoded.lstrip("\ufeff")
    return "UTF-8", raw_bytes.decode("utf-8")


def detect_entity_type(headers: List[str]) -> str:
    """Auto-detect whether headers represent 'member' or 'class' CSV."""
    norm_headers = {normalize_header_token(h) for h in headers if normalize_header_token(h)}
    member_score = 0
    class_score = 0
    for field_spec in MEMBER_SCHEMA.values():
        if any(normalize_header_token(a) in norm_headers for a in field_spec["aliases"]):
            member_score += 1
    for field_spec in CLASS_SCHEMA.values():
        if any(normalize_header_token(a) in norm_headers for a in field_spec["aliases"]):
            class_score += 1
    return "class" if class_score > member_score else "member"


def resolve_column_mapping_detailed(
    headers: List[str],
    entity_type: str,
    custom_mapping: Optional[Dict[str, str]] = None,
    header_line: int = 1,
) -> Tuple[Dict[str, str], Dict[str, int], List[Tuple[int, str]], List[str], List[Dict[str, Any]]]:
    """
    Index-aware column mapping resolver with conflict detection.
    Detects:
      - Unknown canonical fields or missing target CSV headers in custom_mapping
      - Many-to-one conflicts (multiple CSV columns mapped to one canonical field)
      - One-to-many conflicts (one CSV column mapped to multiple canonical fields)
      - Ambiguous alias collisions (multiple distinct CSV headers matching aliases of the same field)
    """
    schema = SCHEMAS[entity_type]
    canonical_to_source: Dict[str, str] = {}
    canonical_to_col_idx: Dict[str, int] = {}
    col_idx_to_canonical: Dict[int, str] = {}
    conflicts: List[Dict[str, Any]] = []

    exact_to_indices: Dict[str, List[int]] = {}
    norm_to_indices: Dict[str, List[int]] = {}
    for idx, h in enumerate(headers):
        if not h:
            continue
        exact_to_indices.setdefault(h, []).append(idx)
        nh = normalize_header_token(h)
        if nh:
            norm_to_indices.setdefault(nh, []).append(idx)

    def _find_header_col_idx(target_header: str) -> Optional[int]:
        cleaned = strip_cell_whitespace(target_header.lstrip("\ufeff"))
        if cleaned in exact_to_indices:
            return exact_to_indices[cleaned][0]
        nt = normalize_header_token(cleaned)
        if nt and nt in norm_to_indices:
            return norm_to_indices[nt][0]
        return None

    if custom_mapping:
        for raw_k, raw_v in custom_mapping.items():
            k = unicodedata.normalize("NFC", raw_k.strip())
            v = unicodedata.normalize("NFC", raw_v.strip())
            canonical_field: Optional[str] = None
            source_spec: Optional[str] = None

            if k in schema and v in schema:
                v_idx = _find_header_col_idx(v)
                k_idx = _find_header_col_idx(k)
                if v_idx is not None:
                    canonical_field, source_spec = k, v
                elif k_idx is not None:
                    canonical_field, source_spec = v, k
                else:
                    canonical_field, source_spec = k, v
            elif k in schema:
                canonical_field, source_spec = k, v
            elif v in schema:
                canonical_field, source_spec = v, k
            else:
                conflicts.append(
                    {
                        "row_number": 0,
                        "line_number": header_line,
                        "field": "__mapping__",
                        "source_column": k,
                        "code": "MAPPING_CONFLICT",
                        "severity": "error",
                        "message": f"알 수 없는 열 매핑 설정입니다: '{raw_k}' -> '{raw_v}' (유효한 표준 필드가 아님).",
                        "raw_value": f"{raw_k}={raw_v}",
                    }
                )
                continue

            assert canonical_field is not None and source_spec is not None
            matched_idx = _find_header_col_idx(source_spec)
            if matched_idx is None:
                conflicts.append(
                    {
                        "row_number": 0,
                        "line_number": header_line,
                        "field": canonical_field,
                        "source_column": source_spec,
                        "code": "MAPPING_CONFLICT",
                        "severity": "error",
                        "message": f"열 매핑에 지정된 원본 헤더 '{source_spec}'(표준 필드 '{canonical_field}')가 CSV에 존재하지 않습니다.",
                        "raw_value": source_spec,
                    }
                )
                continue

            if canonical_field in canonical_to_col_idx and canonical_to_col_idx[canonical_field] != matched_idx:
                prev_header = canonical_to_source[canonical_field]
                conflicts.append(
                    {
                        "row_number": 0,
                        "line_number": header_line,
                        "field": canonical_field,
                        "source_column": headers[matched_idx],
                        "code": "MAPPING_CONFLICT",
                        "severity": "error",
                        "message": (
                            f"열 매핑 충돌: 표준 필드 '{canonical_field}'에 복수의 원본 열"
                            f"('{prev_header}', '{headers[matched_idx]}')이 매핑되었습니다."
                        ),
                        "raw_value": headers[matched_idx],
                    }
                )
                continue

            if matched_idx in col_idx_to_canonical and col_idx_to_canonical[matched_idx] != canonical_field:
                prev_canonical = col_idx_to_canonical[matched_idx]
                conflicts.append(
                    {
                        "row_number": 0,
                        "line_number": header_line,
                        "field": canonical_field,
                        "source_column": headers[matched_idx],
                        "code": "MAPPING_CONFLICT",
                        "severity": "error",
                        "message": (
                            f"열 매핑 충돌: 원본 열 '{headers[matched_idx]}'가 복수의 표준 필드"
                            f"('{prev_canonical}', '{canonical_field}')에 중복 매핑되었습니다."
                        ),
                        "raw_value": headers[matched_idx],
                    }
                )
                continue

            canonical_to_col_idx[canonical_field] = matched_idx
            canonical_to_source[canonical_field] = headers[matched_idx]
            col_idx_to_canonical[matched_idx] = canonical_field

    for canonical_field, spec in schema.items():
        if canonical_field in canonical_to_col_idx:
            continue
        norm_aliases = {normalize_header_token(a) for a in spec["aliases"]}
        candidate_indices: List[int] = []
        seen_candidate_norms = set()
        for idx, h in enumerate(headers):
            if not h or idx in col_idx_to_canonical:
                continue
            nh = normalize_header_token(h)
            if nh in norm_aliases and nh not in seen_candidate_norms:
                seen_candidate_norms.add(nh)
                candidate_indices.append(idx)

        if len(candidate_indices) > 1:
            competing_names = ", ".join(f"'{headers[i]}'" for i in candidate_indices)
            conflicts.append(
                {
                    "row_number": 0,
                    "line_number": header_line,
                    "field": canonical_field,
                    "source_column": headers[candidate_indices[1]],
                    "code": "MAPPING_CONFLICT",
                    "severity": "error",
                    "message": (
                        f"자동 열 매핑 모호성 충돌: 표준 필드 '{canonical_field}'에 대응하는 별칭 헤더가 "
                        f"여러 개 존재합니다({competing_names}). --mapping으로 명시 지정하세요."
                    ),
                    "raw_value": competing_names,
                }
            )

        # Bind using alias priority order if any candidate exists
        for alias in spec["aliases"]:
            norm_alias = normalize_header_token(alias)
            if norm_alias in norm_to_indices:
                chosen_idx = next(
                    (i for i in norm_to_indices[norm_alias] if i not in col_idx_to_canonical),
                    None,
                )
                if chosen_idx is not None:
                    canonical_to_col_idx[canonical_field] = chosen_idx
                    canonical_to_source[canonical_field] = headers[chosen_idx]
                    col_idx_to_canonical[chosen_idx] = canonical_field
                    break

    unmapped_columns = [
        (idx, h) for idx, h in enumerate(headers) if idx not in col_idx_to_canonical
    ]
    missing_required = [
        field
        for field, spec in schema.items()
        if spec["required"] and field not in canonical_to_col_idx
    ]
    return canonical_to_source, canonical_to_col_idx, unmapped_columns, missing_required, conflicts


def resolve_column_mapping(
    headers: List[str],
    entity_type: str,
    custom_mapping: Optional[Dict[str, str]] = None,
) -> Tuple[Dict[str, str], List[str], List[str]]:
    """
    Map CSV source headers to canonical schema fields (public backwards-compatible helper).
    """
    canonical_to_source, _, unmapped_columns, missing_required, _ = resolve_column_mapping_detailed(
        headers, entity_type, custom_mapping
    )
    return canonical_to_source, [h for _, h in unmapped_columns], missing_required


def _has_leading_tab_or_bare_cr(value: str) -> bool:
    """Return True if value starts with a tab or a standalone CR (not a normal CRLF line break)."""
    if not value:
        return False
    if value[0] == "\t":
        return True
    if value[0] == "\r" and not value.startswith("\r\n"):
        return True
    return False


def is_formula_injection(value: str, field_type: str = "str") -> bool:
    """
    Check if a cell value poses a CSV / spreadsheet formula injection risk.
    Detects direct triggers (=, +, -, @, leading tab / bare CR with non-empty content)
    as well as formulas hidden behind leading spaces, tabs, CRLF/LF newlines,
    Unicode spaces, zero-width chars, or control chars.
    Whitespace-only cells (e.g. '\\t', '\\r\\n') are treated as empty rather than formulas.
    Pure negative integers on numeric fields (without control/format prefixes) are
    handled as numeric range errors rather than formula injections.
    """
    if not value:
        return False

    idx = 0
    n = len(value)
    has_stealth_ctrl_or_fmt = False
    while idx < n and is_stealth_prefix_char(value[idx]):
        ch = value[idx]
        if ch not in (" ", "\n", "\r") and (
            ch in ZERO_WIDTH_CHARS or unicodedata.category(ch) in ("Cc", "Cf")
        ):
            has_stealth_ctrl_or_fmt = True
        idx += 1

    stripped_leading = value[idx:]
    if not stripped_leading:
        return False

    if _has_leading_tab_or_bare_cr(value):
        return True

    first_char = stripped_leading[0]
    if first_char in ("=", "+", "@"):
        return True
    if first_char == "-":
        if (
            not has_stealth_ctrl_or_fmt
            and field_type in ("non_negative_int", "positive_int")
            and re.match(r"^-\d+$", strip_cell_whitespace(stripped_leading))
        ):
            return False
        return True
    return False


def sanitize_preview_value(
    value: str,
    max_chars: int = PREVIEW_CELL_TRUNCATE_CHARS,
) -> Tuple[str, bool]:
    """
    Sanitize a string for safe preview output so spreadsheet/UI consumers cannot execute formulas.
    Normalizes CRLF/CR to LF and Unicode to NFC, strips non-whitespace control chars (e.g. NUL),
    caps preview length, and prefixes dangerous leading characters with a single quote.
    """
    normalized = unicodedata.normalize("NFC", strip_disallowed_control_chars(normalize_newlines(value)))
    if max_chars > 0 and len(normalized) > max_chars:
        normalized = normalized[:max_chars] + "...[truncated]"
    if not normalized:
        return normalized, False

    idx = 0
    n = len(normalized)
    while idx < n and is_stealth_prefix_char(normalized[idx]):
        idx += 1
    stripped_leading = normalized[idx:]
    if not stripped_leading:
        return normalized, False

    if _has_leading_tab_or_bare_cr(value) or normalized[0] == "\t" or (
        stripped_leading[0] in FORMULA_OPERATOR_CHARS
    ):
        return "'" + normalized, True
    return normalized, False


def parse_and_validate_date(value: str) -> Tuple[Optional[datetime.date], Optional[str]]:
    """Validate calendar date and return (datetime.date, iso_string) or (None, None)."""
    match = DATE_PATTERN.match(value.strip())
    if not match:
        return None, None
    year, month, day = int(match.group(1)), int(match.group(2)), int(match.group(3))
    try:
        dt = datetime.date(year, month, day)
        return dt, dt.isoformat()
    except ValueError:
        return None, None


def parse_and_validate_time(value: str) -> Tuple[Optional[datetime.time], Optional[str]]:
    """Validate 24-hour time (HH:MM or HH:MM:SS) and return (datetime.time, normalized_str)."""
    match = TIME_PATTERN.match(value.strip())
    if not match:
        return None, None
    hour, minute = int(match.group(1)), int(match.group(2))
    second = int(match.group(3)) if match.group(3) is not None else 0
    try:
        tm = datetime.time(hour, minute, second)
        if tm.second:
            return tm, f"{tm.hour:02d}:{tm.minute:02d}:{tm.second:02d}"
        return tm, f"{tm.hour:02d}:{tm.minute:02d}"
    except ValueError:
        return None, None


def check_unclosed_quotes(text: str) -> Optional[int]:
    """
    Field-aware unclosed double-quote check returning the 1-based starting line number
    if a quoted CSV field remains unclosed at EOF, or None if all quoted fields close.
    """
    for record in iter_csv_records(text, max_field_chars=DEFAULT_MAX_FIELD_CHARS):
        for issue in record.issues:
            if issue.unclosed_eof:
                return issue.line_number
    return None


def iter_csv_records(
    text: str,
    max_field_chars: int = DEFAULT_MAX_FIELD_CHARS,
) -> Iterator[ParsedCsvRecord]:
    """
    Streaming RFC-4180 CSV tokenizer with:
    - Exact 1-based physical line_number tracking across LF, CRLF, and CR newlines
    - Bounded per-field logical character buffering (prevents OOM on huge fields;
      escaped quotes \"\" and CRLF \\r\\n inside quotes each count as 1 logical char)
    - Malformed quote detection (unclosed quotes at EOF, trailing chars after closing quote,
      and bare unescaped quotes in non-formula unquoted cells) with line-bounded recovery
    - NUL / control character resilience without C _csv crashes
    """
    n = len(text)
    i = 0
    line_num = 1

    while i < n:
        record_start_line = line_num

        # Handle completely empty physical line
        if text[i] == "\r":
            i += 2 if (i + 1 < n and text[i + 1] == "\n") else 1
            line_num += 1
            yield ParsedCsvRecord(
                fields=[],
                start_line=record_start_line,
                end_line=record_start_line,
                issues=[],
                is_blank_line=True,
            )
            continue
        if text[i] == "\n":
            i += 1
            line_num += 1
            yield ParsedCsvRecord(
                fields=[],
                start_line=record_start_line,
                end_line=record_start_line,
                issues=[],
                is_blank_line=True,
            )
            continue

        fields: List[str] = []
        issues: List[CsvFieldIssue] = []
        col_idx = 0
        was_quoted_first_cell = text[i] == '"'

        while True:
            if i >= n or text[i] in ("\r", "\n"):
                # Trailing empty field after comma (e.g., "a,b,\n")
                fields.append("")
                record_end_line = line_num
                if i < n:
                    if text[i] == "\r":
                        i += 2 if (i + 1 < n and text[i + 1] == "\n") else 1
                    else:
                        i += 1
                    line_num += 1
                break

            if text[i] == '"':
                quote_start_line = line_num
                i += 1
                buf: List[str] = []
                char_count = 0
                exceeded_limit = False
                closed_quote = False

                while i < n:
                    ch = text[i]
                    if ch == '"':
                        if i + 1 < n and text[i + 1] == '"':
                            char_count += 1
                            if char_count <= max_field_chars:
                                buf.append('"')
                            else:
                                exceeded_limit = True
                            i += 2
                            continue
                        i += 1
                        closed_quote = True
                        break
                    if ch == "\r":
                        if i + 1 < n and text[i + 1] == "\n":
                            char_count += 1
                            if char_count <= max_field_chars:
                                buf.append("\r\n")
                            else:
                                exceeded_limit = True
                            i += 2
                        else:
                            char_count += 1
                            if char_count <= max_field_chars:
                                buf.append("\r")
                            else:
                                exceeded_limit = True
                            i += 1
                        line_num += 1
                    elif ch == "\n":
                        char_count += 1
                        if char_count <= max_field_chars:
                            buf.append("\n")
                        else:
                            exceeded_limit = True
                        i += 1
                        line_num += 1
                    else:
                        char_count += 1
                        if char_count <= max_field_chars:
                            buf.append(ch)
                        else:
                            exceeded_limit = True
                        i += 1

                cell_base = "".join(buf)

                if not closed_quote:
                    issues.append(
                        CsvFieldIssue(
                            col_index=col_idx,
                            code="MALFORMED_CSV_QUOTE",
                            line_number=quote_start_line,
                            message=f"{quote_start_line}번째 줄에서 시작된 인용부호(\")가 닫히지 않았습니다.",
                            raw_snippet=cell_base[:120],
                            unclosed_eof=True,
                        )
                    )
                    if exceeded_limit:
                        issues.append(
                            CsvFieldIssue(
                                col_index=col_idx,
                                code="FIELD_TOO_LARGE",
                                line_number=quote_start_line,
                                message=f"셀 길이가 최대 허용치({max_field_chars}자)를 초과했습니다({char_count}자).",
                                raw_snippet=cell_base[:120],
                            )
                        )
                    fields.append(cell_base)
                    record_end_line = line_num
                    break

                # Closed quote: verify clean delimiter or record end, else recover on current line
                extra_buf: List[str] = []
                if i < n and text[i] not in (",", "\r", "\n"):
                    malformed_line = line_num
                    while i < n and text[i] not in (",", "\r", "\n"):
                        char_count += 1
                        if char_count <= max_field_chars:
                            extra_buf.append(text[i])
                        else:
                            exceeded_limit = True
                        i += 1
                    extra_str = "".join(extra_buf)
                    issues.append(
                        CsvFieldIssue(
                            col_index=col_idx,
                            code="MALFORMED_CSV_QUOTE",
                            line_number=malformed_line,
                            message=f"{malformed_line}번째 줄에서 닫는 인용부호(\") 뒤에 허용되지 않은 문자가 이어집니다.",
                            raw_snippet=(f'"{cell_base[:60]}"{extra_str[:60]}'),
                        )
                    )
                    full_cell = cell_base + extra_str
                else:
                    full_cell = cell_base

                if exceeded_limit:
                    issues.append(
                        CsvFieldIssue(
                            col_index=col_idx,
                            code="FIELD_TOO_LARGE",
                            line_number=quote_start_line,
                            message=f"셀 길이가 최대 허용치({max_field_chars}자)를 초과했습니다({char_count}자).",
                            raw_snippet=full_cell[:120],
                        )
                    )

                fields.append(full_cell)
                if i < n and text[i] == ",":
                    i += 1
                    col_idx += 1
                    continue

                record_end_line = line_num
                if i < n:
                    if text[i] == "\r":
                        i += 2 if (i + 1 < n and text[i + 1] == "\n") else 1
                    else:
                        i += 1
                    line_num += 1
                break

            # Unquoted field
            field_start_line = line_num
            buf = []
            char_count = 0
            exceeded_limit = False
            has_bare_quote = False

            while i < n and text[i] not in (",", "\r", "\n"):
                ch = text[i]
                if ch == '"':
                    has_bare_quote = True
                char_count += 1
                if char_count <= max_field_chars:
                    buf.append(ch)
                else:
                    exceeded_limit = True
                i += 1

            cell_str = "".join(buf)
            if has_bare_quote and not is_formula_injection(cell_str, "str"):
                issues.append(
                    CsvFieldIssue(
                        col_index=col_idx,
                        code="MALFORMED_CSV_QUOTE",
                        line_number=field_start_line,
                        message=f"{field_start_line}번째 줄 비인용 셀 내부에 이스케이프되지 않은 인용부호(\")가 포함되어 있습니다.",
                        raw_snippet=cell_str[:120],
                    )
                )
            if exceeded_limit:
                issues.append(
                    CsvFieldIssue(
                        col_index=col_idx,
                        code="FIELD_TOO_LARGE",
                        line_number=field_start_line,
                        message=f"셀 길이가 최대 허용치({max_field_chars}자)를 초과했습니다({char_count}자).",
                        raw_snippet=cell_str[:120],
                    )
                )

            fields.append(cell_str)
            if i < n and text[i] == ",":
                i += 1
                col_idx += 1
                continue

            record_end_line = line_num
            if i < n:
                if text[i] == "\r":
                    i += 2 if (i + 1 < n and text[i + 1] == "\n") else 1
                else:
                    i += 1
                line_num += 1
            break

        # Treat a single unquoted whitespace-only token with no commas as a blank line
        is_ws_only_single = (
            not was_quoted_first_cell
            and len(fields) == 1
            and not issues
            and strip_cell_whitespace(fields[0]) == ""
        )
        yield ParsedCsvRecord(
            fields=[] if is_ws_only_single else fields,
            start_line=record_start_line,
            end_line=record_end_line,
            issues=issues,
            is_blank_line=is_ws_only_single,
        )


def _empty_result(
    entity_type: Optional[str],
    encoding_detected: str,
    error_item: Dict[str, Any],
) -> Dict[str, Any]:
    code = error_item["code"]
    return {
        "dry_run": True,
        "db_write_performed": False,
        "entity_type": entity_type or "unknown",
        "encoding_detected": encoding_detected,
        "column_mapping": {},
        "unmapped_columns": [],
        "missing_required_columns": [],
        "summary": {
            "total_rows": 0,
            "valid_rows": 0,
            "invalid_rows": 0,
            "duplicate_rows": 0,
            "formula_injection_count": 0,
            "error_counts_by_code": {code: 1},
            "can_import": False,
        },
        "row_errors": [error_item],
        "preview_rows": [],
    }


def validate_csv_content(
    raw_bytes: bytes,
    entity_type: Optional[str] = None,
    custom_mapping: Optional[Dict[str, str]] = None,
    max_preview_rows: int = DEFAULT_MAX_PREVIEW_ROWS,
    max_rows: int = DEFAULT_MAX_ROWS,
    max_field_chars: int = DEFAULT_MAX_FIELD_CHARS,
    max_file_bytes: int = DEFAULT_MAX_FILE_BYTES,
) -> Dict[str, Any]:
    """
    Core dry-run CSV validation pipeline. Never writes to any database.
    Returns a structured dictionary suitable for JSON serialization.
    """
    if max_file_bytes > 0 and len(raw_bytes) > max_file_bytes:
        return _empty_result(
            entity_type=entity_type,
            encoding_detected="UNCHECKED",
            error_item={
                "row_number": 0,
                "line_number": 1,
                "field": "__file__",
                "source_column": None,
                "code": "FILE_TOO_LARGE",
                "severity": "error",
                "message": f"CSV 파일 크기({len(raw_bytes)} bytes)가 최대 허용 크기({max_file_bytes} bytes)를 초과했습니다.",
                "raw_value": None,
            },
        )

    try:
        encoding_detected, decoded_text = detect_encoding_and_decode(raw_bytes)
    except UnicodeDecodeError as exc:
        return _empty_result(
            entity_type=entity_type,
            encoding_detected="INVALID",
            error_item={
                "row_number": 0,
                "line_number": 1,
                "field": "__file__",
                "source_column": None,
                "code": "ENCODING_ERROR",
                "severity": "error",
                "message": f"UTF-8 디코딩 실패: {exc}",
                "raw_value": None,
            },
        )

    effective_max_field = max(1, max_field_chars)
    effective_max_rows = max(1, max_rows)
    effective_max_preview = max(0, max_preview_rows)
    preview_cap = max(PREVIEW_CELL_TRUNCATE_CHARS, effective_max_field)

    record_iter = iter_csv_records(decoded_text, max_field_chars=effective_max_field)

    header_record: Optional[ParsedCsvRecord] = None
    for rec in record_iter:
        if not rec.is_blank_line:
            header_record = rec
            break

    if header_record is None:
        return _empty_result(
            entity_type=entity_type,
            encoding_detected=encoding_detected,
            error_item={
                "row_number": 0,
                "line_number": 1,
                "field": "__file__",
                "source_column": None,
                "code": "EMPTY_FILE",
                "severity": "error",
                "message": "CSV 파일이 비어 있거나 헤더 행이 없습니다.",
                "raw_value": None,
            },
        )

    # If the header row itself has an unclosed quote reaching EOF, columns cannot be determined
    for h_issue in header_record.issues:
        if h_issue.unclosed_eof:
            return _empty_result(
                entity_type=entity_type,
                encoding_detected=encoding_detected,
                error_item={
                    "row_number": 0,
                    "line_number": h_issue.line_number,
                    "field": "__csv__",
                    "source_column": None,
                    "code": "MALFORMED_CSV_QUOTE",
                    "severity": "error",
                    "message": h_issue.message,
                    "raw_value": None,
                },
            )

    row_errors: List[Dict[str, Any]] = []
    preview_rows: List[Dict[str, Any]] = []
    formula_injection_count = 0

    header_line = header_record.start_line
    raw_headers = header_record.fields
    headers = [strip_cell_whitespace(normalize_newlines(h.lstrip("\ufeff"))) for h in raw_headers]

    # Record any tokenizer issues on header cells
    for h_issue in header_record.issues:
        src_col = (
            headers[h_issue.col_index]
            if h_issue.col_index < len(headers) and headers[h_issue.col_index]
            else f"col_{h_issue.col_index + 1}"
        )
        row_errors.append(
            {
                "row_number": 0,
                "line_number": h_issue.line_number,
                "field": "__header__",
                "source_column": src_col,
                "code": h_issue.code,
                "severity": "error",
                "message": h_issue.message,
                "raw_value": sanitize_preview_value(h_issue.raw_snippet)[0],
            }
        )

    # Validate empty headers, duplicate headers (exact & normalized), and header formula/control chars
    seen_exact_headers: Dict[str, int] = {}
    seen_norm_headers: Dict[str, Tuple[int, str]] = {}
    for col_idx, raw_h in enumerate(raw_headers):
        cleaned_h = headers[col_idx]
        if is_formula_injection(raw_h, "str"):
            formula_injection_count += 1
            safe_h, _ = sanitize_preview_value(raw_h)
            row_errors.append(
                {
                    "row_number": 0,
                    "line_number": header_line,
                    "field": "__header__",
                    "source_column": safe_h,
                    "code": "FORMULA_INJECTION",
                    "severity": "error",
                    "message": f"헤더 열({col_idx + 1}번째 열)에서 수식 주입 위험 값 감지: '{safe_h}'",
                    "raw_value": safe_h,
                }
            )
        elif has_disallowed_control_char(raw_h):
            safe_h, _ = sanitize_preview_value(raw_h)
            row_errors.append(
                {
                    "row_number": 0,
                    "line_number": header_line,
                    "field": "__header__",
                    "source_column": safe_h or f"col_{col_idx + 1}",
                    "code": "INVALID_CONTROL_CHAR",
                    "severity": "error",
                    "message": f"헤더 열({col_idx + 1}번째 열)에 허용되지 않는 제어문자가 포함되어 있습니다.",
                    "raw_value": safe_h,
                }
            )

        if not cleaned_h:
            row_errors.append(
                {
                    "row_number": 0,
                    "line_number": header_line,
                    "field": "__header__",
                    "source_column": f"col_{col_idx + 1}",
                    "code": "EMPTY_HEADER",
                    "severity": "error",
                    "message": f"{col_idx + 1}번째 열의 헤더 이름이 비어 있습니다.",
                    "raw_value": raw_h,
                }
            )
            continue

        norm_h = normalize_header_token(cleaned_h)
        if cleaned_h in seen_exact_headers:
            first_col = seen_exact_headers[cleaned_h] + 1
            row_errors.append(
                {
                    "row_number": 0,
                    "line_number": header_line,
                    "field": "__header__",
                    "source_column": cleaned_h,
                    "code": "DUPLICATE_HEADER",
                    "severity": "error",
                    "message": f"중복 헤더 '{cleaned_h}' 감지 ({first_col}번째 열과 {col_idx + 1}번째 열).",
                    "raw_value": cleaned_h,
                }
            )
        elif norm_h and norm_h in seen_norm_headers:
            first_idx, first_name = seen_norm_headers[norm_h]
            row_errors.append(
                {
                    "row_number": 0,
                    "line_number": header_line,
                    "field": "__header__",
                    "source_column": cleaned_h,
                    "code": "DUPLICATE_HEADER",
                    "severity": "error",
                    "message": (
                        f"정규화 충돌 중복 헤더 '{cleaned_h}' 감지 "
                        f"({first_idx + 1}번째 열 '{first_name}'와 동일 표준 토큰)."
                    ),
                    "raw_value": cleaned_h,
                }
            )
        else:
            seen_exact_headers[cleaned_h] = col_idx
            if norm_h:
                seen_norm_headers[norm_h] = (col_idx, cleaned_h)

    resolved_entity = entity_type or detect_entity_type(headers)
    schema = SCHEMAS[resolved_entity]

    (
        canonical_to_source,
        canonical_to_col_idx,
        unmapped_col_pairs,
        missing_required,
        mapping_conflicts,
    ) = resolve_column_mapping_detailed(
        headers=headers,
        entity_type=resolved_entity,
        custom_mapping=custom_mapping,
        header_line=header_line,
    )
    unmapped_headers = [h for _, h in unmapped_col_pairs if h]
    col_idx_to_canonical = {col_idx: field for field, col_idx in canonical_to_col_idx.items()}

    row_errors.extend(mapping_conflicts)

    for missing_field in missing_required:
        row_errors.append(
            {
                "row_number": 0,
                "line_number": header_line,
                "field": missing_field,
                "source_column": None,
                "code": "MISSING_REQUIRED_COLUMN",
                "severity": "error",
                "message": f"필수 열 매핑 누락: '{missing_field}'에 해당하는 헤더를 찾을 수 없습니다.",
                "raw_value": None,
            }
        )

    header_level_has_errors = len(row_errors) > 0

    seen_primary_keys: Dict[str, Tuple[int, int]] = {}
    seen_composite_keys: Dict[Tuple[str, ...], Tuple[int, int]] = {}
    seen_exact_rows: Dict[Tuple[Tuple[bool, str], ...], Tuple[int, int]] = {}

    total_rows = 0
    valid_rows = 0
    invalid_rows = 0
    duplicate_rows = 0

    row_idx = 0
    for record in record_iter:
        if record.is_blank_line:
            continue

        row_idx += 1
        start_line_num = record.start_line

        if row_idx > effective_max_rows:
            row_errors.append(
                {
                    "row_number": row_idx,
                    "line_number": start_line_num,
                    "field": "__file__",
                    "source_column": None,
                    "code": "MAX_ROWS_EXCEEDED",
                    "severity": "error",
                    "message": (
                        f"최대 허용 데이터 행 수({effective_max_rows}행)를 초과하여 "
                        f"{start_line_num}번째 줄부터 추가 행 검증을 중단했습니다."
                    ),
                    "raw_value": None,
                }
            )
            break

        raw_row = record.fields
        total_rows += 1
        current_row_errors: List[Dict[str, Any]] = []
        row_has_duplicate = False
        has_unclosed_eof = any(iss.unclosed_eof for iss in record.issues)

        # Record tokenizer-level issues (malformed quotes, oversized fields) first
        for iss in record.issues:
            if iss.col_index in col_idx_to_canonical:
                iss_field = col_idx_to_canonical[iss.col_index]
                iss_src: Optional[str] = headers[iss.col_index]
            elif iss.col_index < len(headers) and headers[iss.col_index]:
                iss_field = headers[iss.col_index]
                iss_src = headers[iss.col_index]
            else:
                iss_field = "__csv__"
                iss_src = None
            safe_snip, _ = sanitize_preview_value(iss.raw_snippet)
            current_row_errors.append(
                {
                    "row_number": row_idx,
                    "line_number": iss.line_number,
                    "field": iss_field if not iss.unclosed_eof else "__csv__",
                    "source_column": iss_src if not iss.unclosed_eof else None,
                    "code": iss.code,
                    "severity": "error",
                    "message": iss.message,
                    "raw_value": None if iss.unclosed_eof else safe_snip,
                }
            )

        # If row was truncated by an unclosed quote reaching EOF, avoid cascading column/empty errors
        if has_unclosed_eof:
            invalid_rows += 1
            row_errors.extend(current_row_errors)
            if len(preview_rows) < effective_max_preview:
                partial_record: Dict[str, Any] = {}
                partial_sanitized: List[str] = []
                for canonical_field in schema:
                    c_idx = canonical_to_col_idx.get(canonical_field)
                    cell = raw_row[c_idx] if (c_idx is not None and c_idx < len(raw_row)) else ""
                    if cell:
                        s_val, was_s = sanitize_preview_value(cell, max_chars=preview_cap)
                        if was_s:
                            partial_sanitized.append(canonical_field)
                        partial_record[canonical_field] = s_val
                    else:
                        partial_record[canonical_field] = None
                preview_rows.append(
                    {
                        "row_number": row_idx,
                        "line_number": start_line_num,
                        "valid": False,
                        "formula_sanitized": len(partial_sanitized) > 0,
                        "sanitized_fields": partial_sanitized,
                        "error_codes": [e["code"] for e in current_row_errors],
                        "data": partial_record,
                    }
                )
            continue

        # Column count mismatch check
        if len(raw_row) != len(headers):
            safe_cells_preview = [sanitize_preview_value(c[:200])[0] for c in raw_row[:30]]
            current_row_errors.append(
                {
                    "row_number": row_idx,
                    "line_number": start_line_num,
                    "field": "__row__",
                    "source_column": None,
                    "code": "COLUMN_COUNT_MISMATCH",
                    "severity": "error",
                    "message": f"열 개수 불일치: 헤더는 {len(headers)}개이나 데이터 행은 {len(raw_row)}개입니다.",
                    "raw_value": json.dumps(safe_cells_preview, ensure_ascii=False),
                }
            )

        # Exact row duplicate check (distinguishing formula-injected cells from benign normalized cells)
        row_dup_signature: List[Tuple[bool, str]] = []
        has_non_empty_cell = False
        for c_idx, cell in enumerate(raw_row):
            c_field = col_idx_to_canonical.get(c_idx)
            c_type = schema[c_field]["type"] if c_field else "str"
            if is_formula_injection(cell, c_type):
                norm_formula = unicodedata.normalize("NFC", normalize_newlines(cell))
                row_dup_signature.append((True, norm_formula))
                has_non_empty_cell = True
            else:
                norm_plain = strip_cell_whitespace(normalize_newlines(cell))
                row_dup_signature.append((False, norm_plain))
                if norm_plain:
                    has_non_empty_cell = True

        normalized_tuple = tuple(row_dup_signature)
        if has_non_empty_cell:
            if normalized_tuple in seen_exact_rows:
                first_row, first_line = seen_exact_rows[normalized_tuple]
                row_has_duplicate = True
                current_row_errors.append(
                    {
                        "row_number": row_idx,
                        "line_number": start_line_num,
                        "field": "__row__",
                        "source_column": None,
                        "code": "DUPLICATE_ROW",
                        "severity": "error",
                        "message": f"중복 행 감지: {first_row}번째 데이터 행({first_line}번째 줄)과 전체 값이 동일합니다.",
                        "raw_value": None,
                        "first_seen_row": first_row,
                        "first_seen_line": first_line,
                    }
                )
            else:
                seen_exact_rows[normalized_tuple] = (row_idx, start_line_num)

        parsed_record: Dict[str, Any] = {}
        sanitized_fields: List[str] = []
        parsed_dates: Dict[str, datetime.date] = {}
        parsed_times: Dict[str, datetime.time] = {}
        valid_phones: Dict[str, str] = {}

        # Scan all mapped columns
        for canonical_field, spec in schema.items():
            col_idx = canonical_to_col_idx.get(canonical_field)
            source_col = canonical_to_source.get(canonical_field)
            if col_idx is None or source_col is None:
                parsed_record[canonical_field] = None
                continue

            raw_cell = raw_row[col_idx] if col_idx < len(raw_row) else ""

            # Check formula injection first on untrimmed raw_cell (catches stealth whitespace/control prefixes)
            if is_formula_injection(raw_cell, spec["type"]):
                formula_injection_count += 1
                sanitized_val, _ = sanitize_preview_value(raw_cell, max_chars=preview_cap)
                sanitized_fields.append(canonical_field)
                parsed_record[canonical_field] = sanitized_val
                current_row_errors.append(
                    {
                        "row_number": row_idx,
                        "line_number": start_line_num,
                        "field": canonical_field,
                        "source_column": source_col,
                        "code": "FORMULA_INJECTION",
                        "severity": "error",
                        "message": f"수식 주입(Formula Injection) 위험 값 감지 및 무력화: '{sanitized_val}'",
                        "raw_value": strip_disallowed_control_chars(raw_cell[:500]),
                    }
                )
                continue

            if has_disallowed_control_char(raw_cell):
                safe_val, _ = sanitize_preview_value(raw_cell, max_chars=preview_cap)
                parsed_record[canonical_field] = safe_val
                current_row_errors.append(
                    {
                        "row_number": row_idx,
                        "line_number": start_line_num,
                        "field": canonical_field,
                        "source_column": source_col,
                        "code": "INVALID_CONTROL_CHAR",
                        "severity": "error",
                        "message": f"허용되지 않는 제어문자가 포함되어 있습니다: '{source_col}' ({canonical_field}).",
                        "raw_value": safe_val,
                    }
                )
                continue

            trimmed = strip_cell_whitespace(raw_cell)

            # Check empty required value
            if not trimmed:
                if spec["required"]:
                    current_row_errors.append(
                        {
                            "row_number": row_idx,
                            "line_number": start_line_num,
                            "field": canonical_field,
                            "source_column": source_col,
                            "code": "EMPTY_REQUIRED_VALUE",
                            "severity": "error",
                            "message": f"필수값 누락: '{source_col}' ({canonical_field}) 값이 비어 있습니다.",
                            "raw_value": raw_cell[:200],
                        }
                    )
                parsed_record[canonical_field] = None
                continue

            # Type-specific validation
            ftype = spec["type"]
            if ftype == "date":
                dt, iso_str = parse_and_validate_date(trimmed)
                if dt is None:
                    safe_trimmed, _ = sanitize_preview_value(trimmed, max_chars=preview_cap)
                    current_row_errors.append(
                        {
                            "row_number": row_idx,
                            "line_number": start_line_num,
                            "field": canonical_field,
                            "source_column": source_col,
                            "code": "INVALID_DATE",
                            "severity": "error",
                            "message": f"잘못된 날짜 형식 또는 존재하지 않는 달력 날짜입니다: '{safe_trimmed}'",
                            "raw_value": raw_cell[:200],
                        }
                    )
                    parsed_record[canonical_field] = safe_trimmed
                else:
                    parsed_dates[canonical_field] = dt
                    parsed_record[canonical_field] = iso_str
            elif ftype == "time":
                tm, tm_str = parse_and_validate_time(trimmed)
                if tm is None:
                    safe_trimmed, _ = sanitize_preview_value(trimmed, max_chars=preview_cap)
                    current_row_errors.append(
                        {
                            "row_number": row_idx,
                            "line_number": start_line_num,
                            "field": canonical_field,
                            "source_column": source_col,
                            "code": "INVALID_TIME",
                            "severity": "error",
                            "message": f"잘못된 시간 형식입니다(HH:MM 필요): '{safe_trimmed}'",
                            "raw_value": raw_cell[:200],
                        }
                    )
                    parsed_record[canonical_field] = safe_trimmed
                else:
                    parsed_times[canonical_field] = tm
                    parsed_record[canonical_field] = tm_str
            elif ftype in ("non_negative_int", "positive_int"):
                if not re.match(r"^-?\d+$", trimmed):
                    safe_trimmed, _ = sanitize_preview_value(trimmed, max_chars=preview_cap)
                    current_row_errors.append(
                        {
                            "row_number": row_idx,
                            "line_number": start_line_num,
                            "field": canonical_field,
                            "source_column": source_col,
                            "code": "INVALID_INTEGER",
                            "severity": "error",
                            "message": f"정수 형식이 아닙니다: '{safe_trimmed}'",
                            "raw_value": raw_cell[:200],
                        }
                    )
                    parsed_record[canonical_field] = safe_trimmed
                else:
                    int_val = int(trimmed)
                    if ftype == "non_negative_int" and int_val < 0:
                        current_row_errors.append(
                            {
                                "row_number": row_idx,
                                "line_number": start_line_num,
                                "field": canonical_field,
                                "source_column": source_col,
                                "code": "NEGATIVE_NUMBER",
                                "severity": "error",
                                "message": f"0 이상의 정수여야 합니다: {int_val}",
                                "raw_value": raw_cell[:200],
                            }
                        )
                    elif ftype == "positive_int" and int_val <= 0:
                        current_row_errors.append(
                            {
                                "row_number": row_idx,
                                "line_number": start_line_num,
                                "field": canonical_field,
                                "source_column": source_col,
                                "code": "NON_POSITIVE_NUMBER",
                                "severity": "error",
                                "message": f"1 이상의 양의 정수여야 합니다: {int_val}",
                                "raw_value": raw_cell[:200],
                            }
                        )
                    parsed_record[canonical_field] = int_val
            elif ftype == "phone":
                if not PHONE_PATTERN.match(trimmed):
                    safe_trimmed, _ = sanitize_preview_value(trimmed, max_chars=preview_cap)
                    current_row_errors.append(
                        {
                            "row_number": row_idx,
                            "line_number": start_line_num,
                            "field": canonical_field,
                            "source_column": source_col,
                            "code": "INVALID_PHONE",
                            "severity": "error",
                            "message": f"유효하지 않은 휴대폰 번호 형식입니다: '{safe_trimmed}'",
                            "raw_value": raw_cell[:200],
                        }
                    )
                    parsed_record[canonical_field] = safe_trimmed
                else:
                    digits = re.sub(r"\D", "", trimmed)
                    if len(digits) == 11:
                        norm_phone = f"{digits[:3]}-{digits[3:7]}-{digits[7:]}"
                    else:
                        norm_phone = f"{digits[:3]}-{digits[3:6]}-{digits[6:]}"
                    parsed_record[canonical_field] = norm_phone
                    valid_phones[canonical_field] = norm_phone
            else:
                sanitized_val, was_sanitized = sanitize_preview_value(trimmed, max_chars=preview_cap)
                if was_sanitized:
                    sanitized_fields.append(canonical_field)
                parsed_record[canonical_field] = sanitized_val

        # Check all unmapped header columns by exact column index (handles duplicate headers safely)
        for unmapped_idx, unmapped_col in unmapped_col_pairs:
            raw_cell = raw_row[unmapped_idx] if unmapped_idx < len(raw_row) else ""
            col_label = unmapped_col or f"col_{unmapped_idx + 1}"
            if is_formula_injection(raw_cell, "str"):
                formula_injection_count += 1
                safe_val, _ = sanitize_preview_value(raw_cell, max_chars=preview_cap)
                current_row_errors.append(
                    {
                        "row_number": row_idx,
                        "line_number": start_line_num,
                        "field": col_label,
                        "source_column": col_label,
                        "code": "FORMULA_INJECTION",
                        "severity": "error",
                        "message": f"매핑되지 않은 열 '{col_label}'에서 수식 주입 위험 값 감지: '{safe_val}'",
                        "raw_value": strip_disallowed_control_chars(raw_cell[:500]),
                    }
                )
            elif has_disallowed_control_char(raw_cell):
                safe_val, _ = sanitize_preview_value(raw_cell, max_chars=preview_cap)
                current_row_errors.append(
                    {
                        "row_number": row_idx,
                        "line_number": start_line_num,
                        "field": col_label,
                        "source_column": col_label,
                        "code": "INVALID_CONTROL_CHAR",
                        "severity": "error",
                        "message": f"매핑되지 않은 열 '{col_label}'에 허용되지 않는 제어문자가 포함되어 있습니다.",
                        "raw_value": safe_val,
                    }
                )

        # Also inspect overflow columns (when len(raw_row) > len(headers)) for formula injection / control chars
        for extra_idx in range(len(headers), len(raw_row)):
            extra_cell = raw_row[extra_idx]
            extra_label = f"__extra_col_{extra_idx + 1}__"
            if is_formula_injection(extra_cell, "str"):
                formula_injection_count += 1
                safe_val, _ = sanitize_preview_value(extra_cell, max_chars=preview_cap)
                current_row_errors.append(
                    {
                        "row_number": row_idx,
                        "line_number": start_line_num,
                        "field": extra_label,
                        "source_column": None,
                        "code": "FORMULA_INJECTION",
                        "severity": "error",
                        "message": f"초과 열({extra_idx + 1}번째 열)에서 수식 주입 위험 값 감지: '{safe_val}'",
                        "raw_value": strip_disallowed_control_chars(extra_cell[:500]),
                    }
                )
            elif has_disallowed_control_char(extra_cell):
                safe_val, _ = sanitize_preview_value(extra_cell, max_chars=preview_cap)
                current_row_errors.append(
                    {
                        "row_number": row_idx,
                        "line_number": start_line_num,
                        "field": extra_label,
                        "source_column": None,
                        "code": "INVALID_CONTROL_CHAR",
                        "severity": "error",
                        "message": f"초과 열({extra_idx + 1}번째 열)에 허용되지 않는 제어문자가 포함되어 있습니다.",
                        "raw_value": safe_val,
                    }
                )

        # Cross-field logical validations & entity-specific duplicate key checks
        if resolved_entity == "member":
            reg_dt = parsed_dates.get("registration_date")
            exp_dt = parsed_dates.get("expiry_date")
            if reg_dt and exp_dt and exp_dt < reg_dt:
                current_row_errors.append(
                    {
                        "row_number": row_idx,
                        "line_number": start_line_num,
                        "field": "expiry_date",
                        "source_column": canonical_to_source.get("expiry_date"),
                        "code": "INVALID_DATE_RANGE",
                        "severity": "error",
                        "message": f"만료일({exp_dt.isoformat()})이 등록일({reg_dt.isoformat()})보다 앞설 수 없습니다.",
                        "raw_value": parsed_record.get("expiry_date"),
                    }
                )

            member_id_val = parsed_record.get("member_id")
            if member_id_val and isinstance(member_id_val, str) and "member_id" not in sanitized_fields:
                if member_id_val in seen_primary_keys:
                    first_row, first_line = seen_primary_keys[member_id_val]
                    row_has_duplicate = True
                    current_row_errors.append(
                        {
                            "row_number": row_idx,
                            "line_number": start_line_num,
                            "field": "member_id",
                            "source_column": canonical_to_source.get("member_id"),
                            "code": "DUPLICATE_KEY",
                            "severity": "error",
                            "message": f"중복 회원번호 '{member_id_val}' 감지 ({first_row}번째 행에서 이미 등장).",
                            "raw_value": member_id_val,
                            "first_seen_row": first_row,
                            "first_seen_line": first_line,
                        }
                    )
                else:
                    seen_primary_keys[member_id_val] = (row_idx, start_line_num)

            name_val = parsed_record.get("name")
            phone_val = valid_phones.get("phone")
            if name_val and phone_val and "name" not in sanitized_fields:
                comp_key = (str(name_val), str(phone_val))
                if comp_key in seen_composite_keys:
                    first_row, first_line = seen_composite_keys[comp_key]
                    if not row_has_duplicate:
                        row_has_duplicate = True
                    current_row_errors.append(
                        {
                            "row_number": row_idx,
                            "line_number": start_line_num,
                            "field": "phone",
                            "source_column": canonical_to_source.get("phone"),
                            "code": "DUPLICATE_MEMBER_PROFILE",
                            "severity": "error",
                            "message": f"동일 이름·연락처 조합({name_val} / {phone_val})이 {first_row}번째 행과 중복됩니다.",
                            "raw_value": phone_val,
                            "first_seen_row": first_row,
                            "first_seen_line": first_line,
                        }
                    )
                else:
                    seen_composite_keys[comp_key] = (row_idx, start_line_num)

        elif resolved_entity == "class":
            start_tm = parsed_times.get("start_time")
            end_tm = parsed_times.get("end_time")
            if start_tm and end_tm and end_tm <= start_tm:
                current_row_errors.append(
                    {
                        "row_number": row_idx,
                        "line_number": start_line_num,
                        "field": "end_time",
                        "source_column": canonical_to_source.get("end_time"),
                        "code": "INVALID_TIME_RANGE",
                        "severity": "error",
                        "message": f"종료시간({parsed_record.get('end_time')})은 시작시간({parsed_record.get('start_time')}) 이후여야 합니다.",
                        "raw_value": parsed_record.get("end_time"),
                    }
                )

            cap_val = parsed_record.get("capacity")
            booked_val = parsed_record.get("booked_count")
            if isinstance(cap_val, int) and isinstance(booked_val, int) and booked_val > cap_val:
                current_row_errors.append(
                    {
                        "row_number": row_idx,
                        "line_number": start_line_num,
                        "field": "booked_count",
                        "source_column": canonical_to_source.get("booked_count"),
                        "code": "CAPACITY_EXCEEDED",
                        "severity": "error",
                        "message": f"예약인원({booked_val})이 수업 정원({cap_val})을 초과했습니다.",
                        "raw_value": str(booked_val),
                    }
                )

            class_id_val = parsed_record.get("class_id")
            if class_id_val and isinstance(class_id_val, str) and "class_id" not in sanitized_fields:
                if class_id_val in seen_primary_keys:
                    first_row, first_line = seen_primary_keys[class_id_val]
                    row_has_duplicate = True
                    current_row_errors.append(
                        {
                            "row_number": row_idx,
                            "line_number": start_line_num,
                            "field": "class_id",
                            "source_column": canonical_to_source.get("class_id"),
                            "code": "DUPLICATE_KEY",
                            "severity": "error",
                            "message": f"중복 수업코드 '{class_id_val}' 감지 ({first_row}번째 행에서 이미 등장).",
                            "raw_value": class_id_val,
                            "first_seen_row": first_row,
                            "first_seen_line": first_line,
                        }
                    )
                else:
                    seen_primary_keys[class_id_val] = (row_idx, start_line_num)

            c_date = parsed_record.get("class_date")
            s_time = parsed_record.get("start_time")
            instr = parsed_record.get("instructor")
            if (
                c_date
                and s_time
                and instr
                and "class_date" in parsed_dates
                and "start_time" in parsed_times
                and "instructor" not in sanitized_fields
            ):
                sched_key = (str(c_date), str(s_time), str(instr))
                if sched_key in seen_composite_keys:
                    first_row, first_line = seen_composite_keys[sched_key]
                    row_has_duplicate = True
                    current_row_errors.append(
                        {
                            "row_number": row_idx,
                            "line_number": start_line_num,
                            "field": "instructor",
                            "source_column": canonical_to_source.get("instructor"),
                            "code": "DUPLICATE_CLASS_SCHEDULE",
                            "severity": "error",
                            "message": f"동일 강사·수업일자·시작시간({instr} / {c_date} {s_time})이 {first_row}번째 행과 중복됩니다.",
                            "raw_value": instr,
                            "first_seen_row": first_row,
                            "first_seen_line": first_line,
                        }
                    )
                else:
                    seen_composite_keys[sched_key] = (row_idx, start_line_num)

        if row_has_duplicate:
            duplicate_rows += 1

        is_row_valid = len(current_row_errors) == 0 and not header_level_has_errors
        if is_row_valid:
            valid_rows += 1
        else:
            invalid_rows += 1

        row_errors.extend(current_row_errors)

        if len(preview_rows) < effective_max_preview:
            preview_rows.append(
                {
                    "row_number": row_idx,
                    "line_number": start_line_num,
                    "valid": is_row_valid,
                    "formula_sanitized": len(sanitized_fields) > 0,
                    "sanitized_fields": sanitized_fields,
                    "error_codes": [e["code"] for e in current_row_errors],
                    "data": parsed_record,
                }
            )

    error_counts_by_code: Dict[str, int] = {}
    for err in row_errors:
        code = err["code"]
        error_counts_by_code[code] = error_counts_by_code.get(code, 0) + 1

    can_import = len(row_errors) == 0 and total_rows > 0

    return {
        "dry_run": True,
        "db_write_performed": False,
        "entity_type": resolved_entity,
        "encoding_detected": encoding_detected,
        "column_mapping": canonical_to_source,
        "unmapped_columns": unmapped_headers,
        "missing_required_columns": missing_required,
        "summary": {
            "total_rows": total_rows,
            "valid_rows": valid_rows,
            "invalid_rows": invalid_rows,
            "duplicate_rows": duplicate_rows,
            "formula_injection_count": formula_injection_count,
            "error_counts_by_code": error_counts_by_code,
            "can_import": can_import,
        },
        "row_errors": row_errors,
        "preview_rows": preview_rows,
    }


def _parse_json_mapping_no_dup_keys(raw_json: str) -> Dict[str, str]:
    """Parse a JSON mapping object while rejecting duplicate keys and non-string values."""

    def _no_dup_pairs_hook(pairs: List[Tuple[str, Any]]) -> Dict[str, str]:
        result: Dict[str, str] = {}
        for k, v in pairs:
            if not isinstance(k, str) or not isinstance(v, str):
                raise MappingConfigError(f"매핑 키와 값은 모두 문자열이어야 합니다: {k!r}: {v!r}")
            if k in result:
                raise MappingConfigError(f"매핑 설정에 중복 키 '{k}'가 포함되어 있습니다.")
            result[k] = v
        return result

    try:
        parsed = json.loads(raw_json, object_pairs_hook=_no_dup_pairs_hook)
    except json.JSONDecodeError as exc:
        raise MappingConfigError(f"매핑 JSON 구문 오류: {exc}") from exc

    if not isinstance(parsed, dict):
        raise MappingConfigError("매핑 JSON은 객체({key: value}) 형식이어야 합니다.")
    return parsed


def load_mapping_argument(mapping_arg: Optional[str]) -> Optional[Dict[str, str]]:
    """Parse --mapping either as a path to a JSON file, an inline JSON object, or key=value pairs."""
    if not mapping_arg:
        return None
    candidate_path = pathlib.Path(mapping_arg)
    try:
        is_existing = candidate_path.exists()
        is_reg_file = candidate_path.is_file() if is_existing else False
    except (OSError, ValueError):
        is_existing = False
        is_reg_file = False

    if is_existing and not is_reg_file:
        raise MappingConfigError(f"매핑 경로가 일반 파일이 아닙니다: {mapping_arg}")

    if is_reg_file:
        try:
            raw_text = candidate_path.read_text(encoding="utf-8-sig")
        except UnicodeDecodeError as exc:
            raise MappingConfigError(f"매핑 파일 UTF-8 디코딩 실패: {exc}") from exc
        except OSError as exc:
            raise MappingConfigError(f"매핑 파일 읽기 실패: {exc}") from exc
        return _parse_json_mapping_no_dup_keys(raw_text)

    stripped = mapping_arg.strip()
    if not stripped:
        return None
    if stripped.startswith("{") or stripped.startswith("["):
        return _parse_json_mapping_no_dup_keys(stripped)

    mapping: Dict[str, str] = {}
    for pair in stripped.split(","):
        token = pair.strip()
        if not token:
            continue
        if "=" not in token:
            raise MappingConfigError(f"잘못된 매핑 항목 형식입니다('key=value' 필요): '{token}'")
        k, v = token.split("=", 1)
        k_clean, v_clean = k.strip(), v.strip()
        if not k_clean or not v_clean:
            raise MappingConfigError(f"매핑 키 또는 값이 비어 있습니다: '{token}'")
        if k_clean in mapping:
            raise MappingConfigError(f"인라인 매핑에 중복 키 '{k_clean}'가 포함되어 있습니다.")
        mapping[k_clean] = v_clean
    return mapping


def _positive_int_arg(raw: str) -> int:
    try:
        value = int(raw, 10)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(f"정수 값이 필요합니다: {raw!r}") from exc
    if value < 1:
        raise argparse.ArgumentTypeError(f"1 이상의 양의 정수여야 합니다: {value}")
    return value


def _non_negative_int_arg(raw: str) -> int:
    try:
        value = int(raw, 10)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(f"정수 값이 필요합니다: {raw!r}") from exc
    if value < 0:
        raise argparse.ArgumentTypeError(f"0 이상의 정수여야 합니다: {value}")
    return value


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="pilates_csv_import",
        description="필라테스 회원/수업 CSV 가져오기 Dry-Run 검증 CLI (DB 쓰기 없음)",
    )
    parser.add_argument("csv_file", help="검증할 CSV 파일 경로")
    parser.add_argument(
        "--type",
        choices=["member", "class"],
        default=None,
        help="검증 대상 엔티티 유형 (지정하지 않으면 헤더 기반 자동 감지)",
    )
    parser.add_argument(
        "--mapping",
        default=None,
        help="열 매핑 JSON 파일 경로, 인라인 JSON 문자열, 또는 'canonical=헤더명' 목록",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="안전한 미리보기 JSON을 저장할 파일 경로 (미지정 시 표준 출력)",
    )
    parser.add_argument(
        "--max-preview",
        type=_non_negative_int_arg,
        default=DEFAULT_MAX_PREVIEW_ROWS,
        help=f"미리보기 JSON에 포함할 최대 행 수 (기본값: {DEFAULT_MAX_PREVIEW_ROWS})",
    )
    parser.add_argument(
        "--max-rows",
        type=_positive_int_arg,
        default=DEFAULT_MAX_ROWS,
        help=f"검증할 최대 데이터 행 수 제한 (기본값: {DEFAULT_MAX_ROWS})",
    )
    parser.add_argument(
        "--max-field-chars",
        type=_positive_int_arg,
        default=DEFAULT_MAX_FIELD_CHARS,
        help=f"단일 셀 최대 허용 문자 수 제한 (기본값: {DEFAULT_MAX_FIELD_CHARS})",
    )
    parser.add_argument(
        "--max-bytes",
        type=_positive_int_arg,
        default=DEFAULT_MAX_FILE_BYTES,
        help=f"CSV 파일 최대 허용 바이트 크기 제한 (기본값: {DEFAULT_MAX_FILE_BYTES})",
    )
    parser.add_argument(
        "--fail-on-error",
        action="store_true",
        help="검증 오류가 1건이라도 있으면 종료 코드 1 반환",
    )
    return parser


def _emit_cli_error(message: str) -> None:
    error_payload = {
        "dry_run": True,
        "db_write_performed": False,
        "error": message,
    }
    print(json.dumps(error_payload, ensure_ascii=False, indent=2), file=sys.stderr)


def _paths_refer_to_same_file(first_path: pathlib.Path, second_path: pathlib.Path) -> bool:
    """Return True if two paths point to the same underlying file (inode/samefile or resolved path)."""
    try:
        if os.path.samefile(first_path, second_path):
            return True
    except (OSError, ValueError):
        pass
    try:
        return first_path.resolve() == second_path.resolve()
    except (OSError, ValueError):
        return False


def _write_or_print_json(payload: Dict[str, Any], output_path: Optional[str]) -> None:
    json_text = json.dumps(payload, ensure_ascii=False, indent=2)
    if output_path is not None:
        if not output_path.strip():
            raise OSError("출력 파일 경로가 비어 있습니다.")
        out_path = pathlib.Path(output_path)
        if out_path.is_dir():
            raise IsADirectoryError(f"출력 경로가 디렉터리입니다: {output_path}")
        parent_dir = out_path.parent
        parent_dir.mkdir(parents=True, exist_ok=True)
        encoded_bytes = (json_text + "\n").encode("utf-8")
        tmp_path: Optional[pathlib.Path] = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="wb",
                dir=str(parent_dir),
                prefix=".pilates_csv_preview_",
                suffix=".tmp",
                delete=False,
            ) as tmp_file:
                tmp_path = pathlib.Path(tmp_file.name)
                tmp_file.write(encoded_bytes)
                tmp_file.flush()
            os.replace(str(tmp_path), str(out_path))
            tmp_path = None
        finally:
            if tmp_path is not None:
                try:
                    tmp_path.unlink(missing_ok=True)
                except OSError:
                    pass
    else:
        print(json_text)


def _try_emit_result(payload: Dict[str, Any], output_path: Optional[str]) -> bool:
    try:
        _write_or_print_json(payload, output_path)
        return True
    except (OSError, ValueError) as exc:
        _emit_cli_error(f"결과 JSON 출력 실패: {exc}")
        return False


def main(argv: Optional[List[str]] = None) -> int:
    parser = build_arg_parser()
    args = parser.parse_args(argv)

    if not args.csv_file or not args.csv_file.strip():
        _emit_cli_error("CSV 파일 경로가 비어 있습니다.")
        return 2

    csv_path = pathlib.Path(args.csv_file)
    try:
        is_dir = csv_path.is_dir()
        is_file = False if is_dir else csv_path.is_file()
    except (OSError, ValueError) as exc:
        _emit_cli_error(f"CSV 파일 경로를 확인할 수 없습니다: {args.csv_file} ({exc})")
        return 2

    if is_dir:
        _emit_cli_error(f"입력 경로가 파일이 아닌 디렉터리입니다: {args.csv_file}")
        return 2

    if not is_file:
        _emit_cli_error(f"CSV 파일을 찾을 수 없습니다: {args.csv_file}")
        return 2

    if args.output is not None:
        if not args.output.strip():
            _emit_cli_error("출력 파일 경로가 비어 있습니다.")
            return 2
        try:
            out_path = pathlib.Path(args.output)
            if out_path.is_dir():
                _emit_cli_error(f"출력 경로가 파일이 아닌 디렉터리입니다: {args.output}")
                return 2
        except (OSError, ValueError) as exc:
            _emit_cli_error(f"유효하지 않은 출력 파일 경로입니다: {args.output} ({exc})")
            return 2

        if _paths_refer_to_same_file(csv_path, out_path):
            _emit_cli_error(
                f"입출력 경로 충돌: 출력 경로('{args.output}')가 원본 입력 CSV('{args.csv_file}')와 같은 파일을 가리킵니다."
            )
            return 2

        if args.mapping:
            try:
                mapping_candidate = pathlib.Path(args.mapping)
                if mapping_candidate.is_file() and _paths_refer_to_same_file(mapping_candidate, out_path):
                    _emit_cli_error(
                        f"입출력 경로 충돌: 출력 경로('{args.output}')가 매핑 파일('{args.mapping}')과 같은 파일을 가리킵니다."
                    )
                    return 2
            except (OSError, ValueError):
                pass

    try:
        custom_mapping = load_mapping_argument(args.mapping)
    except MappingConfigError as exc:
        result = _empty_result(
            entity_type=args.type,
            encoding_detected="UNCHECKED",
            error_item={
                "row_number": 0,
                "line_number": 1,
                "field": "__mapping__",
                "source_column": None,
                "code": "MAPPING_CONFLICT",
                "severity": "error",
                "message": str(exc),
                "raw_value": args.mapping,
            },
        )
        if not _try_emit_result(result, args.output):
            return 2
        return 1 if args.fail_on_error else 2

    try:
        file_size = csv_path.stat().st_size
    except OSError as exc:
        _emit_cli_error(f"CSV 파일 상태 확인 실패: {args.csv_file} ({exc})")
        return 2

    if args.max_bytes > 0 and file_size > args.max_bytes:
        result = _empty_result(
            entity_type=args.type,
            encoding_detected="UNCHECKED",
            error_item={
                "row_number": 0,
                "line_number": 1,
                "field": "__file__",
                "source_column": None,
                "code": "FILE_TOO_LARGE",
                "severity": "error",
                "message": f"CSV 파일 크기({file_size} bytes)가 최대 허용 크기({args.max_bytes} bytes)를 초과했습니다.",
                "raw_value": None,
            },
        )
        if not _try_emit_result(result, args.output):
            return 2
        return 1 if args.fail_on_error else 0

    try:
        raw_bytes = csv_path.read_bytes()
    except OSError as exc:
        _emit_cli_error(f"CSV 파일 읽기 실패: {args.csv_file} ({exc})")
        return 2

    result = validate_csv_content(
        raw_bytes=raw_bytes,
        entity_type=args.type,
        custom_mapping=custom_mapping,
        max_preview_rows=args.max_preview,
        max_rows=args.max_rows,
        max_field_chars=args.max_field_chars,
        max_file_bytes=args.max_bytes,
    )

    if not _try_emit_result(result, args.output):
        return 2

    if args.fail_on_error and not result["summary"]["can_import"]:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
