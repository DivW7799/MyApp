import { useState } from "react";

import "./CardEntryPage.css";

const ROWS = 6;
const COLUMNS = ["Colors", "Nedal-1", "Nedal-2", "Nedal-3", "Nedal-4", "Nedal-5", "Nedal-6"] as const;

type CardDetails = {
  name: string;
  description: string;
  stitches: string;
  dNo: string;
  piece: string;
  date: string;
  values: string[][];
};

function createEmptyCard(): CardDetails {
  return {
    name: "",
    description: "",
    stitches: "",
    dNo: "",
    piece: "",
    date: new Date().toISOString().slice(0, 10),
    values: Array.from({ length: ROWS }, () => Array.from({ length: COLUMNS.length }, () => "")),
  };
}

export function CardEntryPage() {
  const [card, setCard] = useState<CardDetails>(createEmptyCard);
  const [message, setMessage] = useState("");

  function updateField(field: keyof Omit<CardDetails, "values">, value: string) {
    setCard((current) => ({ ...current, [field]: value }));
    setMessage("");
  }

  function updateCell(row: number, column: number, value: string) {
    setCard((current) => ({
      ...current,
      values: current.values.map((cells, rowIndex) =>
        rowIndex === row
          ? cells.map((cell, columnIndex) => columnIndex === column ? value : cell)
          : cells,
      ),
    }));
    setMessage("");
  }

  function exportCard() {
    const payload = {
      ...card,
      columns: [...COLUMNS],
      values: card.values.map((row, index) => ({
        row: index + 1,
        cells: Object.fromEntries(COLUMNS.map((column, columnIndex) => [column, row[columnIndex]])),
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `card-${card.piece.trim() || "entry"}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage("Card details exported as JSON.");
  }

  function clearCard() {
    setCard(createEmptyCard());
    setMessage("Form cleared.");
  }

  return (
    <div className="card-entry-page">
      <header className="card-entry-page__heading">
        <div>
          <p className="card-entry-page__eyebrow">CARD WORKSPACE</p>
          <h1>Enter card details</h1>
          <p>Enter the details exactly as they appear on the physical card.</p>
        </div>
        <div className="card-entry-page__actions">
          <button type="button" className="card-entry-button card-entry-button--secondary" onClick={clearCard}>Clear form</button>
          <button type="button" className="card-entry-button card-entry-button--primary" onClick={exportCard}>Export JSON</button>
        </div>
      </header>

      {message && <div className="card-entry-page__notice" role="status">{message}</div>}

      <form className="physical-card" onSubmit={(event) => event.preventDefault()}>
        <div className="physical-card__top">
          <label className="physical-card__name">
            <span className="visually-hidden">Name or header</span>
            <input value={card.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Name / header" />
          </label>
          <div className="physical-card__rule" />
          <div className="physical-card__stitches">
            <strong>STICHES :</strong>
            <input aria-label="Stitches description" value={card.description} onChange={(event) => updateField("description", event.target.value)} placeholder="Description / work" />
          </div>
          <div className="physical-card__metadata">
            <label><strong>D. No.:</strong><input value={card.dNo} onChange={(event) => updateField("dNo", event.target.value)} /></label>
            <label><strong>Piece</strong><input value={card.piece} onChange={(event) => updateField("piece", event.target.value)} /></label>
            <label><strong>Date :</strong><input type="date" value={card.date} onChange={(event) => updateField("date", event.target.value)} /></label>
          </div>
        </div>

        <div className="physical-card__grid-wrap">
          <table className="physical-card__grid">
            <thead>
              <tr>
                {COLUMNS.map((column) => <th key={column} scope="col">{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {card.values.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((value, columnIndex) => (
                    <td key={COLUMNS[columnIndex]}>
                      <div className="physical-card__cell">
                        <input
                          aria-label={`Row ${rowIndex + 1}, ${COLUMNS[columnIndex]}`}
                          value={value}
                          onChange={(event) => updateCell(rowIndex, columnIndex, event.target.value)}
                        />
                        <span className="physical-card__corner" aria-hidden="true" />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <footer className="physical-card__footer">
          <span>6 rows · 7 columns</span>
          <span>{card.values.flat().filter((value) => value.trim()).length} cells filled</span>
        </footer>
      </form>
    </div>
  );
}
