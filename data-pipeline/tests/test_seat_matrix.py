from extract_seat_matrix import parse_dse_page, parse_page


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


def test_parses_multiple_dse_courses_on_one_page() -> None:
    text = """
    Admission to Direct Second Year Engineering / Technology 2025-26.
    Sr No : 1 Institute Code & Name : 1002 - Government College of Engineering, Amravati
    Choice Code : 100219110 Course Name : Civil Engineering
    Status : Government - Autonomous Vacant Seats within SI : 0 Lateral Entry : 6 Orphan : 0
    Non-Minority Seats Minority Seats OPEN SC ST VJ/DT NTB NTC NTD OBC SEBC
    G L G L G L G L G L G L G L G L G L
    8 0 2 1 0 1 1 0 0 0 0 0 0 0 0 0 1 0 0 1
    Total Seats For PWD : 0 0 0 0 0 0 0 0 0 0
    PWD Reserved Common : 0
    Total Seats For DEF : 0 0 0 0 0 0 0 0 0 0
    DEF Reserved Common : 0
    Total EWS:2[Calculated EWS:1+Carry Forward First Year EWS Vacancy from AY 2024-25:1]
    Sr No : 2 Institute Code & Name : 1002 - Government College of Engineering, Amravati
    Choice Code : 100224210 Course Name : Computer Science and Engineering
    Status : Government - Autonomous Vacant Seats within SI : 1 Lateral Entry : 6 Orphan : 1
    Non-Minority Seats Minority Seats OPEN SC ST VJ/DT NTB NTC NTD OBC SEBC
    G L G L G L G L G L G L G L G L G L
    9 0 2 1 1 0 1 0 0 0 0 0 0 0 0 0 1 0 1 0
    Total EWS:1[Calculated EWS:1+Carry Forward First Year EWS Vacancy from AY 2024-25:0]
    """

    rows = parse_dse_page(text, 2, "dse-seat-matrix.pdf", "2025-26")

    assert len(rows) == 2
    assert rows[0]["admission_route"] == "DSE"
    assert rows[0]["lateral_entry_seats"] == "6"
    assert rows[0]["cap_seats"] == "10"
    assert rows[0]["needs_review"] == "false"
    assert rows[1]["vacant_seats"] == "1"
    assert rows[1]["orphan_seats"] == "1"
