import { useEffect, useMemo, useState } from "react";

import { ApiError, api, type CurrentUser } from "../../api/client/client";
import { AuthContext, type AuthContextValue } from "./AuthContext";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const user = await api.me();
      setCurrentUser(user);
      return user;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setCurrentUser(null);
        return null;
      }

      throw error;
    }
  };

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await api.me();

        // oxlint-disable-next-line react(set-state-in-effect)
        setCurrentUser(user);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          // oxlint-disable-next-line react(set-state-in-effect)
          setCurrentUser(null);
        } else {
          throw error;
        }
      } finally {
        // oxlint-disable-next-line react(set-state-in-effect)
        setIsLoading(false);
      }
    };

    void loadCurrentUser();
  }, []);

  const login = async (username: string, password: string) => {
    const user = await api.login({ username, password });
    setCurrentUser(user);
    return user;
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setCurrentUser(null);
    }
  };

  const completePasswordChange = async (
    newPassword: string,
    confirmPassword: string,
  ) => {
    const user = await api.completePasswordChange({
      new_password: newPassword,
      confirm_password: confirmPassword,
    });

    setCurrentUser(user);

    return user;
  };

  const value: AuthContextValue = useMemo(
    () => ({
      currentUser,
      isLoading,
      login,
      logout,
      refreshUser,
      completePasswordChange,
    }),
    [currentUser, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
