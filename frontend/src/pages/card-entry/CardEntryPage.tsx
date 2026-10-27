import { useState } from "react";

import { ApiError, api } from "../../api/client/client";
import { DatePicker } from "../../components/date-picker/DatePicker";
import { CardEntryOcr } from "../../components/card-entry-ocr/CardEntryOcr";
import "./CardEntryPage.css";

const NEEDLE_COUNT = 6;
const ROW_COUNT = 6;

type NeedleRow = {
  row_number: number;
  needle_1: string;
  needle_2: string;
  needle_3: string;
  needle_4: string;
  needle_5: string;
  needle_6: string;
};

type CardFormValues = {
  party_name: string;
  stitches: string;
  d_no: string;
  piece: string;
  form_date: string;
};

function getLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createEmptyRow(rowNumber: number): NeedleRow {
  return {
    row_number: rowNumber,
    needle_1: "0",
    needle_2: "0",
    needle_3: "0",
    needle_4: "0",
    needle_5: "0",
    needle_6: "0",
  };
}

function createEmptyRows(): NeedleRow[] {
  return Array.from({ length: ROW_COUNT }, (_, index) =>
    createEmptyRow(index + 1),
  );
}

function createEmptyForm(): CardFormValues {
  return {
    party_name: "",
    stitches: "",
    d_no: "",
    piece: "",
    form_date: getLocalDate(),
  };
}

export function CardEntryPage() {
  const [form, setForm] = useState<CardFormValues>(createEmptyForm);
  const [rows, setRows] = useState<NeedleRow[]>(createEmptyRows);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const updateField = (field: keyof CardFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const updateNeedle = (
    rowIndex: number,
    field: keyof Omit<NeedleRow, "row_number">,
    value: string,
  ) => {
    // Needle values must be non-negative whole numbers.
    if (value !== "" && !/^\d+$/.test(value)) {
      return;
    }

    setRows((current) =>
      current.map((row, index) =>
        index === rowIndex ? { ...row, [field]: value } : row,
      ),
    );

    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleClear = () => {
    if (isSubmitting) {
      return;
    }

    setForm(createEmptyForm());
    setRows(createEmptyRows());
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const requiredFields: Array<keyof CardFormValues> = [
      "party_name",
      "stitches",
      "d_no",
      "piece",
      "form_date",
    ];

    const hasMissingField = requiredFields.some((field) => !form[field].trim());

    if (hasMissingField) {
      setErrorMessage("Please complete all card details.");
      return;
    }

    const hasEmptyNeedle = rows.some((row) =>
      [
        row.needle_1,
        row.needle_2,
        row.needle_3,
        row.needle_4,
        row.needle_5,
        row.needle_6,
      ].some((value) => value === ""),
    );

    if (hasEmptyNeedle) {
      setErrorMessage(
        "Enter a whole-number value in every needle cell. Use 0 where needed.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      await api.createTableForm({
        party_name: form.party_name.trim(),
        stitches: form.stitches.trim(),
        d_no: form.d_no.trim(),
        piece: form.piece.trim(),
        form_date: form.form_date,
        needle_rows: rows.map((row) => ({
          row_number: row.row_number,
          needle_1: row.needle_1,
          needle_2: row.needle_2,
          needle_3: row.needle_3,
          needle_4: row.needle_4,
          needle_5: row.needle_5,
          needle_6: row.needle_6,
        })),
      });

      setSuccessMessage("Card saved successfully.");
      setForm(createEmptyForm());
      setRows(createEmptyRows());
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to save the card. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyOcrResult = (card: {
    header?: {
      stitches?: { value?: string | number | null };
      d_no?: { value?: string | number | null };
      piece?: { value?: string | number | null };
      date?: { value?: string | number | null };
    };
    grid?: Record<string, Array<{ value?: string | number | null }>>;
  }) => {
    const header = card.header ?? {};
    const valueOf = (field?: { value?: string | number | null }) =>
      field?.value == null ? "" : String(field.value).trim();

    // Avoid silently guessing an ambiguous date such as 12/9/2026.
    const rawDate = valueOf(header.date);
    let parsedDate = "";

    const isoMatch = rawDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      const candidate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      const check = new Date(`${candidate}T00:00:00`);

      if (
        !Number.isNaN(check.getTime()) &&
        check.toISOString().slice(0, 10) === candidate
      ) {
        parsedDate = candidate;
      }
    } else {
      const dateMatch = rawDate.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);

      if (dateMatch) {
        const first = Number(dateMatch[1]);
        const second = Number(dateMatch[2]);
        const year = Number(dateMatch[3]);

        // Only infer day/month order when one interpretation is impossible.
        let day: number;
        let month: number;

        if (first > 12 && second <= 12) {
          day = first;
          month = second;
        } else if (second > 12 && first <= 12) {
          month = first;
          day = second;
        } else {
          day = 0;
          month = 0;
        }

        if (day && month) {
          const candidate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const check = new Date(`${candidate}T00:00:00`);

          if (
            !Number.isNaN(check.getTime()) &&
            check.toISOString().slice(0, 10) === candidate
          ) {
            parsedDate = candidate;
          }
        }
      }
    }

    setForm((current) => ({
      ...current,
      stitches: valueOf(header.stitches) || current.stitches,
      d_no: valueOf(header.d_no) || current.d_no,
      piece: valueOf(header.piece) || current.piece,
      form_date: parsedDate || current.form_date,
    }));

    setRows((current) =>
      current.map((row, rowIndex) => {
        const next = { ...row };

        for (let needleIndex = 1; needleIndex <= 6; needleIndex++) {
          const detected = card.grid?.[`nedal_${needleIndex}`]?.[rowIndex];
          const detectedValue = valueOf(detected);

          // These inputs accept whole numbers only.
          if (/^\d+$/.test(detectedValue)) {
            next[
              `needle_${needleIndex}` as keyof Omit<NeedleRow, "row_number">
            ] = detectedValue;
          }
        }

        return next;
      }),
    );

    setErrorMessage("");
    setSuccessMessage(
      "Card read successfully. Check the fields before saving.",
    );
  };

  return (
    <main className="card-entry-page">
      <header className="card-entry-page__header">
        <div>
          <p className="card-entry-page__eyebrow">CARD MANAGEMENT</p>
          <h1>Enter card</h1>
          <p>
            Record the card details and enter the needle values for each row.
          </p>
        </div>
      </header>

      <CardEntryOcr onApply={applyOcrResult} disabled={isSubmitting} />

      <form onSubmit={handleSubmit}>
        <section className="card-entry-card">
          <div className="card-entry-card__header">
            <div>
              <h2>Card details</h2>
              <p>Enter the information printed on the card.</p>
            </div>
            <span className="card-entry-card__step">01</span>
          </div>

          <div className="card-entry-details">
            <div className="card-entry-field card-entry-field--party">
              <label className="form-label" htmlFor="card-party-name">
                Party name
              </label>
              <input
                id="card-party-name"
                className="form-control"
                type="text"
                value={form.party_name}
                onChange={(event) =>
                  updateField("party_name", event.target.value)
                }
                maxLength={255}
                placeholder="Enter party name"
                autoComplete="off"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="card-entry-stitches-date">
              <div className="card-entry-field card-entry-stitches-field">
                <label htmlFor="stitches" className="form-label">
                  Stitches:
                </label>
                <input
                  id="stitches"
                  name="stitches"
                  type="text"
                  className="form-control"
                  value={form.stitches}
                  onChange={(event) =>
                    updateField("stitches", event.target.value)
                  }
                  maxLength={1000}
                  autoComplete="off"
                  placeholder="Enter stitches"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="card-entry-field card-entry-date-field">
                <label className="form-label" htmlFor="form-date">
                  Date
                </label>
                <DatePicker
                  value={form.form_date}
                  onChange={(value) => updateField("form_date", value)}
                />
              </div>
            </div>

            <div className="card-entry-field">
              <label className="form-label" htmlFor="card-design-no">
                Design No.
              </label>
              <input
                id="card-design-no"
                className="form-control"
                type="text"
                value={form.d_no}
                onChange={(event) => updateField("d_no", event.target.value)}
                maxLength={255}
                placeholder="Enter design number"
                autoComplete="off"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="card-entry-field">
              <label className="form-label" htmlFor="card-piece">
                Piece
              </label>
              <input
                id="card-piece"
                className="form-control"
                type="text"
                value={form.piece}
                onChange={(event) => updateField("piece", event.target.value)}
                maxLength={255}
                placeholder="Enter piece"
                autoComplete="off"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>
        </section>

        <section className="card-entry-card card-entry-card--table">
          <div className="card-entry-card__header">
            <div>
              <h2>Needle values</h2>
              <p>
                Enter non-negative whole numbers. Use 0 for an empty needle
                value.
              </p>
            </div>
            <span className="card-entry-card__step">02</span>
          </div>

          <div className="card-entry-table-wrap">
            <table className="table card-entry-table">
              <thead>
                <tr>
                  <th scope="col" className="card-entry-table__row-label">
                    Row
                  </th>
                  {Array.from({ length: NEEDLE_COUNT }, (_, index) => (
                    <th scope="col" key={index}>
                      Needle-{index + 1}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={row.row_number}>
                    <th scope="row" className="card-entry-table__row-label">
                      {row.row_number}
                    </th>

                    {Array.from({ length: NEEDLE_COUNT }, (_, index) => {
                      const field = `needle_${index + 1}` as keyof Omit<
                        NeedleRow,
                        "row_number"
                      >;

                      return (
                        <td key={field}>
                          <label
                            className="visually-hidden"
                            htmlFor={`needle-${row.row_number}-${index + 1}`}
                          >
                            Row {row.row_number}, Needle-{index + 1}
                          </label>
                          <input
                            id={`needle-${row.row_number}-${index + 1}`}
                            className="form-control card-entry-needle-input"
                            type="number"
                            inputMode="numeric"
                            min="0"
                            step="1"
                            value={row[field]}
                            onChange={(event) =>
                              updateNeedle(rowIndex, field, event.target.value)
                            }
                            disabled={isSubmitting}
                            required
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="card-entry-table__hint">
            All six rows are required. Enter 0 for cells with no value.
          </p>
        </section>

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

        <div className="card-entry-actions">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={handleClear}
            disabled={isSubmitting}
          >
            Clear form
          </button>

          <button
            type="submit"
            className="btn btn-primary card-entry-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span
                  className="spinner-border spinner-border-sm"
                  aria-hidden="true"
                />
                <span>Saving card...</span>
              </>
            ) : (
              "Save card"
            )}
          </button>
        </div>
      </form>
    </main>
  );
}
