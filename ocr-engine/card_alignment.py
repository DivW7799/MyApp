
from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np


@dataclass
class AlignmentResult:
    image: np.ndarray
    success: bool
    confidence: float
    message: str


CARD_WIDTH = 1200
CARD_HEIGHT = 1600
TARGET_HEIGHT_WIDTH_RATIO = CARD_HEIGHT / CARD_WIDTH


def order_corners(points: np.ndarray) -> np.ndarray:
    """Order four points as top-left, top-right, bottom-right, bottom-left."""
    points = np.asarray(points, dtype=np.float32).reshape(4, 2)

    # Split into the two uppermost and two lowermost points.
    by_y = points[np.argsort(points[:, 1])]
    upper = by_y[:2]
    lower = by_y[2:]

    upper = upper[np.argsort(upper[:, 0])]
    lower = lower[np.argsort(lower[:, 0])]

    top_left, top_right = upper
    bottom_left, bottom_right = lower

    return np.array(
        [top_left, top_right, bottom_right, bottom_left],
        dtype=np.float32,
    )


def warp_card(image: np.ndarray, corners: np.ndarray) -> np.ndarray:
    source = order_corners(corners)

    destination = np.array(
        [
            [0, 0],
            [CARD_WIDTH - 1, 0],
            [CARD_WIDTH - 1, CARD_HEIGHT - 1],
            [0, CARD_HEIGHT - 1],
        ],
        dtype=np.float32,
    )

    transform = cv2.getPerspectiveTransform(source, destination)

    return cv2.warpPerspective(
        image,
        transform,
        (CARD_WIDTH, CARD_HEIGHT),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )


def rectangle_quality(corners: np.ndarray, image_area: float) -> float:
    """Return a geometric score, not a probability."""
    corners = order_corners(corners)
    tl, tr, br, bl = corners

    top = np.linalg.norm(tr - tl)
    bottom = np.linalg.norm(br - bl)
    left = np.linalg.norm(bl - tl)
    right = np.linalg.norm(br - tr)

    average_width = (top + bottom) / 2
    average_height = (left + right) / 2

    if min(average_width, average_height) < 1:
        return 0.0

    ratio = average_height / average_width
    if not 1.05 <= ratio <= 2.30:
        return 0.0

    polygon_area = abs(cv2.contourArea(corners))
    area_fraction = polygon_area / image_area

    if area_fraction < 0.08:
        return 0.0

    # Prefer portrait rectangles close to the known form proportions.
    ratio_error = abs(ratio - TARGET_HEIGHT_WIDTH_RATIO)
    ratio_score = max(0.0, 1.0 - ratio_error / 0.65)

    # Avoid allowing a very large sheet edge to win on area alone.
    area_score = min(area_fraction / 0.60, 1.0)

    # Penalize extreme differences between opposing edges.
    width_balance = min(top, bottom) / max(top, bottom)
    height_balance = min(left, right) / max(left, right)
    balance_score = (width_balance + height_balance) / 2

    return (
        0.45 * ratio_score
        + 0.30 * balance_score
        + 0.25 * area_score
    )


def align_card(image: np.ndarray) -> AlignmentResult:
    """Find a portrait rectangle and perspective-correct it."""
    if image is None or image.size == 0:
        raise ValueError("The input image is empty.")

    height, width = image.shape[:2]

    if height < 100 or width < 100:
        return AlignmentResult(
            image=image,
            success=False,
            confidence=0.0,
            message="Image is too small to detect the form reliably.",
        )

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.createCLAHE(
        clipLimit=2.0,
        tileGridSize=(8, 8),
    ).apply(gray)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    image_area = float(width * height)
    candidates: list[tuple[float, np.ndarray]] = []

    kernel = np.ones((5, 5), dtype=np.uint8)

    for low, high in ((30, 100), (40, 140), (60, 180)):
        edges = cv2.Canny(blurred, low, high)
        edges = cv2.morphologyEx(
            edges,
            cv2.MORPH_CLOSE,
            kernel,
            iterations=2,
        )

        contours, _ = cv2.findContours(
            edges,
            cv2.RETR_LIST,
            cv2.CHAIN_APPROX_SIMPLE,
        )

        contours = sorted(
            contours,
            key=cv2.contourArea,
            reverse=True,
        )[:250]

        for contour in contours:
            if cv2.contourArea(contour) < image_area * 0.08:
                continue

            perimeter = cv2.arcLength(contour, True)
            if perimeter <= 0:
                continue

            for epsilon_ratio in (0.01, 0.015, 0.02, 0.03, 0.045):
                approx = cv2.approxPolyDP(
                    contour,
                    epsilon_ratio * perimeter,
                    True,
                )

                if len(approx) != 4 or not cv2.isContourConvex(approx):
                    continue

                corners = order_corners(approx.reshape(4, 2))
                score = rectangle_quality(corners, image_area)

                if score > 0:
                    candidates.append((score, corners))

    if not candidates:
        return AlignmentResult(
            image=image,
            success=False,
            confidence=0.0,
            message=(
                "No suitable form rectangle detected. "
                "Original image retained; manual alignment may be needed."
            ),
        )

    candidates.sort(key=lambda item: item[0], reverse=True)
    score, corners = candidates[0]

    # This is a geometric score, not a calibrated confidence probability.
    if score < 0.45:
        return AlignmentResult(
            image=image,
            success=False,
            confidence=float(score),
            message=(
                "Rectangle detection is uncertain. "
                "Original image retained for manual review."
            ),
        )

    aligned = warp_card(image, corners)

    return AlignmentResult(
        image=aligned,
        success=True,
        confidence=float(score),
        message=(
            "Rectangle candidate detected. "
            "Verify the output visually before using it for OCR."
        ),
    )
