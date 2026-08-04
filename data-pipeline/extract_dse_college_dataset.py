from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from urllib.parse import urlparse

import pandas as pd

from college_predictor.codes import canonical_branch_code, canonical_institute_code


def clean_value(value):
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    if pd.isna(value):
        return None
    return value


def text_value(value):
    value = clean_value(value)
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def int_value(value):
    value = clean_value(value)
    if value is None or value == "":
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def number_value(value):
    value = clean_value(value)
    if value is None or value == "":
        return None
    try:
        return round(float(value), 4)
    except (TypeError, ValueError):
        return None


def source_filename(url):
    value = text_value(url)
    if not value:
        return "maharashtra_dse_engineering_college_dataset.xlsx"
    name = Path(urlparse(value).path).name
    return name or "maharashtra_dse_engineering_college_dataset.xlsx"


def extract_profiles(workbook_path: Path):
    frame = pd.read_excel(workbook_path, sheet_name="Colleges", dtype=object)
    rows = []
    for _, row in frame.iterrows():
        institute_code = canonical_institute_code(row.get("Institute Code"))
        if not institute_code:
            continue
        rows.append(
            {
                "instituteCode": institute_code,
                "instituteName": text_value(row.get("Institute Name")),
                "state": text_value(row.get("State")),
                "region": text_value(row.get("Region")),
                "districtCity": text_value(row.get("District / City")),
                "address": text_value(row.get("Address")),
                "ownershipType": text_value(row.get("Ownership Type")),
                "autonomyStatus": text_value(row.get("Autonomy Status")),
                "minorityStatus": text_value(row.get("Minority Status")),
                "university": text_value(row.get("University")),
                "dseBranchCount": int_value(row.get("DSE Branch Count")),
                "dseTotalSeats": int_value(row.get("DSE Total Seats 2025-26")),
                "seatMatrixStatus": text_value(row.get("Seat Matrix Status")),
                "seatMatrixSource": text_value(row.get("Seat Matrix Source")),
                "collegeReferenceSource": text_value(row.get("College Reference Source")),
                "dataQualityNote": text_value(row.get("Data Quality Note")),
            }
        )
    return rows


def extract_seat_matrices(workbook_path: Path):
    frame = pd.read_excel(workbook_path, sheet_name="DSE_Seat_Matrix", dtype=object)
    rows = []
    for _, row in frame.iterrows():
        institute_code = canonical_institute_code(row.get("Institute Code"))
        branch_code = canonical_branch_code(row.get("Choice Code"))
        source_url = text_value(row.get("Official Source URL"))
        if not institute_code or not branch_code:
            continue
        rows.append(
            {
                "academicYear": text_value(row.get("Academic Year")),
                "admissionRoute": "DSE",
                "instituteCode": institute_code,
                "collegeName": text_value(row.get("Institute Name")),
                "branchCode": branch_code,
                "branchName": text_value(row.get("Branch")),
                "totalDseSeats": int_value(row.get("Total DSE Seats")),
                "maharashtraSeats": int_value(row.get("MS Seats")),
                "ewsSeats": int_value(row.get("EWS Seats")),
                "minoritySeats": int_value(row.get("Minority Seats")),
                "otherSeats": int_value(row.get("Other Seats")),
                "collegeStatus": text_value(row.get("Institute Status from PDF")),
                "seatCompositionText": text_value(row.get("Seat Composition Text")),
                "sourceUrl": source_url,
                "sourceFile": source_filename(source_url),
            }
        )
    return rows


def extract_fees(workbook_path: Path):
    frame = pd.read_excel(workbook_path, sheet_name="Fees", dtype=object)
    rows = []
    for _, row in frame.iterrows():
        institute_code = canonical_institute_code(row.get("Institute Code"))
        verification = text_value(row.get("Verification Status"))
        academic_year = text_value(row.get("Fee Year"))
        total_fee = int_value(row.get("Total Approved Fee"))
        if not institute_code or not academic_year or not total_fee:
            continue
        rows.append(
            {
                "instituteCode": institute_code,
                "instituteName": text_value(row.get("Institute Name")),
                "district": text_value(row.get("District / City")),
                "academicYear": academic_year,
                "tuitionFee": int_value(row.get("Tuition Fee")),
                "developmentFee": int_value(row.get("Development Fee")),
                "totalApprovedFee": total_fee,
                "verificationStatus": verification,
                "verified": verification == "Verified FRA annual tuition + development fee",
                "sourceUrl": "https://mahafra.org/feesInformation",
            }
        )
    return rows


def extract_websites(workbook_path: Path):
    frame = pd.read_excel(workbook_path, sheet_name="Official_Websites", dtype=object)
    rows = []
    for _, row in frame.iterrows():
        institute_code = canonical_institute_code(row.get("Institute Code"))
        website = text_value(row.get("Official Website"))
        verification = text_value(row.get("Verification Status"))
        if not institute_code or not website:
            continue
        rows.append(
            {
                "instituteCode": institute_code,
                "instituteName": text_value(row.get("Institute Name")),
                "officialWebsite": website,
                "verificationStatus": verification,
                "verified": verification == "Verified official domain",
                "websiteCompletenessStatus": text_value(row.get("Website Completeness Status")),
            }
        )
    return rows


def extract_rankings(workbook_path: Path):
    frame = pd.read_excel(workbook_path, sheet_name="Colleges", dtype=object)
    rows = []
    for _, row in frame.iterrows():
        institute_code = canonical_institute_code(row.get("Institute Code"))
        rank = int_value(row.get("NIRF 2025 Rank"))
        band = text_value(row.get("NIRF 2025 Band"))
        score = number_value(row.get("NIRF 2025 Score"))
        source_url = text_value(row.get("NIRF Source"))
        if not institute_code or not source_url or (rank is None and band is None):
            continue
        if rank is not None and band == str(rank):
            band = None
        rows.append(
            {
                "instituteCode": institute_code,
                "rankingSystem": "NIRF",
                "rankingYear": 2025,
                "category": "Engineering",
                "rank": rank,
                "band": band,
                "score": score,
                "matchedName": text_value(row.get("NIRF Matched Name")),
                "verified": True,
                "sourceUrl": source_url,
                "sourceFile": "NIRF India Rankings 2025",
            }
        )
    return rows


def write_json(path: Path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(rows, indent=2, ensure_ascii=False), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description="Extract verified DSE college workbook data.")
    parser.add_argument("--workbook", default="maharashtra_dse_engineering_college_dataset.xlsx")
    parser.add_argument("--output-dir", default="data/processed/dse_college_info")
    args = parser.parse_args()

    workbook_path = Path(args.workbook)
    output_dir = Path(args.output_dir)
    datasets = {
        "profiles": extract_profiles(workbook_path),
        "seat_matrices": extract_seat_matrices(workbook_path),
        "fees": extract_fees(workbook_path),
        "websites": extract_websites(workbook_path),
        "rankings": extract_rankings(workbook_path),
    }

    for name, rows in datasets.items():
        write_json(output_dir / f"{name}.json", rows)

    report = {
        "workbook": str(workbook_path),
        "outputDirectory": str(output_dir),
        "counts": {name: len(rows) for name, rows in datasets.items()},
    }
    write_json(output_dir / "extraction_report.json", report)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
