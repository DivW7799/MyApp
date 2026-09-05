from fastapi.testclient import TestClient
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