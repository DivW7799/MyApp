from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0005_create_image_records"
down_revision: str | None = "0004_normalize_usernames"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "image_records",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "text_content",
            sa.Text(),
            nullable=False,
        ),
        sa.Column(
            "original_filename",
            sa.String(length=255),
            nullable=False,
        ),
        sa.Column(
            "content_type",
            sa.String(length=100),
            nullable=False,
        ),
        sa.Column(
            "size_bytes",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "image_data",
            sa.LargeBinary(),
            nullable=False,
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
            ["created_by_id"],
            ["users.id"],
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_image_records_created_by_id",
        "image_records",
        ["created_by_id"],
    )

    op.create_index(
        "ix_image_records_created_at",
        "image_records",
        ["created_at"],
    )

    op.execute(
        """
        GRANT SELECT, INSERT, UPDATE, DELETE
        ON image_records
        TO myapp_runtime
        """
    )


def downgrade() -> None:
    op.drop_index(
        "ix_image_records_created_at",
        table_name="image_records",
    )

    op.drop_index(
        "ix_image_records_created_by_id",
        table_name="image_records",
    )

    op.drop_table("image_records")