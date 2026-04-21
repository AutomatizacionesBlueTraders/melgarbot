import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, clearToken, setToken } from "./api";

export type Me = {
  id: number;
  username: string;
  role: "super_admin" | "dependencia_admin";
  dependencia_id: number | null;
  dependencia_slug: string | null;
};

type AuthCtx = {
  me: Me | null;
  loading: boolean;
  login: (u: string, p: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const m = await api<Me>("/auth/me");
        setMe(m);
      } catch {
        setMe(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api<{ token: string; user: Me }>("/auth/login", {
      method: "POST",
      body: { username, password },
    });
    setToken(res.token);
    const m = await api<Me>("/auth/me");
    setMe(m);
  };

  const logout = () => {
    clearToken();
    setMe(null);
  };

  return <Ctx.Provider value={{ me, loading, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth fuera de AuthProvider");
  return v;
}
