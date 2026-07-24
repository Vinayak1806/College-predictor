from __future__ import annotations

import re
from dataclasses import dataclass

from college_predictor.codes import canonical_institute_code


@dataclass(frozen=True)
class CollegeLocation:
    district: str
    region: str


DISTRICT_REGIONS = {
    "Ahilyanagar": "Nashik",
    "Akola": "Amravati",
    "Amravati": "Amravati",
    "Beed": "Aurangabad",
    "Bhandara": "Nagpur",
    "Buldhana": "Amravati",
    "Chandrapur": "Nagpur",
    "Chhatrapati Sambhajinagar": "Aurangabad",
    "Dharashiv": "Aurangabad",
    "Dhule": "Nashik",
    "Gadchiroli": "Nagpur",
    "Gondia": "Nagpur",
    "Hingoli": "Aurangabad",
    "Jalgaon": "Nashik",
    "Jalna": "Aurangabad",
    "Kolhapur": "Pune",
    "Latur": "Aurangabad",
    "Mumbai City": "Mumbai",
    "Mumbai Suburban": "Mumbai",
    "Nagpur": "Nagpur",
    "Nanded": "Aurangabad",
    "Nandurbar": "Nashik",
    "Nashik": "Nashik",
    "Palghar": "Mumbai",
    "Parbhani": "Aurangabad",
    "Pune": "Pune",
    "Raigad": "Mumbai",
    "Ratnagiri": "Mumbai",
    "Sangli": "Pune",
    "Satara": "Pune",
    "Sindhudurg": "Mumbai",
    "Solapur": "Pune",
    "Thane": "Mumbai",
    "Wardha": "Nagpur",
    "Washim": "Amravati",
    "Yavatmal": "Amravati",
}


def _location_key(value: str) -> str:
    value = re.sub(r"\b\d{6}\b", " ", value)
    value = re.sub(r"[^a-z0-9]+", " ", value.lower())
    return " ".join(value.split())


DISTRICT_ALIASES = {
    _location_key(name): name
    for name in DISTRICT_REGIONS
}
DISTRICT_ALIASES.update(
    {
        "ahmednagar": "Ahilyanagar",
        "aurangabad": "Chhatrapati Sambhajinagar",
        "buldana": "Buldhana",
        "mumbai": "Mumbai City",
        "nadurbar": "Nandurbar",
        "nasik": "Nashik",
        "osmanabad": "Dharashiv",
    }
)


# These institutes have a blank District / City cell in the source workbook.
# Values were reviewed against their official institute names or CET Cell details.
INSTITUTE_LOCATION_OVERRIDES = {
    "03460": CollegeLocation("Palghar", "Mumbai"),
    "04005": CollegeLocation("Nagpur", "Nagpur"),
    "04115": CollegeLocation("Nagpur", "Nagpur"),
    "06006": CollegeLocation("Pune", "Pune"),
    "06402": CollegeLocation("Kolhapur", "Pune"),
    "06444": CollegeLocation("Solapur", "Pune"),
    "06467": CollegeLocation("Solapur", "Pune"),
    "06468": CollegeLocation("Kolhapur", "Pune"),
    "06714": CollegeLocation("Kolhapur", "Pune"),
    "06715": CollegeLocation("Pune", "Pune"),
    "06771": CollegeLocation("Pune", "Pune"),
    "06811": CollegeLocation("Kolhapur", "Pune"),
    "06991": CollegeLocation("Pune", "Pune"),
    "14005": CollegeLocation("Nagpur", "Nagpur"),
    "16006": CollegeLocation("Pune", "Pune"),
    "16121": CollegeLocation("Kolhapur", "Pune"),
    "16126": CollegeLocation("Kolhapur", "Pune"),
    "16351": CollegeLocation("Pune", "Pune"),
    "16352": CollegeLocation("Pune", "Pune"),
    "16354": CollegeLocation("Pune", "Pune"),
    "16355": CollegeLocation("Pune", "Pune"),
    "16357": CollegeLocation("Pune", "Pune"),
    "16361": CollegeLocation("Pune", "Pune"),
}


def canonicalize_district(value: str | None) -> str:
    if not value:
        return ""
    return DISTRICT_ALIASES.get(_location_key(value), "")


def resolve_college_location(
    institute_code: str,
    profile_district: str | None = None,
    profile_region: str | None = None,
) -> CollegeLocation | None:
    code = canonical_institute_code(institute_code)
    district = canonicalize_district(profile_district)
    if district:
        return CollegeLocation(
            district=district,
            region=DISTRICT_REGIONS[district],
        )

    return INSTITUTE_LOCATION_OVERRIDES.get(code)
