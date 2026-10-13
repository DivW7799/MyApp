
import re
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


NeedleValue = Annotated[
    Decimal,
    Field(ge=0, max_digits=None, decimal_places=0),
]


class TableFormNeedleRowInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    row_number: Annotated[int, Field(ge=1, le=6)]
    needle_1: NeedleValue = Decimal("0")
    needle_2: NeedleValue = Decimal("0")
    needle_3: NeedleValue = Decimal("0")
    needle_4: NeedleValue = Decimal("0")
    needle_5: NeedleValue = Decimal("0")
    needle_6: NeedleValue = Decimal("0")

    @field_validator(
        "needle_1",
        "needle_2",
        "needle_3",
        "needle_4",
        "needle_5",
        "needle_6",
        mode="before",
    )
    @classmethod
    def validate_needle_value(cls, value: object) -> Decimal:
        if isinstance(value, bool) or value is None:
            raise ValueError("Needle values must be non-negative whole numbers.")

        if not isinstance(value, (str, int, Decimal)):
            raise ValueError("Needle values must be sent as whole-number strings.")

        try:
            parsed = Decimal(str(value))
        except (InvalidOperation, ValueError):
            raise ValueError("Invalid needle value.") from None

        if not parsed.is_finite() or parsed < 0:
            raise ValueError("Needle values must be finite and non-negative.")

        if parsed != parsed.to_integral_value():
            raise ValueError("Needle values must be whole numbers.")

        return parsed


class TableFormCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    party_name: Annotated[str, Field(min_length=1, max_length=255)]
    stitches: Annotated[str, Field(min_length=1, max_length=1000)]
    d_no: Annotated[str, Field(min_length=1, max_length=255)]
    piece: Annotated[str, Field(min_length=1, max_length=255)]
    form_date: date

    source_image_record_id: UUID | None = None

    needle_rows: Annotated[
        list[TableFormNeedleRowInput],
        Field(min_length=6, max_length=6),
    ]

    @field_validator("party_name", "stitches", "d_no", "piece")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank.")
        return value

    @model_validator(mode="after")
    def validate_six_distinct_rows(self):
        row_numbers = [row.row_number for row in self.needle_rows]

        if sorted(row_numbers) != [1, 2, 3, 4, 5, 6]:
            raise ValueError(
                "Needle rows must contain each row number from 1 to 6 exactly once."
            )

        return self


class TableFormRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    party_name: str
    stitches: str
    d_no: str
    piece: str
    form_date: date
    source_image_record_id: UUID | None
