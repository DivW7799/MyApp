import { useState } from "react";
import type { FormEvent } from "react";

import { useNavigate } from "react-router-dom";

import { ApiError, api, type AccountType } from "../../../api/client/client";

import "./CreateUserPage.css";

export function CreateUserPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("U");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const user = await api.createUser({
        username,
        password,
        account_type: accountType,
      });

      setSuccessMessage(`User "${user.username}" was created successfully.`);

      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setAccountType("U");
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to create the user. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-user-page">
      <div className="container-fluid px-3 px-md-4 py-4 py-md-5">
        <div className="create-user-layout">
          <section className="create-user-header">
            <p className="create-user-eyebrow">Administration</p>

            <h1>Create new user</h1>

            <p>
              Create an account and assign its access level. The user will be
              required to change the temporary password after their first login.
            </p>
          </section>

          <section
            className="create-user-card"
            aria-labelledby="create-user-title"
          >
            <div className="create-user-card-header">
              <h2 id="create-user-title">Account details</h2>

              <p>All fields are required.</p>
            </div>

            <form className="create-user-form" onSubmit={handleSubmit}>
              <div className="create-user-field">
                <label htmlFor="create-user-username">Username</label>

                <input
                  id="create-user-username"
                  name="username"
                  type="text"
                  autoComplete="off"
                  minLength={3}
                  maxLength={100}
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value);
                    setErrorMessage("");
                    setSuccessMessage("");
                  }}
                  required
                  disabled={isSubmitting}
                />

                <span className="create-user-help">
                  Usernames are stored case-insensitively.
                </span>
              </div>

              <div className="create-user-field">
                <label htmlFor="create-user-password">Temporary password</label>

                <input
                  id="create-user-password"
                  name="password"
                  type="password"
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

                <span className="create-user-help">Minimum 12 characters.</span>
              </div>

              <div className="create-user-field">
                <label htmlFor="create-user-confirm-password">
                  Confirm temporary password
                </label>

                <input
                  id="create-user-confirm-password"
                  name="confirmPassword"
                  type="password"
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
              </div>

              <div className="create-user-account-type">
                <div className="create-user-account-type__header">
                  <span className="create-user-account-type__label">
                    Account type
                  </span>

                  <span className="create-user-account-type__value">
                    {accountType === "A" ? "Administrator" : "Normal user"}
                  </span>
                </div>

                <label className="account-type-switch">
                  <span
                    className={
                      accountType === "U"
                        ? "account-type-switch__option account-type-switch__option--active"
                        : "account-type-switch__option"
                    }
                  >
                    User
                  </span>

                  <input
                    type="checkbox"
                    checked={accountType === "A"}
                    onChange={(event) => {
                      setAccountType(event.target.checked ? "A" : "U");
                    }}
                    disabled={isSubmitting}
                    aria-label="Account type"
                  />

                  <span className="account-type-switch__track">
                    <span className="account-type-switch__thumb" />
                  </span>

                  <span
                    className={
                      accountType === "A"
                        ? "account-type-switch__option account-type-switch__option--active"
                        : "account-type-switch__option"
                    }
                  >
                    Admin
                  </span>
                </label>

                <p className="create-user-help">
                  {accountType === "A"
                    ? "This account can manage users and administrator functions."
                    : "This account has standard application access."}
                </p>
              </div>

              {errorMessage && (
                <p className="create-user-error" role="alert">
                  {errorMessage}
                </p>
              )}

              {successMessage && (
                <p className="create-user-success" role="status">
                  {successMessage}
                </p>
              )}

              <div className="create-user-actions">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => navigate("/")}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating user..." : "Create user"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
