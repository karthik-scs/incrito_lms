"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiJson, getAccessToken } from "@/lib/authClient";

export type CurrentUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  mobileNumber: string | null;
  avatarUrl: string | null;
  role: string;
  mfaEnabled: boolean;
  permissions: string[];
};

type AuthContextValue = {
  user: CurrentUser | null;
  loading: boolean;
  refetch: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refetch: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    const result = await apiJson<{ user: CurrentUser }>("/api/auth/me");
    setUser(result.ok ? result.data.user : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return <AuthContext.Provider value={{ user, loading, refetch: load }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
