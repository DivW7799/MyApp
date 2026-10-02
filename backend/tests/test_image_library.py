import base64

from app.main import app
from app.core.security import hash_password
from app.models.image_record import ImageRecord
from app.models.user import User
from fastapi.testclient import TestClient


PASSWORD = "VeryStrongPassword123!"

client = TestClient(app)


ONE_PIXEL_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB"
    "CAQAAAC1HAwCAAAAC0lEQVR42mNk+A8A"
    "AQUBAScY42YAAAAASUVORK5CYII="
)


def create_test_user(
    db,
    username: str,
) -> User:
    user = User(
        username=username,
        password_hash=hash_password(PASSWORD),
        account_type="U",
        is_active=True,
        must_change_password=False,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def login(username: str):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "username": username,
            "password": PASSWORD,
        },
    )

    assert response.status_code == 200


def test_unauthenticated_user_cannot_list_images():
    response = client.get(
        "/api/v1/image-library"
    )

    assert response.status_code == 401


def test_user_can_create_search_and_get_image(
    db,
):
    user = create_test_user(
        db,
        "image_library_test_user",
    )

    login(user.username)

    create_response = client.post(
        "/api/v1/image-library",
        data={
            "text": "red sports car",
        },
        files={
            "image": (
                "car.png",
                ONE_PIXEL_PNG,
                "image/png",
            ),
        },
    )

    assert create_response.status_code == 201

    body = create_response.json()

    assert body["text"] == "red sports car"
    assert body["original_filename"] == "car.png"
    assert body["content_type"] == "image/png"
    assert body["size_bytes"] == len(ONE_PIXEL_PNG)

    record_id = body["id"]

    list_response = client.get(
        "/api/v1/image-library"
    )

    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    search_response = client.get(
        "/api/v1/image-library",
        params={"search": "sports"},
    )

    assert search_response.status_code == 200

    search_body = search_response.json()

    assert len(search_body) == 1
    assert search_body[0]["id"] == record_id

    image_response = client.get(
        f"/api/v1/image-library/{record_id}/image"
    )

    assert image_response.status_code == 200
    assert image_response.headers["content-type"] == (
        "image/png"
    )
    assert image_response.content == ONE_PIXEL_PNG


def test_image_upload_rejects_invalid_type(
    db,
):
    user = create_test_user(
        db,
        "invalid_image_type_user",
    )

    login(user.username)

    response = client.post(
        "/api/v1/image-library",
        data={
            "text": "invalid file",
        },
        files={
            "image": (
                "payload.txt",
                b"not an image",
                "text/plain",
            ),
        },
    )

    assert response.status_code == 400


def test_image_upload_rejects_oversized_file(
    db,
):
    user = create_test_user(
        db,
        "oversized_image_user",
    )

    login(user.username)

    oversized_data = b"a" * (
        5 * 1024 * 1024 + 1
    )

    response = client.post(
        "/api/v1/image-library",
        data={
            "text": "large image",
        },
        files={
            "image": (
                "large.png",
                oversized_data,
                "image/png",
            ),
        },
    )

    assert response.status_code == 400


def test_image_search_is_case_insensitive(
    db,
):
    user = create_test_user(
        db,
        "image_search_case_user",
    )

    login(user.username)

    response = client.post(
        "/api/v1/image-library",
        data={
            "text": "Blue Mountain",
        },
        files={
            "image": (
                "mountain.png",
                ONE_PIXEL_PNG,
                "image/png",
            ),
        },
    )

    assert response.status_code == 201

    search_response = client.get(
        "/api/v1/image-library",
        params={"search": "blue mountain"},
    )

    assert search_response.status_code == 200
    assert len(search_response.json()) == 1


def test_image_record_is_stored_in_database(
    db,
):
    user = create_test_user(
        db,
        "image_database_user",
    )

    login(user.username)

    response = client.post(
        "/api/v1/image-library",
        data={
            "text": "database image test",
        },
        files={
            "image": (
                "database.png",
                ONE_PIXEL_PNG,
                "image/png",
            ),
        },
    )

    assert response.status_code == 201

    record = db.query(ImageRecord).filter(
        ImageRecord.text_content
        == "database image test"
    ).one()

    assert record.image_data == ONE_PIXEL_PNG
    assert record.content_type == "image/png"
    assert record.created_by_id == user.id