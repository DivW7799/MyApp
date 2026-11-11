import { useEffect, useRef, useState } from "react";

import "./BeadsCostingPage.css";

type NumericField = "count" | "heads" | "rate" | "divisor";
type StitchRow = {
  label: string;
  count: string;
  heads: string;
  divisor: string;
  rate: string;
  workbookFormula?: boolean;
};
type BeadRow = { size: string; count: string; rate: string };
type BeadGroup = { label: string; heads: string; rows: BeadRow[] };
type SequenceRow = { label: string; quantity: string; rate: string };

const initialStitches: StitchRow[] = [
  { label: "C", count: "0", heads: "1.5", divisor: "1000", rate: "1", workbookFormula: true },
  { label: "PALLU", count: "0", heads: "5", divisor: "1000", rate: "1" },
  { label: "SKT", count: "0", heads: "7", divisor: "1000", rate: "1" },
  { label: "BLZ", count: "0", heads: "2.5", divisor: "1000", rate: "1" },
  { label: "BLZ", count: "0", heads: "1.5", divisor: "1000", rate: "1" },
  { label: "SILVE", count: "0", heads: "1", divisor: "1000", rate: "1" },
];

const beadSizes = [
  { size: "2 mm", rate: "0.013" },
  { size: "2.5 mm", rate: "0.015" },
  { size: "4 mm", rate: "0.028" },
  { size: "3 mm", rate: "0.01" },
];

function makeBeadGroup(label: string, heads: string): BeadGroup {
  return {
    label,
    heads,
    rows: beadSizes.map((row) => ({ ...row, count: "0" })),
  };
}

const initialBeadGroups: BeadGroup[] = [
  makeBeadGroup("C 1", "1"),
  makeBeadGroup("BLZ 2.5", "2.5"),
  makeBeadGroup("BLZ 1.5", "1"),
  makeBeadGroup("PALLU 5", "5"),
  makeBeadGroup("SKT 7", "7"),
  makeBeadGroup("SILVE 1", "1"),
];

const sequenceLabels = [
  { label: "C", rate: "1" },
  { label: "P", rate: "5" },
  { label: "S", rate: "7" },
  { label: "B", rate: "2.5" },
  { label: "BLZ", rate: "1" },
  { label: "SILVE", rate: "1" },
];

function makeSequence(): SequenceRow[] {
  return sequenceLabels.map((row) => ({
    ...row,
    quantity: "0",
  }));
}

function numberOf(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fmt(value: number, digits = 4): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function InlineNumber({
  value,
  onCommit,
  label,
  step = "any",
}: {
  value: string;
  onCommit: (nextValue: string) => void;
  label: string;
  step?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelBlur = useRef(false);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function beginEdit() {
    cancelBlur.current = false;
    setDraft(value);
    setEditing(true);
  }

  function save() {
    if (draft.trim() !== "" && Number.isFinite(Number(draft))) {
      onCommit(draft.trim());
    } else {
      setDraft(value);
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="beads-costing__cell-input"
        type="number"
        step={step}
        value={draft}
        aria-label={label}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (cancelBlur.current) {
            cancelBlur.current = false;
            return;
          }
          save();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            save();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            cancelBlur.current = true;
            setDraft(value);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <button
      type="button"
      className="beads-costing__editable-value"
      title={`Double-click to edit ${label}`}
      aria-label={`${label}: ${value}. Double-click to edit.`}
      onDoubleClick={beginEdit}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          beginEdit();
        }
      }}
    >
      {fmt(numberOf(value))}
    </button>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="beads-costing__section-heading">
      <div>
        <p className="beads-costing__eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {description && <p className="beads-costing__section-description">{description}</p>}
      </div>
    </div>
  );
}

export function BeadsCostingPage() {
  const [stitches, setStitches] = useState<StitchRow[]>(initialStitches);
  const [beadGroups, setBeadGroups] = useState<BeadGroup[]>(initialBeadGroups);
  const [sequence3, setSequence3] = useState<SequenceRow[]>(makeSequence);
  const [sequence5, setSequence5] = useState<SequenceRow[]>(makeSequence);
  const [stitchMultiplier, setStitchMultiplier] = useState("2.2");
  const [beadMultiplier, setBeadMultiplier] = useState("1");
  const [alterationCost, setAlterationCost] = useState("80");
  const [threeMmBaseQuantity, setThreeMmBaseQuantity] = useState("36600");
  const [threeMmRate, setThreeMmRate] = useState("45");
  const [fiveMmBaseQuantity, setFiveMmBaseQuantity] = useState("22000");
  const [fiveMmRate, setFiveMmRate] = useState("68");

  const stitchRows = stitches.map((row) => {
    const base = numberOf(row.count) * numberOf(row.heads);
    const total = row.workbookFormula
      ? base / (numberOf(row.divisor) || 1)
      : (base * numberOf(row.rate)) / (numberOf(row.divisor) || 1);
    return { ...row, total };
  });
  const stitchRawTotal = stitchRows.reduce((sum, row) => sum + row.total, 0);
  const stitchCost = stitchRawTotal * numberOf(stitchMultiplier);

  const beadGroupTotals = beadGroups.map((group) => ({
    ...group,
    total: group.rows.reduce(
      (sum, row) =>
        sum + numberOf(row.count) * numberOf(group.heads) * numberOf(row.rate),
      0,
    ),
  }));
  const beadRawTotal = beadGroupTotals.reduce((sum, group) => sum + group.total, 0);
  const beadCost = beadRawTotal * numberOf(beadMultiplier);

  const sequence3Rows = sequence3.map((row) => ({
    ...row,
    total: numberOf(row.quantity) * numberOf(row.rate),
  }));
  const sequence5Rows = sequence5.map((row) => ({
    ...row,
    total: numberOf(row.quantity) * numberOf(row.rate),
  }));
  const sequence3Total = sequence3Rows.reduce((sum, row) => sum + row.total, 0);
  const sequence5Total = sequence5Rows.reduce((sum, row) => sum + row.total, 0);
  const threeMmCost =
    (sequence3Total * numberOf(threeMmRate)) /
    (numberOf(threeMmBaseQuantity) || 1);
  const fiveMmCost =
    (sequence5Total * numberOf(fiveMmRate)) /
    (numberOf(fiveMmBaseQuantity) || 1);
  const sequenceCost = threeMmCost + fiveMmCost;
  const baseTotal = stitchCost + beadCost + sequenceCost;
  const beadShare = baseTotal === 0 ? 0 : beadCost / baseTotal;
  const finalRate = baseTotal + numberOf(alterationCost);

  function updateStitch(index: number, field: NumericField, value: string) {
    setStitches((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    );
  }

  function updateBeadGroupHead(index: number, value: string) {
    setBeadGroups((current) =>
      current.map((group, groupIndex) =>
        groupIndex === index ? { ...group, heads: value } : group,
      ),
    );
  }

  function updateBeadRow(
    groupIndex: number,
    rowIndex: number,
    field: "count" | "rate",
    value: string,
  ) {
    setBeadGroups((current) =>
      current.map((group, currentGroupIndex) =>
        currentGroupIndex !== groupIndex
          ? group
          : {
              ...group,
              rows: group.rows.map((row, currentRowIndex) =>
                currentRowIndex === rowIndex ? { ...row, [field]: value } : row,
              ),
            },
      ),
    );
  }

  function updateSequence(
    kind: "3" | "5",
    index: number,
    field: "quantity" | "rate",
    value: string,
  ) {
    const setter = kind === "3" ? setSequence3 : setSequence5;
    setter((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    );
  }

  function resetCalculator() {
    setStitches(initialStitches.map((row) => ({ ...row })));
    setBeadGroups(initialBeadGroups.map((group) => ({
      ...group,
      rows: group.rows.map((row) => ({ ...row })),
    })));
    setSequence3(makeSequence());
    setSequence5(makeSequence());
    setStitchMultiplier("2.2");
    setBeadMultiplier("1");
    setAlterationCost("80");
    setThreeMmBaseQuantity("36600");
    setThreeMmRate("45");
    setFiveMmBaseQuantity("22000");
    setFiveMmRate("68");
  }

  return (
    <main className="beads-costing">
      <header className="beads-costing__header">
        <div>
          <p className="beads-costing__eyebrow">COSTING TOOLS</p>
          <h1>Beads Costing</h1>
          <p className="beads-costing__subtitle">
            Calculate stitch, bead and sequin costs using the rates from your costing workbook.
            Double-click any numeric value to edit it.
          </p>
        </div>
        <button type="button" className="beads-costing__reset" onClick={resetCalculator}>
          Reset values
        </button>
      </header>

      <section className="beads-costing__summary" aria-label="Cost summary">
        <article className="beads-costing__summary-card beads-costing__summary-card--final">
          <span>Final rate</span>
          <strong>{fmt(finalRate)}</strong>
          <small>Base total + alteration / cut / stitch</small>
        </article>
        <article className="beads-costing__summary-card">
          <span>Stitch cost</span>
          <strong>{fmt(stitchCost)}</strong>
          <small>Stitch total × multiplier</small>
        </article>
        <article className="beads-costing__summary-card">
          <span>Bead cost</span>
          <strong>{fmt(beadCost)}</strong>
          <small>All six bead groups</small>
        </article>
        <article className="beads-costing__summary-card">
          <span>Sequin cost</span>
          <strong>{fmt(sequenceCost)}</strong>
          <small>3 mm + 5 mm CD rates</small>
        </article>
      </section>

      <section className="beads-costing__section">
        <SectionHeader
          eyebrow="01 · STITCHES"
          title="Stitch costing"
          description="Edit stitch counts, heads, divisor and rate. Row C follows the formula in the workbook exactly: count × heads ÷ stitches per 1,000."
        />
        <div className="beads-costing__table-wrap">
          <table className="beads-costing__table">
            <thead>
              <tr>
                <th>Stitch</th>
                <th>Count</th>
                <th>Heads</th>
                <th>Stitches / 1,000</th>
                <th>Rate</th>
                <th className="beads-costing__numeric">Total</th>
              </tr>
            </thead>
            <tbody>
              {stitchRows.map((row, index) => (
                <tr key={`${row.label}-${index}`}>
                  <th scope="row">{row.label}{row.label === "BLZ" ? (index === 3 ? " 2.5" : " 1.5") : ""}</th>
                  <td><InlineNumber label={`${row.label} count`} value={row.count} onCommit={(v) => updateStitch(index, "count", v)} step="any" /></td>
                  <td><InlineNumber label={`${row.label} heads`} value={row.heads} onCommit={(v) => updateStitch(index, "heads", v)} /></td>
                  <td><InlineNumber label={`${row.label} stitches per 1000`} value={row.divisor} onCommit={(v) => updateStitch(index, "divisor", v)} /></td>
                  <td><InlineNumber label={`${row.label} rate`} value={row.rate} onCommit={(v) => updateStitch(index, "rate", v)} /></td>
                  <td className="beads-costing__numeric beads-costing__computed">{fmt(row.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={5}>Stitch subtotal</th>
                <td className="beads-costing__numeric">{fmt(stitchRawTotal)}</td>
              </tr>
              <tr>
                <th colSpan={4}>Stitch multiplier</th>
                <td><InlineNumber label="Stitch multiplier" value={stitchMultiplier} onCommit={setStitchMultiplier} /></td>
                <td className="beads-costing__numeric beads-costing__computed">{fmt(stitchCost)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="beads-costing__section">
        <SectionHeader
          eyebrow="02 · BEADS"
          title="Bead costing"
          description="Each bead line is calculated as quantity × heads × rate. Group totals feed the overall bead cost."
        />
        <div className="beads-costing__bead-grid">
          {beadGroupTotals.map((group, groupIndex) => (
            <article className="beads-costing__subcard" key={group.label}>
              <div className="beads-costing__subcard-heading">
                <h3>{group.label}</h3>
                <div className="beads-costing__head-editor">
                  <span>Heads</span>
                  <InlineNumber label={`${group.label} heads`} value={group.heads} onCommit={(v) => updateBeadGroupHead(groupIndex, v)} />
                </div>
              </div>
              <div className="beads-costing__table-wrap">
                <table className="beads-costing__table beads-costing__table--compact">
                  <thead><tr><th>Bead size</th><th>Qty</th><th>Rate</th><th className="beads-costing__numeric">Total</th></tr></thead>
                  <tbody>
                    {group.rows.map((row, rowIndex) => (
                      <tr key={row.size}>
                        <th scope="row">{row.size}</th>
                        <td><InlineNumber label={`${group.label} ${row.size} quantity`} value={row.count} onCommit={(v) => updateBeadRow(groupIndex, rowIndex, "count", v)} /></td>
                        <td><InlineNumber label={`${group.label} ${row.size} rate`} value={row.rate} onCommit={(v) => updateBeadRow(groupIndex, rowIndex, "rate", v)} /></td>
                        <td className="beads-costing__numeric beads-costing__computed">{fmt(numberOf(row.count) * numberOf(group.heads) * numberOf(row.rate))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr><th colSpan={3}>Group total</th><td className="beads-costing__numeric">{fmt(group.total)}</td></tr></tfoot>
                </table>
              </div>
            </article>
          ))}
        </div>
        <div className="beads-costing__total-strip">
          <span>Combined bead subtotal</span>
          <InlineNumber label="Bead cost multiplier" value={beadMultiplier} onCommit={setBeadMultiplier} />
          <strong>{fmt(beadCost)}</strong>
        </div>
      </section>

      <section className="beads-costing__section">
        <SectionHeader
          eyebrow="03 · SEQUINS"
          title="3 mm and 5 mm sequin costing"
          description="Sequence line total = quantity × rate. The CD rate is calculated from sequence total × CD rate ÷ base quantity."
        />
        <div className="beads-costing__sequence-grid">
          {([
            { kind: "3" as const, title: "3 mm sequence", rows: sequence3Rows, total: sequence3Total },
            { kind: "5" as const, title: "5 mm sequence", rows: sequence5Rows, total: sequence5Total },
          ]).map((section) => (
            <article className="beads-costing__subcard" key={section.kind}>
              <div className="beads-costing__subcard-heading"><h3>{section.title}</h3></div>
              <div className="beads-costing__table-wrap">
                <table className="beads-costing__table beads-costing__table--compact">
                  <thead><tr><th>Type</th><th>Qty</th><th>Rate</th><th className="beads-costing__numeric">Total</th></tr></thead>
                  <tbody>
                    {section.rows.map((row, index) => (
                      <tr key={row.label}>
                        <th scope="row">{row.label}</th>
                        <td><InlineNumber label={`${section.title} ${row.label} quantity`} value={row.quantity} onCommit={(v) => updateSequence(section.kind, index, "quantity", v)} /></td>
                        <td><InlineNumber label={`${section.title} ${row.label} rate`} value={row.rate} onCommit={(v) => updateSequence(section.kind, index, "rate", v)} /></td>
                        <td className="beads-costing__numeric beads-costing__computed">{fmt(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr><th colSpan={3}>Sequence total</th><td className="beads-costing__numeric">{fmt(section.total)}</td></tr></tfoot>
                </table>
              </div>
            </article>
          ))}
        </div>
        <div className="beads-costing__sequence-rates">
          <article className="beads-costing__rate-card">
            <h3>3 mm CD rate</h3>
            <div className="beads-costing__rate-fields">
              <label>Base quantity <InlineNumber label="3 mm base quantity" value={threeMmBaseQuantity} onCommit={setThreeMmBaseQuantity} step="1" /></label>
              <label>CD rate <InlineNumber label="3 mm CD rate" value={threeMmRate} onCommit={setThreeMmRate} /></label>
            </div>
            <div className="beads-costing__rate-result"><span>Calculated rate</span><strong>{fmt(threeMmCost)}</strong></div>
          </article>
          <article className="beads-costing__rate-card">
            <h3>5 mm CD rate</h3>
            <div className="beads-costing__rate-fields">
              <label>Base quantity <InlineNumber label="5 mm base quantity" value={fiveMmBaseQuantity} onCommit={setFiveMmBaseQuantity} step="1" /></label>
              <label>CD rate <InlineNumber label="5 mm CD rate" value={fiveMmRate} onCommit={setFiveMmRate} /></label>
            </div>
            <div className="beads-costing__rate-result"><span>Calculated rate</span><strong>{fmt(fiveMmCost)}</strong></div>
          </article>
        </div>
      </section>

      <section className="beads-costing__section">
        <SectionHeader eyebrow="04 · FINAL COST" title="Cost breakdown" description="The final rate follows the workbook's total formula: stitch cost + bead cost + sequin cost + alteration/cut/stitch." />
        <div className="beads-costing__final-table-wrap">
          <table className="beads-costing__table">
            <tbody>
              <tr><th scope="row">Stitch cost</th><td className="beads-costing__numeric">{fmt(stitchCost)}</td></tr>
              <tr><th scope="row">Bead cost</th><td className="beads-costing__numeric">{fmt(beadCost)}</td></tr>
              <tr><th scope="row">Sequin cost (3 mm + 5 mm)</th><td className="beads-costing__numeric">{fmt(sequenceCost)}</td></tr>
              <tr className="beads-costing__subtotal"><th scope="row">Base total</th><td className="beads-costing__numeric">{fmt(baseTotal)}</td></tr>
              <tr><th scope="row">Beads takavari (bead cost ÷ base total)</th><td className="beads-costing__numeric">{fmt(beadShare * 100, 2)}%</td></tr>
              <tr><th scope="row">Alter + cut + stitch</th><td><InlineNumber label="Alteration cut and stitch cost" value={alterationCost} onCommit={setAlterationCost} /></td></tr>
              <tr className="beads-costing__grand-total"><th scope="row">Final rate</th><td className="beads-costing__numeric">{fmt(finalRate)}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="beads-costing__section">
        <SectionHeader eyebrow="REFERENCE" title="Material rate lists" description="Reference values transcribed from the workbook; these are labels for lookup and do not automatically change the editable calculation rates above." />
        <div className="beads-costing__reference-grid">
          <article className="beads-costing__subcard">
            <h3>3 mm CD rate references</h3>
            <ul className="beads-costing__reference-list">
              <li><span>3SG-52</span><strong>45</strong></li>
              <li><span>GLACE</span><strong>33</strong></li>
              <li><span>P-7</span><strong>12</strong></li>
              <li><span>DOUBLE DEVDASS</span><strong>21</strong></li>
              <li><span>PINK</span><strong>25</strong></li>
              <li><span>PINK GLASS</span><strong>40</strong></li>
              <li><span>BLACK</span><strong>13</strong></li>
              <li><span>MILKY</span><strong>16</strong></li>
              <li><span>RED</span><strong>13</strong></li>
              <li><span>RED-GLACE-OPQ-RONAL</span><strong>43</strong></li>
              <li><span>GLACE-PEACH</span><strong>39</strong></li>
            </ul>
          </article>
          <article className="beads-costing__subcard">
            <h3>5 mm CD rate references</h3>
            <ul className="beads-costing__reference-list">
              <li><span>3SG-52</span><strong>68</strong></li>
              <li><span>GLACE</span><strong>49</strong></li>
              <li><span>PINK MOTI</span><strong>25</strong></li>
              <li><span>CREAM OPQ</span><strong>27</strong></li>
              <li><span>BLACK</span><strong>18</strong></li>
              <li><span>MILKY</span><strong>24</strong></li>
              <li><span>RED</span><strong>19</strong></li>
              <li><span>RED-GLACE-OPQ-RONAL</span><strong>64</strong></li>
              <li><span>GLACE-PEACH</span><strong>58</strong></li>
            </ul>
          </article>
          <article className="beads-costing__subcard">
            <h3>Bead quantity references</h3>
            <ul className="beads-costing__reference-list">
              <li><span>2 mm</span><strong>90,000 pcs</strong></li>
              <li><span>2.5 mm</span><strong>60,000 pcs</strong></li>
              <li><span>4 mm</span><strong>30,000 pcs</strong></li>
            </ul>
          </article>
        </div>
      </section>

      <p className="beads-costing__footnote">
        Double-click a numeric value to edit. Enter or clicking outside applies the value; Escape cancels.
        Calculations update immediately in this browser. This page does not save costing inputs to the MyApp database.
      </p>
    </main>
  );
}
