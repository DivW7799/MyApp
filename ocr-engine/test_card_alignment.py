import argparse
from pathlib import Path

import cv2

from card_alignment import align_card


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    args = parser.parse_args()

    image = cv2.imread(str(args.input))

    if image is None:
        raise SystemExit(f"Could not open image: {args.input}")

    result = align_card(image)

    print(f"Success: {result.success}")
    print(f"Confidence: {result.confidence:.3f}")
    print(f"Message: {result.message}")
    print(f"Input dimensions: {image.shape[1]} x {image.shape[0]}")
    print(f"Output dimensions: {result.image.shape[1]} x {result.image.shape[0]}")

    output_path = args.input.with_name(
        f"{args.input.stem}_alignment_test.jpg"
    )

    if not cv2.imwrite(str(output_path), result.image):
        raise SystemExit("Could not save the diagnostic image.")

    print(f"Diagnostic image saved to: {output_path}")


if __name__ == "__main__":
    main()