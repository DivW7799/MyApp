import { useState } from "react";

import type { AccountType } from "../../api/client/client";

import "./UserForm.css";

export type UserFormValues = {
  username: string;
  accountType: AccountType;
  isActive: boolean;
};

type UserFormProps = {
  initialValues: UserFormValues;
  submitLabel: string;
  isSubmitting: boolean;
  errorMessage?: string;
  successMessage?: string;
  showStatus?: boolean;
  canChangeAccountType?: boolean;
  canChangeStatus?: boolean;
  accountTypeLockedMessage?: string;
  statusLockedMessage?: string;
  onSubmit: (values: UserFormValues) => void | Promise<void>;
  onCancel: () => void;
};

export function UserForm({
  initialValues,
  submitLabel,
  isSubmitting,
  errorMessage,
  successMessage,
  showStatus = false,
  canChangeAccountType = true,
  canChangeStatus = true,
  accountTypeLockedMessage,
  statusLockedMessage,
  onSubmit,
  onCancel,
}: UserFormProps) {
  const [username, setUsername] = useState(initialValues.username);

  const [accountType, setAccountType] = useState<AccountType>(
    initialValues.accountType,
  );

  const [isActive, setIsActive] = useState(initialValues.isActive);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await onSubmit({
      username,
      accountType,
      isActive,
    });
  };

  return (
    <form className="user-form" onSubmit={handleSubmit}>
      <div className="user-form-field">
        <label htmlFor="user-form-username">Username</label>

        <input
          id="user-form-username"
          name="username"
          type="text"
          autoComplete="off"
          minLength={3}
          maxLength={100}
          value={username}
          onChange={(event) => {
            setUsername(event.target.value);
          }}
          required
          disabled={isSubmitting}
        />

        <span className="user-form-help">
          Usernames are case-insensitive and stored in lowercase.
        </span>
      </div>

      <div className="user-form-account-type">
        <div className="user-form-section-header">
          <span className="user-form-section-label">Account type</span>

          <span className="user-form-section-value">
            {accountType === "A" ? "Administrator" : "Normal user"}
          </span>
        </div>

        <label className="user-form-switch">
          <span
            className={
              accountType === "U"
                ? "user-form-switch__option user-form-switch__option--active"
                : "user-form-switch__option"
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
            disabled={isSubmitting || !canChangeAccountType}
            aria-label="Account type"
          />

          <span className="user-form-switch__track">
            <span className="user-form-switch__thumb" />
          </span>

          <span
            className={
              accountType === "A"
                ? "user-form-switch__option user-form-switch__option--active"
                : "user-form-switch__option"
            }
          >
            Admin
          </span>
        </label>

        <p className="user-form-help">
          {accountTypeLockedMessage ??
            (accountType === "A"
              ? "This account can manage users and administrator functions."
              : "This account has standard application access.")}
        </p>
      </div>

      {showStatus && (
        <div className="user-form-status">
          <div className="user-form-section-header">
            <span className="user-form-section-label">Account status</span>

            <span className="user-form-section-value">
              {isActive ? "Active" : "Inactive"}
            </span>
          </div>

          <label className="user-form-status-switch">
            <span
              className={
                !isActive
                  ? "user-form-status-switch__option user-form-status-switch__option--active"
                  : "user-form-status-switch__option"
              }
            >
              Inactive
            </span>

            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => {
                setIsActive(event.target.checked);
              }}
              disabled={isSubmitting || !canChangeStatus}
              aria-label="Account status"
            />

            <span className="user-form-status-switch__track">
              <span className="user-form-status-switch__thumb" />
            </span>

            <span
              className={
                isActive
                  ? "user-form-status-switch__option user-form-status-switch__option--active"
                  : "user-form-status-switch__option"
              }
            >
              Active
            </span>
          </label>

          <p className="user-form-help">
            {statusLockedMessage ??
              (isActive
                ? "Active users can sign in to MyApp."
                : "Inactive users cannot sign in until their account is reactivated.")}
          </p>
        </div>
      )}

      {errorMessage && (
        <p className="user-form-message user-form-message--error" role="alert">
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p
          className="user-form-message user-form-message--success"
          role="status"
        >
          {successMessage}
        </p>
      )}

      <div className="user-form-actions">
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
