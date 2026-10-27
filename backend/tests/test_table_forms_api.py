
from datetime import date
from decimal import Decimal
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.core.security import hash_password
from app.models.table_form import (
    TableFormNeedleRow,
    TableFormRecord,
)
from app.models.user import User

import pytest
from sqlalchemy.exc import IntegrityError

from app.schemas.table_form import TableFormCreate
from app.services.table_form import create_table_form



PASSWORD = "VeryStrongPassword123!"

client = TestClient(__import__("app.main", fromlist=["app"]).app)


def create_test_user(db, username: str) -> User:
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


def login(username: str) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={
            "username": username,
            "password": PASSWORD,
        },
    )
    assert response.status_code == 200


def valid_payload() -> dict:
    return {
        "party_name": "Example Party",
        "stitches": "1200",
        "d_no": "D001",
        "piece": "01",
        "form_date": "2026-10-12",
        "needle_rows": [
            {
                "row_number": row_number,
                "needle_1": "62" if row_number == 1 else "0",
                "needle_2": "0",
                "needle_3": "0",
                "needle_4": "0",
                "needle_5": "0",
                "needle_6": "0",
            }
            for row_number in range(1, 7)
        ],
    }


def test_unauthenticated_user_cannot_create_table_form():
    response = client.post(
        "/api/v1/table-forms",
        json=valid_payload(),
    )

    assert response.status_code == 401


def test_authenticated_user_can_create_table_form(db):
    user = create_test_user(db, "table_form_create_user")
    login(user.username)

    response = client.post(
        "/api/v1/table-forms",
        json=valid_payload(),
    )

    assert response.status_code == 201

    body = response.json()
    record_id = body["id"]

    assert body["party_name"] == "Example Party"
    assert body["stitches"] == "1200"
    assert body["d_no"] == "D001"
    assert body["piece"] == "01"
    assert body["form_date"] == "2026-10-12"

    record = db.get(TableFormRecord, record_id)
    assert record is not None
    assert record.created_by_id == user.id

    rows = db.scalars(
        select(TableFormNeedleRow)
        .where(TableFormNeedleRow.form_id == record.id)
        .order_by(TableFormNeedleRow.row_number)
    ).all()

    assert len(rows) == 6
    assert [row.row_number for row in rows] == [1, 2, 3, 4, 5, 6]
    assert rows[0].needle_1 == Decimal("62")
    assert all(row.cloth is None for row in rows)


def test_table_form_rejects_missing_needle_row(db):
    user = create_test_user(db, "table_form_missing_row")
    login(user.username)

    payload = valid_payload()
    payload["needle_rows"].pop()

    response = client.post(
        "/api/v1/table-forms",
        json=payload,
    )

    assert response.status_code == 422
    assert db.scalar(select(func.count()).select_from(TableFormRecord)) == 0


def test_table_form_rejects_duplicate_needle_row(db):
    user = create_test_user(db, "table_form_duplicate_row")
    login(user.username)

    payload = valid_payload()
    payload["needle_rows"][5]["row_number"] = 5

    response = client.post(
        "/api/v1/table-forms",
        json=payload,
    )

    assert response.status_code == 422
    assert db.scalar(select(func.count()).select_from(TableFormRecord)) == 0


def test_table_form_rejects_non_integer_needle_value(db):
    user = create_test_user(db, "table_form_invalid_needle")
    login(user.username)

    payload = valid_payload()
    payload["needle_rows"][0]["needle_1"] = "1.5"

    response = client.post(
        "/api/v1/table-forms",
        json=payload,
    )

    assert response.status_code == 422
    assert db.scalar(select(func.count()).select_from(TableFormRecord)) == 0


def test_table_form_rejects_missing_source_image(db):
    user = create_test_user(db, "table_form_missing_image")
    login(user.username)

    payload = valid_payload()
    payload["source_image_record_id"] = str(uuid4())

    response = client.post(
        "/api/v1/table-forms",
        json=payload,
    )

    assert response.status_code == 400
    assert db.scalar(select(func.count()).select_from(TableFormRecord)) == 0
    assert db.scalar(select(func.count()).select_from(TableFormNeedleRow)) == 0


def test_table_form_rolls_back_parent_when_needle_insert_fails(db):
    user = create_test_user(db, "table_form_rollback_user")
    payload = TableFormCreate.model_validate(valid_payload())

    payload.needle_rows[5].row_number = 7

    with pytest.raises(IntegrityError):
        create_table_form(
            db=db,
            user=user,
            payload=payload,
        )

    parent_count = db.scalar(
        select(func.count()).select_from(TableFormRecord)
    )
    child_count = db.scalar(
        select(func.count()).select_from(TableFormNeedleRow)
    )

    assert parent_count == 0
    assert child_count == 0


def test_authenticated_user_can_list_table_forms(db):
    user = create_test_user(db, "table_form_list_user")
    login(user.username)

    create_response = client.post(
        "/api/v1/table-forms",
        json=valid_payload(),
    )
    assert create_response.status_code == 201

    response = client.get("/api/v1/table-forms")

    assert response.status_code == 200
    assert len(response.json()) >= 1

    record = next(
        item
        for item in response.json()
        if item["id"] == create_response.json()["id"]
    )

    assert record["party_name"] == "Example Party"
    assert record["design_status"] == "n"
    assert record["delivery_status"] == "n"


def test_design_status_update_does_not_change_delivery(db):
    user = create_test_user(db, "table_form_design_status_user")
    login(user.username)

    create_response = client.post(
        "/api/v1/table-forms",
        json=valid_payload(),
    )
    assert create_response.status_code == 201
    record_id = create_response.json()["id"]

    response = client.patch(
        f"/api/v1/table-forms/{record_id}/status",
        json={"workflow": "design", "status": "y"},
    )

    assert response.status_code == 200
    assert response.json()["design_status"] == "y"
    assert response.json()["delivery_status"] == "n"


def test_delivery_status_update_does_not_change_design(db):
    user = create_test_user(db, "table_form_delivery_status_user")
    login(user.username)

    create_response = client.post(
        "/api/v1/table-forms",
        json=valid_payload(),
    )
    assert create_response.status_code == 201
    record_id = create_response.json()["id"]

    response = client.patch(
        f"/api/v1/table-forms/{record_id}/status",
        json={"workflow": "delivery", "status": "y"},
    )

    assert response.status_code == 200
    assert response.json()["design_status"] == "n"
    assert response.json()["delivery_status"] == "y"


def test_status_update_rejects_invalid_status(db):
    user = create_test_user(db, "table_form_invalid_status_user")
    login(user.username)

    create_response = client.post(
        "/api/v1/table-forms",
        json=valid_payload(),
    )
    assert create_response.status_code == 201
    record_id = create_response.json()["id"]

    response = client.patch(
        f"/api/v1/table-forms/{record_id}/status",
        json={"workflow": "design", "status": "completed"},
    )

    assert response.status_code == 422


def test_status_update_rejects_invalid_workflow(db):
    user = create_test_user(db, "table_form_invalid_workflow_user")
    login(user.username)

    create_response = client.post(
        "/api/v1/table-forms",
        json=valid_payload(),
    )
    assert create_response.status_code == 201
    record_id = create_response.json()["id"]

    response = client.patch(
        f"/api/v1/table-forms/{record_id}/status",
        json={"workflow": "packing", "status": "y"},
    )

    assert response.status_code == 422


def test_status_update_returns_404_for_missing_record(db):
    user = create_test_user(db, "table_form_missing_status_user")
    login(user.username)

    response = client.patch(
        f"/api/v1/table-forms/{uuid4()}/status",
        json={"workflow": "design", "status": "y"},
    )

    assert response.status_code == 404
