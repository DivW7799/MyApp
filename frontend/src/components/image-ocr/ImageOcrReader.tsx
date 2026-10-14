import { useRef, useState } from "react";

import { ApiError, api } from "../../api/client/client";
import {
  IMAGE_ACCEPT_ATTRIBUTE,
  IMAGE_FORMAT_LABEL,
  isAllowedImageFile,
} from "../../constants/image-formats";
import { MAX_IMAGE_SIZE_BYTES, MAX_IMAGE_SIZE_LABEL } from "../../constants/upload-limits";
import "./ImageOcrReader.css";

type PrintedLabel = { text: string; confidence: number | null; error?: string };
type OcrResponse = {
  success?: boolean;
  text_count?: number;
  printed_labels?: Record<string, PrintedLabel>;
  alignment?: { applied?: boolean; confidence?: number; message?: string };
  error?: string;
};

const LABEL_NAMES: Array<[string, string]> = [
  ["stitches_label", "STICHES:"],
  ["d_no_label", "D. No.:"],
  ["piece_label", "Piece"],
  ["date_label", "Date:"],
  ["needle_1_label", "Nedal-1 label"],
  ["needle_2_label", "Nedal-2 label"],
  ["needle_3_label", "Nedal-3 label"],
  ["needle_4_label", "Nedal-4 label"],
  ["needle_5_label", "Nedal-5 label"],
  ["needle_6_label", "Nedal-6 label"],
];

export function ImageOcrReader() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<OcrResponse | null>(null);
  const [rawResult, setRawResult] = useState("");
  const [isReading, setIsReading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(null);
    setResult(null);
    setRawResult("");
    setErrorMessage("");
    setStatusMessage("");
    if (!file) return;
    if (!isAllowedImageFile(file)) {
      event.target.value = "";
      setErrorMessage("Supported image formats are JPEG, PNG, WebP, BMP, TIFF, HEIC, HEIF, and AVIF.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      event.target.value = "";
      setErrorMessage(`Image must be ${MAX_IMAGE_SIZE_LABEL} or smaller.`);
      return;
    }
    setSelectedFile(file);
  }

  async function handleReadText() {
    if (!selectedFile) {
      setErrorMessage("Please select an image first.");
      return;
    }
    setIsReading(true);
    setErrorMessage("");
    setStatusMessage("Scanning the fixed printed-label areas only...");
    setResult(null);
    setRawResult("");
    try {
      const response = (await api.readImageText(selectedFile)) as OcrResponse;
      setResult(response);
      setRawResult(JSON.stringify(response, null, 2));
      setStatusMessage("Label scan complete. OCR text is shown exactly as recognized; no spelling correction is applied.");
    } catch (error: unknown) {
      setErrorMessage(error instanceof ApiError ? error.message : "Unable to process this image. Please try again.");
      setStatusMessage("");
    } finally {
      setIsReading(false);
    }
  }

  function handleClear() {
    setSelectedFile(null);
    setResult(null);
    setRawResult("");
    setErrorMessage("");
    setStatusMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <section className="image-ocr">
      <div className="image-ocr__header">
        <div>
          <p className="image-ocr__eyebrow">LOCAL OCR</p>
          <h2>Scan printed card labels</h2>
          <p>Scans the fixed printed labels only. Handwriting is not corrected or assigned to fields.</p>
        </div>
      </div>
      <div className="image-ocr__body">
        <div className="image-ocr__field">
          <label className="form-label" htmlFor="image-ocr-file">Image</label>
          <input ref={fileInputRef} id="image-ocr-file" type="file" className="form-control"
            accept={IMAGE_ACCEPT_ATTRIBUTE} onChange={handleFileChange} disabled={isReading} />
          <p className="image-ocr__hint">{IMAGE_FORMAT_LABEL}. Maximum {MAX_IMAGE_SIZE_LABEL}.</p>
        </div>
        {selectedFile && <div className="image-ocr__selected">
          <div className="image-ocr__selected-info">
            <span className="image-ocr__selected-name">{selectedFile.name}</span>
            <span className="image-ocr__selected-size">{(selectedFile.size / 1024).toFixed(1)} KB</span>
          </div>
          {!isReading && <button type="button" className="image-ocr__remove" onClick={handleClear}>Remove</button>}
        </div>}
        {errorMessage && <div className="alert alert-danger" role="alert">{errorMessage}</div>}
        {statusMessage && <div className="image-ocr__status" role="status">{statusMessage}</div>}
        <div className="image-ocr__actions">
          <button type="button" className="btn btn-primary" disabled={!selectedFile || isReading} onClick={handleReadText}>
            {isReading ? "Scanning..." : "Scan printed labels"}
          </button>
        </div>
        {result && <div className="image-ocr__editor">
          <div className="image-ocr__result-header">
            <div>
              <h3>Printed-label scan</h3>
              <p>{result.alignment?.applied ? "Perspective correction applied" : "Original image used"} · raw OCR text, no spelling correction</p>
            </div>
          </div>
          <div className="image-ocr__label-results">
            {LABEL_NAMES.map(([key, title]) => {
              const item = result.printed_labels?.[key];
              return <div className="image-ocr__label-result" key={key}>
                <span className="image-ocr__label-title">{title}</span>
                <strong>{item?.text || "No text detected"}</strong>
                <small>{typeof item?.confidence === "number" ? `Confidence: ${item.confidence.toFixed(2)}` : item?.error ?? "No confidence score"}</small>
              </div>;
            })}
          </div>
        </div>}
        <div className="image-ocr__result">
          <details>
            <summary>Raw OCR response (diagnostics)</summary>
            <pre className={["image-ocr__text-box", rawResult ? "image-ocr__text-box--has-text" : ""].filter(Boolean).join(" ")}
              aria-live="polite" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {rawResult || "The OCR result will appear here."}
            </pre>
          </details>
        </div>
      </div>
    </section>
  );
}
