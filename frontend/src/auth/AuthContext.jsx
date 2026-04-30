// src/auth/AuthContext.jsx
import React, { createContext, useContext, useMemo, useState } from "react";
import { clearTokens, getAccessToken, setAccessToken, setRefreshToken } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getAccessToken());

  const login = (accessToken, refreshToken) => {
    setAccessToken(accessToken);
    if (refreshToken) {
      setRefreshToken(refreshToken);
    }
    setTokenState(accessToken);
  };

  const logout = () => {
    clearTokens();
    setTokenState(null);
  };

  const value = useMemo(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      login,
      logout,
    }),
    [token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
