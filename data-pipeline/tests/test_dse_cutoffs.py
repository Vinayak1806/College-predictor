from argparse import Namespace

from extract_cutoffs import parse_dse_page


def word(text: str, x: float, top: float, width: float = 25) -> dict:
    return {"text": text, "x0": x, "x1": x + width, "top": top}


def test_dse_parser_keeps_blank_columns_aligned() -> None:
    words = [
        word("1114", 25, 40),
        word("Example", 55, 40),
        word("College", 100, 40),
        word("(Un-Aided)", 160, 40),
        word("Choice", 25, 70),
        word("Code", 58, 70),
        word(":", 83, 70, 3),
        word("111461210", 96, 70, 45),
        word("Course", 181, 70),
        word("Name", 214, 70),
        word(":", 242, 70, 3),
        word("Mechanical", 252, 70, 48),
        word("Engineering", 303, 70, 52),
        word("GOPEN", 96, 125, 29),
        word("GSC", 153, 125, 17),
        word("GST", 204, 125, 17),
        word("GOBC", 252, 125, 24),
        word("GSEBC", 300, 125, 29),
        word("31431", 98, 146, 23),
        word("37231", 149, 146, 23),
        word("34626", 251, 146, 23),
        word("39207", 302, 146, 23),
        word("Stage-I", 40, 151, 27),
        word("(75.63%)", 94, 154, 33),
        word("(73.13%)", 145, 154, 33),
        word("(74.26%)", 247, 154, 33),
        word("(72.27%)", 298, 154, 33),
        word("35459", 200, 171, 23),
        word("Stage-VII", 37, 176, 34),
        word("(73.90%)", 196, 179, 33),
    ]
    args = Namespace(
        academic_year="2025-26",
        route="DSE",
        cap_round=2,
        quota="MH",
        input="round-2.pdf",
    )

    rows = parse_dse_page(words, 20, args)

    assert [(row["seat_type"], row["stage"]) for row in rows] == [
        ("GOPEN", "I"),
        ("GSC", "I"),
        ("GOBC", "I"),
        ("GSEBC", "I"),
        ("GST", "VII"),
    ]
    assert all(row["needs_review"] == "false" for row in rows)
