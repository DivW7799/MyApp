from app.core.security import hash_password, verify_password


def test_password_hash_is_not_plaintext():
    password = "VeryStrongPassword123!"

    password_hash = hash_password(password)

    assert password_hash != password
    assert password_hash.startswith("$argon2id$")


def test_password_hash_uses_unique_salts():
    password = "VeryStrongPassword123!"

    first_hash = hash_password(password)
    second_hash = hash_password(password)

    assert first_hash != second_hash


def test_password_verification():
    password = "VeryStrongPassword123!"

    password_hash = hash_password(password)

    assert verify_password(password, password_hash)
    assert not verify_password("WrongPassword123!", password_hash)