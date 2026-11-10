#!/usr/bin/env python3
"""
Pilates Member & Class CSV Import Dry-Run Validator CLI (pilates-csv-import).
Standard-library-only implementation supporting:
- UTF-8 and UTF-8-BOM detection & decoding
- Multi-line quoted fields, escaped quotes, and Korean/English headers
- Configurable & automatic column mapping
- Invalid calendar date & time range validation
- Duplicate row detection (key-based & exact row duplicates)
- Empty required value & numeric constraint checks
- Formula injection (CSV injection) detection & preview sanitization
- Row-number & physical line-number error reporting
- Safe dry-run preview JSON generation (strictly zero DB writes)
"""

from __future__ import annotations

import argparse
import csv
import datetime
import io
import json
import pathlib
import re
import sys
from typing import Any, Dict, List, Optional, Tuple


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
DATE_PATTERN = re.compile(r"^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$")
TIME_PATTERN = re.compile(r"^(\d{1,2}):(\d{2})(?::(\d{2}))?$")
PHONE_PATTERN = re.compile(r"^01[016789]-?\d{3,4}-?\d{4}$")


def normalize_header_token(header: str) -> str:
    """Normalize a column header token for matching (strip BOM, whitespace, underscores)."""
    cleaned = header.lstrip("\ufeff").strip()
    return re.sub(r"[\s_\-()]+", "", cleaned).lower()


def detect_encoding_and_decode(raw_bytes: bytes) -> Tuple[str, str]:
    """Detect UTF-8 BOM vs plain UTF-8 and return (encoding_name, decoded_text)."""
    if raw_bytes.startswith(b"\xef\xbb\xbf"):
        return "UTF-8-BOM", raw_bytes.decode("utf-8-sig")
    return "UTF-8", raw_bytes.decode("utf-8")


def detect_entity_type(headers: List[str]) -> str:
    """Auto-detect whether headers represent 'member' or 'class' CSV."""
    norm_headers = {normalize_header_token(h) for h in headers if h}
    member_score = 0
    class_score = 0
    for field_spec in MEMBER_SCHEMA.values():
        if any(normalize_header_token(a) in norm_headers for a in field_spec["aliases"]):
            member_score += 1
    for field_spec in CLASS_SCHEMA.values():
        if any(normalize_header_token(a) in norm_headers for a in field_spec["aliases"]):
            class_score += 1
    return "class" if class_score > member_score else "member"


def resolve_column_mapping(
    headers: List[str],
    entity_type: str,
    custom_mapping: Optional[Dict[str, str]] = None,
) -> Tuple[Dict[str, str], List[str], List[str]]:
    """
    Map CSV source headers to canonical schema fields.
    custom_mapping can map either {source_header: canonical_field} or {canonical_field: source_header}.
    Returns:
        canonical_to_source: {canonical_field: source_header}
        unmapped_headers: list of source headers not mapped to any canonical field
        missing_required_fields: list of required canonical fields not mapped
    """
    schema = SCHEMAS[entity_type]
    canonical_to_source: Dict[str, str] = {}
    used_headers = set()

    norm_to_actual = {normalize_header_token(h): h for h in headers}

    if custom_mapping:
        for k, v in custom_mapping.items():
            if k in schema and v in headers:
                canonical_to_source[k] = v
                used_headers.add(v)
            elif v in schema and k in headers:
                canonical_to_source[v] = k
                used_headers.add(k)
            else:
                nk, nv = normalize_header_token(k), normalize_header_token(v)
                if k in schema and nv in norm_to_actual:
                    actual = norm_to_actual[nv]
                    canonical_to_source[k] = actual
                    used_headers.add(actual)
                elif v in schema and nk in norm_to_actual:
                    actual = norm_to_actual[nk]
                    canonical_to_source[v] = actual
                    used_headers.add(actual)

    for canonical_field, spec in schema.items():
        if canonical_field in canonical_to_source:
            continue
        for alias in spec["aliases"]:
            norm_alias = normalize_header_token(alias)
            if norm_alias in norm_to_actual:
                actual_header = norm_to_actual[norm_alias]
                if actual_header not in used_headers:
                    canonical_to_source[canonical_field] = actual_header
                    used_headers.add(actual_header)
                    break

    unmapped_headers = [h for h in headers if h not in used_headers]
    missing_required = [
        field
        for field, spec in schema.items()
        if spec["required"] and field not in canonical_to_source
    ]
    return canonical_to_source, unmapped_headers, missing_required


def is_formula_injection(value: str, field_type: str = "str") -> bool:
    """
    Check if a cell value poses a CSV / spreadsheet formula injection risk.
    Any value starting with =, +, -, @, tab, or carriage return (either directly
    or after leading spaces) is treated as a formula injection attempt, except
    pure negative integers in numeric fields if strictly numeric (though negative
    numbers are still invalid for non-negative Pilates counts).
    """
    if not value:
        return False
    if value[0] in ("\t", "\r"):
        return True
    stripped_leading = value.lstrip(" ")
    if not stripped_leading:
        return False
    first_char = stripped_leading[0]
    if first_char in ("=", "+", "@", "\t", "\r"):
        return True
    if first_char == "-":
        if field_type in ("non_negative_int", "positive_int") and re.match(r"^-\d+$", stripped_leading):
            return False
        return True
    return False


def sanitize_preview_value(value: str) -> Tuple[str, bool]:
    """
    Sanitize a string for safe preview output so spreadsheet/UI consumers cannot execute formulas.
    Normalizes CRLF to LF and prefixes dangerous leading characters with a single quote.
    """
    normalized = value.replace("\r\n", "\n")
    if not normalized:
        return normalized, False
    if normalized[0] in ("\t", "\r") or normalized.lstrip(" ").startswith(("=", "+", "-", "@", "\t", "\r")):
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
    """Validate 24-hour time (HH:MM or HH:MM:SS) and return (datetime.time, HH:MM)."""
    match = TIME_PATTERN.match(value.strip())
    if not match:
        return None, None
    hour, minute = int(match.group(1)), int(match.group(2))
    second = int(match.group(3)) if match.group(3) is not None else 0
    try:
        tm = datetime.time(hour, minute, second)
        return tm, f"{tm.hour:02d}:{tm.minute:02d}"
    except ValueError:
        return None, None


def check_unclosed_quotes(text: str) -> Optional[int]:
    """
    Detect unclosed double quotes in raw CSV text and return the 1-based line number
    where the unclosed quote started (or None if balanced).
    """
    in_quotes = False
    quote_start_line = 1
    line_num = 1
    i = 0
    n = len(text)
    while i < n:
        ch = text[i]
        if ch == '"':
            if in_quotes and i + 1 < n and text[i + 1] == '"':
                i += 2
                continue
            in_quotes = not in_quotes
            if in_quotes:
                quote_start_line = line_num
        elif ch == "\n":
            line_num += 1
        i += 1
    return quote_start_line if in_quotes else None


def validate_csv_content(
    raw_bytes: bytes,
    entity_type: Optional[str] = None,
    custom_mapping: Optional[Dict[str, str]] = None,
    max_preview_rows: int = 50,
) -> Dict[str, Any]:
    """
    Core dry-run CSV validation pipeline. Never writes to any database.
    Returns a structured dictionary suitable for JSON serialization.
    """
    row_errors: List[Dict[str, Any]] = []
    preview_rows: List[Dict[str, Any]] = []

    try:
        encoding_detected, decoded_text = detect_encoding_and_decode(raw_bytes)
    except UnicodeDecodeError as exc:
        return {
            "dry_run": True,
            "db_write_performed": False,
            "entity_type": entity_type or "unknown",
            "encoding_detected": "INVALID",
            "column_mapping": {},
            "unmapped_columns": [],
            "missing_required_columns": [],
            "summary": {
                "total_rows": 0,
                "valid_rows": 0,
                "invalid_rows": 0,
                "duplicate_rows": 0,
                "formula_injection_count": 0,
                "error_counts_by_code": {"ENCODING_ERROR": 1},
                "can_import": False,
            },
            "row_errors": [
                {
                    "row_number": 0,
                    "line_number": 1,
                    "field": "__file__",
                    "source_column": None,
                    "code": "ENCODING_ERROR",
                    "severity": "error",
                    "message": f"UTF-8 디코딩 실패: {exc}",
                    "raw_value": None,
                }
            ],
            "preview_rows": [],
        }

    unclosed_line = check_unclosed_quotes(decoded_text)
    if unclosed_line is not None:
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
                "error_counts_by_code": {"MALFORMED_CSV_QUOTE": 1},
                "can_import": False,
            },
            "row_errors": [
                {
                    "row_number": 0,
                    "line_number": unclosed_line,
                    "field": "__csv__",
                    "source_column": None,
                    "code": "MALFORMED_CSV_QUOTE",
                    "severity": "error",
                    "message": f"{unclosed_line}번째 줄에서 시작된 인용부호(\")가 닫히지 않았습니다.",
                    "raw_value": None,
                }
            ],
            "preview_rows": [],
        }

    stream = io.StringIO(decoded_text, newline="")
    reader = csv.reader(stream, delimiter=",", quotechar='"', strict=False)

    try:
        raw_headers = next(reader)
    except StopIteration:
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
                "error_counts_by_code": {"EMPTY_FILE": 1},
                "can_import": False,
            },
            "row_errors": [
                {
                    "row_number": 0,
                    "line_number": 1,
                    "field": "__file__",
                    "source_column": None,
                    "code": "EMPTY_FILE",
                    "severity": "error",
                    "message": "CSV 파일이 비어 있거나 헤더 행이 없습니다.",
                    "raw_value": None,
                }
            ],
            "preview_rows": [],
        }

    headers = [h.lstrip("\ufeff").strip() for h in raw_headers]
    resolved_entity = entity_type or detect_entity_type(headers)
    schema = SCHEMAS[resolved_entity]

    canonical_to_source, unmapped_headers, missing_required = resolve_column_mapping(
        headers, resolved_entity, custom_mapping
    )
    header_index_map = {h: idx for idx, h in enumerate(headers)}

    for missing_field in missing_required:
        row_errors.append(
            {
                "row_number": 0,
                "line_number": 1,
                "field": missing_field,
                "source_column": None,
                "code": "MISSING_REQUIRED_COLUMN",
                "severity": "error",
                "message": f"필수 열 매핑 누락: '{missing_field}'에 해당하는 헤더를 찾을 수 없습니다.",
                "raw_value": None,
            }
        )

    seen_primary_keys: Dict[str, int] = {}
    seen_composite_keys: Dict[Tuple[str, ...], int] = {}
    seen_exact_rows: Dict[Tuple[str, ...], int] = {}

    total_rows = 0
    valid_rows = 0
    invalid_rows = 0
    duplicate_rows = 0
    formula_injection_count = 0

    prev_line_num = reader.line_num

    for row_idx, raw_row in enumerate(reader, start=1):
        start_line_num = prev_line_num + 1
        prev_line_num = reader.line_num
        total_rows += 1
        current_row_errors: List[Dict[str, Any]] = []
        row_has_duplicate = False

        if len(raw_row) != len(headers):
            current_row_errors.append(
                {
                    "row_number": row_idx,
                    "line_number": start_line_num,
                    "field": "__row__",
                    "source_column": None,
                    "code": "COLUMN_COUNT_MISMATCH",
                    "severity": "error",
                    "message": f"열 개수 불일치: 헤더는 {len(headers)}개이나 데이터 행은 {len(raw_row)}개입니다.",
                    "raw_value": json.dumps(raw_row, ensure_ascii=False),
                }
            )

        normalized_tuple = tuple(cell.strip() for cell in raw_row)
        if any(normalized_tuple):
            if normalized_tuple in seen_exact_rows:
                first_row = seen_exact_rows[normalized_tuple]
                row_has_duplicate = True
                current_row_errors.append(
                    {
                        "row_number": row_idx,
                        "line_number": start_line_num,
                        "field": "__row__",
                        "source_column": None,
                        "code": "DUPLICATE_ROW",
                        "severity": "error",
                        "message": f"중복 행 감지: {first_row}번째 데이터 행과 전체 값이 동일합니다.",
                        "raw_value": None,
                        "first_seen_row": first_row,
                    }
                )
            else:
                seen_exact_rows[normalized_tuple] = row_idx

        parsed_record: Dict[str, Any] = {}
        sanitized_fields: List[str] = []
        parsed_dates: Dict[str, datetime.date] = {}
        parsed_times: Dict[str, datetime.time] = {}

        for canonical_field, spec in schema.items():
            source_col = canonical_to_source.get(canonical_field)
            if source_col is None:
                parsed_record[canonical_field] = None
                continue
            col_idx = header_index_map[source_col]
            raw_cell = raw_row[col_idx] if col_idx < len(raw_row) else ""
            trimmed = raw_cell.strip()

            if is_formula_injection(raw_cell, spec["type"]):
                formula_injection_count += 1
                sanitized_val, _ = sanitize_preview_value(raw_cell)
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
                        "message": f"수식 주입(Formula Injection) 위험 값 감지 및 무력화: '{raw_cell}'",
                        "raw_value": raw_cell,
                    }
                )
                continue

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
                            "raw_value": raw_cell,
                        }
                    )
                parsed_record[canonical_field] = None
                continue

            ftype = spec["type"]
            if ftype == "date":
                dt, iso_str = parse_and_validate_date(trimmed)
                if dt is None:
                    current_row_errors.append(
                        {
                            "row_number": row_idx,
                            "line_number": start_line_num,
                            "field": canonical_field,
                            "source_column": source_col,
                            "code": "INVALID_DATE",
                            "severity": "error",
                            "message": f"잘못된 날짜 형식 또는 존재하지 않는 달력 날짜입니다: '{trimmed}'",
                            "raw_value": raw_cell,
                        }
                    )
                    parsed_record[canonical_field] = trimmed
                else:
                    parsed_dates[canonical_field] = dt
                    parsed_record[canonical_field] = iso_str
            elif ftype == "time":
                tm, tm_str = parse_and_validate_time(trimmed)
                if tm is None:
                    current_row_errors.append(
                        {
                            "row_number": row_idx,
                            "line_number": start_line_num,
                            "field": canonical_field,
                            "source_column": source_col,
                            "code": "INVALID_TIME",
                            "severity": "error",
                            "message": f"잘못된 시간 형식입니다(HH:MM 필요): '{trimmed}'",
                            "raw_value": raw_cell,
                        }
                    )
                    parsed_record[canonical_field] = trimmed
                else:
                    parsed_times[canonical_field] = tm
                    parsed_record[canonical_field] = tm_str
            elif ftype in ("non_negative_int", "positive_int"):
                if not re.match(r"^-?\d+$", trimmed):
                    current_row_errors.append(
                        {
                            "row_number": row_idx,
                            "line_number": start_line_num,
                            "field": canonical_field,
                            "source_column": source_col,
                            "code": "INVALID_INTEGER",
                            "severity": "error",
                            "message": f"정수 형식이 아닙니다: '{trimmed}'",
                            "raw_value": raw_cell,
                        }
                    )
                    parsed_record[canonical_field] = trimmed
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
                                "raw_value": raw_cell,
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
                                "raw_value": raw_cell,
                            }
                        )
                    parsed_record[canonical_field] = int_val
            elif ftype == "phone":
                if not PHONE_PATTERN.match(trimmed):
                    current_row_errors.append(
                        {
                            "row_number": row_idx,
                            "line_number": start_line_num,
                            "field": canonical_field,
                            "source_column": source_col,
                            "code": "INVALID_PHONE",
                            "severity": "error",
                            "message": f"유효하지 않은 휴대폰 번호 형식입니다: '{trimmed}'",
                            "raw_value": raw_cell,
                        }
                    )
                    parsed_record[canonical_field] = trimmed
                else:
                    digits = re.sub(r"\D", "", trimmed)
                    if len(digits) == 11:
                        norm_phone = f"{digits[:3]}-{digits[3:7]}-{digits[7:]}"
                    else:
                        norm_phone = f"{digits[:3]}-{digits[3:6]}-{digits[6:]}"
                    parsed_record[canonical_field] = norm_phone
            else:
                sanitized_val, was_sanitized = sanitize_preview_value(trimmed)
                if was_sanitized:
                    sanitized_fields.append(canonical_field)
                parsed_record[canonical_field] = sanitized_val

        for unmapped_col in unmapped_headers:
            col_idx = header_index_map[unmapped_col]
            raw_cell = raw_row[col_idx] if col_idx < len(raw_row) else ""
            if is_formula_injection(raw_cell, "str"):
                formula_injection_count += 1
                current_row_errors.append(
                    {
                        "row_number": row_idx,
                        "line_number": start_line_num,
                        "field": unmapped_col,
                        "source_column": unmapped_col,
                        "code": "FORMULA_INJECTION",
                        "severity": "error",
                        "message": f"매핑되지 않은 열 '{unmapped_col}'에서 수식 주입 위험 값 감지: '{raw_cell}'",
                        "raw_value": raw_cell,
                    }
                )

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
                    first_row = seen_primary_keys[member_id_val]
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
                        }
                    )
                else:
                    seen_primary_keys[member_id_val] = row_idx

            name_val = parsed_record.get("name")
            phone_val = parsed_record.get("phone")
            if name_val and phone_val:
                comp_key = (str(name_val), str(phone_val))
                if comp_key in seen_composite_keys:
                    first_row = seen_composite_keys[comp_key]
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
                        }
                    )
                else:
                    seen_composite_keys[comp_key] = row_idx

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
                    first_row = seen_primary_keys[class_id_val]
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
                        }
                    )
                else:
                    seen_primary_keys[class_id_val] = row_idx

            c_date = parsed_record.get("class_date")
            s_time = parsed_record.get("start_time")
            instr = parsed_record.get("instructor")
            if c_date and s_time and instr and "class_date" in parsed_dates and "start_time" in parsed_times:
                sched_key = (str(c_date), str(s_time), str(instr))
                if sched_key in seen_composite_keys:
                    first_row = seen_composite_keys[sched_key]
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
                        }
                    )
                else:
                    seen_composite_keys[sched_key] = row_idx

        if row_has_duplicate:
            duplicate_rows += 1

        is_row_valid = len(current_row_errors) == 0 and len(missing_required) == 0
        if is_row_valid:
            valid_rows += 1
        else:
            invalid_rows += 1

        row_errors.extend(current_row_errors)

        if len(preview_rows) < max_preview_rows:
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


def load_mapping_argument(mapping_arg: Optional[str]) -> Optional[Dict[str, str]]:
    """Parse --mapping either as a path to a JSON file, an inline JSON object, or key=value pairs."""
    if not mapping_arg:
        return None
    candidate_path = pathlib.Path(mapping_arg)
    if candidate_path.is_file():
        return json.loads(candidate_path.read_text(encoding="utf-8-sig"))
    stripped = mapping_arg.strip()
    if stripped.startswith("{"):
        return json.loads(stripped)
    mapping: Dict[str, str] = {}
    for pair in stripped.split(","):
        if "=" in pair:
            k, v = pair.split("=", 1)
            mapping[k.strip()] = v.strip()
    return mapping


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
        type=int,
        default=50,
        help="미리보기 JSON에 포함할 최대 행 수 (기본값: 50)",
    )
    parser.add_argument(
        "--fail-on-error",
        action="store_true",
        help="검증 오류가 1건이라도 있으면 종료 코드 1 반환",
    )
    return parser


def main(argv: Optional[List[str]] = None) -> int:
    parser = build_arg_parser()
    args = parser.parse_args(argv)

    csv_path = pathlib.Path(args.csv_file)
    if not csv_path.is_file():
        error_payload = {
            "dry_run": True,
            "db_write_performed": False,
            "error": f"CSV 파일을 찾을 수 없습니다: {args.csv_file}",
        }
        print(json.dumps(error_payload, ensure_ascii=False, indent=2), file=sys.stderr)
        return 2

    custom_mapping = load_mapping_argument(args.mapping)
    raw_bytes = csv_path.read_bytes()
    result = validate_csv_content(
        raw_bytes=raw_bytes,
        entity_type=args.type,
        custom_mapping=custom_mapping,
        max_preview_rows=args.max_preview,
    )

    json_text = json.dumps(result, ensure_ascii=False, indent=2)
    if args.output:
        out_path = pathlib.Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json_text + "\n", encoding="utf-8")
    else:
        print(json_text)

    if args.fail_on_error and not result["summary"]["can_import"]:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
