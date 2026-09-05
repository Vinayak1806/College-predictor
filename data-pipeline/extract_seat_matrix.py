from __future__ import annotations

import argparse
import csv
import json
import re
import gc
from collections import Counter
from pathlib import Path

import pdfplumber

from college_predictor.codes import normalize_branch_code, normalize_institute_code


FIELDNAMES = [
    "academic_year",
    "admission_route",
    "institute_code",
    "college_name",
    "college_status",
    "college_type",
    "autonomous",
    "cap_seats",
    "branch_code",
    "branch_name",
    "sanctioned_intake",
    "maharashtra_seats",
    "minority_seats",
    "all_india_seats",
    "institute_seats",
    "orphan_seats",
    "ews_seats",
    "tfws_choice_code",
    "tfws_seats",
    "vacant_seats",
    "lateral_entry_seats",
    "pwd_seats",
    "defence_seats",
    "category_seats",
    "source_file",
    "source_page",
    "needs_review",
    "review_reason",
]

COLLEGE_RE = re.compile(r"^(?P<code>\d{4,5})\s*-\s*(?P<name>.+)$")
STATUS_RE = re.compile(r"^(?P<status>.+?)\s+CAP Seats:(?P<cap_seats>\d+)$")
YEAR_RE = re.compile(r"Admissions A\.Y\.\s*(20\d{2}-\d{2})")
BRANCH_RE = re.compile(
    r"^(?P<branch_code>\d{9,10}[A-Z]?)\s+"
    r"(?P<branch_name>.+?)\s+"
    r"(?P<sanctioned_intake>\d+)\s+"
    r"(?P<maharashtra_seats>\d+)\s+"
    r"(?P<minority_seats>\d+)\s+"
    r"(?P<all_india_seats>\d+)\s+"
    r"(?P<institute_seats>\d+)\s+"
    r"(?P<orphan_seats>\d+)$"
)
EWS_TFWS_RE = re.compile(
    r"Economically Weaker Section \(EWS\) Seats:\s*(?P<ews>\d+)\s+"
    r"Tution Fee Waiver Scheme Choice Code:\s*(?P<tfws_code>\S*)\s*:?\s*Seats:\s*(?P<tfws>\d+)",
    re.IGNORECASE,
)
DSE_INSTITUTE_RE = re.compile(
    r"^(?:Sr No\s*:\s*\d+\s+)?Institute Code & Name\s*:\s*(?P<code>\d{4,5})\s*-\s*(?P<name>.+)$"
)
DSE_CHOICE_RE = re.compile(r"Choice Code\s*:\s*(?P<branch_code>\d{9,10}[A-Z]?)")
DSE_COURSE_RE = re.compile(r"Course Name\s*:\s*(?P<branch_name>.+)$")
DSE_STATUS_RE = re.compile(
    r"^Status\s*:\s*(?P<status>.+?)\s+Vacant Seats within SI\s*:\s*(?P<vacant>\d+)\s+"
    r"Lateral Entry\s*:\s*(?P<lateral>\d+)(?:\s+.*)?$"
)
DSE_CATEGORIES = ["OPEN", "SC", "ST", "VJDT", "NTB", "NTC", "NTD", "OBC", "SEBC"]


def infer_year(path: Path) -> str:
    match = re.search(r"(20\d{2})", path.name)
    if not match:
        return ""
    year = int(match.group(1))
    return f"{year}-{str(year + 1)[-2:]}"


def split_college_type(status: str) -> tuple[str, str]:
    autonomous = "true" if "Autonomous" in status else "false"
    college_type = status.replace("Autonomous", "").strip()
    return college_type, autonomous


def parse_page(text: str, page_number: int, source_file: str, academic_year: str) -> dict[str, str] | None:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    row = {
        "academic_year": academic_year,
        "admission_route": "FE",
        "institute_code": "",
        "college_name": "",
        "college_status": "",
        "college_type": "",
        "autonomous": "false",
        "cap_seats": "",
        "branch_code": "",
        "branch_name": "",
        "sanctioned_intake": "",
        "maharashtra_seats": "",
        "minority_seats": "",
        "all_india_seats": "",
        "institute_seats": "",
        "orphan_seats": "",
        "ews_seats": "",
        "tfws_choice_code": "",
        "tfws_seats": "",
        "vacant_seats": "",
        "lateral_entry_seats": "",
        "pwd_seats": "",
        "defence_seats": "",
        "category_seats": "",
        "source_file": source_file,
        "source_page": str(page_number),
        "needs_review": "false",
        "review_reason": "",
    }
    issues: set[str] = set()

    for line in lines:
        year_match = YEAR_RE.search(line)
        if year_match:
            row["academic_year"] = year_match.group(1)

        college_match = COLLEGE_RE.match(line)
        if college_match and not row["institute_code"]:
            row["institute_code"] = normalize_institute_code(college_match.group("code"))
            row["college_name"] = college_match.group("name").strip()
            continue

        status_match = STATUS_RE.match(line)
        if status_match:
            status = status_match.group("status").strip()
            row["college_status"] = status
            row["cap_seats"] = status_match.group("cap_seats")
            row["college_type"], row["autonomous"] = split_college_type(status)
            continue

        branch_match = BRANCH_RE.match(line)
        if branch_match:
            row.update(branch_match.groupdict())
            row["branch_code"] = normalize_branch_code(row["branch_code"])
            continue

        ews_match = EWS_TFWS_RE.search(line)
        if ews_match:
            row["ews_seats"] = ews_match.group("ews")
            row["tfws_choice_code"] = normalize_branch_code(ews_match.group("tfws_code").strip(":"))
            row["tfws_seats"] = ews_match.group("tfws")

    required_fields = ["institute_code", "college_name", "branch_code", "branch_name"]
    for field in required_fields:
        if not row[field]:
            issues.add(f"MISSING_{field.upper()}")

    numeric_fields = [
        "cap_seats",
        "sanctioned_intake",
        "maharashtra_seats",
        "minority_seats",
        "all_india_seats",
        "institute_seats",
        "orphan_seats",
        "ews_seats",
        "tfws_seats",
    ]
    for field in numeric_fields:
        if row[field]:
            try:
                if int(row[field]) < 0:
                    issues.add(f"INVALID_{field.upper()}")
            except ValueError:
                issues.add(f"INVALID_{field.upper()}")

    if not row["branch_code"]:
        return None

    if issues:
        row["needs_review"] = "true"
        row["review_reason"] = ";".join(sorted(issues))

    return row


def sum_special_seats(lines: list[str], label: str) -> int:
    prefix = f"Total Seats For {label} :"
    common_prefix = f"{label} Reserved Common :"
    total = 0
    for line in lines:
        if line.startswith(prefix):
            total += sum(int(value) for value in re.findall(r"\d+", line[len(prefix):]))
        elif line.startswith(common_prefix):
            values = re.findall(r"\d+", line[len(common_prefix):])
            total += int(values[0]) if values else 0
    return total


def clean_dse_text(value: str) -> str:
    value = re.sub(r"\s+Orphan\s*:\s*\d+\s*$", "", value, flags=re.IGNORECASE)
    value = re.sub(r"\s+Inst\.\s*Non-Inst\.\s*$", "", value, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", value).strip(" -\t")


def is_dse_metadata_line(line: str) -> bool:
    prefixes = (
        "Sr No",
        "Institute Code & Name",
        "Choice Code",
        "Course Name",
        "Status",
        "Non-Minority Seats",
        "G L G L",
        "Total Seats For",
        "PWD Reserved Common",
        "DEF Reserved Common",
        "Total EWS",
        "STATE CET CELL",
        "Provisional Seat Matrix",
        "Admission to Direct Second Year",
    )
    return line.startswith(prefixes) or bool(re.fullmatch(r"(?:\d+\s+){5,}\d+", line))


def dse_institute_name(block: list[str], institute_match: re.Match[str]) -> str:
    parts = [clean_dse_text(institute_match.group("name"))]
    for line in block[1:]:
        if DSE_CHOICE_RE.search(line) or DSE_COURSE_RE.search(line) or line.startswith("Status"):
            break
        if not is_dse_metadata_line(line) and not re.search(r"Orphan\s*:\s*\d+", line):
            parts.append(clean_dse_text(line))
    return clean_dse_text(" ".join(filter(None, parts)))


def dse_branch_name(block: list[str], choice_index: int) -> str:
    choice_line = block[choice_index]
    same_line_course = DSE_COURSE_RE.search(choice_line)
    course_index = choice_index if same_line_course else next(
        (index for index, line in enumerate(block) if DSE_COURSE_RE.search(line)),
        -1,
    )
    if course_index < 0:
        return ""

    course_match = DSE_COURSE_RE.search(block[course_index])
    parts = [clean_dse_text(course_match.group("branch_name"))]
    status_index = next(
        (index for index in range(course_index + 1, len(block)) if block[index].startswith("Status")),
        len(block),
    )
    for index in range(course_index + 1, status_index):
        line = block[index]
        if index == choice_index or is_dse_metadata_line(line):
            continue
        parts.append(clean_dse_text(line))
    return clean_dse_text(" ".join(filter(None, parts)))


def dse_status_match(block: list[str]) -> re.Match[str] | None:
    for index, line in enumerate(block):
        if not line.startswith("Status"):
            continue
        combined = line
        if index + 1 < len(block) and block[index + 1].startswith("Vacant Seats within SI"):
            combined = f"{line} {block[index + 1]}"
        match = DSE_STATUS_RE.match(combined)
        if match:
            return match
    return None


def parse_dse_page(
    text: str,
    page_number: int,
    source_file: str,
    academic_year: str,
) -> list[dict[str, str]]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    rows: list[dict[str, str]] = []
    starts = [index for index, line in enumerate(lines) if DSE_INSTITUTE_RE.match(line)]

    for position, start in enumerate(starts):
        block = lines[start:starts[position + 1] if position + 1 < len(starts) else len(lines)]
        institute_match = DSE_INSTITUTE_RE.match(block[0])
        choice_matches = [
            (index, DSE_CHOICE_RE.search(line))
            for index, line in enumerate(block)
            if DSE_CHOICE_RE.search(line)
        ]
        status_match = dse_status_match(block)
        if not institute_match or not choice_matches:
            continue

        issues: set[str] = set()
        if len(choice_matches) > 1:
            issues.add("MULTIPLE_CHOICE_CODES_IN_INSTITUTE_BLOCK")
        choice_index, branch_match = choice_matches[0]
        institute_code = normalize_institute_code(institute_match.group("code"))
        branch_code = normalize_branch_code(branch_match.group("branch_code"))
        branch_name = dse_branch_name(block, choice_index)
        if not branch_name:
            issues.add("MISSING_BRANCH_NAME")
        if branch_code[:5] != institute_code:
            issues.add("BRANCH_INSTITUTE_MISMATCH")

        non_minority = minority = 0
        category_seats: dict[str, dict[str, int]] = {}
        header_index = next(
            (index for index, line in enumerate(block) if line.startswith("Non-Minority Seats Minority Seats")),
            -1,
        )
        if header_index >= 0 and header_index + 2 < len(block):
            counts = [int(value) for value in re.findall(r"\d+", block[header_index + 2])]
            if len(counts) >= 20:
                non_minority, minority = counts[:2]
                category_values = counts[2:20]
                category_seats = {
                    category: {
                        "general": category_values[index * 2],
                        "ladies": category_values[index * 2 + 1],
                    }
                    for index, category in enumerate(DSE_CATEGORIES)
                }
            else:
                issues.add("CATEGORY_COLUMN_ALIGNMENT_UNCERTAIN")
        else:
            issues.add("MISSING_CATEGORY_DISTRIBUTION")

        if not status_match:
            issues.add("MISSING_STATUS")
        status = status_match.group("status").strip() if status_match else ""
        college_type, autonomous = split_college_type(status)
        vacant = int(status_match.group("vacant")) if status_match else 0
        lateral = int(status_match.group("lateral")) if status_match else 0
        orphan_match = next((re.search(r"Orphan\s*:\s*(\d+)", line) for line in block if "Orphan" in line), None)
        orphan = int(orphan_match.group(1)) if orphan_match else 0
        ews_match = next((re.search(r"Total EWS\s*:\s*(\d+)", line) for line in block if "Total EWS" in line), None)
        ews = int(ews_match.group(1)) if ews_match else 0
        pwd = sum_special_seats(block, "PWD")
        defence = sum_special_seats(block, "DEF")

        row = {
            "academic_year": academic_year,
            "admission_route": "DSE",
            "institute_code": institute_code,
            "college_name": dse_institute_name(block, institute_match),
            "college_status": status,
            "college_type": college_type,
            "autonomous": autonomous,
            "cap_seats": str(non_minority + minority + orphan + ews),
            "branch_code": branch_code,
            "branch_name": branch_name,
            "sanctioned_intake": "",
            "maharashtra_seats": str(non_minority + minority),
            "minority_seats": str(minority),
            "all_india_seats": "",
            "institute_seats": "",
            "orphan_seats": str(orphan),
            "ews_seats": str(ews),
            "tfws_choice_code": "",
            "tfws_seats": "",
            "vacant_seats": str(vacant),
            "lateral_entry_seats": str(lateral),
            "pwd_seats": str(pwd),
            "defence_seats": str(defence),
            "category_seats": json.dumps(category_seats, separators=(",", ":")),
            "source_file": source_file,
            "source_page": str(page_number),
            "needs_review": str(bool(issues)).lower(),
            "review_reason": ";".join(sorted(issues)),
        }
        rows.append(row)

    return rows


def write_csv(rows: list[dict[str, str]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)


def write_report(
    rows: list[dict[str, str]],
    output_path: Path,
    source_file: str,
    pages: int,
    detected_choice_codes: int = 0,
) -> None:
    counts = Counter()
    for row in rows:
        counts["review" if row["needs_review"] == "true" else "valid"] += 1
        for issue in filter(None, row["review_reason"].split(";")):
            counts[f"issue:{issue}"] += 1

    report = {
        "file": source_file,
        "pages_processed": pages,
        "records": len(rows),
        "valid_records": counts["valid"],
        "records_needing_review": counts["review"],
        "colleges_found": len({row["institute_code"] for row in rows if row["institute_code"]}),
        "branches_found": len({row["branch_code"] for row in rows if row["branch_code"]}),
        "detected_choice_codes": detected_choice_codes,
        "unparsed_choice_codes": max(detected_choice_codes - len(rows), 0),
        "issues": {key.removeprefix("issue:"): value for key, value in counts.items() if key.startswith("issue:")},
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract branch intake and seat matrix details from CAP seat matrix PDFs.")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--report", required=True)
    parser.add_argument("--academic-year", default="")
    parser.add_argument("--route", default="FE", choices=["FE", "DSE"])
    parser.add_argument("--limit-pages", type=int, default=0)
    args = parser.parse_args()

    input_path = Path(args.input)
    rows: list[dict[str, str]] = []
    detected_choice_codes = 0
    academic_year = args.academic_year or infer_year(input_path)

    with pdfplumber.open(input_path) as pdf:
        pages_to_process = min(args.limit_pages or len(pdf.pages), len(pdf.pages))
        for page_number in range(1, pages_to_process + 1):
            page = pdf.pages[page_number - 1]
            text = page.extract_text() or ""
            if args.route == "DSE":
                detected_choice_codes += len(DSE_CHOICE_RE.findall(text))
                rows.extend(parse_dse_page(text, page_number, input_path.name, academic_year))
            else:
                row = parse_page(text, page_number, input_path.name, academic_year)
                if row:
                    rows.append(row)
            page.flush_cache()
            if page_number % 10 == 0:
                gc.collect()

    write_csv(rows, Path(args.output))
    write_report(rows, Path(args.report), input_path.name, pages_to_process, detected_choice_codes)
    print(f"records={len(rows)} csv={args.output} report={args.report}")


if __name__ == "__main__":
    main()
