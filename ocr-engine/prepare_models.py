
from pathlib import Path

from paddleocr import PPStructureV3

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"
CONFIG_PATH = BASE_DIR / "PP-StructureV3.yaml"

MODEL_DIR.mkdir(parents=True, exist_ok=True)

def main() -> None:
    print("Initialising PP-StructureV3 on CPU.")
    print("The first run may download required model files.")

    pipeline = PPStructureV3(
        device="cpu",
        use_doc_orientation_classify=True,
        use_doc_unwarping=True,
        use_textline_orientation=True,
        use_table_recognition=True,
    )

    pipeline.export_paddlex_config_to_yaml(str(CONFIG_PATH))

    print(f"\nPipeline configuration exported to: {CONFIG_PATH}")
    print("Next, we will configure and verify local model paths.")

if __name__ == "__main__":
    main()
