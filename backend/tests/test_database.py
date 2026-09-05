import pytest
from sqlalchemy.exc import IntegrityError

from app.core.security import hash_password
from app.models.user import User


def test_database_rejects_case_variant_duplicate_username(db):
    first_user = User(
        username="DatabaseCaseUser",
        password_hash=hash_password("VeryStrongPassword123!"),
        account_type="U",
        is_active=True,
        must_change_password=False,
    )

    db.add(first_user)
    db.commit()

    duplicate_user = User(
        username="databasecaseuser",
        password_hash=hash_password("VeryStrongPassword123!"),
        account_type="U",
        is_active=True,
        must_change_password=False,
    )

    db.add(duplicate_user)

    with pytest.raises(IntegrityError):
        db.commit()

    db.rollback()