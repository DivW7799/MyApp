from pathlib import PurePath

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.image_record import ImageRecord
from app.models.user import User


MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}


def detect_image_type(data: bytes) -> str | None:
    if data.startswith(b"\xFF\xD8\xFF"):
        return "image/jpeg"

    if data.startswith(
        b"\x89PNG\r\n\x1a\n"
    ):
        return "image/png"

    if (
        len(data) >= 12
        and data[:4] == b"RIFF"
        and data[8:12] == b"WEBP"
    ):
        return "image/webp"

    return None


def sanitize_filename(filename: str | None) -> str:
    if not filename:
        return "uploaded-image"

    filename = PurePath(filename).name.strip()

    if not filename:
        return "uploaded-image"

    return filename[:255]


def create_image_record(
    db: Session,
    user: User,
    text: str,
    filename: str | None,
    content_type: str | None,
    image_data: bytes,
) -> ImageRecord:
    text = text.strip()

    if not text:
        raise ValueError("Text is required")

    if len(text) > 1000:
        raise ValueError(
            "Text must be 1000 characters or fewer"
        )

    if len(image_data) == 0:
        raise ValueError("Image is required")

    if len(image_data) > MAX_IMAGE_SIZE_BYTES:
        raise ValueError(
            "Image must be 5 MB or smaller"
        )

    detected_type = detect_image_type(image_data)

    if detected_type is None:
        raise ValueError(
            "Only JPEG, PNG, and WebP images are allowed"
        )

    if content_type not in ALLOWED_IMAGE_TYPES:
        raise ValueError(
            "Only JPEG, PNG, and WebP images are allowed"
        )

    if content_type != detected_type:
        raise ValueError(
            "Image content does not match its declared type"
        )

    record = ImageRecord(
        text_content=text,
        original_filename=sanitize_filename(filename),
        content_type=detected_type,
        size_bytes=len(image_data),
        image_data=image_data,
        created_by_id=user.id,
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return record


def list_image_records(
    db: Session,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[ImageRecord]:
    query = select(ImageRecord)

    if search:
        search_value = search.strip()

        if search_value:
            escaped = (
                search_value
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_")
            )

            query = query.where(
                ImageRecord.text_content.ilike(
                    f"%{escaped}%",
                    escape="\\",
                )
            )

    query = (
        query
        .order_by(ImageRecord.created_at.desc())
        .limit(limit)
        .offset(offset)
    )

    return list(db.scalars(query).all())


def get_image_record(
    db: Session,
    record_id,
) -> ImageRecord | None:
    return db.get(ImageRecord, record_id)