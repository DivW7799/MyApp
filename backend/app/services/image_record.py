from difflib import SequenceMatcher
from pathlib import PurePath

import re

from sqlalchemy import extract, or_, select
from sqlalchemy.orm import Session

from datetime import date, datetime, time, timedelta, timezone

from app.models.image_record import ImageRecord
from app.models.user import User

from app.services.image_conversion import (
    ALLOWED_IMAGE_TYPES,
    ImageConversionError,
    convert_image,
)


MAX_IMAGE_SIZE_BYTES = 25 * 1024 * 1024

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/bmp",
    "image/tiff",
    "image/heic",
    "image/heif",
    "image/avif",
}

MONTH_NAMES = {
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
}

MONTH_ABBREVIATIONS = {
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "sept": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
}

MONTH_FUZZY_THRESHOLD = 0.72
YEAR_PATTERN = re.compile(r"\b(19\d{2}|20\d{2}|21\d{2})\b")


def find_month_number(search_value: str) -> int | None:
    normalized = search_value.strip().lower()

    if not normalized:
        return None

    if normalized in MONTH_NAMES:
        return MONTH_NAMES[normalized]

    if normalized in MONTH_ABBREVIATIONS:
        return MONTH_ABBREVIATIONS[normalized]

    candidates = list(MONTH_NAMES.items())

    best_month = None
    best_ratio = 0.0

    for month_name, month_number in candidates:
        ratio = SequenceMatcher(
            None,
            normalized,
            month_name,
        ).ratio()

        if ratio > best_ratio:
            best_ratio = ratio
            best_month = month_number

    if best_ratio >= MONTH_FUZZY_THRESHOLD:
        return best_month

    return None


def find_year(search_value: str) -> int | None:
    match = YEAR_PATTERN.search(search_value)

    if match is None:
        return None

    return int(match.group(1))


def detect_image_type(data: bytes) -> str | None:
    # JPEG
    if data.startswith(b"\xFF\xD8\xFF"):
        return "image/jpeg"

    # PNG
    if data.startswith(
        b"\x89PNG\r\n\x1a\n"
    ):
        return "image/png"

    # WebP
    if (
        len(data) >= 12
        and data[:4] == b"RIFF"
        and data[8:12] == b"WEBP"
    ):
        return "image/webp"

    # BMP
    if data.startswith(b"BM"):
        return "image/bmp"

    # TIFF - little endian
    if data.startswith(b"II*\x00"):
        return "image/tiff"

    # TIFF - big endian
    if data.startswith(b"MM\x00*"):
        return "image/tiff"

    # ISO Base Media File Format
    # Used by HEIC/HEIF and AVIF.
    if len(data) >= 12 and data[4:8] == b"ftyp":
        brand = data[8:12]

        heif_brands = {
            b"heic",
            b"heix",
            b"hevc",
            b"hevx",
            b"heim",
            b"heis",
            b"hevm",
            b"hevs",
            b"mif1",
            b"msf1",
        }

        avif_brands = {
            b"avif",
            b"avis",
        }

        if brand in heif_brands:
            return "image/heic"

        if brand in avif_brands:
            return "image/avif"

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
        raise ValueError("Text must be 1000 characters or fewer")

    if not image_data:
        raise ValueError("Image is required")

    if len(image_data) > MAX_IMAGE_SIZE_BYTES:
        raise ValueError("Image must be 25 MiB or smaller")

    # Validate the actual image contents and convert unsupported
    # OCR/storage formats to JPEG or PNG.
    try:
        stored_data, stored_type = convert_image(image_data)
    except ImageConversionError as exc:
        raise ValueError(str(exc)) from exc

    if len(stored_data) > MAX_IMAGE_SIZE_BYTES:
        raise ValueError("Stored image must be 25 MiB or smaller")

    record = ImageRecord(
        text_content=text,
        original_filename=sanitize_filename(filename),
        content_type=stored_type,
        size_bytes=len(stored_data),
        image_data=stored_data,
        created_by_id=user.id,
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return record


def list_image_records(
    db: Session,
    search: str | None = None,
    description: str | None = None,
    filename: str | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[ImageRecord]:
    query = select(ImageRecord)

    def escape_like(value: str) -> str:
        return (
            value
            .replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_")
        )

    if search:
        search_value = search.strip()

        if search_value:
            escaped = escape_like(search_value)
            pattern = f"%{escaped}%"

            query = query.where(
                (
                    ImageRecord.text_content.ilike(
                        pattern,
                        escape="\\",
                    )
                    | ImageRecord.original_filename.ilike(
                        pattern,
                        escape="\\",
                    )
                )
            )

    if description:
        description_value = description.strip()

        if description_value:
            escaped = escape_like(description_value)

            query = query.where(
                ImageRecord.text_content.ilike(
                    f"%{escaped}%",
                    escape="\\",
                )
            )

    if filename:
        filename_value = filename.strip()

        if filename_value:
            escaped = escape_like(filename_value)

            query = query.where(
                ImageRecord.original_filename.ilike(
                    f"%{escaped}%",
                    escape="\\",
                )
            )

    if from_date is not None:
        from_datetime = datetime.combine(
            from_date,
            time.min,
            tzinfo=timezone.utc,
        )
        
        query = query.where(
            ImageRecord.created_at >= from_date
        )

    if to_date is not None:
        to_datetime = datetime.combine(
            to_date + timedelta(days=1),
            time.min,
            tzinfo=timezone.utc,
        )
        
        query = query.where(
            ImageRecord.created_at
            < to_date.fromordinal(to_date.toordinal() + 1)
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