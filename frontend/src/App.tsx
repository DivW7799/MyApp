import { Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "./auth/auth-context/useAuth";
import { LoginPage } from "./pages/login/LoginPage";

function App() {
  const { currentUser, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <main className="container py-5">
        <p>Loading...</p>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <main className="container py-5">
            <div className="d-flex align-items-center justify-content-between gap-3">
              <div>
                <h1 className="mb-1">MyApp</h1>
                <p className="mb-0 text-secondary">
                  Signed in as {currentUser.username}
                </p>
              </div>

              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={() => {
                  void logout();
                }}
              >
                Logout
              </button>
            </div>
          </main>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;