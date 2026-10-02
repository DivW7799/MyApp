import { useState } from "react";
import type { FormEvent } from "react";

import { ApiError, api } from "../../api/client/client";

import "./ResetUserPassword.css";

type ResetUserPasswordProps = {
  userId: string;
  username: string;
};

function EyeIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
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
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
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

export function ResetUserPassword({
  userId,
  username,
}: ResetUserPasswordProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await api.resetUserPassword(userId, {
        new_password: password,
        confirm_password: confirmPassword,
      });

      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);

      setSuccessMessage(
        `A temporary password has been set for "${username}". They must change it the next time they sign in.`,
      );
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to reset the password. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="reset-user-password">
      <div className="reset-user-password__header">
        <div>
          <p className="reset-user-password__eyebrow">Administrator action</p>

          <h2>Reset password</h2>

          <p>
            Set a temporary password for <strong>{username}</strong>.
          </p>
        </div>
      </div>

      <div className="reset-user-password__warning">
        <span className="reset-user-password__warning-icon" aria-hidden="true">
          !
        </span>

        <p>
          This will invalidate the user's existing sessions and require them to
          choose a new password after their next login.
        </p>
      </div>

      <form className="reset-user-password__form" onSubmit={handleSubmit}>
        <div className="reset-user-password__field">
          <label htmlFor="reset-user-password">Temporary password</label>

          <div className="reset-user-password__input-wrapper">
            <input
              id="reset-user-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setErrorMessage("");
                setSuccessMessage("");
              }}
              required
              disabled={isSubmitting}
            />

            <button
              type="button"
              className="reset-user-password__toggle"
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              onClick={() => {
                setShowPassword((current) => !current);
              }}
              disabled={isSubmitting}
              aria-label={
                showPassword
                  ? "Hide temporary password"
                  : "Show temporary password"
              }
              aria-pressed={showPassword}
            >
              <EyeIcon visible={showPassword} />
            </button>
          </div>

          <span className="reset-user-password__help">
            Minimum 12 characters.
          </span>
        </div>

        <div className="reset-user-password__field">
          <label htmlFor="reset-user-password-confirm">
            Confirm temporary password
          </label>

          <div className="reset-user-password__input-wrapper">
            <input
              id="reset-user-password-confirm"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setErrorMessage("");
                setSuccessMessage("");
              }}
              required
              disabled={isSubmitting}
            />

            <button
              type="button"
              className="reset-user-password__toggle"
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              onClick={() => {
                setShowConfirmPassword((current) => !current);
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
          <p
            className="reset-user-password__message reset-user-password__message--error"
            role="alert"
          >
            {errorMessage}
          </p>
        )}

        {successMessage && (
          <p
            className="reset-user-password__message reset-user-password__message--success"
            role="status"
          >
            {successMessage}
          </p>
        )}

        <div className="reset-user-password__actions">
          <button
            type="submit"
            className="btn btn-danger"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Resetting..." : "Set temporary password"}
          </button>
        </div>
      </form>
    </section>
  );
}
