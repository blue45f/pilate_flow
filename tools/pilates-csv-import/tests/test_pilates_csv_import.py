import json
import pathlib
import subprocess
import sys
import tempfile
import unittest

BASE_DIR = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "src"))

import pilates_csv_import as pci  # noqa: E402


class TestPilatesCsvImport(unittest.TestCase):
    """30 automated tests covering BOM, quotes/newlines, Korean headers, mapping, dates, duplicates, empty required fields, formula injection, row errors, and CLI dry-run JSON."""

    def test_01_utf8_bom_detection_and_header_cleaning(self):
        csv_text = "\ufeff회원번호,이름,연락처,등록일,회원권종류,잔여횟수\nM01,김필라,010-1234-5678,2026-11-01,기구 10회,10\n"
        res = pci.validate_csv_content(csv_text.encode("utf-8"))
        self.assertEqual(res["encoding_detected"], "UTF-8-BOM")
        self.assertTrue(res["summary"]["can_import"])
        self.assertEqual(res["column_mapping"]["member_id"], "회원번호")
        self.assertEqual(res["preview_rows"][0]["data"]["member_id"], "M01")

    def test_02_plain_utf8_detection(self):
        csv_text = "회원번호,이름,연락처,등록일,회원권종류,잔여횟수\nM02,이코어,010-2222-3333,2026-11-02,그룹 20회,20\n"
        res = pci.validate_csv_content(csv_text.encode("utf-8"))
        self.assertEqual(res["encoding_detected"], "UTF-8")
        self.assertTrue(res["summary"]["can_import"])

    def test_03_invalid_encoding_handled_gracefully(self):
        bad_bytes = b"\xff\xfe\x00\x00invalid_utf8"
        res = pci.validate_csv_content(bad_bytes)
        self.assertEqual(res["encoding_detected"], "INVALID")
        self.assertFalse(res["summary"]["can_import"])
        self.assertEqual(res["row_errors"][0]["code"], "ENCODING_ERROR")

    def test_04_empty_file_error(self):
        res = pci.validate_csv_content(b"")
        self.assertFalse(res["summary"]["can_import"])
        self.assertEqual(res["row_errors"][0]["code"], "EMPTY_FILE")

    def test_05_headers_only_zero_rows_cannot_import(self):
        csv_text = "회원번호,이름,연락처,등록일,회원권종류,잔여횟수\n"
        res = pci.validate_csv_content(csv_text.encode("utf-8"))
        self.assertEqual(res["summary"]["total_rows"], 0)
        self.assertFalse(res["summary"]["can_import"])

    def test_06_quoted_multiline_and_escaped_quotes(self):
        csv_text = (
            "회원번호,이름,연락처,등록일,회원권종류,잔여횟수,메모\r\n"
            'M03,박밸런스,010-3333-4444,2026-11-03,개인 10회,10,"첫째 줄 메모\r\n둘째 줄 ""강조"" 및, 쉼표 포함"\r\n'
            "M04,최스트레칭,010-4444-5555,2026-11-04,듀엣 10회,10,일반 메모\r\n"
        )
        res = pci.validate_csv_content(csv_text.encode("utf-8"))
        self.assertTrue(res["summary"]["can_import"])
        self.assertEqual(
            res["preview_rows"][0]["data"]["notes"],
            '첫째 줄 메모\n둘째 줄 "강조" 및, 쉼표 포함',
        )
        self.assertEqual(res["preview_rows"][1]["row_number"], 2)
        self.assertEqual(res["preview_rows"][1]["line_number"], 4)

    def test_07_unclosed_quote_detection_with_line_number(self):
        csv_text = (
            "회원번호,이름,연락처,등록일,회원권종류,잔여횟수,메모\n"
            'M05,정오류,010-5555-6666,2026-11-05,기구 10회,10,"닫히지 않은 인용부호\n'
        )
        res = pci.validate_csv_content(csv_text.encode("utf-8"))
        self.assertFalse(res["summary"]["can_import"])
        self.assertEqual(res["row_errors"][0]["code"], "MALFORMED_CSV_QUOTE")
        self.assertEqual(res["row_errors"][0]["line_number"], 2)

    def test_08_column_count_mismatch_detection(self):
        csv_text = (
            "회원번호,이름,연락처,등록일,회원권종류,잔여횟수\n"
            "M06,강열부족,010-6666-7777,2026-11-06\n"
        )
        res = pci.validate_csv_content(csv_text.encode("utf-8"))
        codes = [e["code"] for e in res["row_errors"]]
        self.assertIn("COLUMN_COUNT_MISMATCH", codes)

    def test_09_auto_detect_member_vs_class_entity(self):
        member_csv = "회원ID,회원명,휴대폰,가입일,수강권,남은횟수\nM1,김회원,01012345678,2026-11-01,10회권,10\n"
        class_csv = "수업코드,강좌명,수업일자,시작시간,종료시간,강사명,정원\nC1,리포머A,2026-11-10,09:00,09:50,박강사,6\n"
        res_m = pci.validate_csv_content(member_csv.encode("utf-8"))
        res_c = pci.validate_csv_content(class_csv.encode("utf-8"))
        self.assertEqual(res_m["entity_type"], "member")
        self.assertEqual(res_c["entity_type"], "class")
        self.assertTrue(res_m["summary"]["can_import"])
        self.assertTrue(res_c["summary"]["can_import"])

    def test_10_custom_column_mapping_dict_and_unmapped_columns(self):
        csv_text = (
            "고객고유코드,고객성함,휴대폰번호,최초등록일자,등록상품명,잔여세션수,내부참고열\n"
            "M-900,윤커스텀,010-7777-8888,2026.11.09,프리미엄 30회,30,참고값\n"
        )
        mapping = {
            "member_id": "고객고유코드",
            "name": "고객성함",
            "phone": "휴대폰번호",
            "registration_date": "최초등록일자",
            "membership_type": "등록상품명",
            "remaining_sessions": "잔여세션수",
        }
        res = pci.validate_csv_content(csv_text.encode("utf-8"), entity_type="member", custom_mapping=mapping)
        self.assertTrue(res["summary"]["can_import"])
        self.assertIn("내부참고열", res["unmapped_columns"])
        self.assertEqual(res["preview_rows"][0]["data"]["registration_date"], "2026-11-09")

    def test_11_missing_required_column_error(self):
        csv_text = "회원번호,이름,등록일,회원권종류\nM01,김누락,2026-11-01,기구10회\n"
        res = pci.validate_csv_content(csv_text.encode("utf-8"), entity_type="member")
        self.assertFalse(res["summary"]["can_import"])
        self.assertIn("phone", res["missing_required_columns"])
        self.assertIn("remaining_sessions", res["missing_required_columns"])
        codes = [e["code"] for e in res["row_errors"]]
        self.assertIn("MISSING_REQUIRED_COLUMN", codes)

    def test_12_invalid_calendar_date_non_leap_year_and_month_13(self):
        csv_text = (
            "회원번호,이름,연락처,생년월일,등록일,회원권종류,잔여횟수\n"
            "M01,김날짜,010-1111-2222,1999-04-31,2026-02-29,기구10회,10\n"
            "M02,이달력,010-3333-4444,1990-01-01,2026-13-01,기구10회,10\n"
        )
        res = pci.validate_csv_content(csv_text.encode("utf-8"))
        invalid_date_errors = [e for e in res["row_errors"] if e["code"] == "INVALID_DATE"]
        self.assertEqual(len(invalid_date_errors), 3)
        self.assertEqual(invalid_date_errors[0]["row_number"], 1)
        self.assertEqual(invalid_date_errors[2]["row_number"], 2)

    def test_13_valid_leap_year_and_dot_slash_date_normalization(self):
        csv_text = (
            "회원번호,이름,연락처,생년월일,등록일,만료일,회원권종류,잔여횟수\n"
            "M01,박윤년,010-1111-2222,2000/02/29,2024.02.29,2024-05-29,기구10회,10\n"
        )
        res = pci.validate_csv_content(csv_text.encode("utf-8"))
        self.assertTrue(res["summary"]["can_import"])
        data = res["preview_rows"][0]["data"]
        self.assertEqual(data["birth_date"], "2000-02-29")
        self.assertEqual(data["registration_date"], "2024-02-29")

    def test_14_expiry_date_before_registration_date_error(self):
        csv_text = (
            "회원번호,이름,연락처,등록일,만료일,회원권종류,잔여횟수\n"
            "M01,김역전,010-1111-2222,2026-11-10,2026-11-01,기구10회,10\n"
        )
        res = pci.validate_csv_content(csv_text.encode("utf-8"))
        codes = [e["code"] for e in res["row_errors"]]
        self.assertIn("INVALID_DATE_RANGE", codes)

    def test_15_exact_duplicate_row_detection(self):
        csv_text = (
            "회원번호,이름,연락처,등록일,회원권종류,잔여횟수\n"
            "M01,김중복,010-1111-2222,2026-11-01,기구10회,10\n"
            "M01,김중복,010-1111-2222,2026-11-01,기구10회,10\n"
        )
        res = pci.validate_csv_content(csv_text.encode("utf-8"))
        self.assertEqual(res["summary"]["duplicate_rows"], 1)
        dup_errs = [e for e in res["row_errors"] if e["code"] == "DUPLICATE_ROW"]
        self.assertEqual(len(dup_errs), 1)
        self.assertEqual(dup_errs[0]["row_number"], 2)
        self.assertEqual(dup_errs[0]["first_seen_row"], 1)

    def test_16_duplicate_member_id_and_duplicate_profile_detection(self):
        csv_text = (
            "회원번호,이름,연락처,등록일,회원권종류,잔여횟수\n"
            "M01,김원본,010-1111-2222,2026-11-01,기구10회,10\n"
            "M01,이다른이름,010-9999-8888,2026-11-02,기구20회,20\n"
            "M03,김원본,01011112222,2026-11-05,개인10회,10\n"
        )
        res = pci.validate_csv_content(csv_text.encode("utf-8"))
        self.assertEqual(res["summary"]["duplicate_rows"], 2)
        codes_row2 = [e["code"] for e in res["row_errors"] if e["row_number"] == 2]
        codes_row3 = [e["code"] for e in res["row_errors"] if e["row_number"] == 3]
        self.assertIn("DUPLICATE_KEY", codes_row2)
        self.assertIn("DUPLICATE_MEMBER_PROFILE", codes_row3)

    def test_17_duplicate_class_id_and_instructor_schedule_conflict(self):
        csv_text = (
            "수업코드,수업명,수업일자,시작시간,종료시간,담당강사,정원\n"
            "C01,오전 리포머,2026-11-15,10:00,10:50,박강사,6\n"
            "C01,오전 바렐,2026-11-15,11:00,11:50,최강사,6\n"
            "C03,동시간 중복수업,2026-11-15,10:00,10:50,박강사,4\n"
        )
        res = pci.validate_csv_content(csv_text.encode("utf-8"))
        self.assertEqual(res["summary"]["duplicate_rows"], 2)
        codes_row2 = [e["code"] for e in res["row_errors"] if e["row_number"] == 2]
        codes_row3 = [e["code"] for e in res["row_errors"] if e["row_number"] == 3]
        self.assertIn("DUPLICATE_KEY", codes_row2)
        self.assertIn("DUPLICATE_CLASS_SCHEDULE", codes_row3)

    def test_18_empty_required_values_and_whitespace_only_cells(self):
        csv_text = (
            "회원번호,이름,연락처,등록일,회원권종류,잔여횟수\n"
            " ,   ,010-1111-2222,2026-11-01,,10\n"
        )
        res = pci.validate_csv_content(csv_text.encode("utf-8"))
        empty_errs = [e for e in res["row_errors"] if e["code"] == "EMPTY_REQUIRED_VALUE"]
        missing_fields = {e["field"] for e in empty_errs}
        self.assertEqual(missing_fields, {"member_id", "name", "membership_type"})

    def test_19_formula_injection_equals_plus_minus_at_tab_leading_space(self):
        csv_text = (
            "회원번호,이름,연락처,등록일,회원권종류,잔여횟수,담당강사,메모\n"
            'M01,=CMD|\' /C calc\'!A0,010-1111-2222,2026-11-01,"+SUM(1,2)",10,-1+1,"@HYPERLINK(""http://evil"")"\n'
            "M02,  =1+1,010-2222-3333,2026-11-01,기구10회,10,\t=EVIL(),정상메모\n"
        )
        res = pci.validate_csv_content(csv_text.encode("utf-8"))
        self.assertEqual(res["summary"]["formula_injection_count"], 6)
        p1 = res["preview_rows"][0]
        self.assertTrue(p1["formula_sanitized"])
        self.assertTrue(p1["data"]["name"].startswith("'="))
        self.assertTrue(p1["data"]["membership_type"].startswith("'+"))
        self.assertTrue(p1["data"]["instructor"].startswith("'-"))
        self.assertTrue(p1["data"]["notes"].startswith("'@"))
        p2 = res["preview_rows"][1]
        self.assertTrue(p2["data"]["name"].startswith("'"))
        self.assertTrue(p2["data"]["instructor"].startswith("'\t"))

    def test_20_formula_injection_in_unmapped_column_is_caught(self):
        csv_text = (
            "회원번호,이름,연락처,등록일,회원권종류,잔여횟수,외부비고열\n"
            "M01,김안전,010-1111-2222,2026-11-01,기구10회,10,=WEBSERVICE(\"http://bad\")\n"
        )
        res = pci.validate_csv_content(csv_text.encode("utf-8"))
        self.assertFalse(res["summary"]["can_import"])
        self.assertEqual(res["summary"]["formula_injection_count"], 1)
        self.assertEqual(res["row_errors"][0]["field"], "외부비고열")

    def test_21_negative_sessions_vs_formula_injection_distinction(self):
        csv_text = (
            "회원번호,이름,연락처,등록일,회원권종류,잔여횟수\n"
            "M01,김음수,010-1111-2222,2026-11-01,기구10회,-5\n"
        )
        res = pci.validate_csv_content(csv_text.encode("utf-8"))
        self.assertEqual(res["summary"]["formula_injection_count"], 0)
        self.assertEqual(res["row_errors"][0]["code"], "NEGATIVE_NUMBER")
        self.assertEqual(res["row_errors"][0]["field"], "remaining_sessions")

    def test_22_class_time_validation_and_end_before_start(self):
        csv_text = (
            "수업코드,수업명,수업일자,시작시간,종료시간,담당강사,정원\n"
            "C01,그룹수업,2026-11-15,25:00,10:50,박강사,6\n"
            "C02,역전수업,2026-11-15,14:00,13:50,최강사,6\n"
        )
        res = pci.validate_csv_content(csv_text.encode("utf-8"))
        codes_r1 = [e["code"] for e in res["row_errors"] if e["row_number"] == 1]
        codes_r2 = [e["code"] for e in res["row_errors"] if e["row_number"] == 2]
        self.assertIn("INVALID_TIME", codes_r1)
        self.assertIn("INVALID_TIME_RANGE", codes_r2)

    def test_23_class_capacity_zero_and_booked_exceeds_capacity(self):
        csv_text = (
            "수업코드,수업명,수업일자,시작시간,종료시간,담당강사,정원,예약인원\n"
            "C01,정원초과수업,2026-11-15,10:00,10:50,박강사,6,8\n"
            "C02,정원0수업,2026-11-15,11:00,11:50,박강사,0,0\n"
        )
        res = pci.validate_csv_content(csv_text.encode("utf-8"))
        codes_r1 = [e["code"] for e in res["row_errors"] if e["row_number"] == 1]
        codes_r2 = [e["code"] for e in res["row_errors"] if e["row_number"] == 2]
        self.assertIn("CAPACITY_EXCEEDED", codes_r1)
        self.assertIn("NON_POSITIVE_NUMBER", codes_r2)

    def test_24_phone_number_validation_and_normalization(self):
        csv_text = (
            "회원번호,이름,연락처,등록일,회원권종류,잔여횟수\n"
            "M01,김정상,01012345678,2026-11-01,기구10회,10\n"
            "M02,이오류,02-123-4567,2026-11-01,기구10회,10\n"
        )
        res = pci.validate_csv_content(csv_text.encode("utf-8"))
        self.assertEqual(res["preview_rows"][0]["data"]["phone"], "010-1234-5678")
        codes_r2 = [e["code"] for e in res["row_errors"] if e["row_number"] == 2]
        self.assertIn("INVALID_PHONE", codes_r2)

    def test_25_invalid_integer_format_error(self):
        csv_text = (
            "회원번호,이름,연락처,등록일,회원권종류,잔여횟수\n"
            "M01,김문자횟수,010-1234-5678,2026-11-01,기구10회,열번\n"
        )
        res = pci.validate_csv_content(csv_text.encode("utf-8"))
        self.assertEqual(res["row_errors"][0]["code"], "INVALID_INTEGER")

    def test_26_max_preview_rows_limit_respected(self):
        rows = ["회원번호,이름,연락처,등록일,회원권종류,잔여횟수"]
        for i in range(1, 10):
            rows.append(f"M{i:02d},회원{i},010-1234-560{i},2026-11-01,기구10회,10")
        csv_text = "\n".join(rows) + "\n"
        res = pci.validate_csv_content(csv_text.encode("utf-8"), max_preview_rows=3)
        self.assertEqual(res["summary"]["total_rows"], 9)
        self.assertEqual(len(res["preview_rows"]), 3)

    def test_27_cli_dry_run_output_file_and_no_db_write_flags(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            out_file = pathlib.Path(tmpdir) / "preview.json"
            fixture = BASE_DIR / "fixtures" / "members_valid_bom.csv"
            exit_code = pci.main([str(fixture), "--output", str(out_file), "--fail-on-error"])
            self.assertEqual(exit_code, 0)
            payload = json.loads(out_file.read_text(encoding="utf-8"))
            self.assertTrue(payload["dry_run"])
            self.assertFalse(payload["db_write_performed"])
            self.assertTrue(payload["summary"]["can_import"])

    def test_28_cli_fail_on_error_returns_nonzero_exit_code(self):
        fixture = BASE_DIR / "fixtures" / "members_mixed_errors.csv"
        proc = subprocess.run(
            [sys.executable, str(BASE_DIR / "src" / "pilates_csv_import.py"), str(fixture), "--fail-on-error"],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(proc.returncode, 1)
        payload = json.loads(proc.stdout)
        self.assertFalse(payload["summary"]["can_import"])
        self.assertGreater(len(payload["row_errors"]), 0)

    def test_29_cli_inline_key_value_mapping_support(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            csv_file = pathlib.Path(tmpdir) / "custom.csv"
            csv_file.write_text(
                "코드,성명,전번,일자,권종명,횟수\nM99,홍길동,010-8888-9999,2026-11-09,기구20회,20\n",
                encoding="utf-8",
            )
            mapping_str = "member_id=코드,name=성명,phone=전번,registration_date=일자,membership_type=권종명,remaining_sessions=횟수"
            proc = subprocess.run(
                [
                    sys.executable,
                    str(BASE_DIR / "src" / "pilates_csv_import.py"),
                    str(csv_file),
                    "--type",
                    "member",
                    "--mapping",
                    mapping_str,
                    "--fail-on-error",
                ],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(proc.returncode, 0)
            payload = json.loads(proc.stdout)
            self.assertTrue(payload["summary"]["can_import"])
            self.assertEqual(payload["preview_rows"][0]["data"]["name"], "홍길동")

    def test_30_cli_missing_file_returns_exit_code_2(self):
        exit_code = pci.main(["/nonexistent/path/to/missing.csv"])
        self.assertEqual(exit_code, 2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
