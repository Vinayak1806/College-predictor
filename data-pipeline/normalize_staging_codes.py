from __future__ import annotations

import argparse
import csv
import os
from pathlib import Path

from college_predictor.codes import canonical_branch_code, canonical_institute_code


def normalize_file(path: Path) -> tuple[int, int]:
    temp_path = path.with_suffix(f"{path.suffix}.tmp")
    changed_rows = 0
    total_rows = 0

    with path.open(newline="", encoding="utf-8") as source:
        reader = csv.DictReader(source)
        fieldnames = reader.fieldnames or []
        with temp_path.open("w", newline="", encoding="utf-8") as target:
            writer = csv.DictWriter(target, fieldnames=fieldnames)
            writer.writeheader()

            for row in reader:
                total_rows += 1
                original = (
                    row.get("institute_code", ""),
                    row.get("branch_code", ""),
                    row.get("tfws_choice_code", ""),
                )

                if "institute_code" in row:
                    row["institute_code"] = canonical_institute_code(row["institute_code"])
                if "branch_code" in row:
                    row["branch_code"] = canonical_branch_code(row["branch_code"])
                if "tfws_choice_code" in row and row["tfws_choice_code"]:
                    row["tfws_choice_code"] = canonical_branch_code(row["tfws_choice_code"])

                normalized = (
                    row.get("institute_code", ""),
                    row.get("branch_code", ""),
                    row.get("tfws_choice_code", ""),
                )
                if normalized != original:
                    changed_rows += 1

                writer.writerow(row)

    os.replace(temp_path, path)
    return total_rows, changed_rows


def main() -> None:
    parser = argparse.ArgumentParser(description="Canonicalize codes in existing staging CSV files.")
    parser.add_argument("--staging-dir", default="data/staging")
    parser.add_argument("--pattern", default="FE_20*.csv")
    args = parser.parse_args()

    paths = sorted(Path(args.staging_dir).glob(args.pattern))
    if not paths:
        raise SystemExit("No staging CSV files matched the requested pattern.")

    for path in paths:
        total_rows, changed_rows = normalize_file(path)
        print(f"{path.name}: rows={total_rows} changed={changed_rows}")


if __name__ == "__main__":
    main()
