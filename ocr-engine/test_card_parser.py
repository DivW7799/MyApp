
import json
from pathlib import Path

from card_parser import parse_card


BASE_DIR = Path(__file__).resolve().parent
INPUT_PATH = BASE_DIR / "test-data" / "ocr-result.json"
OUTPUT_PATH = BASE_DIR / "test-data" / "parsed-card.json"


def main() -> None:
    with INPUT_PATH.open("r", encoding="utf-8") as file:
        ocr_result = json.load(file)

    parsed = parse_card(ocr_result.get("text", []))

    with OUTPUT_PATH.open("w", encoding="utf-8") as file:
        json.dump(parsed, file, ensure_ascii=False, indent=2)

    print(json.dumps(parsed, ensure_ascii=False, indent=2))
    print(f"\nSaved parsed card to: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
