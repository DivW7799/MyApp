from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, require_active_admin
from app.models.user import User
from app.schemas.auth import CreateUserRequest, UserResponse
from app.services.auth import create_user


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