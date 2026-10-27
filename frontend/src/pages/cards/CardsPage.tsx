import { useEffect, useMemo, useState, useRef } from "react";

import {
  ApiError,
  api,
  type CardStatus,
  type CardWorkflow,
  type TableFormRecord,
} from "../../api/client/client";

import "./CardsPage.css";

type Tab = CardWorkflow;
type StatusFilter = "all" | CardStatus;

function getStatus(record: TableFormRecord, workflow: Tab): CardStatus {
  return workflow === "design" ? record.design_status : record.delivery_status;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m14 5 5 5M4 20l4.2-.9L19 8.3a2.1 2.1 0 0 0-3-3L5.2 16.1 4 20Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatusSwitch({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`cards-page__power-switch ${
        checked ? "cards-page__power-switch--on" : ""
      }`}
      disabled={disabled}
      onClick={onChange}
    >
      <span className="cards-page__power-button" aria-hidden="true">
        <svg className="cards-page__power-off" viewBox="0 0 150 150">
          <line className="line" x1="75" y1="34" x2="75" y2="58" />
          <circle className="circle" cx="75" cy="80" r="35" />
        </svg>

        <svg className="cards-page__power-on" viewBox="0 0 150 150">
          <line className="line" x1="75" y1="34" x2="75" y2="58" />
          <circle className="circle" cx="75" cy="80" r="35" />
        </svg>
      </span>

      <span className="cards-page__power-label">
        {checked ? "DONE" : "PENDING"}
      </span>
    </button>
  );
}

export function CardsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("design");
  const [records, setRecords] = useState<TableFormRecord[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<CardStatus>("n");
  const [savingId, setSavingId] = useState<string | null>(null);
  const notificationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCards() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = await api.getTableForms();
        if (isMounted) setRecords(result);
      } catch (error: unknown) {
        if (isMounted) setErrorMessage(getErrorMessage(error));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadCards();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!successMessage) return;

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage("");
    }, 10_000);

    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((record) => {
      const matchesSearch =
        !query ||
        [
          record.party_name,
          record.description,
          record.stitches,
          record.d_no,
          record.piece,
          record.form_date,
        ].some((value) => value?.toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "all" || getStatus(record, activeTab) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [records, search, statusFilter, activeTab]);

  const pendingCount = records.filter(
    (record) => getStatus(record, activeTab) === "n",
  ).length;
  const doneCount = records.length - pendingCount;

  function startEditing(record: TableFormRecord) {
    setErrorMessage("");
    setSuccessMessage("");
    setEditingId(record.id);
    setDraftStatus(getStatus(record, activeTab));
  }

  function cancelEditing() {
    setEditingId(null);
    setDraftStatus("n");
    setErrorMessage("");
  }

  async function saveStatus(record: TableFormRecord) {
    const workflow = activeTab;
    const originalStatus = getStatus(record, workflow);

    if (draftStatus === originalStatus) {
      setEditingId(null);
      return;
    }
    if (savingId) return;

    setErrorMessage("");
    setSuccessMessage("");
    setSavingId(record.id);

    try {
      const updated = await api.updateTableFormStatus(
        record.id,
        workflow,
        draftStatus,
      );
      setRecords((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setEditingId(null);
      setSuccessMessage(
        `${workflow === "design" ? "Design" : "Delivery"} status saved for ${record.party_name}.`,
      );
      if (notificationTimer.current) {
        clearTimeout(notificationTimer.current);
      }

      notificationTimer.current = setTimeout(() => {
        setSuccessMessage("");
        notificationTimer.current = null;
      }, 10_000);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSavingId(null);
    }
  }

  function changeTab(tab: Tab) {
    if (savingId) return;
    setActiveTab(tab);
    setStatusFilter("all");
    setEditingId(null);
    setDraftStatus("n");
    setErrorMessage("");
    setSuccessMessage("");
  }

  return (
    <section className="cards-page">
      <header className="cards-page__header">
        <div>
          <p className="cards-page__eyebrow">CARD MANAGEMENT</p>
          <h1>Cards</h1>
          <p className="cards-page__subtitle">
            Track design and delivery progress for every card.
          </p>
        </div>
        <div className="cards-page__total">
          <span>Total cards</span>
          <strong>{records.length}</strong>
        </div>
      </header>

      <div
        className="cards-page__tabs"
        role="tablist"
        aria-label="Card workflow"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "design"}
          className={`cards-page__tab ${activeTab === "design" ? "cards-page__tab--active" : ""}`}
          onClick={() => changeTab("design")}
        >
          Design{" "}
          <span>
            {records.filter((record) => record.design_status === "n").length}
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "delivery"}
          className={`cards-page__tab ${activeTab === "delivery" ? "cards-page__tab--active" : ""}`}
          onClick={() => changeTab("delivery")}
        >
          Delivery{" "}
          <span>
            {records.filter((record) => record.delivery_status === "n").length}
          </span>
        </button>
      </div>

      <div className="cards-page__summary">
        <div className="cards-page__summary-item">
          <span className="cards-page__summary-dot cards-page__summary-dot--pending" />
          <span>Pending</span>
          <strong>{pendingCount}</strong>
        </div>
        <div className="cards-page__summary-item">
          <span className="cards-page__summary-dot cards-page__summary-dot--done" />
          <span>Done</span>
          <strong>{doneCount}</strong>
        </div>
      </div>

      <div className="cards-page__toolbar">
        <div className="cards-page__search">
          <label htmlFor="cards-search">Search cards</label>
          <input
            id="cards-search"
            type="search"
            className="form-control"
            placeholder="Party, card number, description..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="cards-page__filter">
          <label htmlFor="cards-status-filter">Workflow status</label>
          <select
            id="cards-status-filter"
            className="form-select"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
          >
            <option value="all">All statuses</option>
            <option value="n">Pending</option>
            <option value="y">Done</option>
          </select>
        </div>
      </div>

      {errorMessage && (
        <div className="alert alert-danger" role="alert">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="cards-page__success" role="status">
          <span>✓</span>
          {successMessage}
        </div>
      )}

      {isLoading ? (
        <div className="cards-page__state" role="status">
          Loading cards...
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="cards-page__state">
          <strong>
            {records.length === 0 ? "No cards yet" : "No matching cards"}
          </strong>
          <p>
            {records.length === 0
              ? "Cards saved through Enter card will appear here."
              : "Try changing your search or status filter."}
          </p>
        </div>
      ) : (
        <div className="cards-page__table-wrap">
          <table className="table cards-page__table">
            <thead>
              <tr>
                <th>Party</th>
                <th>Description</th>
                <th>Card No.</th>
                <th>Stitches</th>
                <th>Piece</th>
                <th>Date</th>
                <th>
                  {activeTab === "design" ? "Design status" : "Delivery status"}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => {
                const status = getStatus(record, activeTab);
                const isEditing = editingId === record.id;
                const isSaving = savingId === record.id;

                return (
                  <tr
                    key={record.id}
                    className={isEditing ? "cards-page__row--editing" : ""}
                  >
                    <td className="cards-page__party">{record.party_name}</td>
                    <td className="cards-page__description">
                      {record.description || "—"}
                    </td>
                    <td>{record.d_no}</td>
                    <td>{record.stitches}</td>
                    <td>{record.piece}</td>
                    <td>{record.form_date}</td>
                    <td className="cards-page__status-cell">
                      {!isEditing ? (
                        <div className="cards-page__status-view">
                          <span
                            className={`cards-page__status-dot ${status === "y" ? "cards-page__status-dot--done" : "cards-page__status-dot--pending"}`}
                          />
                          <span
                            className={`cards-page__status-label ${status === "y" ? "cards-page__status-label--done" : "cards-page__status-label--pending"}`}
                          >
                            {status === "y" ? "Done" : "Pending"}
                          </span>
                          <button
                            type="button"
                            className="cards-page__edit-button"
                            aria-label={`Edit ${activeTab} status for ${record.party_name}`}
                            title="Edit status"
                            disabled={Boolean(savingId)}
                            onClick={() => startEditing(record)}
                          >
                            <EditIcon />
                          </button>
                        </div>
                      ) : (
                        <div className="cards-page__editor">
                          <div className="cards-page__editor-topline">
                            <span className="cards-page__editor-caption">
                              STATUS CONTROL
                            </span>
                            <span className="cards-page__unsaved">
                              <span /> Unsaved
                            </span>
                          </div>
                          <StatusSwitch
                            checked={draftStatus === "y"}
                            disabled={isSaving}
                            label={`${activeTab} status: ${draftStatus === "y" ? "Done" : "Pending"}. Toggle to change.`}
                            onChange={() =>
                              setDraftStatus((current) =>
                                current === "y" ? "n" : "y",
                              )
                            }
                          />
                          <div className="cards-page__editor-actions">
                            <button
                              type="button"
                              className="cards-page__cancel-button"
                              disabled={isSaving}
                              onClick={cancelEditing}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="cards-page__save-button"
                              disabled={isSaving}
                              onClick={() => void saveStatus(record)}
                            >
                              {isSaving ? (
                                <>
                                  <span className="cards-page__save-spinner" />{" "}
                                  Saving
                                </>
                              ) : (
                                "Save status"
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <footer className="cards-page__footer">
        Showing {filteredRecords.length} of {records.length} cards
      </footer>
    </section>
  );
}
