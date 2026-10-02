import { useState } from "react";
import type { FormEvent } from "react";

import { ApiError, api } from "../../api/client/client";

import "./ChangeOwnPassword.css";

function EyeIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 3 18 18" />
      <path d="M10.6 6.2A10.7 10.7 0 0 1 12 6c6 0 9.5 6 9.5 6a17.7 17.7 0 0 1-3.2 3.8" />
      <path d="M6.2 6.6C3.8 8.2 2.5 12 2.5 12s3.5 6 9.5 6c1.4 0 2.6-.3 3.7-.8" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

export function ChangeOwnPassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);
  const [showNewPassword, setShowNewPassword] =
    useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (newPassword !== confirmPassword) {
      setErrorMessage("New passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await api.changeOwnPassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setSuccessMessage(
        "Your password was changed successfully.",
      );
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
    <section
      className="change-own-password"
      aria-labelledby="change-own-password-title"
    >
      <div className="change-own-password__header">
        <div>
          <h2 id="change-own-password-title">
            Change password
          </h2>

          <p>
            Update the password used to sign in to your account.
          </p>
        </div>
      </div>

      <form
        className="change-own-password__form"
        onSubmit={handleSubmit}
      >
        <div className="change-own-password__field">
          <label
            className="form-label"
            htmlFor="current-account-password"
          >
            Current password
          </label>

          <div className="change-own-password__password">
            <input
              id="current-account-password"
              name="current-password"
              type={showCurrentPassword ? "text" : "password"}
              className="form-control"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) =>
                setCurrentPassword(event.target.value)
              }
              required
              disabled={isSubmitting}
              autoCapitalize="none"
              spellCheck={false}
            />

            <button
              type="button"
              className="change-own-password__toggle"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() =>
                setShowCurrentPassword((visible) => !visible)
              }
              aria-label={
                showCurrentPassword
                  ? "Hide current password"
                  : "Show current password"
              }
              title={
                showCurrentPassword
                  ? "Hide password"
                  : "Show password"
              }
              disabled={isSubmitting}
            >
              <EyeIcon visible={showCurrentPassword} />
            </button>
          </div>
        </div>

        <div className="change-own-password__field">
          <label
            className="form-label"
            htmlFor="new-account-password"
          >
            New password
          </label>

          <div className="change-own-password__password">
            <input
              id="new-account-password"
              name="new-password"
              type={showNewPassword ? "text" : "password"}
              className="form-control"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) =>
                setNewPassword(event.target.value)
              }
              minLength={12}
              required
              disabled={isSubmitting}
              autoCapitalize="none"
              spellCheck={false}
            />

            <button
              type="button"
              className="change-own-password__toggle"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() =>
                setShowNewPassword((visible) => !visible)
              }
              aria-label={
                showNewPassword
                  ? "Hide new password"
                  : "Show new password"
              }
              title={
                showNewPassword
                  ? "Hide password"
                  : "Show password"
              }
              disabled={isSubmitting}
            >
              <EyeIcon visible={showNewPassword} />
            </button>
          </div>

          <p className="change-own-password__hint">
            Use at least 12 characters.
          </p>
        </div>

        <div className="change-own-password__field">
          <label
            className="form-label"
            htmlFor="confirm-account-password"
          >
            Confirm new password
          </label>

          <div className="change-own-password__password">
            <input
              id="confirm-account-password"
              name="confirm-password"
              type={
                showConfirmPassword ? "text" : "password"
              }
              className="form-control"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              minLength={12}
              required
              disabled={isSubmitting}
              autoCapitalize="none"
              spellCheck={false}
            />

            <button
              type="button"
              className="change-own-password__toggle"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() =>
                setShowConfirmPassword((visible) => !visible)
              }
              aria-label={
                showConfirmPassword
                  ? "Hide password confirmation"
                  : "Show password confirmation"
              }
              title={
                showConfirmPassword
                  ? "Hide password"
                  : "Show password"
              }
              disabled={isSubmitting}
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

        {successMessage && (
          <div
            className="alert alert-success"
            role="status"
          >
            {successMessage}
          </div>
        )}

        <div className="change-own-password__actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Changing password..."
              : "Change password"}
          </button>
        </div>
      </form>
    </section>
  );
}