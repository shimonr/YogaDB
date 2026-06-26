import { createContext, useContext, useMemo, useState } from "react";
import { api } from "./api";
import type { User } from "./types";

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("yogadb_token"));
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem("yogadb_user");
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      localStorage.removeItem("yogadb_user");
      return null;
    }
  });

  const login = async (username: string, password: string) => {
    const form = new URLSearchParams();
    form.append("username", username);
    form.append("password", password);
    const { data } = await api.post("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem("yogadb_token", data.access_token);
    localStorage.setItem("yogadb_user", JSON.stringify(data.user));
  };

  const register = async (username: string, email: string, password: string) => {
    await api.post("/auth/register", { username, email, password });
    await login(username, password);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("yogadb_token");
    localStorage.removeItem("yogadb_user");
  };

  const value = useMemo(() => ({ user, token, login, register, logout }), [user, token]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
