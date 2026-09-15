import { Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "./auth/auth-context/useAuth";
import { PasswordChangeRoute } from "./auth/route-guards/PasswordChangeRoute";
import { ChangePasswordPage } from "./pages/change-password/ChangePasswordPage";
import { LoginPage } from "./pages/login/LoginPage";

function App() {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="container py-5">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          currentUser ? (
            <Navigate
              to={
                currentUser.must_change_password
                  ? "/change-password"
                  : "/"
              }
              replace
            />
          ) : (
            <LoginPage />
          )
        }
      />

      <Route
        path="/change-password"
        element={
          <PasswordChangeRoute>
            <ChangePasswordPage />
          </PasswordChangeRoute>
        }
      />

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}

export default App;