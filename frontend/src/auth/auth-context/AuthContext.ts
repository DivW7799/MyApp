import { createContext } from "react";

import type { CurrentUser } from "../../api/client/client";

export type AuthContextValue = {
  currentUser: CurrentUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<CurrentUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<CurrentUser | null>;
  completePasswordChange: (
    newPassword: string,
    confirmPassword: string,
  ) => Promise<CurrentUser>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
