from extract_seat_matrix import parse_page


def test_parses_choice_codes_with_official_letter_suffixes() -> None:
    text = """
    Admissions A.Y. 2025-26
    03025 - Example College
    Un-Aided CAP Seats:60
    0302524270U Computer Science and Engineering 60 39 0 9 12 0
    Economically Weaker Section (EWS) Seats: 6 Tution Fee Waiver Scheme Choice Code: 0302524271U : Seats: 3
    """

    row = parse_page(text, 1, "2025SeatMatrix.pdf", "2025-26")

    assert row is not None
    assert row["institute_code"] == "03025"
    assert row["branch_code"] == "0302524270U"
    assert row["tfws_choice_code"] == "0302524271U"
