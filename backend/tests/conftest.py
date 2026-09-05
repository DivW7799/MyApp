import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, delete
from sqlalchemy.orm import Session, sessionmaker

from app.api.dependencies import get_db
from app.main import app
from app.models.session import Session as UserSession
from app.models.user import User


TEST_DATABASE_URL = os.environ["TEST_DATABASE_URL"]
TEST_DATABASE_ADMIN_URL = os.environ["TEST_DATABASE_ADMIN_URL"]

test_engine = create_engine(
    TEST_DATABASE_URL,
    pool_pre_ping=True,
)

TestingSessionLocal = sessionmaker(
    bind=test_engine,
    autoflush=False,
    autocommit=False,
)

test_admin_engine = create_engine(
    TEST_DATABASE_ADMIN_URL,
    pool_pre_ping=True,
)

TestingAdminSessionLocal = sessionmaker(
    bind=test_admin_engine,
    autoflush=False,
    autocommit=False,
)


def override_get_db():
    db = TestingSessionLocal()

    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def clean_database():
    db = TestingAdminSessionLocal()

    try:
        db.execute(delete(UserSession))
        db.execute(delete(User))
        db.commit()
        yield
    finally:
        db.rollback()
        db.close()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def db():
    session: Session = TestingSessionLocal()

    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def session_factory():
    return TestingSessionLocal