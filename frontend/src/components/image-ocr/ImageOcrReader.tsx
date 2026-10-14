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

type CardHeader = {
  name: string;
  description: string;
  stitches: string;
  d_no: string;
  piece: string;
  date: string;
};

type ParsedCard = {
  header: CardHeader;
  needle_columns: Array<{ needle: number; values: string[] }>;
  unassigned_text?: Array<{ text: string; confidence?: number; reason?: string }>;
  needs_manual_review?: boolean;
};

type OcrResponse = {
  success?: boolean;
  text_count?: number;
  text?: Array<{ text: string; confidence?: number | null; box?: unknown }>;
  alignment?: { applied?: boolean; confidence?: number; message?: string };
  parsed_card?: ParsedCard | null;
  error?: string;
};

const EMPTY_HEADER: CardHeader = {
  name: "", description: "", stitches: "", d_no: "", piece: "", date: "",
};

function emptyColumns() {
  return Array.from({ length: 6 }, (_, index) => ({
    needle: index + 1,
    values: Array.from({ length: 6 }, () => ""),
  }));
}

export function ImageOcrReader() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resultText, setResultText] = useState("");
  const [ocrResult, setOcrResult] = useState<OcrResponse | null>(null);
  const [header, setHeader] = useState<CardHeader>(EMPTY_HEADER);
  const [columns, setColumns] = useState(emptyColumns);
  const [isReading, setIsReading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetResult() {
    setResultText("");
    setOcrResult(null);
    setHeader(EMPTY_HEADER);
    setColumns(emptyColumns());
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(null);
    resetResult();
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
    setStatusMessage("Processing image with local PaddleOCR...");
    resetResult();

    try {
      const result = (await api.readImageText(selectedFile)) as OcrResponse;
      setOcrResult(result);
      setResultText(JSON.stringify(result, null, 2));
      if (result.parsed_card) {
        setHeader({ ...EMPTY_HEADER, ...result.parsed_card.header });
        const incoming = result.parsed_card.needle_columns ?? [];
        setColumns(Array.from({ length: 6 }, (_, index) => ({
          needle: index + 1,
          values: Array.from({ length: 6 }, (_, row) => incoming[index]?.values?.[row] ?? ""),
        })));
      }
      setStatusMessage("OCR completed. Review and correct the editable fields before using them.");
    } catch (error: unknown) {
      setErrorMessage(error instanceof ApiError ? error.message : "Unable to process this image. Please try again.");
      setStatusMessage("");
    } finally {
      setIsReading(false);
    }
  }

  function handleClear() {
    setSelectedFile(null);
    resetResult();
    setErrorMessage("");
    setStatusMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function updateHeader(field: keyof CardHeader, value: string) {
    setHeader((current) => ({ ...current, [field]: value }));
  }

  function updateCell(columnIndex: number, rowIndex: number, value: string) {
    setColumns((current) => current.map((column, index) => index !== columnIndex ? column : ({
      ...column,
      values: column.values.map((cell, row) => row === rowIndex ? value : cell),
    })));
  }

  function copyEditedCard() {
    const exportData = {
      header,
      needle_columns: columns,
      source_file: selectedFile?.name ?? null,
      needs_manual_review: true,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "edited-embroidery-card.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="image-ocr">
      <div className="image-ocr__header">
        <div>
          <p className="image-ocr__eyebrow">LOCAL OCR</p>
          <h2>Read embroidery card</h2>
          <p>Extract the form locally, then review every field. Hidden or uncertain values are not guessed.</p>
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
            {isReading ? "Processing..." : "Read text"}
          </button>
        </div>

        {ocrResult && <div className="image-ocr__editor">
          <div className="image-ocr__result-header">
            <div>
              <h3>Editable card fields</h3>
              <p>{ocrResult.text_count ?? 0} text detections · {ocrResult.alignment?.applied ? "perspective correction applied" : "original image used"} · please verify all values</p>
            </div>
            <button type="button" className="image-ocr__clear-text" onClick={copyEditedCard}>Export edited JSON</button>
          </div>

          <div className="image-ocr__header-fields">
            {([
              ["name", "Name / header"],
              ["description", "Description"],
              ["stitches", "Stitches"],
              ["d_no", "D. No."],
              ["piece", "Piece"],
              ["date", "Date"],
            ] as Array<[keyof CardHeader, string]>).map(([field, label]) => (
              <label className="image-ocr__edit-field" key={field}>
                <span>{label}</span>
                <input className="form-control" value={header[field]} onChange={(event) => updateHeader(field, event.target.value)} />
              </label>
            ))}
          </div>

          <h3 className="image-ocr__grid-title">Needle values — 6 rows × 6 columns</h3>
          <div className="image-ocr__grid-wrap">
            <table className="image-ocr__grid">
              <thead><tr><th>Row</th>{columns.map((column) => <th key={column.needle}>Needle {column.needle}</th>)}</tr></thead>
              <tbody>{Array.from({ length: 6 }, (_, row) => <tr key={row}>
                <th>{row + 1}</th>
                {columns.map((column, col) => <td key={column.needle}>
                  <input aria-label={`Row ${row + 1}, Needle ${column.needle}`} value={column.values[row] ?? ""}
                    onChange={(event) => updateCell(col, row, event.target.value)} />
                </td>)}
              </tr>)}</tbody>
            </table>
          </div>

          {Boolean(ocrResult.parsed_card?.unassigned_text?.length) && <details className="image-ocr__unassigned">
            <summary>Unassigned OCR detections ({ocrResult.parsed_card?.unassigned_text?.length ?? 0})</summary>
            <ul>{ocrResult.parsed_card?.unassigned_text?.map((item, index) => <li key={index}>
              {item.text} {typeof item.confidence === "number" ? `(confidence ${item.confidence.toFixed(2)})` : ""} — {item.reason ?? "review"}
            </li>)}</ul>
          </details>}
        </div>}

        <div className="image-ocr__result">
          <details>
            <summary>Raw OCR response (diagnostics)</summary>
            <pre className={["image-ocr__text-box", resultText ? "image-ocr__text-box--has-text" : ""].filter(Boolean).join(" ")}
              aria-live="polite" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {resultText || "The OCR result will appear here."}
            </pre>
          </details>
        </div>
      </div>
    </section>
  );
}
