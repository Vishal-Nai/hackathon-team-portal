import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import { useJudgeSession } from "../hooks/useJudgeSession";
import { getFriendlyError } from "../utils/errors";

interface JudgeRouteProps {
  children: ReactNode;
}

export function JudgeRoute({ children }: JudgeRouteProps) {
  const { status, role, signInJudge } = useAuth();
  const { session, clearSession } = useJudgeSession();
  const { eventId } = useParams<{ eventId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const hasValidSession = Boolean(eventId && session && session.eventId === eventId);

  useEffect(() => {
    if (!hasValidSession || status !== "unauthenticated" || isConnecting) {
      return;
    }

    setIsConnecting(true);
    setAuthError(null);

    void signInJudge()
      .catch((error) => {
        const message = getFriendlyError(error, "Could not connect as judge. Please sign in again.");
        setAuthError(message);
        clearSession();
        navigate(`/judge/login?eventId=${encodeURIComponent(eventId ?? "")}`, {
          replace: true,
          state: { authError: message },
        });
      })
      .finally(() => {
        setIsConnecting(false);
      });
  }, [clearSession, eventId, hasValidSession, isConnecting, navigate, signInJudge, status]);

  if (!eventId || !session || session.eventId !== eventId) {
    const loginPath = eventId
      ? `/judge/login?eventId=${encodeURIComponent(eventId)}`
      : "/judge/login";
    return <Navigate replace state={{ from: location.pathname }} to={loginPath} />;
  }

  if (authError) {
    return null;
  }

  if (status === "loading" || isConnecting || (status === "unauthenticated" && hasValidSession)) {
    return (
      <section className="mx-auto w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Connecting
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          Signing in as judge
        </h1>
      </section>
    );
  }

  if (status !== "authenticated" || role !== "judge") {
    const loginPath = `/judge/login?eventId=${encodeURIComponent(eventId)}`;
    return <Navigate replace state={{ from: location.pathname }} to={loginPath} />;
  }

  return children;
}
