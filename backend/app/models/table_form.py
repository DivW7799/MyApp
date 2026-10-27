import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TableFormRecord(Base):
    __tablename__ = "table_form_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    party_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
        server_default=text(""),
    )

    stitches: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    d_no: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    design_status: Mapped[str] = mapped_column(
        String(1),
        nullable=False,
        default="n",
        server_default=text("'n'"),
    )

    delivery_status: Mapped[str] = mapped_column(
        String(1),
        nullable=False,
        default="n",
        server_default=text("'n'"),
    )

    piece: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    form_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    source_image_record_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("image_records.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        CheckConstraint(
            "design_status IN ('y', 'n')",
            name="ck_table_form_records_design_status",
        ),
        CheckConstraint(
            "delivery_status IN ('y', 'n')",
            name="ck_table_form_records_delivery_status",
        ),
    )


class TableFormNeedleRow(Base):
    __tablename__ = "table_form_needle_rows"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    form_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("table_form_records.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    row_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    cloth: Mapped[str | None] = mapped_column(
        String(7),
        nullable=True,
    )

    needle_1: Mapped[Decimal] = mapped_column(
        Numeric(scale=0),
        nullable=False,
        server_default=text("0"),
    )

    needle_2: Mapped[Decimal] = mapped_column(
        Numeric(scale=0),
        nullable=False,
        server_default=text("0"),
    )

    needle_3: Mapped[Decimal] = mapped_column(
        Numeric(scale=0),
        nullable=False,
        server_default=text("0"),
    )

    needle_4: Mapped[Decimal] = mapped_column(
        Numeric(scale=0),
        nullable=False,
        server_default=text("0"),
    )

    needle_5: Mapped[Decimal] = mapped_column(
        Numeric(scale=0),
        nullable=False,
        server_default=text("0"),
    )

    needle_6: Mapped[Decimal] = mapped_column(
        Numeric(scale=0),
        nullable=False,
        server_default=text("0"),
    )

    __table_args__ = (
        UniqueConstraint(
            "form_id",
            "row_number",
            name="uq_table_form_needle_rows_form_row",
        ),
        CheckConstraint(
            "row_number BETWEEN 1 AND 6",
            name="ck_table_form_needle_rows_row_number",
        ),
        CheckConstraint(
            """
            needle_1 >= 0
            AND needle_2 >= 0
            AND needle_3 >= 0
            AND needle_4 >= 0
            AND needle_5 >= 0
            AND needle_6 >= 0
            """,
            name="ck_table_form_needle_rows_nonnegative",
        ),
        CheckConstraint(
            """
            cloth IS NULL
            OR cloth ~ '^#[0-9A-Fa-f]{6}$'
            """,
            name="ck_table_form_needle_rows_cloth_hex",
        ),
    )
