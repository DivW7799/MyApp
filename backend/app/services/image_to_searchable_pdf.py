from __future__ import annotations

import argparse
import json
import subprocess
import tempfile
from pathlib import Path

import cv2
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ENGINE_DIR = Path(__file__).resolve().parent
OCR_SCRIPT = ENGINE_DIR / "ocr-service.py"
OCR_PYTHON = ENGINE_DIR / ".venv" / "Scripts" / "python.exe"


def get_font():
    """Use a Unicode font when available; otherwise use Helvetica."""
    candidates = [
        Path("C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/calibri.ttf"),
    ]

    for font_path in candidates:
        if font_path.is_file():
            try:
                pdfmetrics.registerFont(
                    TTFont("SearchableFont", str(font_path))
                )
                return "SearchableFont"
            except Exception:
                continue

    return "Helvetica"


def run_ocr(image_path: Path, json_path: Path) -> dict:
    """Run the project's existing PaddleOCR service exactly once."""
    if not OCR_PYTHON.is_file():
        raise FileNotFoundError(
            f"OCR Python environment not found: {OCR_PYTHON}"
        )

    if not OCR_SCRIPT.is_file():
        raise FileNotFoundError(
            f"OCR service not found: {OCR_SCRIPT}"
        )

    process = subprocess.run(
        [
            str(OCR_PYTHON),
            str(OCR_SCRIPT),
            "--input",
            str(image_path),
            "--output",
            str(json_path),
        ],
        cwd=str(ENGINE_DIR),
        capture_output=True,
        text=True,
        timeout=180,
        check=False,
    )

    if process.returncode != 0:
        raise RuntimeError(
            "OCR service failed.\n"
            f"STDOUT:\n{process.stdout[-2000:]}\n"
            f"STDERR:\n{process.stderr[-4000:]}"
        )

    if not json_path.is_file():
        raise RuntimeError("OCR service did not create its JSON output.")

    result = json.loads(json_path.read_text(encoding="utf-8"))

    if not result.get("success"):
        raise RuntimeError(
            result.get("error", "OCR did not succeed.")
        )

    return result


def extract_box(item: dict):
    """Return a four-point PaddleOCR polygon when available."""
    box = item.get("box")

    if box is None:
        return None

    try:
        points = [[float(p[0]), float(p[1])] for p in box]
    except (TypeError, ValueError, IndexError):
        return None

    if len(points) < 4:
        return None

    return points[:4]


def create_searchable_pdf(
    image_path: Path,
    output_pdf: Path,
    ocr_result: dict,
) -> int:
    """
    Put the image on a PDF page and overlay invisible OCR text.

    The image remains visible. The text layer is selectable/searchable.
    """
    image = cv2.imread(str(image_path), cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError(f"Cannot read image: {image_path}")

    image_height, image_width = image.shape[:2]

    page_width = 595.276
    page_height = 841.890

    scale = min(
        page_width / image_width,
        page_height / image_height,
    )

    draw_width = image_width * scale
    draw_height = image_height * scale

    offset_x = (page_width - draw_width) / 2
    offset_y = (page_height - draw_height) / 2

    output_pdf.parent.mkdir(parents=True, exist_ok=True)

    pdf = canvas.Canvas(
        str(output_pdf),
        pagesize=(page_width, page_height),
        pageCompression=1,
    )

    pdf.drawImage(
        ImageReader(str(image_path)),
        offset_x,
        offset_y,
        width=draw_width,
        height=draw_height,
        preserveAspectRatio=True,
        mask="auto",
    )

    font_name = get_font()
    inserted = 0

    for item in ocr_result.get("text", []):
        text = str(item.get("text", "")).strip()
        points = extract_box(item)

        if not text or points is None:
            continue

        xs = [point[0] for point in points]
        ys = [point[1] for point in points]

        x_min = max(0.0, min(xs))
        x_max = min(float(image_width), max(xs))
        y_min = max(0.0, min(ys))
        y_max = min(float(image_height), max(ys))

        box_width = x_max - x_min
        box_height = y_max - y_min

        if box_width <= 0 or box_height <= 0:
            continue

        # Keep text approximately the same size as its image region.
        font_size = max(2.0, min(box_height * scale * 0.85, 48.0))

        # A searchable text layer should not obscure the image.
        # Text rendering mode 3 means invisible text.
        text_object = pdf.beginText()
        text_object.setTextRenderMode(3)
        text_object.setFont(font_name, font_size)

        pdf_x = offset_x + x_min * scale
        pdf_y = offset_y + (image_height - y_max) * scale

        text_object.setTextOrigin(pdf_x, pdf_y)
        text_object.textOut(text)

        pdf.drawText(text_object)
        inserted += 1

    pdf.showPage()
    pdf.save()

    return inserted


def main():
    parser = argparse.ArgumentParser(
        description="Create a searchable PDF from a card image."
    )
    parser.add_argument(
        "image",
        help="Path to a card image, preferably already cropped/straightened",
    )
    parser.add_argument(
        "-o",
        "--output",
        default="searchable_card.pdf",
        help="Output PDF path",
    )
    args = parser.parse_args()

    image_path = Path(args.image).resolve()
    output_pdf = Path(args.output).resolve()

    if not image_path.is_file():
        raise FileNotFoundError(f"Image not found: {image_path}")

    if image_path.suffix.lower() == ".pdf":
        raise ValueError("Input must be an image, not a PDF.")

    if image_path == output_pdf:
        raise ValueError("Input image and output PDF must be different files.")

    with tempfile.TemporaryDirectory(prefix="searchable-pdf-") as temp:
        json_path = Path(temp) / "ocr-result.json"

        print("Running PaddleOCR...")
        result = run_ocr(image_path, json_path)

        print(f"Recognized text items: {result.get('text_count', 0)}")

        if result.get("alignment", {}).get("applied"):
            print(
                "WARNING: OCR alignment was applied. "
                "Check text alignment in the PDF, because OCR coordinates "
                "may refer to the aligned image rather than the input image."
            )

        count = create_searchable_pdf(
            image_path=image_path,
            output_pdf=output_pdf,
            ocr_result=result,
        )

    print(f"Searchable PDF created: {output_pdf}")
    print(f"Invisible text entries inserted: {count}")


if __name__ == "__main__":
    main()
