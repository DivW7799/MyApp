import logging
import asyncio
import json
import subprocess
import tempfile
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, require_password_change_complete
from app.models.user import User
from app.services.image_record import (
    ALLOWED_IMAGE_TYPES,
    MAX_IMAGE_SIZE_BYTES,
    detect_image_type,
)
from app.services.image_conversion import (
    ImageConversionError,
    convert_image,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/ocr", tags=["ocr"])

PROJECT_ROOT = Path(__file__).resolve().parents[3]
OCR_ROOT = PROJECT_ROOT / "ocr-engine"
OCR_PYTHON = OCR_ROOT / ".venv" / "Scripts" / "python.exe"
OCR_SCRIPT = OCR_ROOT / "ocr-service.py"
OCR_TIMEOUT_SECONDS = 180


async def read_bounded_upload(image: UploadFile) -> bytes:
    chunks: list[bytes] = []
    total_size = 0
    chunk_size = 1024 * 1024

    while True:
        remaining = MAX_IMAGE_SIZE_BYTES - total_size
        chunk = await image.read(min(chunk_size, remaining + 1))

        if not chunk:
            break

        total_size += len(chunk)

        if total_size > MAX_IMAGE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Image must be 25 MiB or smaller.",
            )

        chunks.append(chunk)

    return b"".join(chunks)


@router.post("/read")
async def read_image_text(
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_password_change_complete),
):
    # OCR does not write to the database.
    del db

    try:
        image_data = await read_bounded_upload(image)
    finally:
        await image.close()

    if not image_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image is required.",
        )

    detected_type = detect_image_type(image_data)

    if detected_type is None or detected_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported or invalid image format.",
        )

    try:
        image_data, converted_type = convert_image(image_data)
    except ImageConversionError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    try:
        with tempfile.TemporaryDirectory(prefix="myapp-ocr-") as temp_name:
            temp_dir = Path(temp_name)
            input_extension = (
                ".png" if converted_type == "image/png" else ".jpg"
            )
            input_path = temp_dir / f"{uuid4().hex}{input_extension}"
            output_path = temp_dir / "result.json"

            input_path.write_bytes(image_data)

            if not OCR_PYTHON.is_file() or not OCR_SCRIPT.is_file():
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="The local OCR engine is not configured.",
                )


            try:
                process = await asyncio.to_thread(
                    subprocess.run,
                    [
                        str(OCR_PYTHON),
                        str(OCR_SCRIPT),
                        "--input",
                        str(input_path),
                        "--output",
                        str(output_path),
                    ],
                    cwd=str(OCR_ROOT),
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.PIPE,
                    text=True,
                    timeout=OCR_TIMEOUT_SECONDS,
                    check=False,
                )
            except subprocess.TimeoutExpired as exc:
                raise HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail="OCR processing timed out. Try a smaller image.",
                ) from exc

            if process.returncode != 0:
                diagnostic = (process.stderr or "")[-2000:]
                logger.error("Local OCR process failed: %s", diagnostic)

                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="The OCR engine could not process this image.",
                )

            if not output_path.is_file():
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="The OCR engine returned no result.",
                )

            try:
                result = json.loads(
                    output_path.read_text(encoding="utf-8")
                )
            except (OSError, json.JSONDecodeError) as exc:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="The OCR engine returned an invalid result.",
                ) from exc

            return result

    except HTTPException:
        raise
    except Exception:
        logger.exception("Unexpected error while processing OCR image")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to process this image.",
        )