import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from college_predictor.locations import (  # noqa: E402
    canonicalize_district,
    resolve_college_location,
)


class LocationNormalizationTests(unittest.TestCase):
    def test_normalizes_case_punctuation_and_pin_codes(self):
        self.assertEqual(canonicalize_district("NASHIK"), "Nashik")
        self.assertEqual(canonicalize_district("(Nashik)."), "Nashik")
        self.assertEqual(canonicalize_district("Nashik 422003"), "Nashik")

    def test_normalizes_renamed_districts(self):
        self.assertEqual(canonicalize_district("Ahmednagar"), "Ahilyanagar")
        self.assertEqual(
            canonicalize_district("Aurangabad"),
            "Chhatrapati Sambhajinagar",
        )
        self.assertEqual(canonicalize_district("Osmanabad"), "Dharashiv")

    def test_rejects_localities_and_address_fragments(self):
        self.assertEqual(canonicalize_district("Wagholi"), "")
        self.assertEqual(canonicalize_district("Technology & Management"), "")
        self.assertEqual(canonicalize_district("444302"), "")

    def test_uses_reviewed_override_when_profile_is_blank(self):
        location = resolve_college_location("16354")
        self.assertIsNotNone(location)
        self.assertEqual(location.district, "Pune")
        self.assertEqual(location.region, "Pune")

    def test_profile_district_has_priority(self):
        location = resolve_college_location("16354", "Nagpur", "Nagpur")
        self.assertIsNotNone(location)
        self.assertEqual(location.district, "Nagpur")


if __name__ == "__main__":
    unittest.main()
