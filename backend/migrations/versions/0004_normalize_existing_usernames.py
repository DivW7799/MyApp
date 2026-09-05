from collections.abc import Sequence

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "0004_normalize_usernames"
down_revision: str | None = "0003_username_ci"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE users
        SET username = LOWER(username)
        WHERE username <> LOWER(username)
        """
    )


def downgrade() -> None:
    pass