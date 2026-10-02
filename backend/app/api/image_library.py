from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.api.dependencies import (
    get_db,
    require_password_change_complete,
)
from app.models.user import User
from app.schemas.image_record import ImageRecordResponse
from app.services.image_record import (
    create_image_record,
    get_image_record,
    list_image_records,
)


router = APIRouter(
    prefix="/api/v1/image-library",
    tags=["image-library"],
)


@router.post(
    "",
    response_model=ImageRecordResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_image(
    text: str = Form(...),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_password_change_complete
    ),
):
    image_data = await image.read()

    try:
        record = create_image_record(
            db=db,
            user=current_user,
            text=text,
            filename=image.filename,
            content_type=image.content_type,
            image_data=image_data,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return ImageRecordResponse(
        id=record.id,
        text=record.text_content,
        original_filename=record.original_filename,
        content_type=record.content_type,
        size_bytes=record.size_bytes,
        created_at=record.created_at,
    )


@router.get(
    "",
    response_model=list[ImageRecordResponse],
)
def get_images(
    search: str | None = Query(
        default=None,
        max_length=100,
    ),
    limit: int = Query(
        default=50,
        ge=1,
        le=100,
    ),
    offset: int = Query(
        default=0,
        ge=0,
    ),
    db: Session = Depends(get_db),
    _current_user: User = Depends(
        require_password_change_complete
    ),
):
    records = list_image_records(
        db=db,
        search=search,
        limit=limit,
        offset=offset,
    )

    return [
        ImageRecordResponse(
            id=record.id,
            text=record.text_content,
            original_filename=record.original_filename,
            content_type=record.content_type,
            size_bytes=record.size_bytes,
            created_at=record.created_at,
        )
        for record in records
    ]


@router.get(
    "/{record_id}/image",
)
def get_image(
    record_id: UUID,
    db: Session = Depends(get_db),
    _current_user: User = Depends(
        require_password_change_complete
    ),
):
    record = get_image_record(db, record_id)

    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found",
        )

    return Response(
        content=record.image_data,
        media_type=record.content_type,
        headers={
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, no-store",
        },
    )