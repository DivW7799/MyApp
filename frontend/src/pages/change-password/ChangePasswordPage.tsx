import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { ApiError } from "../../api/client/client";
import { useAuth } from "../../auth/auth-context/useAuth";

import "./ChangePasswordPage.css";

function EyeIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <circle
          cx="12"
          cy="12"
          r="2.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M3 3l18 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <path
        d="M10.6 6.3A10.7 10.7 0 0 1 12 6c6 0 9.5 6 9.5 6a16.8 16.8 0 0 1-3 3.4M6.2 6.9C3.8 8.4 2.5 12 2.5 12s3.5 6 9.5 6a9.8 9.8 0 0 0 3.1-.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { completePasswordChange } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setErrorMessage("");

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await completePasswordChange(
        newPassword,
        confirmPassword,
      );

      navigate("/", { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          "Unable to change the password. Please try again.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="change-password-page">
      <section
        className="change-password-card"
        aria-labelledby="change-password-title"
      >
        <div className="change-password-header">
          <p className="change-password-eyebrow">
            MyApp
          </p>

          <h1 id="change-password-title">
            Change your password
          </h1>

          <p>
            You must choose a new password before continuing.
          </p>
        </div>

        <form
          className="change-password-form"
          onSubmit={handleSubmit}
        >
          <div className="mb-3 change-password-field">
            <label
              className="form-label"
              htmlFor="new-password"
            >
              New password
            </label>

            <div className="change-password-input-wrapper">
              <input
                id="new-password"
                name="new-password"
                type={showNewPassword ? "text" : "password"}
                className="form-control"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value);
                  setErrorMessage("");
                }}
                required
                disabled={isSubmitting}
              />

              <button
                type="button"
                className="change-password-toggle"
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onClick={() => {
                  setShowNewPassword(
                    (current) => !current,
                  );
                }}
                disabled={isSubmitting}
                aria-label={
                  showNewPassword
                    ? "Hide new password"
                    : "Show new password"
                }
                aria-pressed={showNewPassword}
              >
                <EyeIcon visible={showNewPassword} />
              </button>
            </div>
          </div>

          <div className="mb-3 change-password-field">
            <label
              className="form-label"
              htmlFor="confirm-password"
            >
              Confirm new password
            </label>

            <div className="change-password-input-wrapper">
              <input
                id="confirm-password"
                name="confirm-password"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                className="form-control"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(
                    event.target.value,
                  );
                  setErrorMessage("");
                }}
                required
                disabled={isSubmitting}
              />

              <button
                type="button"
                className="change-password-toggle"
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onClick={() => {
                  setShowConfirmPassword(
                    (current) => !current,
                  );
                }}
                disabled={isSubmitting}
                aria-label={
                  showConfirmPassword
                    ? "Hide confirmed password"
                    : "Show confirmed password"
                }
                aria-pressed={showConfirmPassword}
              >
                <EyeIcon visible={showConfirmPassword} />
              </button>
            </div>
          </div>

          {errorMessage && (
            <div
              className="alert alert-danger"
              role="alert"
            >
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Changing password..."
              : "Change password"}
          </button>
        </form>
      </section>
    </main>
  );
}