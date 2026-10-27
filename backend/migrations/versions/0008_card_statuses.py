from alembic import op
import sqlalchemy as sa

revision = "0008_card_statuses"
down_revision = "0007_add_description"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "table_form_records",
        sa.Column(
            "design_status",
            sa.String(length=1),
            nullable=False,
            server_default=sa.text("'n'"),
        ),
    )

    op.add_column(
        "table_form_records",
        sa.Column(
            "delivery_status",
            sa.String(length=1),
            nullable=False,
            server_default=sa.text("'n'"),
        ),
    )

    op.create_check_constraint(
        "ck_table_form_records_design_status",
        "table_form_records",
        "design_status IN ('y', 'n')",
    )

    op.create_check_constraint(
        "ck_table_form_records_delivery_status",
        "table_form_records",
        "delivery_status IN ('y', 'n')",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_table_form_records_delivery_status",
        "table_form_records",
        type_="check",
    )
    op.drop_constraint(
        "ck_table_form_records_design_status",
        "table_form_records",
        type_="check",
    )
    op.drop_column("table_form_records", "delivery_status")
    op.drop_column("table_form_records", "design_status")