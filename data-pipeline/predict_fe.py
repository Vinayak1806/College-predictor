from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

from college_predictor.seat_types import eligible_seat_types


def zone_from_margin(margin: float) -> str:
    if margin >= 3.0:
        return "SAFE"
    if margin >= 0.0:
        return "TARGET"
    if margin >= -2.0:
        return "AMBITIOUS"
    return "HIGHLY_AMBITIOUS"


ZONE_ORDER = {
    "SAFE": 0,
    "TARGET": 1,
    "AMBITIOUS": 2,
    "HIGHLY_AMBITIOUS": 3,
}


def parse_float(value: str) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def main() -> None:
    parser = argparse.ArgumentParser(description="Run a basic FE percentile predictor from staged cutoffs.")
    parser.add_argument("--cutoffs", required=True)
    parser.add_argument("--percentile", type=float, required=True)
    parser.add_argument("--category", required=True)
    parser.add_argument("--gender", required=True)
    parser.add_argument("--university-type", required=True, choices=["HOME", "OTHER", "STATE"])
    parser.add_argument("--branch", default="")
    parser.add_argument("--city", default="")
    parser.add_argument("--include-review", action="store_true")
    parser.add_argument("--limit", type=int, default=25)
    args = parser.parse_args()

    allowed_seats = eligible_seat_types(
        category=args.category,
        gender=args.gender,
        university_type=args.university_type,
    )
    branch_query = args.branch.lower()
    city_query = args.city.lower()
    results: list[dict[str, object]] = []

    with Path(args.cutoffs).open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            if row["seat_type"] not in allowed_seats:
                continue
            if not args.include_review and row["needs_review"] == "true":
                continue
            if branch_query and branch_query not in row["branch_name"].lower():
                continue
            if city_query and city_query not in row["college_name"].lower():
                continue
            cutoff = parse_float(row["closing_score"])
            if cutoff is None:
                continue
            margin = args.percentile - cutoff
            results.append(
                {
                    "college": row["college_name"],
                    "branch": row["branch_name"],
                    "zone": zone_from_margin(margin),
                    "studentScore": args.percentile,
                    "closingCutoff": cutoff,
                    "margin": round(margin, 4),
                    "year": row["academic_year"],
                    "round": int(row["cap_round"]),
                    "seatType": row["seat_type"],
                    "sourceFile": row["source_file"],
                    "sourcePage": int(row["source_page"]),
                    "reason": f"Your percentile is {margin:+.2f} points compared with the historical closing cutoff.",
                }
            )

    results.sort(key=lambda item: (ZONE_ORDER[str(item["zone"])], -float(item["margin"])))
    print(json.dumps(results[: args.limit], indent=2))


if __name__ == "__main__":
    main()
