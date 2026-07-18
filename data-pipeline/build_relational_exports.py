from __future__ import annotations

import argparse
import csv
import hashlib
import re
from pathlib import Path


def slugify(value: str) -> str:
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "unknown"


def next_id(counter: dict[str, int], key: str) -> int:
    counter[key] = counter.get(key, 0) + 1
    return counter[key]


def read_stage_files(paths: list[Path], include_review: bool) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for path in paths:
        with path.open(newline="", encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                if not include_review and row.get("needs_review") == "true":
                    continue
                rows.append(row)
    return rows


def infer_city(college_name: str) -> str:
    parts = [part.strip() for part in college_name.split(",") if part.strip()]
    if len(parts) < 2:
        return ""
    city = parts[-1]
    city = re.sub(r"\bDist\.?\b.*$", "", city, flags=re.IGNORECASE).strip()
    city = re.sub(r"\bTal\.?\b.*$", "", city, flags=re.IGNORECASE).strip()
    return city


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build relational PostgreSQL-ready CSV exports.")
    parser.add_argument("--staging-dir", default="data/staging")
    parser.add_argument("--output-dir", default="data/processed/postgres")
    parser.add_argument("--include-review", action="store_true")
    args = parser.parse_args()

    staging_paths = sorted(Path(args.staging_dir).glob("FE_20*_CAP*_MH.csv"))
    rows = read_stage_files(staging_paths, args.include_review)
    output_dir = Path(args.output_dir)

    id_counter: dict[str, int] = {}
    cities: dict[str, dict[str, object]] = {}
    universities: dict[str, dict[str, object]] = {}
    colleges: dict[str, dict[str, object]] = {}
    branches: dict[str, dict[str, object]] = {}
    college_branches: dict[tuple[str, str, str], dict[str, object]] = {}
    seat_types: dict[str, dict[str, object]] = {}
    datasets: dict[tuple[str, str, str, str, str], dict[str, object]] = {}
    cutoffs: list[dict[str, object]] = []

    for row in rows:
        city_name = infer_city(row["college_name"])
        city_id = ""
        if city_name:
            if city_name not in cities:
                cities[city_name] = {
                    "id": next_id(id_counter, "cities"),
                    "name": city_name,
                    "district": "",
                    "region": "",
                }
            city_id = cities[city_name]["id"]

        university_id = ""
        university_name = row.get("university", "").strip()
        if university_name:
            if university_name not in universities:
                universities[university_name] = {
                    "id": next_id(id_counter, "universities"),
                    "name": university_name,
                }
            university_id = universities[university_name]["id"]

        college_code = row["institute_code"]
        if college_code not in colleges:
            college_slug = slugify(f"{college_code}-{row['college_name']}")
            colleges[college_code] = {
                "id": next_id(id_counter, "colleges"),
                "institute_code": college_code,
                "name": row["college_name"],
                "slug": college_slug,
                "city_id": city_id,
                "university_id": university_id,
                "college_type": row.get("college_status", ""),
                "autonomous": "true" if "Autonomous" in row.get("college_status", "") else "false",
                "minority_type": "",
                "official_website": "",
            }

        branch_code = row["branch_code"]
        if branch_code not in branches:
            branches[branch_code] = {
                "id": next_id(id_counter, "branches"),
                "branch_code": branch_code,
                "official_name": row["branch_name"],
                "display_name": row["branch_name"],
                "search_group": "",
            }

        cb_key = (college_code, branch_code, row["academic_year"])
        if cb_key not in college_branches:
            college_branches[cb_key] = {
                "id": next_id(id_counter, "college_branches"),
                "college_id": colleges[college_code]["id"],
                "branch_id": branches[branch_code]["id"],
                "academic_year": row["academic_year"],
                "intake": "",
            }

        seat_code = row["seat_type"]
        if seat_code not in seat_types:
            seat_types[seat_code] = {
                "id": next_id(id_counter, "seat_types"),
                "code": seat_code,
                "category": row["category"],
                "gender": row["gender"],
                "university_type": row["university_type"],
                "special_type": "",
            }

        dataset_key = (
            row["academic_year"],
            row["admission_route"],
            row["cap_round"],
            row["quota"],
            row["source_file"],
        )
        if dataset_key not in datasets:
            digest = hashlib.sha256("|".join(dataset_key).encode("utf-8")).hexdigest()
            datasets[dataset_key] = {
                "id": next_id(id_counter, "cutoff_datasets"),
                "academic_year": row["academic_year"],
                "admission_route": row["admission_route"],
                "cap_round": row["cap_round"],
                "quota": row["quota"],
                "source_filename": row["source_file"],
                "source_url": "",
                "file_hash": digest,
                "status": "VERIFIED",
            }

        cutoffs.append(
            {
                "id": next_id(id_counter, "cutoffs"),
                "dataset_id": datasets[dataset_key]["id"],
                "college_branch_id": college_branches[cb_key]["id"],
                "seat_type_id": seat_types[seat_code]["id"],
                "stage": row["stage"],
                "opening_rank": row["opening_rank"],
                "closing_rank": row["closing_rank"],
                "opening_score": row["opening_score"],
                "closing_score": row["closing_score"],
                "source_page": row["source_page"],
                "verified": "false",
                "needs_review": row["needs_review"],
                "review_reason": row["review_reason"],
            }
        )

    write_csv(output_dir / "cities.csv", ["id", "name", "district", "region"], list(cities.values()))
    write_csv(output_dir / "universities.csv", ["id", "name"], list(universities.values()))
    write_csv(
        output_dir / "colleges.csv",
        [
            "id",
            "institute_code",
            "name",
            "slug",
            "city_id",
            "university_id",
            "college_type",
            "autonomous",
            "minority_type",
            "official_website",
        ],
        list(colleges.values()),
    )
    write_csv(output_dir / "branches.csv", ["id", "branch_code", "official_name", "display_name", "search_group"], list(branches.values()))
    write_csv(output_dir / "college_branches.csv", ["id", "college_id", "branch_id", "academic_year", "intake"], list(college_branches.values()))
    write_csv(output_dir / "seat_types.csv", ["id", "code", "category", "gender", "university_type", "special_type"], list(seat_types.values()))
    write_csv(
        output_dir / "cutoff_datasets.csv",
        ["id", "academic_year", "admission_route", "cap_round", "quota", "source_filename", "source_url", "file_hash", "status"],
        list(datasets.values()),
    )
    write_csv(
        output_dir / "cutoffs.csv",
        [
            "id",
            "dataset_id",
            "college_branch_id",
            "seat_type_id",
            "stage",
            "opening_rank",
            "closing_rank",
            "opening_score",
            "closing_score",
            "source_page",
            "verified",
            "needs_review",
            "review_reason",
        ],
        cutoffs,
    )

    summary = {
        "staging_files": len(staging_paths),
        "source_rows": len(rows),
        "cities": len(cities),
        "universities": len(universities),
        "colleges": len(colleges),
        "branches": len(branches),
        "college_branches": len(college_branches),
        "seat_types": len(seat_types),
        "cutoff_datasets": len(datasets),
        "cutoffs": len(cutoffs),
        "include_review": args.include_review,
    }
    write_csv(output_dir / "summary.csv", list(summary.keys()), [summary])
    print(summary)


if __name__ == "__main__":
    main()

