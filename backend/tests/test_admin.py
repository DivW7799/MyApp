from app.core.security import hash_password
from app.models.user import User
from app.models.session import Session as UserSession
from app.main import app

from app.core.identifiers import normalize_username
from fastapi.testclient import TestClient


PASSWORD = "VeryStrongPassword123!"

target_client = TestClient(app)


def create_test_user(
    db,
    username: str,
    account_type: str,
    must_change_password: bool = False,
    is_active: bool = True,
) -> User:
    user = User(
        username=normalize_username(username),
        password_hash=hash_password(PASSWORD),
        account_type=account_type,
        is_active=is_active,
        must_change_password=must_change_password,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def login(client, username: str):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "username": username,
            "password": PASSWORD,
        },
    )

    assert response.status_code == 200
    return response


def test_unauthenticated_user_cannot_access_admin_users(client):
    response = client.get("/api/v1/admin/users")

    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication required"


def test_normal_user_cannot_access_admin_users(client, db):
    user = create_test_user(
        db,
        username="normal_admin_test",
        account_type="U",
    )

    login(client, user.username)

    response = client.get("/api/v1/admin/users")

    assert response.status_code == 404
    assert response.json()["detail"] == "Not found"


def test_admin_with_forced_password_change_cannot_access_admin_users(
    client,
    db,
):
    user = create_test_user(
        db,
        username="forced_admin_test",
        account_type="A",
        must_change_password=True,
    )

    login(client, user.username)

    response = client.get("/api/v1/admin/users")

    assert response.status_code == 403
    assert response.json()["detail"] == "Password change required"


def test_active_admin_can_access_admin_users(client, db):
    user = create_test_user(
        db,
        username="valid_admin_test",
        account_type="A",
    )

    login(client, user.username)

    response = client.get("/api/v1/admin/users")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_admin_created_account_requires_password_change(
    client,
    db,
):
    admin = create_test_user(
        db,
        username="creator_admin",
        account_type="A",
    )

    login(client, admin.username)

    response = client.post(
        "/api/v1/admin/users",
        json={
            "username": "created_test_user",
            "password": "TemporaryPassword123!",
            "account_type": "U",
        },
    )

    assert response.status_code == 201

    body = response.json()

    assert body["username"] == "created_test_user"
    assert body["account_type"] == "U"
    assert body["is_active"] is True
    assert body["must_change_password"] is True
    assert "password_hash" not in body


def test_admin_created_username_is_normalized(
    client,
    db,
):
    admin = create_test_user(
        db,
        username="username_normalizer_admin",
        account_type="A",
    )

    login(client, admin.username)

    response = client.post(
        "/api/v1/admin/users",
        json={
            "username": "MixedCaseNewUser",
            "password": "TemporaryPassword123!",
            "account_type": "U",
        },
    )

    assert response.status_code == 201

    body = response.json()

    assert body["username"] == "mixedcasenewuser"

    created_user = db.query(User).filter(
        User.username == "mixedcasenewuser"
    ).one()

    assert created_user.username == "mixedcasenewuser"
    

def test_admin_cannot_create_case_variant_of_existing_username(
    client,
    db,
):
    admin = create_test_user(
        db,
        username="case_duplicate_admin",
        account_type="A",
    )

    existing_user = create_test_user(
        db,
        username="CaseSensitiveUser",
        account_type="U",
    )

    login(client, admin.username)

    response = client.post(
        "/api/v1/admin/users",
        json={
            "username": "casesensitiveuser",
            "password": "TemporaryPassword123!",
            "account_type": "U",
        },
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "Username already exists"

    db.expire_all()

    users = db.query(User).filter(
        User.username == "casesensitiveuser"
    ).all()

    assert len(users) == 1
    


def test_admin_password_reset_invalidates_target_sessions(
    client,
    db,
):
    admin = create_test_user(
        db,
        username="password_reset_admin",
        account_type="A",
    )

    target = create_test_user(
        db,
        username="password_reset_target",
        account_type="U",
    )

    target_client = TestClient(app)

    target_login = target_client.post(
        "/api/v1/auth/login",
        json={
            "username": target.username,
            "password": PASSWORD,
        },
    )

    assert target_login.status_code == 200

    target_me = target_client.get("/api/v1/auth/me")
    assert target_me.status_code == 200

    existing_session_count = db.query(UserSession).filter(
        UserSession.user_id == target.id
    ).count()

    assert existing_session_count == 1

    admin_login = client.post(
        "/api/v1/auth/login",
        json={
            "username": admin.username,
            "password": PASSWORD,
        },
    )

    assert admin_login.status_code == 200

    reset_response = client.post(
        f"/api/v1/admin/users/{target.id}/password",
        json={
            "new_password": "ResetTemporaryPassword123!",
            "confirm_password": "ResetTemporaryPassword123!",
        },
    )

    assert reset_response.status_code == 204

    db.expire_all()

    refreshed_target = db.get(User, target.id)

    assert refreshed_target is not None
    assert refreshed_target.must_change_password is True

    remaining_sessions = db.query(UserSession).filter(
        UserSession.user_id == target.id
    ).count()

    assert remaining_sessions == 0

    old_session_response = target_client.get(
        "/api/v1/auth/me"
    )

    assert old_session_response.status_code == 401


def test_admin_password_reset_rejects_mismatched_passwords(
    client,
    db,
):
    admin = create_test_user(
        db,
        username="reset_validation_admin",
        account_type="A",
    )

    target = create_test_user(
        db,
        username="reset_validation_target",
        account_type="U",
    )

    login(client, admin.username)

    response = client.post(
        f"/api/v1/admin/users/{target.id}/password",
        json={
            "new_password": "NewPassword123!",
            "confirm_password": "DifferentPassword123!",
        },
    )

    assert response.status_code == 422


def test_last_active_admin_cannot_be_demoted(
    client,
    db,
):
    admin = create_test_user(
        db,
        username="last_admin_demote",
        account_type="A",
    )

    login(client, admin.username)

    response = client.patch(
        f"/api/v1/admin/users/{admin.id}",
        json={
            "account_type": "U",
        },
    )

    assert response.status_code == 409
    assert response.json()["detail"] == (
        "The last active administrator cannot be "
        "demoted or deactivated"
    )

    db.expire_all()

    refreshed = db.get(User, admin.id)

    assert refreshed is not None
    assert refreshed.account_type == "A"
    assert refreshed.is_active is True


def test_last_active_admin_cannot_be_deactivated(
    client,
    db,
):
    admin = create_test_user(
        db,
        username="last_admin_deactivate",
        account_type="A",
    )

    login(client, admin.username)

    response = client.patch(
        f"/api/v1/admin/users/{admin.id}",
        json={
            "is_active": False,
        },
    )

    assert response.status_code == 409
    assert response.json()["detail"] == (
        "The last active administrator cannot be "
        "demoted or deactivated"
    )

    db.expire_all()

    refreshed = db.get(User, admin.id)

    assert refreshed is not None
    assert refreshed.account_type == "A"
    assert refreshed.is_active is True


def test_admin_can_demote_one_of_two_active_admins(
    client,
    db,
):
    first_admin = create_test_user(
        db,
        username="two_admins_first",
        account_type="A",
    )

    second_admin = create_test_user(
        db,
        username="two_admins_second",
        account_type="A",
    )

    login(client, first_admin.username)

    response = client.patch(
        f"/api/v1/admin/users/{second_admin.id}",
        json={
            "account_type": "U",
        },
    )

    assert response.status_code == 200

    body = response.json()

    assert body["account_type"] == "U"
    assert body["is_active"] is True

    db.expire_all()

    remaining_admins = (
        db.query(User)
        .filter(
            User.account_type == "A",
            User.is_active.is_(True),
        )
        .count()
    )

    assert remaining_admins == 1


def test_admin_can_deactivate_one_of_two_active_admins(
    client,
    db,
):
    first_admin = create_test_user(
        db,
        username="two_active_first",
        account_type="A",
    )

    second_admin = create_test_user(
        db,
        username="two_active_second",
        account_type="A",
    )

    login(client, first_admin.username)

    response = client.patch(
        f"/api/v1/admin/users/{second_admin.id}",
        json={
            "is_active": False,
        },
    )

    assert response.status_code == 200

    body = response.json()

    assert body["account_type"] == "A"
    assert body["is_active"] is False

    db.expire_all()

    remaining_admins = (
        db.query(User)
        .filter(
            User.account_type == "A",
            User.is_active.is_(True),
        )
        .count()
    )

    assert remaining_admins == 1


def test_last_active_admin_cannot_be_demoted_and_deactivated_together(
    client,
    db,
):
    admin = create_test_user(
        db,
        username="last_admin_both",
        account_type="A",
    )

    login(client, admin.username)

    response = client.patch(
        f"/api/v1/admin/users/{admin.id}",
        json={
            "account_type": "U",
            "is_active": False,
        },
    )

    assert response.status_code == 409
    assert response.json()["detail"] == (
        "The last active administrator cannot be "
        "demoted or deactivated"
    )

    db.expire_all()

    refreshed = db.get(User, admin.id)

    assert refreshed is not None
    assert refreshed.account_type == "A"
    assert refreshed.is_active is True
    
    
def test_admin_cannot_rename_user_to_case_variant_of_existing_username(
    client,
    db,
):
    admin = create_test_user(
        db,
        username="rename_case_admin",
        account_type="A",
    )

    existing_user = create_test_user(
        db,
        username="existing_username",
        account_type="U",
    )

    target_user = create_test_user(
        db,
        username="rename_target_user",
        account_type="U",
    )

    login(client, admin.username)

    response = client.patch(
        f"/api/v1/admin/users/{target_user.id}",
        json={
            "username": "EXISTING_USERNAME",
        },
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "Username already exists"

    db.expire_all()

    refreshed_target = db.get(User, target_user.id)

    assert refreshed_target is not None
    assert refreshed_target.username == "rename_target_user"

    refreshed_existing = db.get(User, existing_user.id)

    assert refreshed_existing is not None
    assert refreshed_existing.username == "existing_username"