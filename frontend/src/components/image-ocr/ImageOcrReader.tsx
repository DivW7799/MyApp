import { useRef, useState } from "react";
import { createWorker, PSM } from "tesseract.js";

import {
  IMAGE_ACCEPT_ATTRIBUTE,
  IMAGE_FORMAT_LABEL,
  isAllowedImageFile,
} from "../../constants/image-formats";

import { getBrowserPreviewBlob } from "../../utils/image-utils";

import "./ImageOcrReader.css";

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

const OCR_SCALE = 3;
const OCR_THRESHOLD = 185;

async function loadImage(file: File): Promise<HTMLImageElement> {
  const browserImage = await getBrowserPreviewBlob(file);

  return new Promise((resolve, reject) => {
    const image = new Image();

    const objectUrl = URL.createObjectURL(browserImage);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);

      reject(new Error("Unable to load the selected image."));
    };

    image.src = objectUrl;
  });
}

function preprocessImage(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");

  const width = image.naturalWidth || image.width;

  const height = image.naturalHeight || image.height;

  canvas.width = width * OCR_SCALE;
  canvas.height = height * OCR_SCALE;

  const context = canvas.getContext("2d", {
    willReadFrequently: true,
  });

  if (!context) {
    throw new Error("Unable to prepare image for OCR.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

  const pixels = imageData.data;

  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];

    // Convert RGB to perceived grayscale.
    const grayscale = 0.299 * red + 0.587 * green + 0.114 * blue;

    /*
     * Increase contrast around the threshold.
     *
     * Values below the threshold become darker.
     * Values above the threshold become lighter.
     *
     * This helps separate the printed text from
     * the light grey watermark/background.
     */
    const contrast = (grayscale - 128) * 1.35 + 128;

    const adjusted = Math.max(0, Math.min(255, contrast));

    /*
     * Convert to mostly black/white.
     *
     * Dark printed text remains black.
     * Light background/watermark becomes white.
     */
    const value = adjusted < OCR_THRESHOLD ? 0 : 255;

    pixels[index] = value;
    pixels[index + 1] = value;
    pixels[index + 2] = value;
  }

  context.putImageData(imageData, 0, 0);

  return canvas;
}

export function ImageOcrReader() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [extractedText, setExtractedText] = useState("");

  const [isReading, setIsReading] = useState(false);

  const [progress, setProgress] = useState(0);

  const [statusMessage, setStatusMessage] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    setErrorMessage("");
    setStatusMessage("");
    setExtractedText("");
    setProgress(0);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!isAllowedImageFile(file)) {
      setSelectedFile(null);
      event.target.value = "";

      setErrorMessage(
        "Supported image formats are JPEG, PNG, WebP, BMP, TIFF, HEIC, HEIF, and AVIF.",
      );

      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setSelectedFile(null);
      event.target.value = "";

      setErrorMessage("Image must be 20 MB or smaller.");

      return;
    }

    setSelectedFile(file);
  };

  const handleReadText = async () => {
    if (!selectedFile) {
      setErrorMessage("Please select an image first.");

      return;
    }

    setIsReading(true);
    setProgress(0);
    setErrorMessage("");
    setExtractedText("");
    setStatusMessage("Loading image...");

    let worker: Awaited<ReturnType<typeof createWorker>> | null = null;

    try {
      /*
       * Load the original image into memory.
       */
      const image = await loadImage(selectedFile);

      setStatusMessage("Preparing image for OCR...");
      setProgress(5);

      /*
       * Create an enlarged, grayscale,
       * high-contrast, thresholded canvas.
       */
      const processedImage = preprocessImage(image);

      setStatusMessage("Starting OCR engine...");
      setProgress(10);

      worker = await createWorker("eng", 1, {
        logger: (message) => {
          if (message.status === "recognizing text") {
            setProgress(Math.max(10, Math.round(10 + message.progress * 90)));

            setStatusMessage("Reading text from image...");
          } else if (message.status) {
            setStatusMessage(message.status);
          }
        },
      });

      /*
       * Tell Tesseract that the document is
       * primarily a single block of text.
       */
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      });

      const result = await worker.recognize(processedImage);

      const text = result.data.text.trim();

      setExtractedText(text);

      if (text) {
        setStatusMessage("Text extracted successfully.");
      } else {
        setStatusMessage("No readable text was detected.");
      }

      setProgress(100);
    } catch (error) {
      console.error("OCR failed:", error);

      setErrorMessage(
        "Unable to read text from this image. Please try another image.",
      );

      setStatusMessage("");
      setProgress(0);
    } finally {
      if (worker) {
        await worker.terminate();
      }

      setIsReading(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setExtractedText("");
    setErrorMessage("");
    setStatusMessage("");
    setProgress(0);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <section className="image-ocr">
      <div className="image-ocr__header">
        <div>
          <p className="image-ocr__eyebrow">OCR TEST</p>

          <h2>Read text from image</h2>

          <p>Upload an image and let the browser extract the text from it.</p>
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
            {IMAGE_FORMAT_LABEL}. Maximum 20 MB.
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
          <div className="alert alert-danger image-ocr__error" role="alert">
            {errorMessage}
          </div>
        )}

        {isReading && (
          <div className="image-ocr__progress" aria-live="polite">
            <div className="image-ocr__progress-header">
              <span>{statusMessage || "Processing image..."}</span>

              <span>{progress}%</span>
            </div>

            <div className="image-ocr__progress-track">
              <div
                className="image-ocr__progress-bar"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>
        )}

        {!isReading && statusMessage && (
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
            {isReading ? "Reading..." : "Read text"}
          </button>
        </div>

        <div className="image-ocr__result">
          <div className="image-ocr__result-header">
            <div>
              <h3>Extracted text</h3>

              <p>The OCR result will appear here.</p>
            </div>

            {extractedText && (
              <button
                type="button"
                className="image-ocr__clear-text"
                onClick={() => setExtractedText("")}
              >
                Clear
              </button>
            )}
          </div>

          <div
            className={[
              "image-ocr__text-box",
              extractedText ? "image-ocr__text-box--has-text" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-live="polite"
          >
            {extractedText || "Extracted text will appear here."}
          </div>
        </div>
      </div>
    </section>
  );
}
