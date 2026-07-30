from __future__ import annotations

from dataclasses import dataclass
import re


CATEGORIES = {
    "OPEN",
    "SC",
    "ST",
    "VJ",
    "NTA",
    "NTB",
    "NTC",
    "NTD",
    "NT1",
    "NT2",
    "NT3",
    "OBC",
    "SEBC",
    "EWS",
    "TFWS",
    "ORPHAN",
}

SPECIAL_TYPES = {
    "TFWS": ("TFWS", "SPECIAL", "STATE"),
    "EWS": ("EWS", "SPECIAL", "STATE"),
    "ORPHAN": ("ORPHAN", "SPECIAL", "STATE"),
    "ORP": ("ORPHAN", "SPECIAL", "STATE"),
}

MINORITY_TYPES = {
    "MI": ("MINORITY", "GENERAL", "STATE"),
}

UNIVERSITY_SUFFIX = {
    "H": "HOME",
    "O": "OTHER",
    "S": "STATE",
}


@dataclass(frozen=True)
class SeatTypeInfo:
    code: str
    category: str
    gender: str
    university_type: str
    special: str | None = None


def normalize_seat_type(value: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", value.upper())


def merge_wrapped_heading_tokens(tokens: list[str]) -> list[str]:
    merged: list[str] = []
    for token in tokens:
        token = normalize_seat_type(token)
        if not token:
            continue
        if token in UNIVERSITY_SUFFIX and merged:
            previous = merged[-1]
            if previous not in SPECIAL_TYPES and not previous.endswith(tuple(UNIVERSITY_SUFFIX)):
                merged[-1] = previous + token
                continue
        merged.append(token)
    return merged


def decode_seat_type(raw_code: str) -> SeatTypeInfo | None:
    code = normalize_seat_type(raw_code)
    if not code:
        return None

    if code in SPECIAL_TYPES:
        category, gender, university_type = SPECIAL_TYPES[code]
        return SeatTypeInfo(code, category, gender, university_type, code)

    if code in MINORITY_TYPES:
        category, gender, university_type = MINORITY_TYPES[code]
        return SeatTypeInfo(code, category, gender, university_type, "MINORITY")

    university_type = "STATE"
    body = code
    if code[-1:] in UNIVERSITY_SUFFIX:
        university_type = UNIVERSITY_SUFFIX[code[-1]]
        body = code[:-1]

    special = None
    if body.startswith("PWDR"):
        special = "PWD"
        body = body[4:]
    elif body.startswith("PWD"):
        special = "PWD"
        body = body[3:]
    elif body.startswith("DEFR"):
        special = "DEFENCE"
        body = body[4:]
    elif body.startswith("DEF"):
        special = "DEFENCE"
        body = body[3:]

    if special and body in {"", "O"}:
        body = "OPEN"

    gender = "SPECIAL" if special else "UNKNOWN"
    if body.startswith("G"):
        gender = "GENERAL"
        body = body[1:]
    elif body.startswith("L"):
        gender = "LADIES"
        body = body[1:]

    if body.startswith("R") and body[1:] in CATEGORIES:
        body = body[1:]

    category = body
    if category in CATEGORIES:
        return SeatTypeInfo(code, category, gender, university_type, special)

    return None


def eligible_seat_types(
    *,
    category: str,
    gender: str,
    university_type: str,
    include_special: bool = False,
) -> set[str]:
    category = category.upper()
    gender = gender.upper()
    university_type = university_type.upper()

    suffixes = []
    if university_type in {"HOME", "H"}:
        suffixes.append("H")
    elif university_type in {"OTHER", "O"}:
        suffixes.append("O")
    suffixes.append("S")

    categories = {"OPEN"}
    if category != "OPEN":
        categories.add(category)

    prefixes = ["G"]
    if gender in {"FEMALE", "LADIES", "WOMAN", "WOMEN"}:
        prefixes.append("L")

    seats = {prefix + cat + suffix for prefix in prefixes for cat in categories for suffix in suffixes}
    if include_special:
        seats.update({"TFWS", "EWS", "ORPHAN"})
    return seats
