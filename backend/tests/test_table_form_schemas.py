
from datetime import date
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.schemas.table_form import TableFormCreate


def valid_payload() -> dict:
    return {
        "party_name": "Example Party",
        "stitches": "1200",
        "d_no": "D001",
        "piece": "01",
        "form_date": "2026-10-12",
        "needle_rows": [
            {
                "row_number": row_number,
                "needle_1": "62" if row_number == 1 else "0",
                "needle_2": "0",
                "needle_3": "0",
                "needle_4": "0",
                "needle_5": "0",
                "needle_6": "0",
            }
            for row_number in range(1, 7)
        ],
    }


def test_valid_table_form_payload():
    payload = TableFormCreate.model_validate(valid_payload())

    assert payload.party_name == "Example Party"
    assert payload.form_date == date(2026, 10, 12)
    assert len(payload.needle_rows) == 6
    assert payload.needle_rows[0].needle_1 == Decimal("62")


def test_rejects_missing_needle_row():
    data = valid_payload()
    data["needle_rows"] = data["needle_rows"][:-1]

    with pytest.raises(ValidationError):
        TableFormCreate.model_validate(data)


def test_rejects_duplicate_row_numbers():
    data = valid_payload()
    data["needle_rows"][5]["row_number"] = 5

    with pytest.raises(ValidationError):
        TableFormCreate.model_validate(data)


@pytest.mark.parametrize("value", ["-1", "-0.5", "1.5", "NaN", "Infinity"])
def test_rejects_invalid_needle_values(value: str):
    data = valid_payload()
    data["needle_rows"][0]["needle_1"] = value

    with pytest.raises(ValidationError):
        TableFormCreate.model_validate(data)


def test_accepts_large_whole_number_as_decimal():
    data = valid_payload()
    large_value = "999999999999999999999999999999999999"
    data["needle_rows"][0]["needle_1"] = large_value

    payload = TableFormCreate.model_validate(data)

    assert payload.needle_rows[0].needle_1 == Decimal(large_value)


def test_rejects_unknown_request_fields():
    data = valid_payload()
    data["unexpected"] = "not allowed"

    with pytest.raises(ValidationError):
        TableFormCreate.model_validate(data)


def test_rejects_blank_party_name():
    data = valid_payload()
    data["party_name"] = "   "

    with pytest.raises(ValidationError):
        TableFormCreate.model_validate(data)
