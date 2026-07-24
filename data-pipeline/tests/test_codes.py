from __future__ import annotations

import unittest

from college_predictor.codes import (
    canonical_branch_code,
    canonical_institute_code,
    normalize_branch_code,
    normalize_institute_code,
)


class CodeNormalizationTests(unittest.TestCase):
    def test_institute_codes_are_five_digits(self) -> None:
        self.assertEqual(normalize_institute_code("6155"), "06155")
        self.assertEqual(normalize_institute_code("06155"), "06155")
        self.assertEqual(normalize_institute_code("EN1101"), "01101")

    def test_branch_codes_are_ten_digits(self) -> None:
        self.assertEqual(normalize_branch_code("615524510"), "0615524510")
        self.assertEqual(normalize_branch_code("0615524510"), "0615524510")
        self.assertEqual(normalize_branch_code("302524270U"), "0302524270U")

    def test_empty_or_invalid_values_stay_empty(self) -> None:
        self.assertEqual(normalize_institute_code(None), "")
        self.assertEqual(normalize_branch_code("not available"), "")

    def test_old_institute_codes_resolve_to_current_codes(self) -> None:
        self.assertEqual(canonical_institute_code("04005"), "14005")
        self.assertEqual(canonical_institute_code("6006"), "16006")
        self.assertEqual(canonical_institute_code("06155"), "06155")

    def test_choice_code_prefix_follows_current_institute_code(self) -> None:
        self.assertEqual(canonical_branch_code("0600619110"), "1600619110")
        self.assertEqual(canonical_branch_code("400524610"), "1400524610")
        self.assertEqual(canonical_branch_code("302524270U"), "0302524270U")


if __name__ == "__main__":
    unittest.main()
