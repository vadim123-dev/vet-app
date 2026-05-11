import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { clearTokens, getAccessToken, setAccessToken, setRefreshToken } from "../api";

const AuthContext = createContext(null);

function loadUser() {
  try { return JSON.parse(localStorage.getItem("vet_user") || "null"); }
  catch { return null; }
}

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getAccessToken());
  const [user,  setUserState]  = useState(loadUser);

  const login = (accessToken, refreshToken, userData) => {
    setAccessToken(accessToken);
    if (refreshToken) setRefreshToken(refreshToken);
    setTokenState(accessToken);
    if (userData) {
      setUserState(userData);
      localStorage.setItem("vet_user", JSON.stringify(userData));
    }
  };

  const logout = () => {
    clearTokens();
    localStorage.removeItem("vet_user");
    setTokenState(null);
    setUserState(null);
  };

  const hasRole = useCallback(
    (role) => Array.isArray(user?.roles) && user.roles.includes(role),
    [user]
  );

  const value = useMemo(
    () => ({ token, isAuthenticated: Boolean(token), user, login, logout, hasRole }),
    [token, user, hasRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook intentionally co-located with its provider
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
