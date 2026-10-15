from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import (
    get_db,
    require_password_change_complete,
)
from app.models.user import User
from app.schemas.table_form import (
    TableFormCreate,
    TableFormRecordResponse,
)
from app.services.table_form import create_table_form


router = APIRouter(
    prefix="/api/v1/table-forms",
    tags=["table-forms"],
)


@router.post(
    "",
    response_model=TableFormRecordResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_table_form_endpoint(
    payload: TableFormCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_password_change_complete
    ),
):
    try:
        record = create_table_form(
            db=db,
            user=current_user,
            payload=payload,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return record
