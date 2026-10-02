import { Navigate } from "react-router-dom";

import { useAuth } from "../auth-context/useAuth";

type AdminRouteProps = {
  children: React.ReactNode;
};

export function AdminRoute({ children }: AdminRouteProps) {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.account_type !== "A") {
    return <Navigate to="/" replace />;
  }

  if (currentUser.must_change_password) {
    return <Navigate to="/change-password" replace />;
  }

  return children;
}