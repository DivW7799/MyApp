import { useRef, useState } from "react";

import { ApiError, api } from "../../api/client/client";

import {
  IMAGE_ACCEPT_ATTRIBUTE,
  IMAGE_FORMAT_LABEL,
  isAllowedImageFile,
} from "../../constants/image-formats";

import {
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGE_SIZE_LABEL,
} from "../../constants/upload-limits";

import "./ImageOcrReader.css";

export function ImageOcrReader() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resultText, setResultText] = useState("");
  const [isReading, setIsReading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setSelectedFile(null);
    setResultText("");
    setErrorMessage("");
    setStatusMessage("");

    if (!file) {
      return;
    }

    if (!isAllowedImageFile(file)) {
      event.target.value = "";
      setErrorMessage(
        "Supported formats are PDF, JPEG, PNG, WebP, BMP, TIFF, HEIC, HEIF, and AVIF.",
      );
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      event.target.value = "";
      setErrorMessage(`File must be ${MAX_IMAGE_SIZE_LABEL} or smaller.`);
      return;
    }

    setSelectedFile(file);
  }

  async function handleReadText() {
    if (!selectedFile) {
      setErrorMessage("Please select an image or PDF first.");
      return;
    }

    setIsReading(true);
    setErrorMessage("");
    setStatusMessage("Processing document with local PaddleOCR...");
    setResultText("");

    try {
      const result = await api.readImageText(selectedFile);

      setResultText(JSON.stringify(result, null, 2));
      setStatusMessage("OCR processing completed.");
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to process this document. Please try again.");
      }

      setStatusMessage("");
    } finally {
      setIsReading(false);
    }
  }

  function handleClear() {
    setSelectedFile(null);
    setResultText("");
    setErrorMessage("");
    setStatusMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <section className="image-ocr">
      <div className="image-ocr__header">
        <div>
          <p className="image-ocr__eyebrow">LOCAL OCR</p>
          <h2>Read text from document</h2>
          <p>
            Extract text and table structure using the local PaddleOCR engine.
          </p>
        </div>
      </div>

      <div className="image-ocr__body">
        <div className="image-ocr__field">
          <label className="form-label" htmlFor="image-ocr-file">
            Image
          </label>

          <input
            ref={fileInputRef}
            id="image-ocr-file"
            type="file"
            className="form-control"
            accept={IMAGE_ACCEPT_ATTRIBUTE}
            onChange={handleFileChange}
            disabled={isReading}
          />

          <p className="image-ocr__hint">
            {IMAGE_FORMAT_LABEL}. Maximum {MAX_IMAGE_SIZE_LABEL}.
          </p>
        </div>

        {selectedFile && (
          <div className="image-ocr__selected">
            <div className="image-ocr__selected-info">
              <span className="image-ocr__selected-name">
                {selectedFile.name}
              </span>
              <span className="image-ocr__selected-size">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </span>
            </div>

            {!isReading && (
              <button
                type="button"
                className="image-ocr__remove"
                onClick={handleClear}
              >
                Remove
              </button>
            )}
          </div>
        )}

        {errorMessage && (
          <div className="alert alert-danger" role="alert">
            {errorMessage}
          </div>
        )}

        {statusMessage && (
          <div className="image-ocr__status" role="status">
            {statusMessage}
          </div>
        )}

        <div className="image-ocr__actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!selectedFile || isReading}
            onClick={handleReadText}
          >
            {isReading ? "Processing..." : "Read text"}
          </button>
        </div>

        <div className="image-ocr__result">
          <div className="image-ocr__result-header">
            <div>
              <h3>OCR result</h3>
              <p>Raw structured output from PP-StructureV3.</p>
            </div>

            {resultText && (
              <button
                type="button"
                className="image-ocr__clear-text"
                onClick={() => setResultText("")}
              >
                Clear
              </button>
            )}
          </div>

          <pre
            className={[
              "image-ocr__text-box",
              resultText ? "image-ocr__text-box--has-text" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-live="polite"
            style={{
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
            }}
          >
            {resultText || "The OCR result will appear here."}
          </pre>
        </div>
      </div>
    </section>
  );
}
