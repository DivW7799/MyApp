import { useEffect, useRef, useState } from "react";

import "./DatePicker.css";

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
};

type CalendarView =
  | "days"
  | "months"
  | "years";

const WEEKDAYS = [
  "Mo",
  "Tu",
  "We",
  "Th",
  "Fr",
  "Sa",
  "Su",
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MIN_YEAR = 1970;

function formatDisplayDate(value: string): string {
  if (!value) {
    return "";
  }

  const [year, month, day] = value
    .split("-")
    .map(Number);

  if (!year || !month || !day) {
    return "";
  }

  return `${String(day).padStart(2, "0")}/${String(
    month,
  ).padStart(2, "0")}/${year}`;
}

function toDateString(
  year: number,
  month: number,
  day: number,
): string {
  return `${year}-${String(month + 1).padStart(
    2,
    "0",
  )}-${String(day).padStart(2, "0")}`;
}

function getCalendarDays(
  year: number,
  month: number,
): Array<Date | null> {
  const firstDay = new Date(
    year,
    month,
    1,
  );

  const daysInMonth = new Date(
    year,
    month + 1,
    0,
  ).getDate();

  // Convert Sunday=0 to Monday=0.
  const startingDay =
    (firstDay.getDay() + 6) % 7;

  const days: Array<Date | null> = [];

  for (let index = 0; index < startingDay; index++) {
    days.push(null);
  }

  for (
    let day = 1;
    day <= daysInMonth;
    day++
  ) {
    days.push(
      new Date(year, month, day),
    );
  }

  return days;
}

function parseDateValue(
  value: string,
): Date | null {
  if (!value) {
    return null;
  }

  const [year, month, day] = value
    .split("-")
    .map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(
    year,
    month - 1,
    day,
  );
}

export function DatePicker({
  value,
  onChange,
}: DatePickerProps) {
  const containerRef =
    useRef<HTMLDivElement>(null);

  const today = new Date();
  const currentYear =
    today.getFullYear();

  const initialDate =
    parseDateValue(value) ?? today;

  const [isOpen, setIsOpen] =
    useState(false);

  const [calendarView, setCalendarView] =
    useState<CalendarView>("days");

  const [visibleMonth, setVisibleMonth] =
    useState(
      new Date(
        initialDate.getFullYear(),
        initialDate.getMonth(),
        1,
      ),
    );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleOutsideClick = (
      event: MouseEvent,
    ) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsOpen(false);
        setCalendarView("days");
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setCalendarView("days");
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [isOpen]);

  const calendarDays = getCalendarDays(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
  );

  const selectedDate =
    parseDateValue(value);

  const isSameDay = (
    first: Date,
    second: Date,
  ) =>
    first.getFullYear() ===
      second.getFullYear() &&
    first.getMonth() ===
      second.getMonth() &&
    first.getDate() ===
      second.getDate();

  const handlePreviousMonth = () => {
    setVisibleMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() - 1,
          1,
        ),
    );
  };

  const handleNextMonth = () => {
    setVisibleMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() + 1,
          1,
        ),
    );
  };

  const handleDateSelect = (
    date: Date,
  ) => {
    const dateString = toDateString(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );

    onChange(dateString);
    setIsOpen(false);
    setCalendarView("days");
  };

  const handleMonthSelect = (
    monthIndex: number,
  ) => {
    setVisibleMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          monthIndex,
          1,
        ),
    );

    setCalendarView("days");
  };

  const handleYearSelect = (
    year: number,
  ) => {
    setVisibleMonth(
      (current) =>
        new Date(
          year,
          current.getMonth(),
          1,
        ),
    );

    setCalendarView("days");
  };

  const handleClear = () => {
    onChange("");
    setIsOpen(false);
    setCalendarView("days");
  };

  const handleToday = () => {
    setVisibleMonth(
      new Date(
        currentYear,
        today.getMonth(),
        1,
      ),
    );

    handleDateSelect(today);
  };

  const years = Array.from(
    {
      length:
        currentYear - MIN_YEAR + 1,
    },
    (_, index) =>
      currentYear - index,
  );

  return (
    <div
      ref={containerRef}
      className="date-picker"
    >
      <button
        type="button"
        className={[
          "date-picker__trigger",
          isOpen
            ? "date-picker__trigger--open"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => {
          setIsOpen(
            (current) => !current,
          );
          setCalendarView("days");
        }}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className="date-picker__calendar-icon">
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <rect
              x="3"
              y="5"
              width="18"
              height="16"
              rx="2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            />

            <path
              d="M7 3v4M17 3v4M3 10h18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </span>

        <span
          className={
            value
              ? "date-picker__value"
              : "date-picker__placeholder"
          }
        >
          {value
            ? formatDisplayDate(value)
            : "Select date"}
        </span>

        <span className="date-picker__chevron">
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="m7 10 5 5 5-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div
          className="date-picker__popup"
          role="dialog"
          aria-label="Choose upload date"
        >
          {calendarView === "days" && (
            <>
              <div className="date-picker__header">
                <button
                  type="button"
                  className="date-picker__month-button"
                  onClick={
                    handlePreviousMonth
                  }
                  aria-label="Previous month"
                >
                  ‹
                </button>

                <div className="date-picker__month-title">
                  <button
                    type="button"
                    className="date-picker__month-selector"
                    onClick={() =>
                      setCalendarView(
                        "months",
                      )
                    }
                  >
                    {
                      MONTHS[
                        visibleMonth.getMonth()
                      ]
                    }
                  </button>

                  <button
                    type="button"
                    className="date-picker__year-selector"
                    onClick={() =>
                      setCalendarView(
                        "years",
                      )
                    }
                  >
                    {visibleMonth.getFullYear()}
                  </button>
                </div>

                <button
                  type="button"
                  className="date-picker__month-button"
                  onClick={
                    handleNextMonth
                  }
                  aria-label="Next month"
                >
                  ›
                </button>
              </div>

              <div className="date-picker__weekdays">
                {WEEKDAYS.map(
                  (day) => (
                    <span key={day}>
                      {day}
                    </span>
                  ),
                )}
              </div>

              <div className="date-picker__days">
                {calendarDays.map(
                  (date, index) => {
                    if (!date) {
                      return (
                        <span
                          key={`empty-${index}`}
                          className="date-picker__empty"
                        />
                      );
                    }

                    const isSelected =
                      selectedDate
                        ? isSameDay(
                            date,
                            selectedDate,
                          )
                        : false;

                    const isToday =
                      isSameDay(
                        date,
                        today,
                      );

                    return (
                      <button
                        key={date.toISOString()}
                        type="button"
                        className={[
                          "date-picker__day",
                          isSelected
                            ? "date-picker__day--selected"
                            : "",
                          isToday
                            ? "date-picker__day--today"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(
                            " ",
                          )}
                        onClick={() =>
                          handleDateSelect(
                            date,
                          )
                        }
                      >
                        {date.getDate()}
                      </button>
                    );
                  },
                )}
              </div>
            </>
          )}

          {calendarView === "months" && (
            <div className="date-picker__selection-view">
              <div className="date-picker__selection-header">
                <button
                  type="button"
                  className="date-picker__back-button"
                  onClick={() =>
                    setCalendarView(
                      "days",
                    )
                  }
                >
                  ← Back
                </button>

                <span>
                  {visibleMonth.getFullYear()}
                </span>
              </div>

              <div className="date-picker__months">
                {MONTHS.map(
                  (
                    month,
                    index,
                  ) => {
                    const isSelected =
                      index ===
                      visibleMonth.getMonth();

                    return (
                      <button
                        key={month}
                        type="button"
                        className={[
                          "date-picker__month-option",
                          isSelected
                            ? "date-picker__month-option--selected"
                            : "",
                        ]
                          .filter(
                            Boolean,
                          )
                          .join(
                            " ",
                          )}
                        onClick={() =>
                          handleMonthSelect(
                            index,
                          )
                        }
                      >
                        {month}
                      </button>
                    );
                  },
                )}
              </div>
            </div>
          )}

          {calendarView === "years" && (
            <div className="date-picker__selection-view">
              <div className="date-picker__selection-header">
                <button
                  type="button"
                  className="date-picker__back-button"
                  onClick={() =>
                    setCalendarView(
                      "days",
                    )
                  }
                >
                  ← Back
                </button>

                <span>
                  Select year
                </span>
              </div>

              <div className="date-picker__years">
                {years.map(
                  (year) => {
                    const isSelected =
                      year ===
                      visibleMonth.getFullYear();

                    return (
                      <button
                        key={year}
                        type="button"
                        className={[
                          "date-picker__year-option",
                          isSelected
                            ? "date-picker__year-option--selected"
                            : "",
                        ]
                          .filter(
                            Boolean,
                          )
                          .join(
                            " ",
                          )}
                        onClick={() =>
                          handleYearSelect(
                            year,
                          )
                        }
                      >
                        {year}
                      </button>
                    );
                  },
                )}
              </div>
            </div>
          )}

          <div className="date-picker__footer">
            <button
              type="button"
              className="date-picker__today"
              onClick={handleToday}
            >
              Today
            </button>

            <button
              type="button"
              className="date-picker__clear"
              disabled={!value}
              onClick={handleClear}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}