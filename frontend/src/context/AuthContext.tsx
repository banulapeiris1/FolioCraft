"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { AuthUser, getCurrentUser, ApiError } from "@/lib/api";
import {
  getStoredToken,
  setStoredToken,
  removeStoredToken,
} from "@/lib/storage";
import { resolveSessionRestoreFailure } from "@/lib/authSession";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /**
   * DASH-02: true when a stored session exists but could not be verified
   * because the API was unreachable or failing. The stored token is kept;
   * callers should show a service-unavailable state rather than logging out.
   */
  isServiceUnavailable: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  /** DASH-02: re-attempts verification of the stored session. */
  retrySession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type SessionVerification =
  | { status: "verified"; user: AuthUser }
  | { status: "clear" }
  | { status: "unavailable" };

/**
 * Verifies a stored token against GET /api/auth/me without touching React
 * state, so effects can await it and apply the result afterwards.
 */
async function verifyStoredToken(storedToken: string): Promise<SessionVerification> {
  try {
    const response = await getCurrentUser(storedToken);
    return { status: "verified", user: response.user };
  } catch (error) {
    return { status: resolveSessionRestoreFailure(error) };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isServiceUnavailable, setIsServiceUnavailable] = useState<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Applies the outcome of verifying a stored token (DASH-02).
   * A rejected token (401/404) is cleared; an unreachable or failing API
   * keeps the token and flags the service as unavailable.
   */
  const applySessionOutcome = useCallback(
    (storedToken: string, outcome: SessionVerification) => {
      if (!isMountedRef.current) return;
      if (outcome.status === "verified") {
        setToken(storedToken);
        setUser(outcome.user);
        setIsServiceUnavailable(false);
      } else if (outcome.status === "clear") {
        removeStoredToken();
        setToken(null);
        setUser(null);
        setIsServiceUnavailable(false);
      } else {
        setIsServiceUnavailable(true);
      }
      setIsLoading(false);
    },
    []
  );

  /**
   * Initializes the session on mount by checking localStorage and fetching /me.
   */
  useEffect(() => {
    const storedToken = getStoredToken();
    if (!storedToken) {
      queueMicrotask(() => {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      });
      return;
    }

    void verifyStoredToken(storedToken).then((outcome) =>
      applySessionOutcome(storedToken, outcome)
    );
  }, [applySessionOutcome]);

  /**
   * Re-attempts session verification, e.g. from a "Try again" button
   * shown while the service is unavailable.
   */
  const retrySession = useCallback(async () => {
    const storedToken = getStoredToken();
    if (!storedToken) {
      setIsServiceUnavailable(false);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const outcome = await verifyStoredToken(storedToken);
    applySessionOutcome(storedToken, outcome);
  }, [applySessionOutcome]);

  /**
   * Establishes authentication session upon successful login or registration.
   */
  const login = useCallback((newToken: string, newUser: AuthUser) => {
    setStoredToken(newToken);
    setToken(newToken);
    setUser(newUser);
    setIsServiceUnavailable(false);
  }, []);

  /**
   * Clears the authentication session and stored JWT.
   */
  const logout = useCallback(() => {
    removeStoredToken();
    setToken(null);
    setUser(null);
    setIsServiceUnavailable(false);
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
    isServiceUnavailable,
    login,
    logout,
    refreshUser,
    retrySession,
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
