from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Batch extract FE seat matrix PDFs.")
    parser.add_argument("--raw-dir", default="data/raw/fe")
    parser.add_argument("--staging-dir", default="data/staging")
    parser.add_argument("--reports-dir", default="data/reports")
    args = parser.parse_args()

    pdf_paths = sorted(Path(args.raw_dir).glob("**/FE_*_SeatMatrix.pdf"))
    if not pdf_paths:
        raise SystemExit("No FE seat matrix PDFs found.")

    for pdf_path in pdf_paths:
        stem = pdf_path.stem
        output_path = Path(args.staging_dir) / f"{stem}.csv"
        report_path = Path(args.reports_dir) / f"{stem}.json"
        print(f"Extracting {pdf_path}", flush=True)
        subprocess.run(
            [
                sys.executable,
                str(Path(__file__).with_name("extract_seat_matrix.py")),
                "--input",
                str(pdf_path),
                "--output",
                str(output_path),
                "--report",
                str(report_path),
            ],
            check=True,
        )


if __name__ == "__main__":
    main()

