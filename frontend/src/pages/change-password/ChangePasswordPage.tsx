import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { ApiError } from "../../api/client/client";
import { useAuth } from "../../auth/auth-context/useAuth";

import "./ChangePasswordPage.css";

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { completePasswordChange } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          <p className="change-password-eyebrow">MyApp</p>

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
          <div className="mb-3">
            <label
              className="form-label"
              htmlFor="new-password"
            >
              New password
            </label>

            <input
              id="new-password"
              name="new-password"
              type="password"
              className="form-control"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) =>
                setNewPassword(event.target.value)
              }
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="mb-3">
            <label
              className="form-label"
              htmlFor="confirm-password"
            >
              Confirm new password
            </label>

            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              className="form-control"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              required
              disabled={isSubmitting}
            />
          </div>

          {errorMessage && (
            <div className="alert alert-danger" role="alert">
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