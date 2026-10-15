from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

from PIL import Image, ImageOps
import pillow_heif


@dataclass
class CropResult:
    image: np.ndarray
    cropped: bool
    message: str
    corners: list[list[float]] | None = None
    
def load_image(path: str | Path) -> np.ndarray:
    """Load common image formats, including HEIC/HEIF, as OpenCV BGR."""
    path = Path(path)

    # Try OpenCV first for formats it supports natively.
    image = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if image is not None:
        return image

    # Fall back to Pillow for HEIC/HEIF and other supported formats.
    pillow_heif.register_heif_opener()

    try:
        with Image.open(path) as source:
            source = ImageOps.exif_transpose(source)
            rgb = np.asarray(source.convert("RGB"))
            return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    except Exception as exc:
        raise ValueError(
            f"Could not read image '{path}'. "
            "Check that the file exists and is a supported image format."
        ) from exc


def order_corners(points: np.ndarray) -> np.ndarray:
    """Return corners in top-left, top-right, bottom-right, bottom-left order."""
    points = np.asarray(points, dtype=np.float32).reshape(4, 2)

    sums = points.sum(axis=1)
    differences = np.diff(points, axis=1).ravel()

    return np.array(
        [
            points[np.argmin(sums)],        # top-left
            points[np.argmin(differences)], # top-right
            points[np.argmax(sums)],        # bottom-right
            points[np.argmax(differences)], # bottom-left
        ],
        dtype=np.float32,
    )


def detect_card_corners(image: np.ndarray) -> np.ndarray | None:
    """
    Detect a large, approximately rectangular card in a photograph.

    Uses multiple edge-detection thresholds because card borders can be
    faint, shadowed, or partly obscured.
    """
    height, width = image.shape[:2]
    image_area = height * width

    if height < 100 or width < 100:
        return None

    scale = min(1.0, 1400.0 / max(height, width))
    if scale < 1.0:
        working = cv2.resize(
            image,
            (int(width * scale), int(height * scale)),
            interpolation=cv2.INTER_AREA,
        )
    else:
        working = image.copy()

    gray = cv2.cvtColor(working, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)

    # Combine edge detection and adaptive thresholding. This helps with
    # uneven lighting and low-contrast paper edges.
    edges = cv2.Canny(gray, 35, 110)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
    edges = cv2.morphologyEx(
        edges, cv2.MORPH_CLOSE, kernel, iterations=2
    )

    adaptive = cv2.adaptiveThreshold(
        gray,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        41,
        7,
    )
    adaptive = cv2.bitwise_not(adaptive)
    adaptive = cv2.morphologyEx(
        adaptive, cv2.MORPH_CLOSE, kernel, iterations=2
    )

    candidates: list[tuple[float, np.ndarray]] = []

    for mask in (edges, adaptive):
        contours, _ = cv2.findContours(
            mask, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE
        )

        for contour in contours:
            area = cv2.contourArea(contour)
            working_area = working.shape[0] * working.shape[1]

            # Ignore tiny objects and contours covering almost the whole
            # photo, such as the image frame.
            if area < working_area * 0.12:
                continue
            if area > working_area * 0.97:
                continue

            perimeter = cv2.arcLength(contour, True)
            if perimeter <= 0:
                continue

            # Try several polygon approximation tolerances.
            for epsilon_factor in (0.015, 0.02, 0.03, 0.04):
                polygon = cv2.approxPolyDP(
                    contour, epsilon_factor * perimeter, True
                )

                if len(polygon) != 4:
                    continue
                if not cv2.isContourConvex(polygon):
                    continue

                corners = order_corners(polygon.reshape(4, 2))

                # Reject degenerate quadrilaterals.
                rect_area = cv2.contourArea(corners)
                if rect_area < working_area * 0.12:
                    continue

                top_left, top_right, bottom_right, bottom_left = corners

                top = np.linalg.norm(top_right - top_left)
                bottom = np.linalg.norm(bottom_right - bottom_left)
                left = np.linalg.norm(bottom_left - top_left)
                right = np.linalg.norm(bottom_right - top_right)

                card_width = (top + bottom) / 2
                card_height = (left + right) / 2

                if min(card_width, card_height) < 80:
                    continue

                aspect_ratio = card_width / card_height

                # Supports portrait and landscape cards without assuming
                # a single fixed paper size.
                if not 0.35 <= aspect_ratio <= 2.8:
                    continue

                # A valid card generally has four edges of reasonable
                # length. Reject candidates with extremely uneven edges.
                if min(top, bottom) / max(top, bottom) < 0.25:
                    continue
                if min(left, right) / max(left, right) < 0.25:
                    continue

                # Prefer large quadrilaterals with balanced edge lengths.
                balance = (
                    min(top, bottom) / max(top, bottom)
                    + min(left, right) / max(left, right)
                ) / 2

                score = rect_area * (0.7 + 0.3 * balance)
                candidates.append((score, corners.copy()))

                # The first valid approximation for this contour is enough.
                break

    if not candidates:
        return None

    # Convert from resized-image coordinates back to original coordinates.
    _, best = max(candidates, key=lambda item: item[0])
    best /= scale

    # Final geometric sanity checks.
    best[:, 0] = np.clip(best[:, 0], 0, width - 1)
    best[:, 1] = np.clip(best[:, 1], 0, height - 1)

    if cv2.contourArea(best) < image_area * 0.12:
        return None

    return best.astype(np.float32)


def perspective_crop(
    image: np.ndarray,
    corners: np.ndarray,
    padding_ratio: float = 0.0,
) -> np.ndarray | None:
    """Transform the detected card into a straight, top-down rectangle."""
    tl, tr, br, bl = order_corners(corners)

    output_width = int(
        max(np.linalg.norm(tr - tl), np.linalg.norm(br - bl))
    )
    output_height = int(
        max(np.linalg.norm(bl - tl), np.linalg.norm(br - tr))
    )

    if output_width < 100 or output_height < 100:
        return None

    # Preserve the detected card proportions instead of forcing A4 sizing.
    destination = np.array(
        [
            [0, 0],
            [output_width - 1, 0],
            [output_width - 1, output_height - 1],
            [0, output_height - 1],
        ],
        dtype=np.float32,
    )

    matrix = cv2.getPerspectiveTransform(
        np.array([tl, tr, br, bl], dtype=np.float32),
        destination,
    )

    corrected = cv2.warpPerspective(
        image,
        matrix,
        (output_width, output_height),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )

    return corrected


def crop_card_image(
    input_path: str | Path,
    output_path: str | Path,
) -> CropResult:
    """
    Crop and rectify a photographed card.

    If detection fails, save and return the original image rather than
    risking a destructive or incorrect crop.
    """
    input_path = Path(input_path)
    output_path = Path(output_path)

    image = load_image(input_path)

    corners = detect_card_corners(image)

    if corners is None:
        output_path.parent.mkdir(parents=True, exist_ok=True)

        if not cv2.imwrite(str(output_path), image):
            raise OSError(f"Could not write output: {output_path}")

        return CropResult(
            image=image,
            cropped=False,
            message="Card boundary not detected; original image saved.",
        )

    corrected = perspective_crop(image, corners)

    if corrected is None:
        output_path.parent.mkdir(parents=True, exist_ok=True)

        if not cv2.imwrite(str(output_path), image):
            raise OSError(f"Could not write output: {output_path}")

        return CropResult(
            image=image,
            cropped=False,
            message="Perspective correction failed; original image saved.",
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)

    if not cv2.imwrite(str(output_path), corrected):
        raise OSError(f"Could not write output: {output_path}")

    return CropResult(
        image=corrected,
        cropped=True,
        message="Card detected and perspective corrected.",
        corners=corners.tolist(),
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Detect and perspective-correct a photographed card."
    )
    parser.add_argument("input", help="Path to the original photo")
    parser.add_argument(
        "-o",
        "--output",
        default="card_crop_preview.jpg",
        help="Output image path (default: card_crop_preview.jpg)",
    )
    args = parser.parse_args()

    result = crop_card_image(args.input, args.output)

    print(result.message)
    print(f"Output: {Path(args.output).resolve()}")

    if result.corners:
        print("Corners (original image coordinates):")
        for name, point in zip(
            ("top-left", "top-right", "bottom-right", "bottom-left"),
            result.corners,
        ):
            print(f"  {name}: ({point[0]:.1f}, {point[1]:.1f})")


if __name__ == "__main__":
    main()
