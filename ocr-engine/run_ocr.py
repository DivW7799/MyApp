
import json
from pathlib import Path

from paddleocr import PPStructureV3

BASE_DIR = Path(__file__).resolve().parent
IMAGE_PATH = BASE_DIR / "test-data" / "sample-form.png"
OUTPUT_DIR = BASE_DIR / "output"
MODEL_ROOT = BASE_DIR / "models"


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


def main() -> None:
    if not IMAGE_PATH.is_file():
        raise FileNotFoundError(f"Test image not found: {IMAGE_PATH}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Input image: {IMAGE_PATH}")
    print(f"Local model directory: {MODEL_ROOT}")
    print("Initialising PP-StructureV3 using project-local models...")

    pipeline = PPStructureV3(
        device="cpu",
        layout_detection_model_dir=model_path("PP-DocLayout_plus-L"),
        doc_orientation_classify_model_dir=model_path(
            "PP-LCNet_x1_0_doc_ori"
        ),
        doc_unwarping_model_dir=model_path("UVDoc"),
        text_detection_model_dir=model_path("PP-OCRv5_server_det"),
        text_recognition_model_dir=model_path("PP-OCRv5_server_rec"),
        textline_orientation_model_dir=model_path(
            "PP-LCNet_x1_0_textline_ori"
        ),
        table_classification_model_dir=model_path(
            "PP-LCNet_x1_0_table_cls"
        ),
        wired_table_structure_recognition_model_dir=model_path(
            "SLANeXt_wired"
        ),
        wireless_table_structure_recognition_model_dir=model_path(
            "SLANet_plus"
        ),
        wired_table_cells_detection_model_dir=model_path(
            "RT-DETR-L_wired_table_cell_det"
        ),
        wireless_table_cells_detection_model_dir=model_path(
            "RT-DETR-L_wireless_table_cell_det"
        ),
        use_doc_orientation_classify=True,
        use_doc_unwarping=True,
        use_textline_orientation=True,
        use_table_recognition=True,
        use_formula_recognition=False,
        use_chart_recognition=False,
        use_region_detection=False,
        use_seal_recognition=False,
    )

    print("Running OCR. This may take a while on the CPU...")

    results = list(pipeline.predict(input=str(IMAGE_PATH)))

    if not results:
        raise RuntimeError("The OCR pipeline returned no results.")

    for index, result in enumerate(results, start=1):
        output_path = OUTPUT_DIR / f"result_{index}"
        output_path.mkdir(parents=True, exist_ok=True)

        if hasattr(result, "save_to_json"):
            result.save_to_json(save_path=str(output_path))

        if hasattr(result, "save_to_markdown"):
            result.save_to_markdown(save_path=str(output_path))

        if hasattr(result, "json"):
            data = result.json

            if callable(data):
                data = data()

            if isinstance(data, str):
                data = json.loads(data)

            with (output_path / "result.json").open(
                "w", encoding="utf-8"
            ) as file:
                json.dump(
                    data,
                    file,
                    ensure_ascii=False,
                    indent=2,
                    default=str,
                )

        print(f"Result {index} saved to: {output_path}")

    print("\nOCR processing finished.")
    print(f"Inspect the output folder: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
