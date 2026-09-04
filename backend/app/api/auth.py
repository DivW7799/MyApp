from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Response,
    status,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db
from app.core.config import get_settings
from app.core.security import verify_password
from app.models.user import User
from app.schemas.auth import (
    ChangeOwnPasswordRequest,
    CompletePasswordChangeRequest,
    LoginRequest,
    UserResponse,
)
from app.services.auth import (
    change_own_password,
    complete_forced_password_change,
)
from app.services.session import create_session, delete_session


router = APIRouter(
    prefix="/api/v1/auth",
    tags=["authentication"],
)


@router.post(
    "/login",
    response_model=UserResponse,
)
def login(
    request: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    user = db.scalar(
        select(User).where(
            User.username == request.username
        )
    )

    invalid_credentials = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid username or password",
    )

    if user is None:
        raise invalid_credentials

    if not user.is_active:
        raise invalid_credentials

    if not verify_password(
        request.password,
        user.password_hash,
    ):
        raise invalid_credentials

    raw_token, _ = create_session(db, user)

    settings = get_settings()

    response.set_cookie(
        key=settings.session_cookie_name,
        value=raw_token,
        httponly=True,
        secure=settings.environment != "development",
        samesite="lax",
        max_age=settings.session_expire_hours * 60 * 60,
        path="/",
    )

    return UserResponse(
        id=user.id,
        username=user.username,
        account_type=user.account_type,
        is_active=user.is_active,
        must_change_password=user.must_change_password,
    )


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
)
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    settings = get_settings()

    session_token = request.cookies.get(
        settings.session_cookie_name
    )

    if session_token:
        delete_session(db, session_token)

    response.delete_cookie(
        key=settings.session_cookie_name,
        path="/",
    )


@router.get(
    "/me",
    response_model=UserResponse,
)
def me(
    current_user: User = Depends(get_current_user),
):
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        account_type=current_user.account_type,
        is_active=current_user.is_active,
        must_change_password=current_user.must_change_password,
    )


@router.post(
    "/complete-password-change",
    response_model=UserResponse,
)
def complete_password_change(
    request: CompletePasswordChangeRequest,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        raw_token = complete_forced_password_change(
            db=db,
            user=current_user,
            new_password=request.new_password,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    settings = get_settings()

    response.set_cookie(
        key=settings.session_cookie_name,
        value=raw_token,
        httponly=True,
        secure=settings.environment != "development",
        samesite="lax",
        max_age=settings.session_expire_hours * 60 * 60,
        path="/",
    )

    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        account_type=current_user.account_type,
        is_active=current_user.is_active,
        must_change_password=current_user.must_change_password,
    )


@router.post(
    "/change-password",
    response_model=UserResponse,
)
def change_password(
    request: ChangeOwnPasswordRequest,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        raw_token = change_own_password(
            db=db,
            user=current_user,
            current_password=request.current_password,
            new_password=request.new_password,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    settings = get_settings()

    response.set_cookie(
        key=settings.session_cookie_name,
        value=raw_token,
        httponly=True,
        secure=settings.environment != "development",
        samesite="lax",
        max_age=settings.session_expire_hours * 60 * 60,
        path="/",
    )

    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        account_type=current_user.account_type,
        is_active=current_user.is_active,
        must_change_password=current_user.must_change_password,
    )