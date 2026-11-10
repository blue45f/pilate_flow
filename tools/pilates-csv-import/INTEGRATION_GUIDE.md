# 필라테스 회원/수업 CSV 가져오기 Dry-Run 검증기 통합 안내 (`pilates-csv-import`)

## 1. 개요 및 격리 원칙
- **목적**: 필라테스 센터의 회원(`member`) 및 수업(`class`) CSV 파일을 실제 DB에 반영하기 전, 인코딩(UTF-8/UTF-8 BOM)·인용부호/줄바꿈·한글 헤더 매핑·달력 날짜/시간·중복행·필수값 누락·수식 주입(CSV Injection)을 검증하고 안전한 미리보기 JSON(`dry_run: true`, `db_write_performed: false`)을 생성합니다.
- **무결성 및 격리**: 외부 패키지나 DB 연결 없이 Python 3 표준 라이브러리만 사용하며, 기존 12 UI 설계·예약 코어·JSON manifest 검증기와 파일/코드 소유를 공유하지 않습니다.

## 2. CLI 실행 방법
```bash
# 회원 CSV 검증 및 표준 출력 미리보기
python3 src/pilates_csv_import.py fixtures/members_valid_bom.csv --type member --fail-on-error

# 수업 CSV 검증 및 미리보기 JSON 파일 저장
python3 src/pilates_csv_import.py fixtures/classes_mixed_errors.csv --type class --output outputs/classes_preview.json

# 사용자 정의 열 매핑(JSON 파일 또는 key=value) 적용
python3 src/pilates_csv_import.py fixtures/members_valid_bom.csv --mapping fixtures/custom_mapping.json
```

## 3. 백엔드/프론트엔드 통합 흐름 (원본 앱 미수정 안내)
1. **업로드 스테이징 (Dry-Run 단계)**: 사용자가 관리 화면에서 CSV를 업로드하면 서버 임시 경로에 저장하거나 바이트 스트림으로 읽어 `validate_csv_content(raw_bytes, entity_type, custom_mapping)` 함수를 호출합니다.
2. **미리보기 및 행별 오류 렌더링**:
   - 반환된 JSON의 `preview_rows`에는 수식 주입 위험 문자(`=`, `+`, `-`, `@`, `\t`, `\r`)가 단일 인용부호(`'`)로 무력화(`formula_sanitized: true`)되어 있어 프론트엔드 테이블이나 엑셀 재내보내기 시 수식이 실행되지 않습니다.
   - `row_errors` 배열의 `row_number`(데이터 행 번호)와 `line_number`(실제 CSV 줄 번호), `code`, `field`, `message`를 그대로 UI 오류 배지에 바인딩합니다.
3. **최종 커밋 게이트**: `summary.can_import === true` 및 `summary.invalid_rows === 0`일 때만 실제 트랜잭션 가져오기 API를 활성화합니다.
