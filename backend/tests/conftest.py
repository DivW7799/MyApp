import os
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from dotenv import load_dotenv
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, delete
from sqlalchemy.orm import Session, sessionmaker

from app.api.dependencies import get_db
from app.main import app

from app.models.image_record import ImageRecord
from app.models.session import Session as UserSession
from app.models.user import User
from app.models.table_form import TableFormNeedleRow, TableFormRecord


TEST_ENV_FILE = Path(__file__).with_name(".env.test")
load_dotenv(TEST_ENV_FILE)

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


def run_test_database_migrations():
    alembic_ini = Path(__file__).resolve().parents[1] / "alembic.ini"

    config = Config(str(alembic_ini))

    config.set_main_option(
        "test_database_url",
        TEST_DATABASE_ADMIN_URL.replace("%", "%%"),
    )

    command.upgrade(config, "head")


run_test_database_migrations()


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
        db.execute(delete(TableFormNeedleRow))
        db.execute(delete(TableFormRecord))
        db.execute(delete(ImageRecord))
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