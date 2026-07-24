from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path

from college_predictor.codes import CURRENT_INSTITUTE_CODE_ALIASES


def read_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def duplicate_values(rows: list[dict[str, str]], field: str) -> list[str]:
    seen: set[str] = set()
    duplicates: set[str] = set()
    for row in rows:
        value = row[field]
        if value in seen:
            duplicates.add(value)
        seen.add(value)
    return sorted(duplicates)


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate PostgreSQL-ready relational CSV exports.")
    parser.add_argument("--input-dir", default="data/processed/postgres")
    parser.add_argument("--staging-dir", default="data/staging")
    args = parser.parse_args()
    data_dir = Path(args.input_dir)

    cities = read_rows(data_dir / "cities.csv")
    colleges = read_rows(data_dir / "colleges.csv")
    branches = read_rows(data_dir / "branches.csv")
    college_branches = read_rows(data_dir / "college_branches.csv")
    seat_types = read_rows(data_dir / "seat_types.csv")
    datasets = read_rows(data_dir / "cutoff_datasets.csv")
    cutoffs = read_rows(data_dir / "cutoffs.csv")
    matrix_rows = [
        row
        for path in sorted(Path(args.staging_dir).glob("FE_20??_SeatMatrix.csv"))
        for row in read_rows(path)
    ]

    errors: list[str] = []
    city_ids = {row["id"] for row in cities}
    college_ids = {row["id"] for row in colleges}
    branch_ids = {row["id"] for row in branches}
    college_branch_ids = {row["id"] for row in college_branches}
    seat_type_ids = {row["id"] for row in seat_types}
    dataset_ids = {row["id"] for row in datasets}

    invalid_college_codes = [row["institute_code"] for row in colleges if len(row["institute_code"]) != 5 or not row["institute_code"].isdigit()]
    invalid_branch_codes = [
        row["branch_code"]
        for row in branches
        if not re.fullmatch(r"\d{10}[A-Z]?", row["branch_code"])
    ]
    if invalid_college_codes:
        errors.append(f"Invalid institute codes: {invalid_college_codes[:5]}")
    if invalid_branch_codes:
        errors.append(f"Invalid branch codes: {invalid_branch_codes[:5]}")

    deprecated_codes = set(CURRENT_INSTITUTE_CODE_ALIASES)
    deprecated_college_codes = [
        row["institute_code"]
        for row in colleges
        if row["institute_code"] in deprecated_codes
    ]
    deprecated_branch_codes = [
        row["branch_code"]
        for row in branches
        if row["branch_code"][:5] in deprecated_codes
    ]
    if deprecated_college_codes:
        errors.append(f"Deprecated institute codes remain: {deprecated_college_codes[:5]}")
    if deprecated_branch_codes:
        errors.append(f"Choice codes use deprecated institute prefixes: {deprecated_branch_codes[:5]}")

    duplicate_city_names = duplicate_values(
        [{"name": row["name"].strip().casefold()} for row in cities],
        "name",
    )
    invalid_city_names = [
        row["name"]
        for row in cities
        if re.search(r"\d", row["name"])
        or row["name"] != row["name"].strip()
        or row["name"].endswith(".")
    ]
    invalid_city_metadata = [
        row["name"]
        for row in cities
        if not row["district"] or not row["region"]
    ]
    if duplicate_city_names:
        errors.append(f"Duplicate canonical city names: {duplicate_city_names[:5]}")
    if invalid_city_names:
        errors.append(f"Invalid city names: {invalid_city_names[:5]}")
    if invalid_city_metadata:
        errors.append(f"Cities missing district or region: {invalid_city_metadata[:5]}")

    invalid_matrix_codes = [
        f"{row['academic_year']}:{row['branch_code']}"
        for row in matrix_rows
        if len(row["institute_code"]) != 5
        or not row["institute_code"].isdigit()
        or len(row["branch_code"]) != 10
        or not row["branch_code"].isdigit()
    ]
    if invalid_matrix_codes:
        errors.append(f"Invalid seat-matrix codes: {invalid_matrix_codes[:5]}")

    deprecated_matrix_codes = [
        f"{row['academic_year']}:{row['institute_code']}:{row['branch_code']}"
        for row in matrix_rows
        if row["institute_code"] in deprecated_codes
        or row["branch_code"][:5] in deprecated_codes
    ]
    if deprecated_matrix_codes:
        errors.append(f"Seat matrices use deprecated institute codes: {deprecated_matrix_codes[:5]}")

    for filename, rows, field in [
        ("cities.csv", cities, "id"),
        ("colleges.csv", colleges, "institute_code"),
        ("branches.csv", branches, "branch_code"),
        ("college_branches.csv", college_branches, "id"),
        ("seat_types.csv", seat_types, "code"),
        ("cutoff_datasets.csv", datasets, "id"),
        ("cutoffs.csv", cutoffs, "id"),
    ]:
        duplicates = duplicate_values(rows, field)
        if duplicates:
            errors.append(f"{filename} has duplicate {field} values: {duplicates[:5]}")

    invalid_college_branches = [
        row["id"] for row in college_branches
        if row["college_id"] not in college_ids or row["branch_id"] not in branch_ids
    ]
    if invalid_college_branches:
        errors.append(f"College-branch foreign-key failures: {invalid_college_branches[:5]}")

    invalid_college_cities = [
        row["institute_code"]
        for row in colleges
        if not row["city_id"] or row["city_id"] not in city_ids
    ]
    if invalid_college_cities:
        errors.append(f"Colleges missing canonical cities: {invalid_college_cities[:5]}")

    invalid_cutoffs = [
        row["id"] for row in cutoffs
        if row["dataset_id"] not in dataset_ids
        or row["college_branch_id"] not in college_branch_ids
        or row["seat_type_id"] not in seat_type_ids
    ]
    if invalid_cutoffs:
        errors.append(f"Cutoff foreign-key failures: {invalid_cutoffs[:5]}")

    summary = {
        "cities": len(cities),
        "colleges": len(colleges),
        "branches": len(branches),
        "college_branches": len(college_branches),
        "seat_types": len(seat_types),
        "datasets": len(datasets),
        "cutoffs": len(cutoffs),
        "seat_matrices": len(matrix_rows),
        "errors": errors,
    }
    print(json.dumps(summary, indent=2))
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
