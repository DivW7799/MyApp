import { Navigate, Route, Routes } from "react-router-dom";

import { AdminRoute } from "./auth/route-guards/AdminRoute";
import { PasswordChangeRoute } from "./auth/route-guards/PasswordChangeRoute";
import { ProtectedRoute } from "./auth/route-guards/ProtectedRoute";
import { useAuth } from "./auth/auth-context/useAuth";
import { AppShell } from "./components/app-shell/AppShell";
import { CreateUserPage } from "./pages/admin/create-user/CreateUserPage";
import { EditUserPage } from "./pages/admin/edit-user/EditUserPage";
import { UsersPage } from "./pages/admin/users/UsersPage";
import { ChangePasswordPage } from "./pages/change-password/ChangePasswordPage";
import { HomePage } from "./pages/home/HomePage";
import { LoginPage } from "./pages/login/LoginPage";
import { ImageLibraryPage } from "./pages/image-library/ImageLibraryPage";

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
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<HomePage />} />

        <Route path="/account" element={<EditUserPage />} />

        <Route path="/images" element={<ImageLibraryPage />} />

        <Route
          path="/admin/users/create"
          element={
            <AdminRoute>
              <CreateUserPage />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <UsersPage />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/users/:userId/edit"
          element={
            <AdminRoute>
              <EditUserPage />
            </AdminRoute>
          }
        />
      </Route>

      <Route
        path="/change-password"
        element={
          <PasswordChangeRoute>
            <ChangePasswordPage />
          </PasswordChangeRoute>
        }
      />

      <Route
        path="/login"
        element={
          currentUser ? (
            <Navigate
              to={currentUser.must_change_password ? "/change-password" : "/"}
              replace
            />
          ) : (
            <LoginPage />
          )
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
