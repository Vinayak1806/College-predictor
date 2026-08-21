from __future__ import annotations

import argparse
import csv
import json
import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

import pdfplumber

from college_predictor.codes import normalize_branch_code, normalize_institute_code
from college_predictor.seat_types import (
    decode_seat_type,
    merge_wrapped_heading_tokens,
    normalize_seat_type,
)


FIELDNAMES = [
    "academic_year",
    "admission_route",
    "cap_round",
    "quota",
    "institute_code",
    "college_name",
    "branch_code",
    "branch_name",
    "college_status",
    "university",
    "section",
    "seat_type",
    "category",
    "gender",
    "university_type",
    "stage",
    "opening_rank",
    "closing_rank",
    "opening_score",
    "closing_score",
    "source_file",
    "source_page",
    "extraction_method",
    "verified",
    "needs_review",
    "review_reason",
]

COLLEGE_RE = re.compile(r"^(?P<code>\d{4,5})\s*-\s*(?P<name>.+)$")
BRANCH_RE = re.compile(r"^(?P<code>\d{9,10}[A-Z]{0,3})\s*-\s*(?P<name>.+)$")
DSE_COLLEGE_RE = re.compile(
    r"^(?P<code>\d{4,5})\s+(?P<name>.+?)(?:\s+\((?P<status>[^()]*)\))?$"
)
DSE_BRANCH_RE = re.compile(
    r"^Choice Code\s*:\s*(?P<code>\d{9,10}[A-Z]?)\s+Course Name\s*:\s*(?P<name>.+)$",
    re.IGNORECASE,
)
YEAR_RE = re.compile(r"Admissions A\.Y\.\s*(20\d{2}-\d{2})")
RANK_RE = re.compile(r"\b\d{1,6}\b")
SCORE_RE = re.compile(r"\((\d+(?:\.\d+)?)\)")
STAGE_RE = re.compile(r"^(?P<stage>[IVX]+(?:-Non)?)(?:\s+(?P<values>.*))?$")
DSE_STAGE_RE = re.compile(r"^Stage-(?P<stage>[IVX]+(?:-Non)?)$", re.IGNORECASE)
DSE_SCORE_RE = re.compile(r"^\((?P<score>\d+(?:\.\d+)?)%?\)$")

SECTION_TYPES = {
    "Home University Seats Allotted to Home University Candidates": "HOME",
    "Home University Seats Allotted to Other Than Home University Candidates": "HOME_FOR_OTHER",
    "Other Than Home University Seats Allotted to Other Than Home University Candidates": "OTHER",
    "Other Than Home University Seats Allotted to Home University Candidates": "OTHER_FOR_HOME",
    "State Level": "STATE",
}


@dataclass
class Context:
    institute_code: str = ""
    college_name: str = ""
    branch_code: str = ""
    branch_name: str = ""
    college_status: str = ""
    university: str = ""
    section: str = ""


def infer_round(path: Path) -> int:
    match = re.search(r"CAP\s*([1-4])|CAP([1-4])", path.name, re.IGNORECASE)
    if not match:
        return 0
    return int(next(group for group in match.groups() if group))


def infer_year(path: Path) -> str:
    match = re.search(r"(20\d{2})", path.name)
    if not match:
        return ""
    start = int(match.group(1))
    return f"{start}-{str(start + 1)[-2:]}"


def is_noise(line: str) -> bool:
    return (
        not line
        or line.startswith("D Government of Maharashtra")
        or line.startswith("i State Common Entrance Test Cell")
        or line.startswith("r Cut Off List")
        or line.startswith("Master of Engineering")
        or line.startswith("Legends:")
        or line.startswith("* Maharashtra State Seats")
        or line.isdigit()
    )


def split_status(line: str) -> tuple[str, str]:
    value = line.removeprefix("Status:").strip()
    if "Home University :" not in value:
        return value, ""
    status, university = value.split("Home University :", 1)
    return status.strip(), university.strip()


def collect_stage_header(lines: list[str], start: int) -> tuple[list[str], int]:
    tokens = lines[start].split()[1:]
    index = start + 1
    while index < len(lines):
        current = lines[index].strip()
        if not current:
            index += 1
            continue
        if STAGE_RE.match(current) or current in SECTION_TYPES or current.startswith("Status:"):
            break
        if COLLEGE_RE.match(current) or BRANCH_RE.match(current):
            break
        if re.search(r"\d", current) or current.startswith("("):
            break
        tokens.extend(current.split())
        index += 1
    return merge_wrapped_heading_tokens(tokens), index


def make_record(
    *,
    ctx: Context,
    seat_type: str,
    stage: str,
    rank: str,
    score: str,
    args: argparse.Namespace,
    page_number: int,
    needs_review: bool,
    reasons: list[str],
) -> dict[str, str]:
    decoded = decode_seat_type(seat_type)
    if decoded is None:
        category = gender = university_type = "UNKNOWN"
        needs_review = True
        reasons.append("UNKNOWN_SEAT_TYPE")
    else:
        category = decoded.category
        gender = decoded.gender
        university_type = decoded.university_type

    return {
        "academic_year": args.academic_year,
        "admission_route": args.route,
        "cap_round": str(args.cap_round),
        "quota": args.quota,
        "institute_code": ctx.institute_code,
        "college_name": ctx.college_name,
        "branch_code": ctx.branch_code,
        "branch_name": ctx.branch_name,
        "college_status": ctx.college_status,
        "university": ctx.university,
        "section": ctx.section,
        "seat_type": seat_type,
        "category": category,
        "gender": gender,
        "university_type": university_type,
        "stage": stage,
        "opening_rank": "",
        "closing_rank": rank,
        "opening_score": "",
        "closing_score": score,
        "source_file": Path(args.input).name,
        "source_page": str(page_number),
        "extraction_method": "pdfplumber_text",
        "verified": "false",
        "needs_review": str(needs_review).lower(),
        "review_reason": ";".join(sorted(set(reasons))),
    }


def is_seat_header(line: str) -> list[str] | None:
    tokens = line.split()
    if not tokens:
        return None
    normalized = []
    for token in tokens:
        code = normalize_seat_type(token)
        if decode_seat_type(code) is None:
            return None
        normalized.append(code)
    return normalized


def parse_page(text: str, page_number: int, args: argparse.Namespace) -> list[dict[str, str]]:
    raw_lines = [line.strip() for line in text.splitlines()]
    lines = [line for line in raw_lines if not is_noise(line)]
    ctx = Context()
    records: list[dict[str, str]] = []
    seat_types: list[str] = []
    current_ranks: list[str] = []
    current_stage: str = "Stage-I"
    index = 0

    while index < len(lines):
        line = lines[index]

        college_match = COLLEGE_RE.match(line)
        if college_match:
            ctx.institute_code = normalize_institute_code(college_match.group("code"))
            ctx.college_name = college_match.group("name").strip()
            ctx.branch_code = ""
            ctx.branch_name = ""
            ctx.section = ""
            seat_types = []
            current_ranks = []
            index += 1
            continue

        branch_match = BRANCH_RE.match(line)
        if branch_match:
            ctx.branch_code = normalize_branch_code(branch_match.group("code"))
            ctx.branch_name = branch_match.group("name").strip()
            ctx.section = ""
            seat_types = []
            current_ranks = []
            index += 1
            continue

        if line.startswith("Status:"):
            ctx.college_status, ctx.university = split_status(line)
            index += 1
            continue

        if line in SECTION_TYPES:
            ctx.section = SECTION_TYPES[line]
            seat_types = []
            current_ranks = []
            index += 1
            continue

        if line.startswith("Stage "):
            seat_types, index = collect_stage_header(lines, index)
            current_ranks = []
            continue

        seat_header = is_seat_header(line)
        if seat_header:
            seat_types = seat_header
            current_ranks = []
            index += 1
            continue

        if seat_types:
            stage_match = STAGE_RE.match(line)
            ranks = RANK_RE.findall(line)
            scores = SCORE_RE.findall(line)

            if stage_match and not ranks and not scores:
                current_stage = stage_match.group("stage")
                index += 1
                continue

            if ranks and len(ranks) == len(seat_types) and not scores:
                current_ranks = ranks
                index += 1
                continue

            if scores and len(scores) == len(seat_types) and current_ranks:
                stage = current_stage or "Stage-I"
                needs_review = len(current_ranks) != len(seat_types) or len(scores) != len(current_ranks)
                reasons: list[str] = []
                if len(current_ranks) != len(seat_types):
                    reasons.append("COLUMN_ALIGNMENT_UNCERTAIN")
                if len(scores) != len(current_ranks):
                    reasons.append("RANK_SCORE_COUNT_MISMATCH")

                for position, rank in enumerate(current_ranks):
                    seat_type = seat_types[position] if position < len(seat_types) else ""
                    score = scores[position] if position < len(scores) else ""
                    records.append(
                        make_record(
                            ctx=ctx,
                            seat_type=seat_type,
                            stage=stage,
                            rank=rank,
                            score=score,
                            args=args,
                            page_number=page_number,
                            needs_review=needs_review,
                            reasons=reasons.copy(),
                        )
                    )
                seat_types = []
                current_ranks = []
                index += 1
                continue

        stage_match = STAGE_RE.match(line)
        if stage_match and seat_types:
            stage = stage_match.group("stage")
            ranks = RANK_RE.findall(stage_match.group("values") or "")
            score_text = ""
            next_index = index + 1
            if next_index < len(lines):
                score_text = lines[next_index]
                next_index += 1
            scores = SCORE_RE.findall(score_text)

            needs_review = len(ranks) != len(seat_types) or len(scores) != len(ranks)
            reasons: list[str] = []
            if len(ranks) != len(seat_types):
                reasons.append("COLUMN_ALIGNMENT_UNCERTAIN")
            if len(scores) != len(ranks):
                reasons.append("RANK_SCORE_COUNT_MISMATCH")

            for position, rank in enumerate(ranks):
                seat_type = seat_types[position] if position < len(seat_types) else ""
                score = scores[position] if position < len(scores) else ""
                records.append(
                    make_record(
                        ctx=ctx,
                        seat_type=seat_type,
                        stage=stage,
                        rank=rank,
                        score=score,
                        args=args,
                        page_number=page_number,
                        needs_review=needs_review,
                        reasons=reasons.copy(),
                    )
                )
            index = next_index
            continue

        year_match = YEAR_RE.search(line)
        if year_match and not args.academic_year:
            args.academic_year = year_match.group(1)

        index += 1

    return records


def fe_positioned_lines(page) -> list[tuple[float, str]]:
    lines: list[tuple[float, str]] = []
    for line in group_words_into_lines(page.extract_words() or []):
        text = " ".join(str(word["text"]) for word in line).strip()
        lines.append((float(line[0]["top"]), text))
    return lines


def fe_context_before_table(lines: list[tuple[float, str]], table_top: float) -> Context:
    ctx = Context()
    for line_top, line in lines:
        if line_top >= table_top:
            break

        college_match = COLLEGE_RE.match(line)
        if college_match:
            ctx.institute_code = normalize_institute_code(college_match.group("code"))
            ctx.college_name = college_match.group("name").strip()
            ctx.branch_code = ""
            ctx.branch_name = ""
            ctx.section = ""
            continue

        branch_match = BRANCH_RE.match(line)
        if branch_match:
            ctx.branch_code = normalize_branch_code(branch_match.group("code"))
            ctx.branch_name = branch_match.group("name").strip()
            ctx.section = ""
            continue

        if line.startswith("Status:"):
            ctx.college_status, ctx.university = split_status(line)
            continue

        if line in SECTION_TYPES:
            ctx.section = SECTION_TYPES[line]

    if not ctx.section:
        ctx.section = "STATE"
    return ctx


def parse_fe_table_page(page, page_number: int, args: argparse.Namespace) -> list[dict[str, str]]:
    positioned_lines = fe_positioned_lines(page)
    records: list[dict[str, str]] = []

    for table in page.find_tables():
        rows = table.extract() or []
        if len(rows) < 2 or len(rows[0]) < 2:
            continue

        seat_types = [normalize_seat_type(value or "") for value in rows[0][1:]]
        if not any(seat_types):
            continue

        table_context = fe_context_before_table(positioned_lines, float(table.bbox[1]))

        for row in rows[1:]:
            stage = str(row[0] or "").strip()
            if not re.fullmatch(r"[IVX]+(?:-Non)?", stage, re.IGNORECASE):
                continue

            for position, cell in enumerate(row[1:]):
                value = str(cell or "").strip()
                if not value:
                    continue

                rank_match = RANK_RE.search(value)
                score_match = SCORE_RE.search(value)
                reasons: list[str] = []
                if not rank_match or not score_match:
                    reasons.append("RANK_SCORE_COUNT_MISMATCH")

                seat_type = seat_types[position] if position < len(seat_types) else ""
                record = make_record(
                    ctx=table_context,
                    seat_type=seat_type,
                    stage=stage,
                    rank=rank_match.group(0) if rank_match else "",
                    score=score_match.group(1) if score_match else "",
                    args=args,
                    page_number=page_number,
                    needs_review=bool(reasons),
                    reasons=reasons,
                )
                record["extraction_method"] = "pdfplumber_table"
                records.append(record)

    return records


def group_words_into_lines(words: list[dict]) -> list[list[dict]]:
    lines: list[list[dict]] = []
    for word in sorted(words, key=lambda item: (round(float(item["top"]), 1), float(item["x0"]))):
        if not lines or abs(float(lines[-1][0]["top"]) - float(word["top"])) > 1:
            lines.append([word])
        else:
            lines[-1].append(word)
    return [sorted(line, key=lambda item: float(item["x0"])) for line in lines]


def word_center(word: dict) -> float:
    return (float(word["x0"]) + float(word["x1"])) / 2


def dse_header(line: list[dict]) -> list[tuple[str, float]]:
    if not line or float(line[0]["x0"]) < 75:
        return []

    headers: list[tuple[str, float]] = []
    for word in line:
        code = normalize_seat_type(str(word["text"]))
        if decode_seat_type(code) is None:
            return []
        headers.append((code, word_center(word)))
    return headers


def nearest_header(headers: list[tuple[str, float]], x_position: float) -> str | None:
    if not headers:
        return None
    code, header_x = min(headers, key=lambda item: abs(item[1] - x_position))
    return code if abs(header_x - x_position) <= 38 else None


def parse_dse_page(words: list[dict], page_number: int, args: argparse.Namespace) -> list[dict[str, str]]:
    lines = group_words_into_lines(words)
    all_words = [word for line in lines for word in line]
    ctx = Context(section="STATE")
    headers: list[tuple[str, float]] = []
    records: list[dict[str, str]] = []

    for line in lines:
        text = " ".join(str(word["text"]) for word in line).strip()

        college_match = DSE_COLLEGE_RE.match(text)
        if college_match and float(line[0]["x0"]) < 50:
            ctx.institute_code = normalize_institute_code(college_match.group("code"))
            ctx.college_name = college_match.group("name").strip()
            ctx.college_status = (college_match.group("status") or "").strip()
            ctx.branch_code = ""
            ctx.branch_name = ""
            headers = []
            continue

        branch_match = DSE_BRANCH_RE.match(text)
        if branch_match:
            ctx.branch_code = normalize_branch_code(branch_match.group("code"))
            ctx.branch_name = branch_match.group("name").strip()
            headers = []
            continue

        possible_headers = dse_header(line)
        if possible_headers and ctx.branch_code:
            headers = possible_headers
            continue

        stage_match = DSE_STAGE_RE.match(text)
        if not stage_match or not headers or not ctx.branch_code:
            continue

        stage_top = float(line[0]["top"])
        nearby = [
            word
            for word in all_words
            if float(word["x0"]) >= 75 and abs(float(word["top"]) - stage_top) <= 10
        ]
        rank_words = [
            word for word in nearby
            if float(word["top"]) < stage_top and re.fullmatch(r"\d{1,7}", str(word["text"]))
        ]
        score_words = [
            word for word in nearby
            if DSE_SCORE_RE.fullmatch(str(word["text"]))
        ]

        for rank_word in rank_words:
            seat_type = nearest_header(headers, word_center(rank_word))
            score_word = min(
                score_words,
                key=lambda word: abs(word_center(word) - word_center(rank_word)),
                default=None,
            )
            score_match = DSE_SCORE_RE.fullmatch(str(score_word["text"])) if score_word else None
            reasons: list[str] = []
            if not seat_type:
                reasons.append("COLUMN_ALIGNMENT_UNCERTAIN")
            if score_word is None or abs(word_center(score_word) - word_center(rank_word)) > 20:
                reasons.append("RANK_SCORE_COUNT_MISMATCH")

            records.append(
                make_record(
                    ctx=ctx,
                    seat_type=seat_type or "",
                    stage=stage_match.group("stage").upper(),
                    rank=str(rank_word["text"]),
                    score=score_match.group("score") if score_match and not reasons else "",
                    args=args,
                    page_number=page_number,
                    needs_review=bool(reasons),
                    reasons=reasons,
                )
            )

    return records


def validate_records(records: list[dict[str, str]]) -> Counter:
    counts: Counter = Counter()
    seen: set[tuple[str, ...]] = set()
    for row in records:
        issues = set(filter(None, row["review_reason"].split(";")))
        if not row["institute_code"]:
            issues.add("MISSING_INSTITUTE_CODE")
        if not row["college_name"]:
            issues.add("MISSING_COLLEGE_NAME")
        if not row["branch_code"]:
            issues.add("MISSING_BRANCH_CODE")
        if not row["seat_type"]:
            issues.add("MISSING_SEAT_TYPE")
        if row["admission_route"] not in {"FE", "DSE"}:
            issues.add("INVALID_ROUTE")
        if row["cap_round"] not in {"1", "2", "3", "4"}:
            issues.add("INVALID_CAP_ROUND")
        try:
            rank = int(row["closing_rank"])
            if rank <= 0:
                issues.add("INVALID_RANK")
        except ValueError:
            issues.add("INVALID_RANK")
        if row["closing_score"]:
            try:
                score = float(row["closing_score"])
                if score < 0 or score > 100:
                    issues.add("INVALID_SCORE")
            except ValueError:
                issues.add("INVALID_SCORE")

        unique_key = (
            row["academic_year"],
            row["admission_route"],
            row["cap_round"],
            row["quota"],
            row["institute_code"],
            row["branch_code"],
            row["seat_type"],
            row["stage"],
            row["section"],
        )
        if unique_key in seen:
            issues.add("DUPLICATE_UNIQUE_KEY")
            counts["duplicate_records"] += 1
        seen.add(unique_key)

        row["review_reason"] = ";".join(sorted(issues))
        row["needs_review"] = str(bool(issues)).lower()
        counts["needs_review" if issues else "valid"] += 1
        for issue in issues:
            counts[f"issue:{issue}"] += 1
    return counts


def write_csv(rows: list[dict[str, str]], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)


def write_report(rows: list[dict[str, str]], counts: Counter, args: argparse.Namespace, pages: int) -> None:
    report = {
        "file": Path(args.input).name,
        "academic_year": args.academic_year,
        "admission_route": args.route,
        "cap_round": args.cap_round,
        "quota": args.quota,
        "pages_processed": pages,
        "colleges_found": len({row["institute_code"] for row in rows if row["institute_code"]}),
        "branches_found": len({row["branch_code"] for row in rows if row["branch_code"]}),
        "cutoff_records": len(rows),
        "valid_records": counts["valid"],
        "records_needing_review": counts["needs_review"],
        "duplicate_records": counts["duplicate_records"],
        "issues": {key.removeprefix("issue:"): value for key, value in counts.items() if key.startswith("issue:")},
    }
    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract Maharashtra CAP cutoff records from PDF text.")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--report", required=True)
    parser.add_argument("--route", default="FE", choices=["FE", "DSE"])
    parser.add_argument("--academic-year", default="")
    parser.add_argument("--cap-round", type=int, default=0)
    parser.add_argument("--quota", default="MH")
    parser.add_argument("--limit-pages", type=int, default=0)
    args = parser.parse_args()

    input_path = Path(args.input)
    if not args.academic_year:
        args.academic_year = infer_year(input_path)
    if not args.cap_round:
        args.cap_round = infer_round(input_path)

    rows: list[dict[str, str]] = []
    with pdfplumber.open(input_path) as pdf:
        pages_to_process = min(args.limit_pages or len(pdf.pages), len(pdf.pages))
        for page_number, page in enumerate(pdf.pages[:pages_to_process], start=1):
            text = page.extract_text() or ""
            if args.route == "DSE":
                extracted = parse_dse_page(page.extract_words() or [], page_number, args)
                if not extracted:
                    table_rows = parse_fe_table_page(page, page_number, args)
                    extracted = table_rows or parse_page(text, page_number, args)
                rows.extend(extracted)
            else:
                table_rows = parse_fe_table_page(page, page_number, args)
                rows.extend(table_rows or parse_page(text, page_number, args))

    counts = validate_records(rows)
    write_csv(rows, Path(args.output))
    write_report(rows, counts, args, pages_to_process)
    print(f"records={len(rows)} valid={counts['valid']} needs_review={counts['needs_review']}")
    print(f"csv={args.output}")
    print(f"report={args.report}")


if __name__ == "__main__":
    main()
