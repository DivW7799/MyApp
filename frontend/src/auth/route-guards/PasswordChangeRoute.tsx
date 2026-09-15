import { Navigate } from "react-router-dom";

import { useAuth } from "../auth-context/useAuth";

type PasswordChangeRouteProps = {
  children: React.ReactNode;
};

export function PasswordChangeRoute({
  children,
}: PasswordChangeRouteProps) {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!currentUser.must_change_password) {
    return <Navigate to="/" replace />;
  }

  return children;
}