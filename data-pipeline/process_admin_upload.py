from __future__ import annotations

import argparse
import csv
import json
import subprocess
import sys
from pathlib import Path


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def main() -> None:
    parser = argparse.ArgumentParser(description="Process one supported admin data upload.")
    parser.add_argument("--document-type", required=True, choices=["CUTOFF_PDF", "SEAT_MATRIX_PDF"])
    parser.add_argument("--input", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--original-filename", required=True)
    parser.add_argument("--route", default="FE", choices=["FE", "DSE"])
    parser.add_argument("--academic-year", required=True)
    parser.add_argument("--cap-round", type=int, default=0)
    parser.add_argument("--quota", default="MH")
    args = parser.parse_args()

    pipeline_dir = Path(__file__).resolve().parent
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    csv_path = output_dir / "records.csv"
    report_path = output_dir / "report.json"

    if args.document_type == "CUTOFF_PDF":
        if not args.cap_round:
            raise SystemExit("CAP round is required for cutoff PDFs.")
        run(
            [
                sys.executable,
                str(pipeline_dir / "extract_cutoffs.py"),
                "--input",
                args.input,
                "--output",
                str(csv_path),
                "--report",
                str(report_path),
                "--route",
                args.route,
                "--academic-year",
                args.academic_year,
                "--cap-round",
                str(args.cap_round),
                "--quota",
                args.quota,
            ]
        )
        record_type = "CUTOFF"
    else:
        run(
            [
                sys.executable,
                str(pipeline_dir / "extract_seat_matrix.py"),
                "--input",
                args.input,
                "--output",
                str(csv_path),
                "--report",
                str(report_path),
                "--academic-year",
                args.academic_year,
                "--route",
                args.route,
            ]
        )
        record_type = "SEAT_MATRIX"

    rows = read_csv(csv_path)
    for row in rows:
        row["source_file"] = args.original_filename

    report = json.loads(report_path.read_text(encoding="utf-8"))
    report["file"] = args.original_filename
    report["document_type"] = args.document_type
    report["academic_year"] = args.academic_year
    report["admission_route"] = args.route
    if args.cap_round:
        report["cap_round"] = args.cap_round
    report["quota"] = args.quota
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    records_path = output_dir / "records.json"
    records_path.write_text(
        json.dumps(
            [{"recordType": record_type, "data": row} for row in rows],
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    print(json.dumps({"records": len(rows), "records_path": str(records_path), "report_path": str(report_path)}))


if __name__ == "__main__":
    main()
