from __future__ import annotations

import argparse
import csv
import json
import re
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


def write_csv(rows: list[dict[str, str]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)


def write_report(rows: list[dict[str, str]], output_path: Path, source_file: str, pages: int) -> None:
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
        "issues": {key.removeprefix("issue:"): value for key, value in counts.items() if key.startswith("issue:")},
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract branch intake and seat matrix details from CAP seat matrix PDFs.")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--report", required=True)
    parser.add_argument("--limit-pages", type=int, default=0)
    args = parser.parse_args()

    input_path = Path(args.input)
    rows: list[dict[str, str]] = []
    academic_year = infer_year(input_path)

    with pdfplumber.open(input_path) as pdf:
        pages_to_process = min(args.limit_pages or len(pdf.pages), len(pdf.pages))
        for page_number, page in enumerate(pdf.pages[:pages_to_process], start=1):
            row = parse_page(page.extract_text() or "", page_number, input_path.name, academic_year)
            if row:
                rows.append(row)

    write_csv(rows, Path(args.output))
    write_report(rows, Path(args.report), input_path.name, pages_to_process)
    print(f"records={len(rows)} csv={args.output} report={args.report}")


if __name__ == "__main__":
    main()
