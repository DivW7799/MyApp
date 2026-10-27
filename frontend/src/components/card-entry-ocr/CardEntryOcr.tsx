
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
import "./CardEntryOcr.css";

const OCR_TIMEOUT_MS = 25_000;

type ParsedField = {
  value?: string | number | null;
};

type ParsedCard = {
  header?: {
    stitches?: ParsedField;
    d_no?: ParsedField;
    piece?: ParsedField;
    date?: ParsedField;
  };
  grid?: Record<string, ParsedField[]>;
};

type OcrResponse = {
  success?: boolean;
  parsed_card?: ParsedCard;
};

type Props = {
  onApply: (card: ParsedCard) => void;
  disabled?: boolean;
};

export function CardEntryOcr({ onApply, disabled = false }: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] ?? null;

    setSelectedFile(null);
    setErrorMessage("");
    setStatusMessage("");

    if (!file) return;

    if (!isAllowedImageFile(file)) {
      event.target.value = "";
      setErrorMessage(
        "Please select a supported image or PDF file.",
      );
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      event.target.value = "";
      setErrorMessage(
        `File must be ${MAX_IMAGE_SIZE_LABEL} or smaller.`,
      );
      return;
    }

    setSelectedFile(file);
  }

  async function handleReadCard() {
    if (!selectedFile || isReading || disabled) return;

    const controller = new AbortController();
    let timedOut = false;

    setIsReading(true);
    setErrorMessage("");
    setStatusMessage("Reading your card…");

    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, OCR_TIMEOUT_MS);

    try {
      const result = (await api.readImageText(
        selectedFile,
        controller.signal,
      )) as OcrResponse;

      if (timedOut) return;

      if (!result.success || !result.parsed_card) {
        throw new Error("OCR could not recognise this card.");
      }

      onApply(result.parsed_card);
      setStatusMessage("Card read successfully. Check the populated fields.");
    } catch (error: unknown) {
      if (timedOut) {
        setErrorMessage(
          "OCR couldn’t read this card within 25 seconds. Please try again.",
        );
      } else if (error instanceof ApiError) {
        setErrorMessage(
          "OCR couldn’t read this card. Please check the file and try again.",
        );
      } else if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        setErrorMessage(
          "OCR couldn’t read this card. Please try again.",
        );
      } else {
        setErrorMessage(
          "OCR couldn’t read this card. Please try again.",
        );
      }

      setStatusMessage("");
    } finally {
      window.clearTimeout(timeoutId);
      setIsReading(false);
    }
  }

  function handleClear() {
    if (isReading) return;

    setSelectedFile(null);
    setErrorMessage("");
    setStatusMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <section className="card-ocr">
      <div className="card-ocr__heading">
        <div>
          <p className="card-ocr__eyebrow">SMART CARD READER</p>
          <h2>Read card automatically</h2>
          <p>
            Upload a card image and we’ll fill in the matching
            fields for you.
          </p>
        </div>
        <span className="card-ocr__chip" aria-hidden="true">
          AI / OCR
        </span>
      </div>

      <div className="card-ocr__upload">
        <label htmlFor="card-ocr-file" className="form-label">
          Card image or PDF
        </label>
        <input
          ref={fileInputRef}
          id="card-ocr-file"
          className="form-control"
          type="file"
          accept={IMAGE_ACCEPT_ATTRIBUTE}
          onChange={handleFileChange}
          disabled={isReading || disabled}
        />
        <p className="card-ocr__hint">
          {IMAGE_FORMAT_LABEL}. Maximum {MAX_IMAGE_SIZE_LABEL}.
        </p>

        {selectedFile && (
          <div className="card-ocr__file">
            <span className="card-ocr__file-icon" aria-hidden="true">
              ↗
            </span>
            <div className="card-ocr__file-details">
              <strong>{selectedFile.name}</strong>
              <span>{(selectedFile.size / 1024).toFixed(1)} KB</span>
            </div>
            {!isReading && (
              <button
                type="button"
                className="card-ocr__remove"
                onClick={handleClear}
                disabled={disabled}
              >
                Remove
              </button>
            )}
          </div>
        )}

        {isReading && (
          <div
            className="card-ocr__scanner"
            role="status"
            aria-live="polite"
          >
            <div className="card-ocr__scanner-graphic">
              <div className="card-ocr__scanner-ring" />
              <div className="card-ocr__scanner-ring card-ocr__scanner-ring--inner" />
              <div className="card-ocr__scanner-core">
                <span />
              </div>
              <div className="card-ocr__scan-line" />
            </div>
            <div className="card-ocr__scanner-copy">
              <strong>Reading your card…</strong>
              <span>Analysing text and locating card fields</span>
              <div className="card-ocr__progress">
                <span />
              </div>
              <small>Maximum processing time: 25 seconds</small>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="card-ocr__error" role="alert">
            <span aria-hidden="true">!</span>
            {errorMessage}
          </div>
        )}

        {statusMessage && !isReading && !errorMessage && (
          <p className="card-ocr__success" role="status">
            <span aria-hidden="true">✓</span> {statusMessage}
          </p>
        )}

        <div className="card-ocr__actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleReadCard}
            disabled={!selectedFile || isReading || disabled}
          >
            {isReading ? "Reading card…" : "Read card"}
          </button>
        </div>
      </div>
    </section>
  );
}
