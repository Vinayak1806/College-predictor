from __future__ import annotations

import csv
import json
from pathlib import Path


PDF_RECOVERED_CODES = {
    "03025",
    "03035",
    "04304",
    "06276",
    "06285",
    "06938",
}

SUMMARY_FALLBACKS = [
    {
        "institute_code": "03209",
        "college_name": "K J Somaiya Institute of Technology",
        "college_status": "Un-Aided Autonomous Linguistic Minority - Gujarathi",
        "college_type": "Un-Aided",
        "autonomous": "true",
        "branches": [
            ("0320924510", "Computer Engineering", 120),
            ("0320924610", "Information Technology", 120),
            ("0320937210", "Electronics and Telecommunication Engg", 120),
            ("0320999510", "Artificial Intelligence and Data Science", 120),
        ],
    },
    {
        "institute_code": "04141",
        "college_name": "Shriram Gram Vikas Shikshan Sanstha, Vilasrao Deshmukh College of Engineering and Technology, Nagpur",
        "college_status": "Un-Aided",
        "college_type": "Un-Aided",
        "autonomous": "false",
        "branches": [
            ("0414119110", "Civil Engineering", 60),
            ("0414124510", "Computer Engineering", 120),
            ("0414161210", "Mechanical Engineering", 30),
            ("0414199510", "Artificial Intelligence and Data Science", 30),
        ],
    },
    {
        "institute_code": "05256",
        "college_name": "Matoshri Aasarabai Institute of Technology and Research Centre",
        "college_status": "Un-Aided",
        "college_type": "Un-Aided",
        "autonomous": "false",
        "branches": [
            ("0525624510", "Computer Engineering", 60),
            ("0525624610", "Information Technology", 60),
            ("0525684410", "Electronics and Computer Engineering", 60),
        ],
    },
    {
        "institute_code": "16361",
        "college_name": "Zeal College of Engineering & Research, Induri, Pune (Off Campus-Induri)",
        "college_status": "Un-Aided Autonomous",
        "college_type": "Un-Aided",
        "autonomous": "true",
        "branches": [
            ("1636124510", "Computer Engineering", 120),
            ("1636137210", "Electronics and Telecommunication Engg", 60),
            ("1636184410", "Electronics and Computer Engineering", 60),
            ("1636199510", "Artificial Intelligence and Data Science", 120),
        ],
    },
]


def nullable_int(value: str) -> int | None:
    text = str(value or "").strip()
    return int(text) if text else None


def csv_row_to_record(row: dict[str, str]) -> dict[str, object]:
    return {
        "academicYear": row["academic_year"],
        "admissionRoute": row["admission_route"],
        "instituteCode": row["institute_code"],
        "collegeName": row["college_name"],
        "collegeStatus": row["college_status"] or None,
        "collegeType": row["college_type"] or None,
        "autonomous": row["autonomous"].lower() == "true",
        "capSeats": nullable_int(row["cap_seats"]),
        "branchCode": row["branch_code"],
        "branchName": row["branch_name"],
        "sanctionedIntake": nullable_int(row["sanctioned_intake"]),
        "maharashtraSeats": nullable_int(row["maharashtra_seats"]),
        "minoritySeats": nullable_int(row["minority_seats"]),
        "allIndiaSeats": nullable_int(row["all_india_seats"]),
        "instituteSeats": nullable_int(row["institute_seats"]),
        "orphanSeats": nullable_int(row["orphan_seats"]),
        "ewsSeats": nullable_int(row["ews_seats"]),
        "tfwsChoiceCode": row["tfws_choice_code"] or None,
        "tfwsSeats": nullable_int(row["tfws_seats"]),
        "sourceFile": row["source_file"],
        "sourcePage": int(row["source_page"]),
        "verified": True,
        "needsReview": False,
        "reviewReason": None,
        "coverage": "FULL_SEAT_MATRIX",
    }


def summary_records() -> list[dict[str, object]]:
    records = []
    for college in SUMMARY_FALLBACKS:
        source_url = (
            "https://fe2025.mahacet.org/StaticPages/frmInstituteSummary"
            f"?InstituteCode={college['institute_code']}"
        )
        for branch_code, branch_name, intake in college["branches"]:
            records.append(
                {
                    "academicYear": "2025-26",
                    "admissionRoute": "FE",
                    "instituteCode": college["institute_code"],
                    "collegeName": college["college_name"],
                    "collegeStatus": college["college_status"],
                    "collegeType": college["college_type"],
                    "autonomous": college["autonomous"] == "true",
                    "capSeats": None,
                    "branchCode": branch_code,
                    "branchName": branch_name,
                    "sanctionedIntake": intake,
                    "maharashtraSeats": None,
                    "minoritySeats": None,
                    "allIndiaSeats": None,
                    "instituteSeats": None,
                    "orphanSeats": None,
                    "ewsSeats": None,
                    "tfwsChoiceCode": None,
                    "tfwsSeats": None,
                    "sourceFile": source_url,
                    "sourcePage": 0,
                    "verified": True,
                    "needsReview": False,
                    "reviewReason": "OFFICIAL_INSTITUTE_SUMMARY_INTAKE_ONLY",
                    "coverage": "OFFICIAL_INTAKE_ONLY",
                }
            )
    return records


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    input_path = root / "data" / "staging" / "FE_2025_SeatMatrix.csv"
    output_path = root / "data" / "validated" / "seat_matrix_2025_fixes.json"

    with input_path.open(newline="", encoding="utf-8") as handle:
        recovered = [
            csv_row_to_record(row)
            for row in csv.DictReader(handle)
            if row["institute_code"] in PDF_RECOVERED_CODES
        ]

    records = recovered + summary_records()
    report = {
        "academicYear": "2025-26",
        "authority": "State Common Entrance Test Cell, Government of Maharashtra",
        "summary": {
            "pdfRecoveredColleges": len({row["instituteCode"] for row in recovered}),
            "pdfRecoveredBranches": len(recovered),
            "officialSummaryColleges": len(SUMMARY_FALLBACKS),
            "officialSummaryBranches": len(records) - len(recovered),
            "totalRecords": len(records),
        },
        "records": records,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(f"{json.dumps(report, indent=2)}\n", encoding="utf-8")
    print(json.dumps(report["summary"], indent=2))
    print(f"output={output_path}")


if __name__ == "__main__":
    main()
