
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0006_create_table_forms"
down_revision: str | None = "0005_create_image_records"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "table_form_records",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("party_name", sa.String(255), nullable=False),
        sa.Column("stitches", sa.Text(), nullable=False),
        sa.Column("d_no", sa.String(255), nullable=False),
        sa.Column("piece", sa.String(255), nullable=False),
        sa.Column("form_date", sa.Date(), nullable=False),
        sa.Column(
            "source_image_record_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "created_by_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["source_image_record_id"],
            ["image_records.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["created_by_id"],
            ["users.id"],
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_table_form_records_source_image_record_id",
        "table_form_records",
        ["source_image_record_id"],
    )

    op.create_index(
        "ix_table_form_records_created_by_id",
        "table_form_records",
        ["created_by_id"],
    )

    op.create_table(
        "table_form_needle_rows",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "form_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("row_number", sa.Integer(), nullable=False),
        sa.Column("cloth", sa.String(7), nullable=True),
        *[
            sa.Column(
                f"needle_{number}",
                sa.Numeric(scale=0),
                server_default=sa.text("0"),
                nullable=False,
            )
            for number in range(1, 7)
        ],
        sa.ForeignKeyConstraint(
            ["form_id"],
            ["table_form_records.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "form_id",
            "row_number",
            name="uq_table_form_needle_rows_form_row",
        ),
        sa.CheckConstraint(
            "row_number BETWEEN 1 AND 6",
            name="ck_table_form_needle_rows_row_number",
        ),
        sa.CheckConstraint(
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
        sa.CheckConstraint(
            """
            cloth IS NULL
            OR cloth ~ '^#[0-9A-Fa-f]{6}$'
            """,
            name="ck_table_form_needle_rows_cloth_hex",
        ),
    )

    op.create_index(
        "ix_table_form_needle_rows_form_id",
        "table_form_needle_rows",
        ["form_id"],
    )

    # Follow the existing application's restricted runtime-role pattern.
    op.execute(
        """
        GRANT SELECT, INSERT, UPDATE, DELETE
        ON table_form_records, table_form_needle_rows
        TO myapp_runtime
        """
    )


def downgrade() -> None:
    op.drop_index(
        "ix_table_form_needle_rows_form_id",
        table_name="table_form_needle_rows",
    )
    op.drop_table("table_form_needle_rows")

    op.drop_index(
        "ix_table_form_records_created_by_id",
        table_name="table_form_records",
    )
    op.drop_index(
        "ix_table_form_records_source_image_record_id",
        table_name="table_form_records",
    )
    op.drop_table("table_form_records")
