import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";
import {
  signInAsJudge,
  signInWithGoogle,
  signOutUser,
  subscribeToAuth,
  type AuthRole,
} from "../services/auth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  role: AuthRole;
  signIn: () => Promise<void>;
  signInJudge: (options?: { forceFresh?: boolean }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AuthRole>(null);

  useEffect(() => {
    return subscribeToAuth(({ user: nextUser, role: nextRole, resolving }) => {
      if (resolving) {
        setStatus("loading");
        setUser(null);
        setRole(null);
        return;
      }

      setUser(nextUser);
      setRole(nextRole);
      setStatus(nextUser ? "authenticated" : "unauthenticated");
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      role,
      signIn: async () => {
        await signInWithGoogle();
      },
      signInJudge: async (options) => {
        await signInAsJudge(options);
      },
      signOut: async () => {
        await signOutUser();
      },
    }),
    [status, user, role],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
