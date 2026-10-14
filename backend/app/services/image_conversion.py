
from __future__ import annotations

from io import BytesIO
from warnings import simplefilter
import warnings

from PIL import Image, ImageOps, UnidentifiedImageError
from pillow_heif import register_heif_opener

register_heif_opener()

MAX_IMAGE_PIXELS = 40_000_000
MAX_CONVERTED_IMAGE_BYTES = 25 * 1024 * 1024

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

PIL_FORMAT_TO_MIME = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
    "BMP": "image/bmp",
    "TIFF": "image/tiff",
    "HEIC": "image/heic",
    "HEIF": "image/heif",
    "AVIF": "image/avif",
}


class ImageConversionError(ValueError):
    """Raised when an uploaded image cannot safely be processed."""


def convert_image(data: bytes) -> tuple[bytes, str]:
    """
    Return (image_bytes, content_type).

    JPEG and PNG are validated and returned unchanged.
    All other supported formats are converted to JPEG or PNG.
    Images with transparency are converted to PNG.
    """
    if not data:
        raise ImageConversionError("Image is required.")

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)

            with Image.open(BytesIO(data)) as image:
                image_format = (image.format or "").upper()

                original_type = PIL_FORMAT_TO_MIME.get(image_format)
                if original_type not in ALLOWED_IMAGE_TYPES:
                    raise ImageConversionError(
                        "Unsupported image format."
                    )

                width, height = image.size
                if (
                    width <= 0
                    or height <= 0
                    or width * height > MAX_IMAGE_PIXELS
                ):
                    raise ImageConversionError(
                        "Image dimensions are too large."
                    )

                image.verify()

            # Reopen because verify() invalidates the image object.
            with Image.open(BytesIO(data)) as image:
                image.load()

                if original_type in {"image/jpeg", "image/png"}:
                    return data, original_type

                image = ImageOps.exif_transpose(image)

                has_transparency = (
                    "A" in image.getbands()
                    or "transparency" in image.info
                )

                output = BytesIO()

                if has_transparency:
                    image = image.convert("RGBA")
                    image.save(output, format="PNG", optimize=True)
                    output_type = "image/png"
                else:
                    image = image.convert("RGB")
                    image.save(
                        output,
                        format="JPEG",
                        quality=90,
                        optimize=True,
                    )
                    output_type = "image/jpeg"

                converted = output.getvalue()

                if len(converted) > MAX_CONVERTED_IMAGE_BYTES:
                    raise ImageConversionError(
                        "Converted image exceeds the 25 MiB limit."
                    )

                return converted, output_type

    except ImageConversionError:
        raise
    except (
        UnidentifiedImageError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
        OSError,
        ValueError,
    ) as exc:
        raise ImageConversionError(
            "Invalid or unsupported image. Please upload a valid image."
        ) from exc
