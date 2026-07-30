from __future__ import annotations

import argparse
import json
import math
import re
from pathlib import Path

import pandas as pd

from college_predictor.codes import normalize_institute_code


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


def extract_profiles(workbook_path: Path) -> list[dict[str, object]]:
    df = pd.read_excel(workbook_path, sheet_name="Colleges", dtype=object)
    rows: list[dict[str, object]] = []

    for _, row in df.iterrows():
        institute_code = normalize_institute_code(row.get("Institute Code"))
        if not institute_code:
            continue

        rows.append(
            {
                "instituteCode": institute_code,
                "instituteName": text_value(row.get("Institute Name")),
                "currentCap2025": text_value(row.get("Current CAP 2025-26")),
                "state": text_value(row.get("State")),
                "region": text_value(row.get("Region")),
                "districtCity": text_value(row.get("District / City")),
                "address": text_value(row.get("Address")),
                "ownershipType": text_value(row.get("Ownership Type")),
                "autonomyStatus": text_value(row.get("Autonomy Status")),
                "minorityStatus": text_value(row.get("Minority Status")),
                "university": text_value(row.get("University")),
                "totalIntake": int_value(row.get("Total Intake")),
                "branchRecords": int_value(row.get("Branch Records")),
                "feeYear": text_value(row.get("Fee Year")),
                "totalApprovedFee": int_value(row.get("Total Approved Fee")),
                "fePreferenceProxy": number_value(row.get("FE Preference Proxy")),
                "dsePreferenceProxy": number_value(row.get("DSE Preference Proxy")),
                "combinedPreferenceProxy": number_value(row.get("Combined Preference Proxy")),
                "preferenceBand": text_value(row.get("Preference Band")),
                "officialWebsite": text_value(row.get("Official Website")),
                "websiteCompletenessScore": number_value(row.get("Website Completeness Score")),
                "websiteCompletenessStatus": text_value(row.get("Website Completeness Status")),
                "dataQualityNote": text_value(row.get("Data Quality Note")),
                "sourceUrl": text_value(row.get("Source URL")),
            }
        )

    return rows


def extract_fees(workbook_path: Path) -> list[dict[str, object]]:
    df = pd.read_excel(workbook_path, sheet_name="Fees", dtype=object)
    rows: list[dict[str, object]] = []

    for _, row in df.iterrows():
        academic_year = text_value(row.get("Academic Year"))
        fra_id = text_value(row.get("FRA Institute ID"))
        institute_name = text_value(row.get("Institute Name"))
        if not academic_year or not fra_id or not institute_name:
            continue

        rows.append(
            {
                "academicYear": academic_year,
                "fraInstituteId": fra_id,
                "instituteCode": normalize_institute_code(fra_id),
                "instituteName": institute_name,
                "district": text_value(row.get("District")),
                "approvalStatus": text_value(row.get("Approval Status")),
                "meetingDate": text_value(row.get("Meeting Date")),
                "tuitionFee": int_value(row.get("Tuition Fee")),
                "developmentFee": int_value(row.get("Development Fee")),
                "totalApprovedFee": int_value(row.get("Total Approved Fee")),
                "sourceUrl": text_value(row.get("Source URL")),
            }
        )

    return rows


def write_json(path: Path, rows: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(rows, indent=2, ensure_ascii=False), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract college profile and fee data from workbook.")
    parser.add_argument("--workbook", default="maharashtra_engineering_college_predictor_dataset.xlsx")
    parser.add_argument("--output-dir", default="data/processed/college_info")
    args = parser.parse_args()

    workbook_path = Path(args.workbook)
    output_dir = Path(args.output_dir)
    profiles = extract_profiles(workbook_path)
    fees = extract_fees(workbook_path)

    write_json(output_dir / "college_profiles.json", profiles)
    write_json(output_dir / "college_fees.json", fees)
    print({"profiles": len(profiles), "fees": len(fees), "output_dir": str(output_dir)})


if __name__ == "__main__":
    main()
