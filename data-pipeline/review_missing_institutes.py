from __future__ import annotations

import argparse
import csv
import json
import re
from collections import Counter
from dataclasses import asdict
from pathlib import Path
from types import SimpleNamespace

import pdfplumber

from college_predictor.seat_types import decode_seat_type, normalize_seat_type
from extract_cutoffs import (
    COLLEGE_RE,
    FIELDNAMES,
    SCORE_RE,
    SECTION_TYPES,
    Context,
    make_record,
    split_status,
)


TARGET_CODES = {
    "02032",
    "03025",
    "03035",
    "04304",
    "06276",
    "06285",
    "06938",
    "16361",
}
CHOICE_CODE_RE = re.compile(r"^(?P<code>\d{9,10}[A-Z]?)\s*-\s*(?P<name>.+)$")
STAGE_CELL_RE = re.compile(r"^(?P<stage>[IVX]+(?:-Non)?)$")
RANK_CELL_RE = re.compile(r"^\s*(?P<rank>\d{1,6})\b")


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)


def find_last_match(pattern: re.Pattern[str], lines: list[str]) -> re.Match[str] | None:
    for line in reversed(lines):
        match = pattern.match(line)
        if match:
            return match
    return None


def context_above_table(page: pdfplumber.page.Page, table_top: float) -> Context:
    text = page.crop((0, 0, page.width, min(page.height, table_top + 1))).extract_text() or ""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    context = Context()

    college_match = find_last_match(COLLEGE_RE, lines)
    branch_match = find_last_match(CHOICE_CODE_RE, lines)
    if college_match:
        context.institute_code = college_match.group("code").zfill(5)
        context.college_name = college_match.group("name").strip()
    if branch_match:
        raw_code = branch_match.group("code").upper()
        suffix = raw_code[-1] if raw_code[-1:].isalpha() else ""
        digits = re.sub(r"\D", "", raw_code)
        context.branch_code = f"{digits.zfill(10)}{suffix}"
        context.branch_name = branch_match.group("name").strip()

    for line in reversed(lines):
        if line.startswith("Status:"):
            context.college_status, context.university = split_status(line)
            break

    section_positions = {
        section: text.rfind(label)
        for label, section in SECTION_TYPES.items()
        if text.rfind(label) >= 0
    }
    if section_positions:
        context.section = max(section_positions, key=section_positions.get)

    return context


def table_header_index(matrix: list[list[str | None]]) -> int | None:
    for index, row in enumerate(matrix):
        headings = [normalize_seat_type(cell or "") for cell in row[1:]]
        recognized = sum(bool(decode_seat_type(heading)) or heading == "MI" for heading in headings)
        if recognized and recognized >= max(1, len([heading for heading in headings if heading]) // 2):
            return index
    return None


def extract_table_records(
    page: pdfplumber.page.Page,
    source_path: Path,
    academic_year: str,
    cap_round: int,
) -> tuple[list[dict[str, str]], list[str]]:
    records: list[dict[str, str]] = []
    errors: list[str] = []

    for table_number, table in enumerate(page.find_tables(), start=1):
        matrix = table.extract()
        header_index = table_header_index(matrix)
        if header_index is None:
            continue

        context = context_above_table(page, table.bbox[1])
        if context.institute_code not in TARGET_CODES:
            continue
        if not context.branch_code:
            errors.append(
                f"{source_path.name} page {page.page_number} table {table_number}: missing official choice code"
            )
            continue

        headings = [normalize_seat_type(cell or "") for cell in matrix[header_index][1:]]
        if len([heading for heading in headings if heading]) != len(set(filter(None, headings))):
            errors.append(
                f"{source_path.name} page {page.page_number} table {table_number}: duplicate seat headings"
            )
            continue

        args = SimpleNamespace(
            academic_year=academic_year,
            route="FE",
            cap_round=cap_round,
            quota="MH",
            input=str(source_path),
        )
        for row_number, row in enumerate(matrix[header_index + 1 :], start=header_index + 2):
            stage_text = (row[0] or "").strip().splitlines()[0].strip()
            stage_match = STAGE_CELL_RE.match(stage_text)
            if not stage_match:
                if any((cell or "").strip() for cell in row):
                    errors.append(
                        f"{source_path.name} page {page.page_number} table {table_number} row {row_number}: invalid stage"
                    )
                continue

            stage = stage_match.group("stage")
            for column, heading in enumerate(headings, start=1):
                cell = row[column] if column < len(row) else None
                cell_text = (cell or "").strip()
                if not cell_text:
                    continue
                if not heading:
                    errors.append(
                        f"{source_path.name} page {page.page_number} table {table_number} column {column}: value without seat heading"
                    )
                    continue

                rank_match = RANK_CELL_RE.search(cell_text)
                score_match = SCORE_RE.search(cell_text)
                if not rank_match or not score_match:
                    errors.append(
                        f"{source_path.name} page {page.page_number} table {table_number} row {row_number}: incomplete rank/score cell"
                    )
                    continue
                if heading != "MI" and decode_seat_type(heading) is None:
                    errors.append(
                        f"{source_path.name} page {page.page_number} table {table_number}: unknown seat type {heading}"
                    )
                    continue

                record = make_record(
                    ctx=context,
                    seat_type=heading,
                    stage=stage,
                    rank=rank_match.group("rank"),
                    score=score_match.group(1),
                    args=args,
                    page_number=page.page_number,
                    needs_review=False,
                    reasons=[],
                )
                if heading == "MI":
                    record.update(
                        {
                            "category": "MINORITY",
                            "gender": "GENERAL",
                            "university_type": "STATE",
                        }
                    )
                record.update(
                    {
                        "extraction_method": "pdfplumber_table_review",
                        "verified": "true",
                        "needs_review": "false",
                        "review_reason": "",
                    }
                )
                records.append(record)

    return records, errors


def pair_counter(rows: list[dict[str, str]]) -> Counter[tuple[str, str, str, str]]:
    return Counter(
        (
            row["source_page"],
            row["institute_code"],
            row["closing_rank"],
            row["closing_score"],
        )
        for row in rows
    )


def unique_records(rows: list[dict[str, str]]) -> tuple[list[dict[str, str]], list[str]]:
    unique: dict[tuple[str, ...], dict[str, str]] = {}
    errors: list[str] = []
    for row in rows:
        key = (
            row["academic_year"],
            row["admission_route"],
            row["cap_round"],
            row["quota"],
            row["institute_code"],
            row["branch_code"],
            row["seat_type"],
            row["stage"],
            row["section"],
        )
        existing = unique.get(key)
        if existing and (
            existing["closing_rank"] != row["closing_rank"]
            or existing["closing_score"] != row["closing_score"]
        ):
            errors.append(f"Conflicting reviewed cutoff key: {'|'.join(key)}")
            continue
        unique[key] = row
    return list(unique.values()), errors


def main() -> None:
    parser = argparse.ArgumentParser(description="Review table-alignment failures for known current institutes.")
    parser.add_argument("--staging-dir", default="data/staging")
    parser.add_argument("--raw-dir", default="data/raw/fe")
    parser.add_argument("--output-dir", default="data/validated/reviewed_cutoffs")
    parser.add_argument(
        "--report",
        default="data/reports/reviewed_missing_institutes.json",
    )
    args = parser.parse_args()

    staging_dir = Path(args.staging_dir)
    raw_dir = Path(args.raw_dir)
    output_dir = Path(args.output_dir)
    all_records: list[dict[str, str]] = []
    report_files: list[dict[str, object]] = []
    all_errors: list[str] = []

    for staging_path in sorted(staging_dir.glob("FE_20*_CAP*_MH.csv")):
        source_rows = [
            row for row in read_csv(staging_path)
            if row.get("institute_code") in TARGET_CODES
        ]
        if not source_rows:
            continue

        academic_year = source_rows[0]["academic_year"]
        cap_round = int(source_rows[0]["cap_round"])
        start_year = academic_year[:4]
        source_path = raw_dir / start_year / source_rows[0]["source_file"]
        pages = sorted({int(row["source_page"]) for row in source_rows})
        reviewed_rows: list[dict[str, str]] = []
        file_errors: list[str] = []

        with pdfplumber.open(source_path) as pdf:
            for page_number in pages:
                page_records, page_errors = extract_table_records(
                    pdf.pages[page_number - 1],
                    source_path,
                    academic_year,
                    cap_round,
                )
                reviewed_rows.extend(page_records)
                file_errors.extend(page_errors)

        source_pairs = pair_counter(source_rows)
        reviewed_pairs = pair_counter(reviewed_rows)
        missing_pairs = source_pairs - reviewed_pairs
        unexpected_pairs = reviewed_pairs - source_pairs
        if missing_pairs:
            file_errors.append(
                f"{staging_path.name}: {sum(missing_pairs.values())} source rank/score pairs were not recovered"
            )
        if unexpected_pairs:
            file_errors.append(
                f"{staging_path.name}: {sum(unexpected_pairs.values())} unexpected rank/score pairs were extracted"
            )

        reviewed_rows, duplicate_errors = unique_records(reviewed_rows)
        file_errors.extend(duplicate_errors)
        found_codes = {row["institute_code"] for row in reviewed_rows}
        expected_codes = {row["institute_code"] for row in source_rows}
        missing_codes = sorted(expected_codes - found_codes)
        if missing_codes:
            file_errors.append(f"{staging_path.name}: missing institutes {', '.join(missing_codes)}")

        if not file_errors:
            output_path = output_dir / staging_path.name
            write_csv(output_path, reviewed_rows)
            all_records.extend(reviewed_rows)
        else:
            output_path = None
            all_errors.extend(file_errors)

        report_files.append(
            {
                "stagingFile": staging_path.name,
                "sourcePdf": str(source_path),
                "sourceRows": len(source_rows),
                "reviewedRows": len(reviewed_rows),
                "sourcePages": len(pages),
                "institutes": sorted(expected_codes),
                "output": str(output_path) if output_path else None,
                "errors": file_errors,
            }
        )

    report = {
        "reviewMethod": (
            "Official PDF tables were extracted by cell boundaries. Every source rank/percentile pair "
            "had to be recovered before a file was approved."
        ),
        "targetInstitutes": sorted(TARGET_CODES),
        "files": report_files,
        "summary": {
            "files": len(report_files),
            "approvedFiles": sum(not item["errors"] for item in report_files),
            "reviewedRecords": len(all_records),
            "errors": len(all_errors),
        },
        "errors": all_errors,
    }
    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "reviewed_missing_institutes.json").write_text(
        json.dumps(all_records, indent=2),
        encoding="utf-8",
    )

    print(json.dumps(report["summary"], indent=2))
    print(f"report={report_path}")
    if all_errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
