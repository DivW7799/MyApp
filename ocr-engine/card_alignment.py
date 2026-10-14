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
    """Order points as top-left, top-right, bottom-right, bottom-left."""
    points = np.asarray(points, dtype=np.float32).reshape(4, 2)
    sums = points.sum(axis=1)
    differences = np.diff(points, axis=1).reshape(-1)
    top_left = points[np.argmin(sums)]
    bottom_right = points[np.argmax(sums)]
    top_right = points[np.argmin(differences)]
    bottom_left = points[np.argmax(differences)]
    ordered = np.array([top_left, top_right, bottom_right, bottom_left], dtype=np.float32)
    if len(np.unique(ordered, axis=0)) != 4:
        by_y = points[np.argsort(points[:, 1])]
        upper, lower = by_y[:2], by_y[2:]
        upper, lower = upper[np.argsort(upper[:, 0])], lower[np.argsort(lower[:, 0])]
        ordered = np.array([upper[0], upper[1], lower[1], lower[0]], dtype=np.float32)
    return ordered


def warp_card(image: np.ndarray, corners: np.ndarray) -> np.ndarray:
    source = order_corners(corners)
    destination = np.array(
        [[0, 0], [CARD_WIDTH - 1, 0],
         [CARD_WIDTH - 1, CARD_HEIGHT - 1], [0, CARD_HEIGHT - 1]],
        dtype=np.float32,
    )
    transform = cv2.getPerspectiveTransform(source, destination)
    return cv2.warpPerspective(
        image, transform, (CARD_WIDTH, CARD_HEIGHT),
        flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE,
    )


def rectangle_quality(corners: np.ndarray, image_area: float) -> float:
    corners = order_corners(corners)
    tl, tr, br, bl = corners
    top, bottom = np.linalg.norm(tr - tl), np.linalg.norm(br - bl)
    left, right = np.linalg.norm(bl - tl), np.linalg.norm(br - tr)
    average_width, average_height = (top + bottom) / 2, (left + right) / 2
    if min(average_width, average_height) < 1:
        return 0.0
    ratio = average_height / average_width
    if not 1.05 <= ratio <= 2.30:
        return 0.0
    area_fraction = abs(cv2.contourArea(corners)) / image_area
    if area_fraction < 0.08:
        return 0.0
    ratio_score = max(0.0, 1.0 - abs(ratio - TARGET_HEIGHT_WIDTH_RATIO) / 0.65)
    area_score = min(area_fraction / 0.60, 1.0)
    balance = (
        min(top, bottom) / max(top, bottom)
        + min(left, right) / max(left, right)
    ) / 2
    return 0.45 * ratio_score + 0.30 * balance + 0.25 * area_score


def _yellow_paper_candidate(image: np.ndarray) -> tuple[np.ndarray | None, float]:
    """Detect yellow form paper by colour before considering background edges."""
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    # Broad yellow range; saturation/value floors suppress most grey/black background.
    mask = cv2.inRange(hsv, np.array([12, 35, 65]), np.array([43, 255, 255]))
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (11, 11))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None, 0.0

    image_area = float(image.shape[0] * image.shape[1])
    for contour in sorted(contours, key=cv2.contourArea, reverse=True)[:8]:
        area = cv2.contourArea(contour)
        if area < image_area * 0.10:
            continue
        perimeter = cv2.arcLength(contour, True)
        if perimeter <= 0:
            continue
        for epsilon_ratio in (0.008, 0.012, 0.018, 0.025, 0.035):
            approx = cv2.approxPolyDP(contour, epsilon_ratio * perimeter, True)
            if len(approx) != 4 or not cv2.isContourConvex(approx):
                continue
            corners = order_corners(approx.reshape(4, 2))
            score = rectangle_quality(corners, image_area)
            if score >= 0.30:
                return corners, score
    return None, 0.0


def _edge_candidate(image: np.ndarray) -> tuple[np.ndarray | None, float]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    image_area = float(image.shape[0] * image.shape[1])
    kernel = np.ones((5, 5), dtype=np.uint8)
    candidates: list[tuple[float, np.ndarray]] = []

    for low, high in ((30, 100), (40, 140), (60, 180)):
        edges = cv2.Canny(blurred, low, high)
        edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel, iterations=2)
        contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        for contour in sorted(contours, key=cv2.contourArea, reverse=True)[:250]:
            if cv2.contourArea(contour) < image_area * 0.08:
                continue
            perimeter = cv2.arcLength(contour, True)
            if perimeter <= 0:
                continue
            for epsilon_ratio in (0.01, 0.015, 0.02, 0.03, 0.045):
                approx = cv2.approxPolyDP(contour, epsilon_ratio * perimeter, True)
                if len(approx) != 4 or not cv2.isContourConvex(approx):
                    continue
                corners = order_corners(approx.reshape(4, 2))
                score = rectangle_quality(corners, image_area)
                if score > 0:
                    candidates.append((score, corners))
    if not candidates:
        return None, 0.0
    return max(candidates, key=lambda item: item[0])[1], max(candidates, key=lambda item: item[0])[0]


def align_card(image: np.ndarray) -> AlignmentResult:
    """Detect the form boundary and perspective-correct it; retain original on uncertainty."""
    if image is None or image.size == 0:
        raise ValueError("The input image is empty.")
    height, width = image.shape[:2]
    if height < 100 or width < 100:
        return AlignmentResult(image, False, 0.0, "Image is too small to detect the form reliably.")

    corners, score = _yellow_paper_candidate(image)
    method = "yellow-paper colour segmentation"
    if corners is None:
        corners, score = _edge_candidate(image)
        method = "edge-based rectangle detection"

    if corners is None or score < 0.30:
        return AlignmentResult(
            image, False, float(score),
            "Could not confidently locate the form. Original image retained for review.",
        )

    aligned = warp_card(image, corners)
    return AlignmentResult(
        aligned, True, float(score),
        f"Form rectified using {method}; inspect the preview before accepting OCR.",
    )
