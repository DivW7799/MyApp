from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.identifiers import normalize_username
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.auth import CreateUserRequest
from app.services.session import (
    create_session_record,
    invalidate_user_sessions,
)


def create_user(
    db: Session,
    request: CreateUserRequest,
) -> User:
    username = normalize_username(request.username)

    existing_user = db.scalar(
        select(User).where(User.username == username)
    )

    if existing_user is not None:
        raise ValueError("Username already exists")

    user = User(
        username=username,
        password_hash=hash_password(request.password),
        account_type=request.account_type,
        is_active=True,
        must_change_password=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def complete_forced_password_change(
    db: Session,
    user: User,
    new_password: str,
) -> str:
    if not user.must_change_password:
        raise ValueError("Password change is not required")

    user.password_hash = hash_password(new_password)
    user.must_change_password = False

    invalidate_user_sessions(db, user.id)

    raw_token, _ = create_session_record(db, user)

    db.commit()
    db.refresh(user)

    return raw_token


def change_own_password(
    db: Session,
    user: User,
    current_password: str,
    new_password: str,
) -> str:
    if user.must_change_password:
        raise ValueError(
            "Complete the required password change first"
        )

    if not verify_password(
        current_password,
        user.password_hash,
    ):
        raise ValueError("Current password is incorrect")

    user.password_hash = hash_password(new_password)

    invalidate_user_sessions(db, user.id)

    raw_token, _ = create_session_record(db, user)

    db.commit()
    db.refresh(user)

    return raw_token


def admin_change_password(
    db: Session,
    target_user: User,
    new_password: str,
) -> None:
    target_user.password_hash = hash_password(new_password)
    target_user.must_change_password = True

    invalidate_user_sessions(db, target_user.id)

    db.commit()