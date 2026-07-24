from __future__ import annotations

import re


CURRENT_INSTITUTE_CODE_ALIASES = {
    "04005": "14005",
    "06006": "16006",
}


def normalize_numeric_code(value: object, width: int) -> str:
    if value is None:
        return ""

    text = str(value).strip()
    if not text:
        return ""

    if text.endswith(".0"):
        text = text[:-2]

    digits = re.sub(r"\D", "", text)
    if not digits:
        return ""

    return digits.zfill(width)


def normalize_institute_code(value: object) -> str:
    return normalize_numeric_code(value, 5)


def normalize_branch_code(value: object) -> str:
    if value is None:
        return ""

    text = str(value).strip().upper()
    if not text:
        return ""

    suffix = text[-1] if text[-1:].isalpha() else ""
    digits = re.sub(r"\D", "", text)
    if not digits:
        return ""

    return f"{digits.zfill(10)}{suffix}"


def canonical_institute_code(value: object) -> str:
    code = normalize_institute_code(value)
    return CURRENT_INSTITUTE_CODE_ALIASES.get(code, code)


def canonical_branch_code(value: object) -> str:
    code = normalize_branch_code(value)
    if not re.fullmatch(r"\d{10}[A-Z]?", code):
        return code

    return f"{canonical_institute_code(code[:5])}{code[5:]}"
