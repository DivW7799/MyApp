import threading

from sqlalchemy import select

from app.models.user import User
from app.schemas.user import AdminUserUpdateRequest
from app.services.user import update_user


TEST_PASSWORD_HASH = "unused"


def test_concurrent_admin_demotions_preserve_last_admin(
    db,
    session_factory,
):
    first_admin = User(
        username="concurrent_admin_one",
        password_hash=TEST_PASSWORD_HASH,
        account_type="A",
        is_active=True,
        must_change_password=False,
    )

    second_admin = User(
        username="concurrent_admin_two",
        password_hash=TEST_PASSWORD_HASH,
        account_type="A",
        is_active=True,
        must_change_password=False,
    )

    db.add_all([first_admin, second_admin])
    db.commit()

    first_admin_id = first_admin.id
    second_admin_id = second_admin.id

    barrier = threading.Barrier(2)
    results = []
    unexpected_errors = []

    def demote_admin(admin_id):
        thread_db = session_factory()

        try:
            target_user = thread_db.get(User, admin_id)

            assert target_user is not None

            barrier.wait()

            try:
                update_user(
                    db=thread_db,
                    target_user=target_user,
                    request=AdminUserUpdateRequest(
                        account_type="U"
                    ),
                )
                results.append("success")
            except ValueError as exc:
                results.append(str(exc))

        except Exception as exc:
            unexpected_errors.append(exc)

        finally:
            thread_db.close()

    first_thread = threading.Thread(
        target=demote_admin,
        args=(first_admin_id,),
    )

    second_thread = threading.Thread(
        target=demote_admin,
        args=(second_admin_id,),
    )

    first_thread.start()
    second_thread.start()

    first_thread.join()
    second_thread.join()

    assert not unexpected_errors
    assert len(results) == 2

    expected_error = (
        "The last active administrator cannot be "
        "demoted or deactivated"
    )

    assert results.count("success") == 1
    assert results.count(expected_error) == 1

    db.expire_all()

    active_admins = db.scalars(
        select(User).where(
            User.account_type == "A",
            User.is_active.is_(True),
        )
    ).all()

    assert len(active_admins) == 1