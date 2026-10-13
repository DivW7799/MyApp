
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.image_record import ImageRecord
from app.models.table_form import TableFormNeedleRow, TableFormRecord
from app.models.user import User
from app.schemas.table_form import TableFormCreate


def create_table_form(
    db: Session,
    user: User,
    payload: TableFormCreate,
) -> TableFormRecord:
    """Create a Table Form and its six needle rows atomically."""

    try:
        # Validate the optional source image before creating any records.
        if payload.source_image_record_id is not None:
            image_id = db.scalar(
                select(ImageRecord.id).where(
                    ImageRecord.id == payload.source_image_record_id
                )
            )

            if image_id is None:
                raise ValueError("The specified source image does not exist.")

        # Create the parent record.
        record = TableFormRecord(
            party_name=payload.party_name,
            stitches=payload.stitches,
            d_no=payload.d_no,
            piece=payload.piece,
            form_date=payload.form_date,
            source_image_record_id=payload.source_image_record_id,
            created_by_id=user.id,
        )

        db.add(record)
        db.flush()

        # Create all six child rows within the same transaction.
        needle_rows = [
            TableFormNeedleRow(
                form_id=record.id,
                row_number=row.row_number,
                cloth=None,
                needle_1=row.needle_1,
                needle_2=row.needle_2,
                needle_3=row.needle_3,
                needle_4=row.needle_4,
                needle_5=row.needle_5,
                needle_6=row.needle_6,
            )
            for row in payload.needle_rows
        ]

        db.add_all(needle_rows)
        db.flush()

        # Commit the parent and all six rows together.
        db.commit()

        # Refresh the parent so its returned values reflect the database.
        db.refresh(record)

        return record

    except Exception:
        db.rollback()
        raise
