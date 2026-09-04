from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, require_active_admin
from app.models.user import User
from app.schemas.auth import CreateUserRequest, UserResponse
from app.schemas.user import AdminUserDetail, AdminUserListItem, AdminUserUpdateRequest
from app.services.auth import create_user
from app.services.user import get_user_by_id, list_users, update_user


router = APIRouter(
    prefix="/api/v1/admin",
    tags=["admin"],
)


@router.post(
    "/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_user_account(
    request: CreateUserRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_active_admin),
):
    try:
        user = create_user(db, request)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    return UserResponse(
        id=user.id,
        username=user.username,
        account_type=user.account_type,
        is_active=user.is_active,
        must_change_password=user.must_change_password,
    )


@router.get(
    "/users",
    response_model=list[AdminUserListItem],
)
def get_users(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_active_admin),
):
    return [
        AdminUserListItem(
            id=user.id,
            username=user.username,
            account_type=user.account_type,
            is_active=user.is_active,
            must_change_password=user.must_change_password,
        )
        for user in list_users(db)
    ]


@router.get(
    "/users/{user_id}",
    response_model=AdminUserDetail,
)
def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_active_admin),
):
    user = get_user_by_id(db, user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found",
        )

    return AdminUserDetail(
        id=user.id,
        username=user.username,
        account_type=user.account_type,
        is_active=user.is_active,
        must_change_password=user.must_change_password,
    )


@router.patch(
    "/users/{user_id}",
    response_model=AdminUserDetail,
)
def update_user_account(
    user_id: UUID,
    request: AdminUserUpdateRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_active_admin),
):
    user = get_user_by_id(db, user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found",
        )

    try:
        user = update_user(
            db=db,
            target_user=user,
            request=request,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    return AdminUserDetail(
        id=user.id,
        username=user.username,
        account_type=user.account_type,
        is_active=user.is_active,
        must_change_password=user.must_change_password,
    )