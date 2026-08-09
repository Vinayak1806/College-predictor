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


def test_parses_2026_dse_layout_with_wrapped_course_and_split_institute_header() -> None:
    text = """
    Provisional Seat Matrix for CAP Round I for Direct Second Year Engineering / Technology 2026-27
    Sr No : 223 Institute Code & Name : 2114 - Deogiri Institute of Engineering and Management Studies, Aurangabad Orphan : 0
    Course Name : Computer Science and Engineering(Artificial Intelligence and
    Choice Code : 0211491110 Inst. Non-Inst.
    Machine Learning)
    Status : Un-Aided - Autonomous Vacant Seats within SI : 3 Lateral Entry : 6 0 0
    Non-Minority Seats Minority Seats OPEN SC ST VJ/DT NTB NTC NTD OBC SEBC
    G L G L G L G L G L G L G L G L G L
    11 0 3 1 0 1 1 0 1 0 0 0 0 0 0 0 2 0 0 1
    Total EWS:1[Calculated EWS:1+Carry Forward First Year EWS Vacancy from AY 2025-26:0]
    Institute Code & Name : 2116 - Matoshri Pratishan's Group of Institutions (Integrated Campus),
    Sr No : 224 Orphan : 0
    Kupsarwadi , Nanded
    Choice Code : 0211619110 Course Name : Civil Engineering Inst. Non-Inst.
    Status : Un-Aided Vacant Seats within SI : 33 Lateral Entry : 6 0 0
    Non-Minority Seats Minority Seats OPEN SC ST VJ/DT NTB NTC NTD OBC SEBC
    G L G L G L G L G L G L G L G L G L
    41 0 9 5 3 2 2 1 1 0 1 0 1 0 1 0 5 3 3 1
    Total EWS:4[Calculated EWS:1+Carry Forward First Year EWS Vacancy from AY 2025-26:3]
    """

    rows = parse_dse_page(text, 87, "dse-seat-matrix-2026.pdf", "2026-27")

    assert len(rows) == 2
    assert rows[0]["institute_code"] == "02114"
    assert rows[0]["branch_code"] == "0211491110"
    assert rows[0]["branch_name"] == "Computer Science and Engineering(Artificial Intelligence and Machine Learning)"
    assert rows[0]["college_name"] == "Deogiri Institute of Engineering and Management Studies, Aurangabad"
    assert rows[0]["college_type"] == "Un-Aided -"
    assert rows[0]["autonomous"] == "true"
    assert rows[0]["lateral_entry_seats"] == "6"
    assert rows[0]["needs_review"] == "false"

    assert rows[1]["institute_code"] == "02116"
    assert rows[1]["branch_code"] == "0211619110"
    assert rows[1]["college_name"] == "Matoshri Pratishan's Group of Institutions (Integrated Campus), Kupsarwadi , Nanded"
    assert rows[1]["branch_name"] == "Civil Engineering"
    assert rows[1]["vacant_seats"] == "33"
    assert rows[1]["needs_review"] == "false"


def test_marks_dse_choice_code_that_does_not_match_its_institute() -> None:
    text = """
    Sr No : 1 Institute Code & Name : 2114 - Example College Orphan : 0
    Choice Code : 0211619110 Course Name : Civil Engineering Inst. Non-Inst.
    Status : Un-Aided Vacant Seats within SI : 0 Lateral Entry : 6 0 0
    Non-Minority Seats Minority Seats OPEN SC ST VJ/DT NTB NTC NTD OBC SEBC
    G L G L G L G L G L G L G L G L G L
    8 0 2 1 0 1 1 0 0 0 0 0 0 0 0 0 1 0 0 1
    """

    rows = parse_dse_page(text, 1, "dse-seat-matrix.pdf", "2026-27")

    assert len(rows) == 1
    assert rows[0]["needs_review"] == "true"
    assert "BRANCH_INSTITUTE_MISMATCH" in rows[0]["review_reason"]


def test_parses_wrapped_dse_minority_status() -> None:
    text = """
    Institute Code & Name : 3148 - Mahavir Education Trust's Shah & Anchor Kutchhi Engineering College,
    Sr No : 450 Orphan : 0
    Mumbai
    Choice Code : 0314824510 Course Name : Computer Engineering Inst. Non-Inst.
    Status : Un-Aided - Autonomous - Linguistic Minority -
    Vacant Seats within SI : 3 Lateral Entry : 18 0 0
    Non-Minority Seats Minority Seats OPEN SC ST VJ/DT NTB NTC NTD OBC SEBC
    G L G L G L G L G L G L G L G L G L
    0 18 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
    """

    rows = parse_dse_page(text, 175, "dse-seat-matrix.pdf", "2026-27")

    assert len(rows) == 1
    assert rows[0]["college_status"] == "Un-Aided - Autonomous - Linguistic Minority -"
    assert rows[0]["vacant_seats"] == "3"
    assert rows[0]["lateral_entry_seats"] == "18"
    assert rows[0]["needs_review"] == "false"
