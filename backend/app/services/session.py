import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.orm import Session as DbSession

from app.core.config import get_settings
from app.models.session import Session as UserSession
from app.models.user import User


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_session_record(
    db: DbSession,
    user: User,
) -> tuple[str, UserSession]:
    settings = get_settings()

    raw_token = secrets.token_urlsafe(32)
    token_hash = hash_session_token(raw_token)

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(
        hours=settings.session_expire_hours
    )

    session = UserSession(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
        created_at=now,
        last_seen_at=now,
    )

    db.add(session)

    return raw_token, session


def create_session(
    db: DbSession,
    user: User,
) -> tuple[str, UserSession]:
    raw_token, session = create_session_record(db, user)

    db.commit()
    db.refresh(session)

    return raw_token, session


def get_session_by_token(
    db: DbSession,
    raw_token: str,
) -> UserSession | None:
    token_hash = hash_session_token(raw_token)

    session = db.scalar(
        select(UserSession).where(
            UserSession.token_hash == token_hash
        )
    )

    if session is None:
        return None

    now = datetime.now(timezone.utc)

    if session.expires_at <= now:
        db.delete(session)
        db.commit()
        return None

    return session


def get_user_for_session(
    db: DbSession,
    session: UserSession,
) -> User | None:
    return db.scalar(
        select(User).where(
            User.id == session.user_id,
            User.is_active.is_(True),
        )
    )


def touch_session(
    db: DbSession,
    session: UserSession,
) -> None:
    session.last_seen_at = datetime.now(timezone.utc)
    db.commit()


def delete_session(
    db: DbSession,
    raw_token: str,
) -> None:
    token_hash = hash_session_token(raw_token)

    db.execute(
        delete(UserSession).where(
            UserSession.token_hash == token_hash
        )
    )

    db.commit()


def invalidate_user_sessions(
    db: DbSession,
    user_id: UUID,
) -> None:
    db.execute(
        delete(UserSession).where(
            UserSession.user_id == user_id
        )
    )