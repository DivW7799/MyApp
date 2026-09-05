from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient

from app.services.session import hash_session_token
from app.models.session import Session as UserSession
from app.core.security import hash_password
from app.models.user import User


def test_health(client: TestClient):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}



def test_unauthenticated_user_cannot_access_me(
    client,
):
    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication required"


def test_login_success(
    client,
    db,
):
    user = User(
        username="test_login_user",
        password_hash=hash_password(
            "VeryStrongPassword123!"
        ),
        account_type="U",
        is_active=True,
        must_change_password=False,
    )

    db.add(user)
    db.commit()

    response = client.post(
        "/api/v1/auth/login",
        json={
            "username": "test_login_user",
            "password": "VeryStrongPassword123!",
        },
    )

    assert response.status_code == 200

    body = response.json()

    assert body["username"] == "test_login_user"
    assert body["account_type"] == "U"
    assert body["is_active"] is True
    assert body["must_change_password"] is False
    assert "password_hash" not in body
    assert client.cookies.get("myapp_session")

    me_response = client.get("/api/v1/auth/me")

    assert me_response.status_code == 200
    assert me_response.json()["username"] == "test_login_user"


def test_login_wrong_password(
    client,
    db,
):
    user = User(
        username="test_wrong_password",
        password_hash=hash_password(
            "CorrectPassword123!"
        ),
        account_type="U",
        is_active=True,
        must_change_password=False,
    )

    db.add(user)
    db.commit()

    response = client.post(
        "/api/v1/auth/login",
        json={
            "username": "test_wrong_password",
            "password": "WrongPassword123!",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == (
        "Invalid username or password"
    )


def test_login_unknown_username(client):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "username": "does_not_exist",
            "password": "SomePassword123!",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == (
        "Invalid username or password"
    )


def test_login_inactive_user(
    client,
    db,
):
    user = User(
        username="inactive_user",
        password_hash=hash_password(
            "VeryStrongPassword123!"
        ),
        account_type="U",
        is_active=False,
        must_change_password=False,
    )

    db.add(user)
    db.commit()

    response = client.post(
        "/api/v1/auth/login",
        json={
            "username": "inactive_user",
            "password": "VeryStrongPassword123!",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == (
        "Invalid username or password"
    )


def test_logout_invalidates_session(client, db):
    user = User(
        username="logout_test_user",
        password_hash=hash_password("VeryStrongPassword123!"),
        account_type="U",
        is_active=True,
        must_change_password=False,
    )

    db.add(user)
    db.commit()

    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "username": "logout_test_user",
            "password": "VeryStrongPassword123!",
        },
    )

    assert login_response.status_code == 200

    me_response = client.get("/api/v1/auth/me")
    assert me_response.status_code == 200

    logout_response = client.post("/api/v1/auth/logout")
    assert logout_response.status_code == 204

    me_after_logout = client.get("/api/v1/auth/me")

    assert me_after_logout.status_code == 401
    assert me_after_logout.json()["detail"] == (
        "Authentication required"
    )


def test_forced_password_change_clears_flag_and_creates_session(
    client,
    db,
):
    user = User(
        username="forced_change_test_user",
        password_hash=hash_password("TemporaryPassword123!"),
        account_type="U",
        is_active=True,
        must_change_password=True,
    )

    db.add(user)
    db.commit()

    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "username": "forced_change_test_user",
            "password": "TemporaryPassword123!",
        },
    )

    assert login_response.status_code == 200
    assert login_response.json()["must_change_password"] is True

    change_response = client.post(
        "/api/v1/auth/complete-password-change",
        json={
            "new_password": "PermanentPassword123!",
            "confirm_password": "PermanentPassword123!",
        },
    )

    assert change_response.status_code == 200

    body = change_response.json()

    assert body["must_change_password"] is False

    me_response = client.get("/api/v1/auth/me")

    assert me_response.status_code == 200
    assert me_response.json()["must_change_password"] is False


def test_expired_session_is_rejected_and_deleted(
    client,
    db,
):
    user = User(
        username="expired_session_user",
        password_hash=hash_password(
            "VeryStrongPassword123!"
        ),
        account_type="U",
        is_active=True,
        must_change_password=False,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    expired_session = UserSession(
        user_id=user.id,
        token_hash=hash_session_token("expired-test-token"),
        expires_at=datetime.now(timezone.utc) - timedelta(
            minutes=1
        ),
        created_at=datetime.now(timezone.utc) - timedelta(
            hours=1
        ),
        last_seen_at=datetime.now(timezone.utc) - timedelta(
            hours=1
        ),
    )

    db.add(expired_session)
    db.commit()

    expired_session_id = expired_session.id

    client.cookies.set(
        "myapp_session",
        "expired-test-token",
    )

    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401
    assert response.json()["detail"] == (
        "Authentication required"
    )

    db.expire_all()

    remaining_session = db.get(
        UserSession,
        expired_session_id,
    )

    assert remaining_session is None


def test_missing_session_cookie_returns_401(client):
    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401
    assert response.json()["detail"] == (
        "Authentication required"
    )


def test_logout_deletes_session(
    client,
    db,
):
    user = User(
        username="logout_session_user",
        password_hash=hash_password(
            "VeryStrongPassword123!"
        ),
        account_type="U",
        is_active=True,
        must_change_password=False,
    )

    db.add(user)
    db.commit()

    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "username": "logout_session_user",
            "password": "VeryStrongPassword123!",
        },
    )

    assert login_response.status_code == 200

    session_count_before = db.query(UserSession).filter(
        UserSession.user_id == user.id
    ).count()

    assert session_count_before == 1

    logout_response = client.post(
        "/api/v1/auth/logout"
    )

    assert logout_response.status_code == 204

    db.expire_all()

    session_count_after = db.query(UserSession).filter(
        UserSession.user_id == user.id
    ).count()

    assert session_count_after == 0


def test_login_sets_secure_session_cookie(
    client,
    db,
):
    user = User(
        username="cookie_test_user",
        password_hash=hash_password(
            "VeryStrongPassword123!"
        ),
        account_type="U",
        is_active=True,
        must_change_password=False,
    )

    db.add(user)
    db.commit()

    response = client.post(
        "/api/v1/auth/login",
        json={
            "username": "cookie_test_user",
            "password": "VeryStrongPassword123!",
        },
    )

    assert response.status_code == 200

    set_cookie = response.headers.get("set-cookie")

    assert set_cookie is not None

    assert "HttpOnly" in set_cookie
    assert "Path=/" in set_cookie
    assert "SameSite=lax" in set_cookie