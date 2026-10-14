
import argparse
import json
import logging
import tempfile
import traceback
from pathlib import Path

import cv2
from paddleocr import PaddleOCR

from card_alignment import align_card
from card_parser import parse_card

BASE_DIR = Path(__file__).resolve().parent
MODEL_ROOT = BASE_DIR / "models"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("myapp.ocr")


def model_path(name: str) -> str:
    path = MODEL_ROOT / name

    required_files = (
        "inference.pdiparams",
        "inference.json",
        "inference.yml",
    )

    missing = [
        filename
        for filename in required_files
        if not (path / filename).is_file()
    ]

    if missing:
        raise FileNotFoundError(
            f"Model '{name}' is incomplete at {path}. "
            f"Missing files: {', '.join(missing)}"
        )

    return str(path)


def serialize_result(result) -> dict:
    """Convert a PaddleOCR result to a JSON-compatible dictionary."""
    data = result.json

    if callable(data):
        data = data()

    if isinstance(data, str):
        data = json.loads(data)

    if not isinstance(data, dict):
        raise TypeError("PaddleOCR returned an unexpected result format.")

    return data


def extract_text(serialized_results: list[dict]) -> list[dict]:
    """Extract recognized text, confidence scores, and bounding boxes."""
    recognized_text = []

    for result in serialized_results:
        res = result.get("res", result)

        texts = res.get("rec_texts", [])
        scores = res.get("rec_scores", [])
        boxes = res.get("rec_polys", res.get("dt_polys", []))

        for index, value in enumerate(texts):
            value = str(value).strip()

            if not value:
                continue

            score = (
                float(scores[index])
                if index < len(scores)
                else None
            )

            box = boxes[index] if index < len(boxes) else None

            recognized_text.append({
                "text": value,
                "confidence": score,
                "box": box,
            })

    return recognized_text



def extract_printed_labels(ocr, image: cv2.typing.MatLike) -> dict:
    """Read fixed printed-label zones only. Preserve raw OCR text; never spell-correct."""
    height, width = image.shape[:2]
    zones = {
        "stitches_label": (90, 365, 330, 430),
        "d_no_label": (90, 480, 250, 550),
        "piece_label": (450, 480, 545, 550),
        "date_label": (745, 485, 870, 555),
        "needle_1_label": (245, 570, 395, 635),
        "needle_2_label": (390, 570, 540, 635),
        "needle_3_label": (535, 570, 680, 635),
        "needle_4_label": (675, 570, 825, 635),
        "needle_5_label": (820, 570, 970, 635),
        "needle_6_label": (965, 570, 1120, 635),
    }
    labels = {}
    with tempfile.TemporaryDirectory(prefix="myapp_printed_labels_") as temp_dir:
        for field, (x1, y1, x2, y2) in zones.items():
            sx, sy = width / 1200.0, height / 1600.0
            x1, x2 = int(x1 * sx), int(x2 * sx)
            y1, y2 = int(y1 * sy), int(y2 * sy)
            crop = image[max(0, y1):min(height, y2), max(0, x1):min(width, x2)]
            if crop.size == 0:
                labels[field] = {"text": "", "confidence": None, "detections": []}
                continue
            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) if len(crop.shape) == 3 else crop
            enlarged = cv2.resize(gray, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)
            crop_path = Path(temp_dir) / (field + ".png")
            if not cv2.imwrite(str(crop_path), enlarged):
                labels[field] = {"text": "", "confidence": None, "detections": []}
                continue
            try:
                predictions = ocr.predict(input=str(crop_path))
                items = extract_text([serialize_result(result) for result in predictions])
                scores = [item["confidence"] for item in items if item["confidence"] is not None]
                labels[field] = {
                    "text": " ".join(item["text"] for item in items).strip(),
                    "confidence": round(sum(scores) / len(scores), 4) if scores else None,
                    "detections": items,
                }
            except Exception as exc:
                labels[field] = {"text": "", "confidence": None, "detections": [],
                                 "error": type(exc).__name__ + ": " + str(exc)}
    return labels


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run local PaddleOCR with optional card alignment."
    )
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    if not args.input.is_file():
        raise FileNotFoundError(
            f"Input image does not exist: {args.input}"
        )

    args.output.parent.mkdir(parents=True, exist_ok=True)

    output = {
        "results": [],
        "text": [],
        "text_count": 0,
        "parsed_card": None,
        "success": False,
        "alignment": {
            "attempted": False,
            "applied": False,
            "confidence": 0.0,
            "message": "Alignment has not been attempted.",
        },
    }

    try:
        logger.info("Loading local OCR models...")

        # Keep the existing, working local model configuration.
        ocr = PaddleOCR(
            device="cpu",
            text_detection_model_name="PP-OCRv5_server_det",
            text_detection_model_dir=model_path("PP-OCRv5_server_det"),
            text_recognition_model_name="PP-OCRv5_server_rec",
            text_recognition_model_dir=model_path("PP-OCRv5_server_rec"),
            text_det_limit_side_len=960,
            text_det_limit_type="max",
            text_det_box_thresh=0.5,
            text_det_thresh=0.2,
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=False,
        )

        # Default to the original image. Alignment must never prevent OCR.
        processing_image = args.input
        alignment_info = {
            "attempted": True,
            "applied": False,
            "confidence": 0.0,
            "message": "Original image used.",
        }

        logger.info("Attempting card alignment on %s", args.input)

        try:
            original_image = cv2.imread(str(args.input))

            if original_image is None:
                raise ValueError("OpenCV could not read the input image.")

            alignment = align_card(original_image)

            alignment_info = {
                "attempted": True,
                "applied": False,
                "confidence": float(alignment.confidence),
                "message": str(alignment.message),
            }

            if alignment.success:
                # Use a temporary PNG. Never overwrite the user's upload.
                with tempfile.TemporaryDirectory(
                    prefix="myapp_ocr_"
                ) as temp_dir:
                    aligned_path = Path(temp_dir) / "aligned.png"

                    if not cv2.imwrite(
                        str(aligned_path),
                        alignment.image,
                    ):
                        raise OSError(
                            "Could not write the aligned image."
                        )

                    alignment_info["applied"] = True

                    logger.info(
                        "Alignment applied (score %.3f).",
                        alignment.confidence,
                    )

                    logger.info("Running OCR on the aligned image.")

                    predictions = ocr.predict(
                        input=str(aligned_path)
                    )

                    serialized_results = [
                        serialize_result(result)
                        for result in predictions
                    ]

                    recognized_text = extract_text(serialized_results)
                    printed_labels = extract_printed_labels(ocr, alignment.image)

                    output = {
                        "results": serialized_results,
                        "text": recognized_text,
                        "text_count": len(recognized_text),
                        "printed_labels": printed_labels,
                        "success": True,
                        "alignment": alignment_info,
                    }

            else:
                logger.warning(
                    "Alignment was not applied: %s",
                    alignment.message,
                )

        except Exception as alignment_error:
            # Alignment is optional. Log the problem and try the original.
            logger.exception(
                "Alignment failed; falling back to the original image."
            )
            alignment_info = {
                "attempted": True,
                "applied": False,
                "confidence": 0.0,
                "message": (
                    "Alignment failed; original image used. "
                    f"{type(alignment_error).__name__}: "
                    f"{alignment_error}"
                ),
            }

        # If alignment was not applied, run OCR on the original image.
        if not alignment_info["applied"]:
            logger.info("Running OCR on the original image.")

            predictions = ocr.predict(input=str(args.input))

            serialized_results = [
                serialize_result(result)
                for result in predictions
            ]

            recognized_text = extract_text(serialized_results)
            original_image = cv2.imread(str(args.input))
            printed_labels = extract_printed_labels(ocr, original_image) if original_image is not None else {}

            output = {
                "results": serialized_results,
                "text": recognized_text,
                "text_count": len(recognized_text),
                "printed_labels": printed_labels,
                "success": True,
                "alignment": alignment_info,
            }

        logger.info(
            "OCR finished. Recognized %d text items.",
            output["text_count"],
        )

    except Exception as exc:
        logger.exception("OCR processing failed")

        output = {
            "results": [],
            "text": [],
            "text_count": 0,
            "parsed_card": None,
            "success": False,
            "alignment": output.get("alignment"),
            "error": f"{type(exc).__name__}: {exc}",
            "traceback": traceback.format_exc(),
        }

    with args.output.open("w", encoding="utf-8") as output_file:
        json.dump(
            output,
            output_file,
            ensure_ascii=False,
            indent=2,
            default=str,
        )

    if not output["success"]:
        raise RuntimeError("OCR processing failed; see the OCR logs.")


if __name__ == "__main__":
    main()
