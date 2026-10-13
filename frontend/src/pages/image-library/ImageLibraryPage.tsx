import { useEffect, useRef, useState } from "react";

import {
  ApiError,
  api,
  type ImageRecord,
  type ImageSearchFilters,
} from "../../api/client/client";

import {
  IMAGE_ACCEPT_ATTRIBUTE,
  IMAGE_FORMAT_LABEL,
  isAllowedImageFile,
} from "../../constants/image-formats";

import { DatePicker } from "../../components/date-picker/DatePicker";
import { ImageOcrReader } from "../../components/image-ocr/ImageOcrReader";

import { getBrowserPreviewBlob } from "../../utils/image-utils";
import "./ImageLibraryPage.css";

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
const SEARCH_DEBOUNCE_MS = 300;

type ImageTab = "upload" | "view";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

export function ImageLibraryPage() {
  const [activeTab, setActiveTab] = useState<ImageTab>("upload");

  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [searchText, setSearchText] = useState("");
  const [descriptionFilter, setDescriptionFilter] = useState("");
  const [filenameFilter, setFilenameFilter] = useState("");
  const [uploadedDate, setUploadedDate] = useState("");

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const [records, setRecords] = useState<ImageRecord[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const searchRequestId = useRef(0);

  useEffect(() => {
    if (activeTab !== "view") {
      return;
    }

    let cancelled = false;

    setIsLoading(true);
    setErrorMessage("");

    const filters: ImageSearchFilters = {
      search: searchText,
      description: descriptionFilter,
      filename: filenameFilter,
      fromDate: uploadedDate || undefined,
      toDate: uploadedDate || undefined,
    };

    const timer = window.setTimeout(async () => {
      const requestId = ++searchRequestId.current;

      try {
        const result = await api.getImageRecords(filters);

        if (!cancelled && requestId === searchRequestId.current) {
          setRecords(result);
        }
      } catch (error: unknown) {
        if (cancelled || requestId !== searchRequestId.current) {
          return;
        }

        if (error instanceof ApiError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("Unable to search image records.");
        }
      } finally {
        if (!cancelled && requestId === searchRequestId.current) {
          setIsLoading(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeTab, searchText, descriptionFilter, filenameFilter, uploadedDate]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage("");
    setSuccessMessage("");

    const file = event.target.files?.[0] ?? null;

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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!text.trim()) {
      setErrorMessage("Please enter some text.");
      return;
    }

    if (!selectedFile) {
      setErrorMessage("Please select an image.");
      return;
    }

    setIsSubmitting(true);

    try {
      await api.createImageRecord(text.trim(), selectedFile);

      setText("");
      setSelectedFile(null);

      const fileInput = document.getElementById("image-library-file");

      if (fileInput instanceof HTMLInputElement) {
        fileInput.value = "";
      }

      setSuccessMessage("Image and text saved successfully.");
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to save the image. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTabChange = (tab: ImageTab) => {
    setActiveTab(tab);
    setErrorMessage("");
    setSuccessMessage("");

    if (tab === "view") {
      setSearchText("");
      setDescriptionFilter("");
      setFilenameFilter("");
      setUploadedDate("");
    }
  };

  const handleClearFilters = () => {
    setDescriptionFilter("");
    setFilenameFilter("");
    setUploadedDate("");
    setErrorMessage("");
  };

  const hasActiveFilters = Boolean(
    descriptionFilter.trim() || filenameFilter.trim() || uploadedDate,
  );

  const hasAnySearch = Boolean(searchText.trim() || hasActiveFilters);

  return (
    <main className="image-library-page">
      <div className="image-library-page__header">
        <div>
          <p className="image-library-page__eyebrow">IMAGE LIBRARY</p>

          <h1>Images</h1>

          <p>Upload images or search your saved image library.</p>
        </div>
      </div>

      <div
        className="image-library-tabs"
        role="tablist"
        aria-label="Image library sections"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "upload"}
          className={[
            "image-library-tab",
            activeTab === "upload" ? "image-library-tab--active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => handleTabChange("upload")}
        >
          Upload
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "view"}
          className={[
            "image-library-tab",
            activeTab === "view" ? "image-library-tab--active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => handleTabChange("view")}
        >
          View
        </button>
      </div>

      {activeTab === "upload" ? (
        <>
          <section className="image-library-card" role="tabpanel">
            <div className="image-library-card__header">
              <div>
                <h2>Add image</h2>

                <p>Enter searchable text and upload an image.</p>
              </div>
            </div>

            <form className="image-library-upload" onSubmit={handleSubmit}>
              <div className="image-library-field">
                <label className="form-label" htmlFor="image-library-text">
                  Description
                </label>

                <input
                  id="image-library-text"
                  type="text"
                  className="form-control"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  maxLength={1000}
                  placeholder="Enter a description..."
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="image-library-field">
                <label className="form-label" htmlFor="image-library-file">
                  Image
                </label>

                <input
                  id="image-library-file"
                  type="file"
                  className="form-control"
                  accept={IMAGE_ACCEPT_ATTRIBUTE}
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                  required
                />

                <p className="image-library-field__hint">
                  {IMAGE_FORMAT_LABEL}. Maximum 20 MB.
                </p>
              </div>

              {errorMessage && (
                <div className="alert alert-danger" role="alert">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="alert alert-success" role="status">
                  {successMessage}
                </div>
              )}

              <div className="image-library-upload__actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save image"}
                </button>
              </div>
            </form>
          </section>

          <ImageOcrReader />
        </>
      ) : (
        <section className="image-library-view" role="tabpanel">
          <section className="image-library-card">
            <div className="image-library-card__header image-library-search-header">
              <div>
                <h2>Search images</h2>

                <p>
                  Search by description or filename, then use filters for more
                  precise results.
                </p>
              </div>

              <button
                type="button"
                className="image-library-filter-toggle"
                aria-expanded={isFiltersOpen}
                aria-controls="image-library-filters"
                onClick={() => setIsFiltersOpen((current) => !current)}
              >
                <FilterToggleIcon isOpen={isFiltersOpen} />

                <span>Filters</span>

                {hasActiveFilters && (
                  <span className="image-library-filter-toggle__badge">
                    Active
                  </span>
                )}
              </button>
            </div>

            {isFiltersOpen && (
              <div id="image-library-filters" className="image-library-filters">
                <div className="image-library-filters__grid">
                  <div className="image-library-field">
                    <label
                      className="form-label"
                      htmlFor="image-library-description-filter"
                    >
                      Description
                    </label>

                    <input
                      id="image-library-description-filter"
                      type="text"
                      className="form-control"
                      value={descriptionFilter}
                      onChange={(event) =>
                        setDescriptionFilter(event.target.value)
                      }
                      placeholder="Filter by description..."
                      maxLength={1000}
                      autoComplete="off"
                    />
                  </div>

                  <div className="image-library-field">
                    <label
                      className="form-label"
                      htmlFor="image-library-filename-filter"
                    >
                      Filename
                    </label>

                    <input
                      id="image-library-filename-filter"
                      type="text"
                      className="form-control"
                      value={filenameFilter}
                      onChange={(event) =>
                        setFilenameFilter(event.target.value)
                      }
                      placeholder="Filter by filename..."
                      maxLength={255}
                      autoComplete="off"
                    />
                  </div>

                  <div className="image-library-field">
                    <label className="form-label">Date uploaded</label>

                    <DatePicker
                      value={uploadedDate}
                      onChange={setUploadedDate}
                    />
                  </div>
                </div>

                <div className="image-library-filters__footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={!hasActiveFilters}
                    onClick={handleClearFilters}
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            )}

            <div className="image-library-search">
              <label className="visually-hidden" htmlFor="image-library-search">
                Search images
              </label>

              <input
                id="image-library-search"
                type="search"
                className="form-control"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search description or filename..."
                autoComplete="off"
              />

              {searchText && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setSearchText("")}
                >
                  Clear
                </button>
              )}
            </div>

            <p className="image-library-search__hint">
              Search updates automatically as you type.
            </p>

            {errorMessage && (
              <div
                className="alert alert-danger image-library-search__error"
                role="alert"
              >
                {errorMessage}
              </div>
            )}
          </section>

          <section className="image-library-card">
            <div className="image-library-card__header">
              <div>
                <h2>Saved images</h2>

                <p>
                  {isLoading
                    ? "Searching..."
                    : `${records.length} result${
                        records.length === 1 ? "" : "s"
                      }`}
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="image-library-empty">Searching...</div>
            ) : records.length === 0 ? (
              <div className="image-library-empty">
                {hasAnySearch
                  ? "No matching images found."
                  : "No saved images found."}
              </div>
            ) : (
              <div className="image-library-grid">
                {records.map((record) => (
                  <ImageRecordCard
                    key={record.id}
                    record={record}
                    formatFileSize={formatFileSize}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            )}
          </section>
        </section>
      )}
    </main>
  );
}

type ImageRecordCardProps = {
  record: ImageRecord;
  formatFileSize: (bytes: number) => string;
  formatDate: (value: string) => string;
};

function ImageRecordCard({
  record,
  formatFileSize,
  formatDate,
}: ImageRecordCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    const loadImage = async () => {
      try {
        const blob = await api.getImageRecordImage(record.id);

        if (cancelled) {
          return;
        }

        const previewBlob = await getBrowserPreviewBlob(blob);

        if (cancelled) {
          return;
        }

        objectUrl = URL.createObjectURL(previewBlob);

        setImageUrl(objectUrl);
      } catch {
        if (!cancelled) {
          setImageError(true);
        }
      }
    };

    void loadImage();

    return () => {
      cancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [record.id]);

  return (
    <article className="image-record-card">
      <div className="image-record-card__image">
        {imageUrl ? (
          <img src={imageUrl} alt={record.text} />
        ) : imageError ? (
          <div className="image-record-card__image-error">
            Unable to load image
          </div>
        ) : (
          <div className="image-record-card__image-loading">
            Loading image...
          </div>
        )}
      </div>

      <div className="image-record-card__body">
        <p className="image-record-card__text">{record.text}</p>

        <div className="image-record-card__metadata">
          <span>{record.original_filename}</span>

          <span>{formatFileSize(record.size_bytes)}</span>

          <span>{formatDate(record.created_at)}</span>
        </div>
      </div>
    </article>
  );
}

function FilterToggleIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className="image-library-filter-toggle__icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {isOpen ? (
        <>
          <path
            d="M6 10l6-6 6 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="M6 17l6-6 6 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <>
          <path
            d="M6 7l6 6 6-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="M6 14l6 6 6-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}
