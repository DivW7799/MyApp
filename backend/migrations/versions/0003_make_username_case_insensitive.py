from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0003_username_ci"
down_revision: str | None = "0002_add_password_change_flag"
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

    op.drop_constraint(
        "uq_users_username",
        "users",
        type_="unique",
    )

    op.create_index(
        "uq_users_username_lower",
        "users",
        [sa.text("LOWER(username)")],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        "uq_users_username_lower",
        table_name="users",
    )

    op.create_unique_constraint(
        "uq_users_username",
        "users",
        ["username"],
    )