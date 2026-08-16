import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, persistSession, type AuthBusiness, type AuthSession, type AuthUser } from "@/lib/api";
import { clearTokens, getAccessToken } from "@/lib/auth";

type AuthContextValue = {
  user: AuthUser | null;
  business: AuthBusiness | null;
  loading: boolean;
  isAuthenticated: boolean;
  applySession: (session: AuthSession) => void;
  refreshMe: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [business, setBusiness] = useState<AuthBusiness | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshMe() {
    if (!getAccessToken()) {
      setUser(null);
      setBusiness(null);
      return;
    }
    try {
      const me = await api.me();
      setUser(me.user);
      setBusiness(me.business);
    } catch {
      clearTokens();
      setUser(null);
      setBusiness(null);
    }
  }

  useEffect(() => {
    void refreshMe().finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      business,
      loading,
      isAuthenticated: Boolean(user),
      applySession: (session) => {
        persistSession(session);
        setUser(session.user);
        setBusiness(session.business);
      },
      refreshMe,
      logout: async () => {
        await api.logout();
        setUser(null);
        setBusiness(null);
      },
    }),
    [user, business, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
