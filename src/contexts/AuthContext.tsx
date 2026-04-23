import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiFetch, clearAuth, getAuth, setAuth, type AuthData } from "@/lib/api";

type Role = "ADMIN" | "HR" | "EMPLOYEE";

interface AuthContextValue {
  user: AuthData["user"] | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuthState] = useState<AuthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAuthState(getAuth());
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiFetch<AuthData>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setAuth(data);
    setAuthState(data);
  };

  const logout = () => {
    clearAuth();
    setAuthState(null);
    window.location.href = "/login";
  };

  const hasRole = (roles: Role[]) => !!auth && roles.includes(auth.user.role);

  return (
    <AuthContext.Provider
      value={{
        user: auth?.user ?? null,
        token: auth?.token ?? null,
        isAuthenticated: !!auth,
        loading,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}