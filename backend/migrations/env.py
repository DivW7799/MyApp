from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import get_settings

from app.db.base import Base
from app.models.session import Session
from app.models.user import User
from app.models.image_record import ImageRecord

from app.models.table_form import TableFormNeedleRow, TableFormRecord


config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

settings = get_settings()


target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = settings.alembic_database_url

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    configuration = config.get_section(
        config.config_ini_section,
        {},
    )

    database_url = config.get_main_option(
        "test_database_url"
    )

    if not database_url:
        database_url = settings.alembic_database_url

    configuration["sqlalchemy.url"] = database_url

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()
            

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()