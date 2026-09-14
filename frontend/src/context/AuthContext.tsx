"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { AuthUser, getCurrentUser, ApiError } from "@/lib/api";
import {
  getStoredToken,
  setStoredToken,
  removeStoredToken,
} from "@/lib/storage";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /**
   * Initializes the session on mount by checking localStorage and fetching /me.
   */
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      const storedToken = getStoredToken();
      if (!storedToken) {
        queueMicrotask(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });
        return;
      }

      try {
        const response = await getCurrentUser(storedToken);
        if (isMounted) {
          setToken(storedToken);
          setUser(response.user);
        }
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 404)) {
          removeStoredToken();
          if (isMounted) {
            setToken(null);
            setUser(null);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Establishes authentication session upon successful login or registration.
   */
  const login = useCallback((newToken: string, newUser: AuthUser) => {
    setStoredToken(newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  /**
   * Clears the authentication session and stored JWT.
   */
  const logout = useCallback(() => {
    removeStoredToken();
    setToken(null);
    setUser(null);
  }, []);

  /**
   * Re-fetches the current authenticated user data from the server.
   */
  const refreshUser = useCallback(async () => {
    const currentToken = token || getStoredToken();
    if (!currentToken) {
      logout();
      return;
    }

    try {
      const response = await getCurrentUser(currentToken);
      setUser(response.user);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 404)) {
        logout();
      }
    }
  }, [token, logout]);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: Boolean(token && user),
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
