from alembic import op
import sqlalchemy as sa


revision = "0007_add_description"
down_revision = "0006_create_table_forms"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "table_form_records",
        sa.Column(
            "description",
            sa.String(length=512),
            server_default=sa.text("''"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("table_form_records", "description")