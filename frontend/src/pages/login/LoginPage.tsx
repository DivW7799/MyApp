import { useState } from "react";
import type { FormEvent } from "react";

import { useNavigate } from "react-router-dom";

import { ApiError } from "../../api/client/client";
import { useAuth } from "../../auth/auth-context/useAuth";
import {
  LoginCharacter,
  type LoginCharacterState,
} from "../../components/login-character/LoginCharacter";

import "./LoginPage.css";

type FocusedField = "username" | "password" | null;

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<FocusedField>(null);
  const [showPassword, setShowPassword] = useState(false);

  const characterState: LoginCharacterState = isSubmitting
    ? "submitting"
    : errorMessage
      ? "error"
      : showPassword
        ? "password-visible"
        : focusedField === "password"
          ? "password"
          : (focusedField ?? "idle");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const user = await login(username, password);

      if (user.must_change_password) {
        navigate("/change-password", { replace: true });
        return;
      }

      navigate("/", { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to sign in. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-page__glow login-page__glow--one" />
      <div className="login-page__glow login-page__glow--two" />
      <div className="login-page__glow login-page__glow--three" />

      <div className="login-page__grid" aria-hidden="true" />

      <div className="login-page__particle login-page__particle--one" />
      <div className="login-page__particle login-page__particle--two" />
      <div className="login-page__particle login-page__particle--three" />
      <div className="login-page__particle login-page__particle--four" />
      <div className="login-page__particle login-page__particle--five" />
      <div className="login-page__particle login-page__particle--six" />

      <section className="login-card" aria-labelledby="login-title">
        <div className="login-visual">
          <div className="login-visual__badge">
            <span className="login-visual__badge-dot" />
            Secure workspace
          </div>

          <LoginCharacter state={characterState} />
        </div>

        <div className="login-form-panel">
          <div className="login-header">
            <p className="login-eyebrow">Welcome back</p>

            <h1 id="login-title">Sign in</h1>

            <p className="login-description">
              Enter your credentials to continue.
            </p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="username">Username</label>

              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setErrorMessage("");
                }}
                onFocus={() => setFocusedField("username")}
                onBlur={() => setFocusedField(null)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">Password</label>

              <div className="login-password-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setErrorMessage("");
                  }}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  required
                  disabled={isSubmitting}
                />

                <button
                  className="login-password-toggle"
                  type="button"
                  onMouseDown={(event) => {
                    /*
                     * Prevent the password input from losing focus before
                     * the visibility state is changed.
                     */
                    event.preventDefault();
                  }}
                  onClick={() => {
                    setShowPassword((current) => !current);
                  }}
                  disabled={isSubmitting}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
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
                  ) : (
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
                  )}
                </button>
              </div>
            </div>

            {errorMessage && (
              <p className="login-error" role="alert">
                {errorMessage}
              </p>
            )}

            <button
              className="login-submit"
              type="submit"
              disabled={isSubmitting}
            >
              <span className="login-submit__text">
                {isSubmitting ? "Signing in..." : "Sign in"}
              </span>

              <span className="login-submit__arrow" aria-hidden="true">
                →
              </span>
            </button>
          </form>

          <p className="login-footer">Authorized users only.</p>
        </div>
      </section>
    </main>
  );
}
