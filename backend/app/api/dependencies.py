from collections.abc import Generator

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session as DbSession

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.user import User
from app.services.session import (
    get_session_by_token,
    get_user_for_session,
    touch_session,
)
from app.core.errors import authentication_required


def get_db() -> Generator[DbSession, None, None]:
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


def get_current_user(
    request: Request,
    db: DbSession = Depends(get_db),
) -> User:
    settings = get_settings()

    session_token = request.cookies.get(
        settings.session_cookie_name
    )

    if not session_token:
        raise authentication_required()

    session = get_session_by_token(db, session_token)

    if session is None:
        raise authentication_required()

    user = get_user_for_session(db, session)

    if user is None:
        raise authentication_required()

    touch_session(db, session)

    return user


def require_password_change_complete(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.must_change_password:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Password change required",
        )

    return current_user


def require_active_admin(
    current_user: User = Depends(
        require_password_change_complete
    ),
) -> User:
    if current_user.account_type != "A":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found",
        )

    return current_user