import re
from difflib import SequenceMatcher


HEADER_FIELDS = {
    "stitches": ("stitches", "stiches", "stich", "stitch"),
    "d_no": ("d no", "dno", "d number", "design no"),
    "piece": ("piece", "pieces"),
    "date": ("date",),
}

GRID_FIELDS = ["colors"] + [f"nedal_{i}" for i in range(1, 7)]
ROWS_PER_COLUMN = 6


def normalise(text):
    """Normalise label text for matching without changing stored OCR text."""
    text = str(text or "").lower().strip()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def get_box(box):
    """Convert polygon or rectangle OCR boxes into [x1, y1, x2, y2]."""
    if not box:
        return None

    try:
        if (
            len(box) == 4
            and all(isinstance(v, (int, float)) for v in box)
        ):
            x1, y1, x2, y2 = box
        else:
            points = [
                point for point in box
                if isinstance(point, (list, tuple)) and len(point) >= 2
            ]
            if not points:
                return None

            xs = [float(point[0]) for point in points]
            ys = [float(point[1]) for point in points]
            x1, y1, x2, y2 = min(xs), min(ys), max(xs), max(ys)

        return [float(x1), float(y1), float(x2), float(y2)]
    except (TypeError, ValueError):
        return None


def prepare_items(recognized_text):
    """Convert OCR detections into a consistent internal representation."""
    items = []

    for index, detection in enumerate(recognized_text or []):
        if not isinstance(detection, dict):
            continue

        text = str(detection.get("text", "")).strip()
        box = get_box(detection.get("box") or detection.get("bbox"))

        if not text or box is None:
            continue

        try:
            confidence = float(detection.get("confidence"))
        except (TypeError, ValueError):
            confidence = None

        x1, y1, x2, y2 = box
        items.append({
            "id": index,
            "text": text,
            "confidence": confidence,
            "box": box,
            "cx": (x1 + x2) / 2,
            "cy": (y1 + y2) / 2,
        })

    return items


def empty_field():
    return {
        "value": "",
        "raw_text": "",
        "confidence": None,
        "box": None,
        "needs_review": False,
        "review_reasons": [],
    }


def make_field(value="", item=None, needs_review=False, reason=None):
    result = empty_field()
    result["value"] = value

    if item:
        result["raw_text"] = item["text"]
        result["confidence"] = item["confidence"]
        result["box"] = item["box"]

    if needs_review:
        result["needs_review"] = True
        if reason:
            result["review_reasons"].append(reason)

    return result


def label_match(text):
    """Return (field_name, matched_label) only for known header labels."""
    cleaned = normalise(text)
    if not cleaned:
        return None, None

    best = (None, None, 0.0)

    for field_name, aliases in HEADER_FIELDS.items():
        for alias in aliases:
            alias_clean = normalise(alias)

            if cleaned == alias_clean:
                return field_name, alias_clean

            score = SequenceMatcher(None, cleaned, alias_clean).ratio()
            if score > best[2]:
                best = (field_name, alias_clean, score)

    if best[2] >= 0.88:
        return best[0], best[1]

    return None, None


def split_combined_label(text):
    """
    Split detections such as Piece62 and Date:12/912026.
    Return (field_name, value) or None.
    """
    raw = str(text or "").strip()

    patterns = [
        ("stitches", r"^\s*sti(?:t|c)h(?:es)?\s*[:\-]?\s*(.*?)\s*$"),
        ("d_no", r"^\s*d\s*\.?\s*n(?:o|umber)\s*\.?\s*[:\-]?\s*(.*?)\s*$"),
        ("piece", r"^\s*pieces?\s*[:\-]?\s*(.*?)\s*$"),
        ("date", r"^\s*date\s*[:\-]?\s*(.*?)\s*$"),
    ]

    for field_name, pattern in patterns:
        match = re.match(pattern, raw, flags=re.IGNORECASE)
        if match:
            value = match.group(1).strip()
            return field_name, value

    compact = re.sub(r"\s+", "", raw)

    match = re.match(r"^(pieces?)(.*)$", compact, flags=re.IGNORECASE)
    if match:
        return "piece", match.group(2).strip(" :-")

    match = re.match(r"^(date)(.*)$", compact, flags=re.IGNORECASE)
    if match:
        return "date", match.group(2).strip(" :-")

    match = re.match(
        r"^(stitches|stiches|stich|stitch)(.*)$",
        compact,
        flags=re.IGNORECASE,
    )
    if match:
        return "stitches", match.group(2).strip(" :-")

    match = re.match(
        r"^(d\.?no\.?|dnumber)(.*)$",
        compact,
        flags=re.IGNORECASE,
    )
    if match:
        return "d_no", match.group(2).strip(" :-")

    return None


def find_grid_headers(items):
    """Find Nedal-1 through Nedal-6 and record their horizontal centres."""
    headers = {}
    consumed_ids = set()

    for item in items:
        text = normalise(item["text"])
        match = re.search(r"\bn[e]?dal\s*[-_ ]?\s*([1-6])\b", text)

        if match:
            number = int(match.group(1))
            headers[number] = item
            consumed_ids.add(item["id"])

    return headers, consumed_ids


def parse_header(items):
    """
    Parse only explicit label/value detections.

    Important: a separate, unknown detection is never assigned to a header
    merely because it is close to a label.
    """
    header = {
        "stitches": empty_field(),
        "d_no": empty_field(),
        "piece": empty_field(),
        "date": empty_field(),
    }
    consumed_ids = set()

    for item in items:
        split = split_combined_label(item["text"])
        if not split:
            continue

        field_name, value = split
        consumed_ids.add(item["id"])

        if value:
            header[field_name] = make_field(
                value,
                item,
                needs_review=True,
                reason="Label and value were detected in the same OCR box",
            )
        else:
            header[field_name] = empty_field()

    for item in items:
        if item["id"] in consumed_ids:
            continue

        field_name, _ = label_match(item["text"])
        if field_name:
            consumed_ids.add(item["id"])

    return header, consumed_ids


def parse_grid(items, image_width, image_height, header_consumed_ids):
    grid = {
        column: [empty_field() for _ in range(ROWS_PER_COLUMN)]
        for column in GRID_FIELDS
    }

    headers, header_ids = find_grid_headers(items)
    consumed_ids = set(header_consumed_ids) | header_ids

    if len(headers) < 2:
        return grid, consumed_ids, set(), None

    ordered = sorted(headers.items(), key=lambda pair: pair[1]["cx"])
    centres = [item["cx"] for _, item in ordered]

    spacings = [
        centres[i + 1] - centres[i]
        for i in range(len(centres) - 1)
        if centres[i + 1] > centres[i]
    ]
    spacing = sorted(spacings)[len(spacings) // 2] if spacings else image_width / 7

    first_nedal_centre = headers.get(1, ordered[0][1])["cx"]
    column_centres = [first_nedal_centre - spacing] + [
        headers[i]["cx"] for i in range(1, 7)
    ]

    header_bottom = max(item["box"][3] for item in headers.values())
    grid_top = header_bottom + max(8, image_height * 0.005)
    grid_bottom = image_height * 0.94
    row_height = (grid_bottom - grid_top) / ROWS_PER_COLUMN

    assigned_ids = set()

    for item in sorted(items, key=lambda entry: (entry["cy"], entry["cx"])):
        if item["id"] in consumed_ids:
            continue

        if item["cy"] < grid_top or item["cy"] >= grid_bottom:
            continue

        column_index = min(
            range(len(column_centres)),
            key=lambda i: abs(item["cx"] - column_centres[i]),
        )

        if abs(item["cx"] - column_centres[column_index]) > spacing * 0.58:
            continue

        row_index = int((item["cy"] - grid_top) / row_height)
        if not 0 <= row_index < ROWS_PER_COLUMN:
            continue

        column_name = GRID_FIELDS[column_index]

        if grid[column_name][row_index]["value"]:
            continue

        grid[column_name][row_index] = make_field(
            item["text"],
            item,
            needs_review=False,
        )
        assigned_ids.add(item["id"])

    return grid, consumed_ids, assigned_ids, grid_top


def parse_card(recognized_text, image_width=1200, image_height=1600):
    """
    Parse OCR detections into header fields, grid cells and unassigned text.
    """
    items = prepare_items(recognized_text)

    header, header_consumed_ids = parse_header(items)

    grid, consumed_ids, assigned_grid_ids, grid_top = parse_grid(
        items,
        image_width,
        image_height,
        header_consumed_ids,
    )

    unassigned_text = []

    for item in items:
        if item["id"] in consumed_ids or item["id"] in assigned_grid_ids:
            continue

        unassigned_text.append({
            "text": item["text"],
            "confidence": item["confidence"],
            "box": item["box"],
            "reason": "No confidently matched header field or grid cell",
        })

    review_required = bool(unassigned_text)

    for field in header.values():
        if field["needs_review"]:
            review_required = True

    for cells in grid.values():
        for cell in cells:
            if cell["needs_review"]:
                review_required = True

    return {
        "header": header,
        "grid": grid,
        "unassigned_text": unassigned_text,
        "review_required": review_required,
    }
