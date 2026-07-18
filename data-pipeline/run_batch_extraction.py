from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Batch extract normalized CAP cutoff PDFs.")
    parser.add_argument("--raw-dir", default="data/raw/fe")
    parser.add_argument("--staging-dir", default="data/staging")
    parser.add_argument("--reports-dir", default="data/reports")
    parser.add_argument("--pattern", default="FE_20*_CAP*_MH.pdf")
    args = parser.parse_args()

    raw_paths = sorted(Path(args.raw_dir).glob(f"**/{args.pattern}"))
    if not raw_paths:
        raise SystemExit(f"No PDFs found under {args.raw_dir} for {args.pattern}")

    for pdf_path in raw_paths:
        stem = pdf_path.stem
        output_path = Path(args.staging_dir) / f"{stem}.csv"
        report_path = Path(args.reports_dir) / f"{stem}.json"
        print(f"Extracting {pdf_path} -> {output_path}", flush=True)
        subprocess.run(
            [
                sys.executable,
                str(Path(__file__).with_name("extract_cutoffs.py")),
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

