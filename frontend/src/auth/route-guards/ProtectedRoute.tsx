import { Navigate } from "react-router-dom";

import { useAuth } from "../auth-context/useAuth";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

export function ProtectedRoute({
  children,
}: ProtectedRouteProps) {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.must_change_password) {
    return <Navigate to="/change-password" replace />;
  }

  return children;
}