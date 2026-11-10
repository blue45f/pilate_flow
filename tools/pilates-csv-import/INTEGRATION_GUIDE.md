# 필라테스 회원/수업 CSV 가져오기 Dry-Run 검증기 통합 안내 (`pilates-csv-import`)

## 1. 개요 및 격리 원칙
- **목적**: 필라테스 센터의 회원(`member`) 및 수업(`class`) CSV 파일을 실제 DB에 반영하기 전, 인코딩(UTF-8/UTF-8 BOM 및 이중 BOM)·인용부호/다중 줄 개행·한글 헤더 매핑·중복/빈 헤더·매핑 충돌·필드/행/파일 크기 제한·달력 날짜/시간·중복행·필수값 누락·숨은 수식 주입(공백·탭·개행·유니코드 공백·제로폭 문자·제어문자 우회 포함)을 검증하고 안전한 미리보기 JSON(`dry_run: true`, `db_write_performed: false`)을 생성합니다.
- **무결성 및 격리**: 외부 패키지나 DB 연결 없이 Python 3 표준 라이브러리만 사용하며, `tools/pilates-csv-import/` 내부에서만 독립 동작합니다.

## 2. CLI 실행 방법
```bash
# 회원 CSV 검증 및 표준 출력 미리보기
python3 src/pilates_csv_import.py fixtures/members_valid_bom.csv --type member --fail-on-error

# 수업 CSV 검증 및 미리보기 JSON 파일 저장
python3 src/pilates_csv_import.py fixtures/classes_mixed_errors.csv --type class --output outputs/classes_preview.json

# 크기·행·셀 길이 보호 제한 옵션 지정 실행
python3 src/pilates_csv_import.py fixtures/members_edge_hardening.csv --max-bytes 10485760 --max-rows 10000 --max-field-chars 10000

# 사용자 정의 헤더 CSV에 열 매핑(key=value 또는 JSON 파일) 적용
python3 src/pilates_csv_import.py <custom_headers.csv> --mapping fixtures/custom_mapping.json --fail-on-error
```

## 3. 주요 오류 코드 요약
- **파일/인코딩/크기 보호**: `FILE_TOO_LARGE`, `ENCODING_ERROR`, `EMPTY_FILE`, `MAX_ROWS_EXCEEDED`, `FIELD_TOO_LARGE`
- **헤더/매핑 무결성**: `EMPTY_HEADER`, `DUPLICATE_HEADER`, `MAPPING_CONFLICT`, `MISSING_REQUIRED_COLUMN`
- **구문/행 구조/보안**: `MALFORMED_CSV_QUOTE`, `COLUMN_COUNT_MISMATCH`, `FORMULA_INJECTION`, `INVALID_CONTROL_CHAR`
- **도메인/중복 검증**: `EMPTY_REQUIRED_VALUE`, `INVALID_DATE`, `INVALID_DATE_RANGE`, `INVALID_TIME`, `INVALID_TIME_RANGE`, `INVALID_INTEGER`, `NEGATIVE_NUMBER`, `NON_POSITIVE_NUMBER`, `CAPACITY_EXCEEDED`, `INVALID_PHONE`, `DUPLICATE_ROW`, `DUPLICATE_KEY`, `DUPLICATE_MEMBER_PROFILE`, `DUPLICATE_CLASS_SCHEDULE`

## 4. 백엔드/프론트엔드 통합 흐름 (원본 앱 미수정 안내)
1. **업로드 스테이징 (Dry-Run 단계)**: 업로드된 CSV 바이트 스트림을 `validate_csv_content(raw_bytes, entity_type, custom_mapping, max_preview_rows, max_rows, max_field_chars, max_file_bytes)`에 전달합니다.
2. **미리보기 및 정확한 원본 행번호 렌더링**:
   - `preview_rows`의 문자열은 수식 주입 위험 문자(`=`, `+`, `-`, `@`, `\t`, `\r` 및 공백·개행·제로폭·제어문자 뒤에 숨은 수식)가 단일 인용부호(`'`)로 무력화(`formula_sanitized: true`)되고 비인쇄 제어문자가 제거되어 그리드 및 재내보내기에 안전합니다.
   - `row_errors`는 논리 데이터 순번(`row_number`)과 원본 파일의 물리 줄 번호(`line_number`), 중복 최초 등장 위치(`first_seen_row`, `first_seen_line`)를 함께 제공합니다.
3. **최종 커밋 게이트**: `summary.can_import === true` 및 `summary.invalid_rows === 0`일 때만 실제 트랜잭션 가져오기 API를 활성화합니다.
