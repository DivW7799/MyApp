import { useEffect, useState } from "react";
import { ApiError, api, type ImageRecord } from "../../api/client/client";
import "./ImageLibraryPage.css";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

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
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [searchText, setSearchText] = useState("");
  const [records, setRecords] = useState<ImageRecord[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    api
      .getImageRecords()
      .then((result) => {
        if (!cancelled) {
          setRecords(result);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        if (error instanceof ApiError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage(
            "Unable to load image records.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setErrorMessage("");
    setSuccessMessage("");

    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setSelectedFile(null);
      event.target.value = "";
      setErrorMessage(
        "Only JPEG, PNG, and WebP images are allowed.",
      );
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setSelectedFile(null);
      event.target.value = "";
      setErrorMessage(
        "Image must be 5 MB or smaller.",
      );
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
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
      const created = await api.createImageRecord(
        text.trim(),
        selectedFile,
      );

      setRecords((current) => [
        created,
        ...current,
      ]);

      setText("");
      setSelectedFile(null);

      const fileInput = document.getElementById(
        "image-library-file",
      );

      if (
        fileInput instanceof HTMLInputElement
      ) {
        fileInput.value = "";
      }

      setSuccessMessage(
        "Image and text saved successfully.",
      );
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          "Unable to save the image. Please try again.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearch = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      const result = await api.getImageRecords(
        searchText,
      );

      setRecords(result);
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          "Unable to search image records.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSearch = async () => {
    setSearchText("");
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      const result = await api.getImageRecords();
      setRecords(result);
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          "Unable to load image records.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="image-library-page">
      <div className="image-library-page__header">
        <div>
          <p className="image-library-page__eyebrow">
            IMAGE LIBRARY
          </p>

          <h1>Images</h1>

          <p>
            Save an image with searchable text and find it later.
          </p>
        </div>
      </div>

      <section className="image-library-card">
        <div className="image-library-card__header">
          <div>
            <h2>Add image</h2>

            <p>
              Enter text and upload an image.
            </p>
          </div>
        </div>

        <form
          className="image-library-upload"
          onSubmit={handleSubmit}
        >
          <div className="image-library-field">
            <label
              className="form-label"
              htmlFor="image-library-text"
            >
              Text
            </label>

            <input
              id="image-library-text"
              type="text"
              className="form-control"
              value={text}
              onChange={(event) =>
                setText(event.target.value)
              }
              maxLength={1000}
              placeholder="Enter searchable text..."
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="image-library-field">
            <label
              className="form-label"
              htmlFor="image-library-file"
            >
              Image
            </label>

            <input
              id="image-library-file"
              type="file"
              className="form-control"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={isSubmitting}
              required
            />

            <p className="image-library-field__hint">
              JPEG, PNG, or WebP. Maximum 5 MB.
            </p>
          </div>

          {errorMessage && (
            <div
              className="alert alert-danger"
              role="alert"
            >
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div
              className="alert alert-success"
              role="status"
            >
              {successMessage}
            </div>
          )}

          <div className="image-library-upload__actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Saving..."
                : "Save image"}
            </button>
          </div>
        </form>
      </section>

      <section className="image-library-card">
        <div className="image-library-card__header">
          <div>
            <h2>Search images</h2>

            <p>
              Search using the text saved with an image.
            </p>
          </div>
        </div>

        <form
          className="image-library-search"
          onSubmit={handleSearch}
        >
          <div className="image-library-search__input">
            <label
              className="visually-hidden"
              htmlFor="image-library-search"
            >
              Search
            </label>

            <input
              id="image-library-search"
              type="search"
              className="form-control"
              value={searchText}
              onChange={(event) =>
                setSearchText(event.target.value)
              }
              placeholder="Search saved text..."
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            Search
          </button>

          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => void handleClearSearch()}
            disabled={isLoading && !searchText}
          >
            Clear
          </button>
        </form>
      </section>

      <section className="image-library-card">
        <div className="image-library-card__header">
          <div>
            <h2>Saved images</h2>

            <p>
              {records.length} result
              {records.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="image-library-empty">
            Loading...
          </div>
        ) : records.length === 0 ? (
          <div className="image-library-empty">
            No matching images found.
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

    api
      .getImageRecordImage(record.id)
      .then((blob) => {
        if (cancelled) {
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setImageError(true);
        }
      });

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
          <img
            src={imageUrl}
            alt={record.text}
          />
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
        <p className="image-record-card__text">
          {record.text}
        </p>

        <div className="image-record-card__metadata">
          <span>{record.original_filename}</span>
          <span>
            {formatFileSize(record.size_bytes)}
          </span>
          <span>
            {formatDate(record.created_at)}
          </span>
        </div>
      </div>
    </article>
  );
}