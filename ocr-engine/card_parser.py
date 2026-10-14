
from __future__ import annotations

import re
from datetime import datetime
from typing import Any


NEEDLE_COUNT = 6
ROWS_PER_NEEDLE = 6


def box_center(box: Any) -> tuple[float, float] | None:
    """Return the center point of a PaddleOCR polygon."""
    try:
        points = [
            (float(point[0]), float(point[1]))
            for point in box
        ]

        if not points:
            return None

        return (
            sum(point[0] for point in points) / len(points),
            sum(point[1] for point in points) / len(points),
        )
    except (TypeError, ValueError, IndexError):
        return None


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def empty_grid() -> list[list[str]]:
    """Six rows, each containing six needle-column values."""
    return [
        ["" for _ in range(NEEDLE_COUNT)]
        for _ in range(ROWS_PER_NEEDLE)
    ]


def parse_card(ocr_items: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Convert OCR text boxes into editable card fields.

    Grid values are assigned by normalized position. Unreadable or
    obscured cells remain blank instead of being guessed.
    """
    positioned = []

    for item in ocr_items:
        text = clean_text(str(item.get("text", "")))
        center = box_center(item.get("box"))

        if not text or center is None:
            continue

        x, y = center
        positioned.append({
            "text": text,
            "x": x,
            "y": y,
            "confidence": item.get("confidence"),
        })

    # Use the OCR coordinate space. The current aligned output is 1200x1600.
    # Keep these values explicit so they can be calibrated to the template.
    width = 1200.0
    height = 1600.0

    header = {
        "name": "",
        "description": "",
        "stitches": "",
        "d_no": "",
        "piece": "",
        "date": "",
    }

    grid = empty_grid()
    unassigned = []

    for item in positioned:
        text = item["text"]
        x = item["x"]
        y = item["y"]
        normalized_x = x / width
        normalized_y = y / height

        # Header text: use spatial bands, not OCR return order.
        if normalized_y < 0.29:
            if not header["name"] and normalized_y < 0.25:
                header["name"] = text
            elif not header["description"]:
                header["description"] = text
            else:
                unassigned.append(text)
            continue

        if normalized_y < 0.38:
            lower = text.lower()

            if "stich" in lower or "stitch" in lower:
                continue
            if "date" in lower:
                date_match = re.search(
                    r"\d{1,2}[/-]\d{1,2}[/-]\d{2,4}",
                    text,
                )
                header["date"] = (
                    date_match.group(0) if date_match else ""
                )
                continue
            if "d.no" in lower or "d. no" in lower:
                continue
            if "piece" in lower:
                piece_match = re.search(r"\d+", text)
                header["piece"] = (
                    piece_match.group(0) if piece_match else ""
                )
                continue

        # Label positions may vary slightly, so use text as well.
        lower = text.lower()

        if "stich" in lower or "stitch" in lower:
            continue

        if "date" in lower:
            date_match = re.search(
                r"\d{1,2}[/-]\d{1,2}[/-]\d{2,4}",
                text,
            )
            header["date"] = date_match.group(0) if date_match else ""
            continue

        if "d.no" in lower or "d. no" in lower:
            continue

        if "piece" in lower:
            piece_match = re.search(r"\d+", text)
            header["piece"] = piece_match.group(0) if piece_match else ""
            continue

        # Needle headings are labels, not cell values.
        needle_match = re.search(r"needle\s*[-:]?\s*(\d+)", lower)
        if needle_match:
            continue

        # The printed grid begins below the needle headings.
        # Leave anything outside the grid unassigned for manual review.
        grid_top = 0.36
        grid_bottom = 0.94
        grid_left = 0.10
        grid_right = 0.90

        if not (
            grid_top <= normalized_y <= grid_bottom
            and grid_left <= normalized_x <= grid_right
        ):
            unassigned.append(text)
            continue

        column_width = (grid_right - grid_left) / NEEDLE_COUNT
        row_height = (grid_bottom - grid_top) / ROWS_PER_NEEDLE

        column = int((normalized_x - grid_left) / column_width)
        row = int((normalized_y - grid_top) / row_height)

        column = max(0, min(NEEDLE_COUNT - 1, column))
        row = max(0, min(ROWS_PER_NEEDLE - 1, row))

        # Preserve multiple detections in a cell instead of overwriting.
        if grid[row][column]:
            grid[row][column] += " " + text
        else:
            grid[row][column] = text

    # Do not infer a date format or silently invent missing values.
    return {
        "header": header,
        "needle_columns": [
            {
                "needle": needle_index + 1,
                "values": [
                    grid[row_index][needle_index]
                    for row_index in range(ROWS_PER_NEEDLE)
                ],
            }
            for needle_index in range(NEEDLE_COUNT)
        ],
        "unassigned_text": unassigned,
        "needs_manual_review": True,
    }
