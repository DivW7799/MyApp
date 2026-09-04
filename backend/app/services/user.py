from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import AdminUserUpdateRequest


def list_users(db: Session) -> list[User]:
    return list(
        db.scalars(
            select(User).order_by(User.username)
        ).all()
    )


def get_user_by_id(
    db: Session,
    user_id: UUID,
) -> User | None:
    return db.scalar(
        select(User).where(User.id == user_id)
    )


def count_active_admins(db: Session) -> int:
    return (
        db.scalar(
            select(func.count())
            .select_from(User)
            .where(
                User.account_type == "A",
                User.is_active.is_(True),
            )
        )
        or 0
    )


def lock_active_admins(db: Session) -> None:
    db.execute(
        select(User.id)
        .where(
            User.account_type == "A",
            User.is_active.is_(True),
        )
        .with_for_update()
    )


def update_user(
    db: Session,
    target_user: User,
    request: AdminUserUpdateRequest,
) -> User:
    if (
        request.account_type == "U"
        or request.is_active is False
    ):
        lock_active_admins(db)

    target_user = db.scalar(
        select(User)
        .where(User.id == target_user.id)
        .with_for_update()
    )

    if target_user is None:
        raise ValueError("User not found")

    changing_admin_status = (
        target_user.account_type == "A"
        and target_user.is_active
        and (
            request.account_type == "U"
            or request.is_active is False
        )
    )

    if changing_admin_status:
        active_admin_count = count_active_admins(db)

        if active_admin_count <= 1:
            raise ValueError(
                "The last active administrator cannot be "
                "demoted or deactivated"
            )

    if request.username is not None:
        existing_user = db.scalar(
            select(User).where(
                User.username == request.username,
                User.id != target_user.id,
            )
        )

        if existing_user is not None:
            raise ValueError("Username already exists")

        target_user.username = request.username

    if request.account_type is not None:
        target_user.account_type = request.account_type

    if request.is_active is not None:
        target_user.is_active = request.is_active

    db.commit()
    db.refresh(target_user)

    return target_user