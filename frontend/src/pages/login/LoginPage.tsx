import { useState } from "react";
import type { FormEvent } from "react";

import { useNavigate } from "react-router-dom";

import { ApiError } from "../../api/client/client";
import { useAuth } from "../../auth/auth-context/useAuth";

import "./LoginPage.css";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-header">
          <p className="login-eyebrow">MyApp</p>
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
              onChange={(event) => setUsername(event.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={isSubmitting}
            />
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
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}