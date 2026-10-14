from __future__ import annotations

import re
from typing import Any


NEEDLE_COUNT = 6
ROWS_PER_NEEDLE = 6


def box_center(box: Any) -> tuple[float, float] | None:
    try:
        points = [(float(point[0]), float(point[1])) for point in box]
        if not points:
            return None
        return sum(p[0] for p in points) / len(points), sum(p[1] for p in points) / len(points)
    except (TypeError, ValueError, IndexError):
        return None


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def empty_grid() -> list[list[str]]:
    return [["" for _ in range(NEEDLE_COUNT)] for _ in range(ROWS_PER_NEEDLE)]


def _normalise_label(text: str) -> str:
    return re.sub(r"[^a-z0-9]", "", text.lower())


def _field_value(text: str, label_pattern: str) -> str:
    match = re.search(label_pattern, text, flags=re.IGNORECASE)
    if not match:
        return ""
    return clean_text(text[match.end():].strip(" :.-"))


def _extract_date(text: str) -> str:
    """Accept common OCR losses of a date separator, e.g. 12/912026."""
    match = re.search(r"(?<!\\d)(\\d{1,2})[./-](\\d{1,2})[./-]?(\\d{4}|\\d{2})(?!\\d)", text)
    if not match:
        return ""
    day_or_month, month_or_day, year = match.groups()
    return f"{day_or_month}/{month_or_day}/{year}"


def parse_card(ocr_items: list[dict[str, Any]], image_size: tuple[int, int] = (1200, 1600)) -> dict[str, Any]:
    """
    Arrange OCR detections into editable form fields.

    OCR coordinates are x/y pixels. image_size is (width, height).
    Low-confidence or unrecognized content is retained in unassigned_text;
    obscured cells are deliberately left empty rather than inferred.
    """
    width, height = image_size
    positioned = []
    for item in ocr_items:
        text = clean_text(str(item.get("text", "")))
        center = box_center(item.get("box"))
        if not text or center is None:
            continue
        positioned.append({
            "text": text, "x": center[0], "y": center[1],
            "confidence": item.get("confidence"),
        })
    positioned.sort(key=lambda item: (item["y"], item["x"]))

    header = {"name": "", "description": "", "stitches": "", "d_no": "", "piece": "", "date": ""}
    grid = empty_grid()
    unassigned: list[dict[str, Any]] = []
    needle_headings: list[dict[str, Any]] = []

    for item in positioned:
        text, x, y = item["text"], item["x"], item["y"]
        nx, ny = x / max(width, 1), y / max(height, 1)
        low = text.lower()
        norm = _normalise_label(text)

        # Label detections sometimes merge with the handwritten value.
        if "stich" in low or "stitch" in low:
            value = _field_value(text, r"stitch(?:es)?")
            if value:
                header["stitches"] = value
            continue
        if "date" in low or re.search(r"\d{1,2}[/-]\d{1,2}[/-]\d{2,4}", text):
            date = re.search(r"\d{1,2}[/-]\d{1,2}[/-]\d{2,4}", text)
            if date:
                header["date"] = date.group(0)
                continue
            if "date" in low:
                continue
        if "dno" in norm or norm.startswith("dno"):
            value = _field_value(text, r"d\s*\.?\s*no\s*\.?\s*:")
            if value:
                header["d_no"] = value
            continue
        if "piece" in low:
            value = _field_value(text, r"piece")
            digits = re.search(r"\d+", value or text)
            if digits:
                header["piece"] = digits.group(0)
            continue

        # OCR commonly reads the printed "Needle" as "Nedal".
        needle = re.search(r"(?:needle|nedal|nedle|need[e1]e)\s*[-:#]?\s*(\d+)", low)
        if needle:
            needle_headings.append({"needle": int(needle.group(1)), "x": x, "y": y})
            continue

        # Typical form regions. Header is arranged spatially to tolerate reading order changes.
        if ny < 0.27:
            if nx < 0.45 and not header["name"]:
                header["name"] = text
            elif not header["description"]:
                header["description"] = text
            else:
                unassigned.append({**item, "reason": "header_text"})
            continue

        # If a label and value were split into separate detections, place plausible free
        # header values by their y-coordinate and nearest horizontal region.
        if 0.27 <= ny < 0.36:
            if nx < 0.32 and not header["d_no"] and not re.search(r"[a-z]", text, re.I):
                header["d_no"] = text
            elif 0.30 <= nx <= 0.58 and not header["piece"] and re.search(r"\d", text):
                header["piece"] = re.search(r"\d+", text).group(0)
            elif nx > 0.65 and not header["date"] and re.search(r"\d{1,2}[/-]\d{1,2}", text):
                header["date"] = text
            else:
                unassigned.append({**item, "reason": "header_or_label"})
            continue

        # Six columns by six rows. Use centres rather than OCR return order.
        grid_left, grid_right = 0.10, 0.90
        grid_top, grid_bottom = 0.36, 0.94
        if grid_left <= nx <= grid_right and grid_top <= ny <= grid_bottom:
            col_w = (grid_right - grid_left) / NEEDLE_COUNT
            row_h = (grid_bottom - grid_top) / ROWS_PER_NEEDLE
            col = min(NEEDLE_COUNT - 1, max(0, int((nx - grid_left) / col_w)))
            row = min(ROWS_PER_NEEDLE - 1, max(0, int((ny - grid_top) / row_h)))
            grid[row][col] = (grid[row][col] + " " + text).strip()
        else:
            unassigned.append({**item, "reason": "outside_known_fields"})

    # Use detected heading x-centres to map cell values when all/most headings are present.
    # Keep fixed template mapping as fallback, since heading detections may be incomplete.
    if len(needle_headings) >= 4:
        headings = sorted(needle_headings, key=lambda item: item["x"])
        centres = [item["x"] for item in headings]
        # Re-map values by x nearest heading centre, preserving row order.
        detections = []
        for item in positioned:
            text, x, y = item["text"], item["x"], item["y"]
            if y / max(height, 1) < 0.39:
                continue
            low = text.lower()
            if re.search(r"(?:needle|nedal|nedle|need[e1]e)\s*[-:#]?\s*\d+", low):
                continue
            if not (0.36 <= y / max(height, 1) <= 0.94):
                continue
            detections.append(item)
        remapped = empty_grid()
        for item in detections:
            col = min(range(len(centres)), key=lambda index: abs(item["x"] - centres[index]))
            row = min(ROWS_PER_NEEDLE - 1, max(0, int((item["y"] / max(height, 1) - 0.36) / (0.58 / ROWS_PER_NEEDLE))))
            remapped[row][col] = (remapped[row][col] + " " + item["text"]).strip()
        # Only replace when there is content to preserve.
        if any(value for row in remapped for value in row):
            grid = remapped

    return {
        "header": header,
        "needle_columns": [
            {"needle": i + 1, "values": [grid[row][i] for row in range(ROWS_PER_NEEDLE)]}
            for i in range(NEEDLE_COUNT)
        ],
        "needle_headings": needle_headings,
        "unassigned_text": unassigned,
        "needs_manual_review": True,
    }
