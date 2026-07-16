import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import { useVolunteerSession } from "../hooks/useVolunteerSession";
import { getFriendlyError } from "../utils/errors";

interface VolunteerRouteProps {
  children: ReactNode;
}

export function VolunteerRoute({ children }: VolunteerRouteProps) {
  const { status, role, signInVolunteer, user } = useAuth();
  const { session, clearSession } = useVolunteerSession();
  const { eventId } = useParams<{ eventId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const hasValidSession = Boolean(eventId && session && session.eventId === eventId);
  const sessionMatchesAuth =
    Boolean(user?.uid) && Boolean(session?.sessionId) && user?.uid === session?.sessionId;

  useEffect(() => {
    if (!hasValidSession || isConnecting || status === "loading") {
      return;
    }

    if (status === "authenticated" && role === "judge" && session && user && user.uid !== session.sessionId) {
      clearSession();
      navigate(`/volunteer/login?eventId=${encodeURIComponent(eventId ?? "")}`, {
        replace: true,
        state: { authError: "Session expired. Please sign in again." },
      });
      return;
    }

    if (status !== "unauthenticated") {
      return;
    }

    setIsConnecting(true);
    setAuthError(null);

    void signInVolunteer()
      .then(() => {
        // signInVolunteer may reuse an existing anonymous user; ownership must match.
      })
      .catch((error) => {
        const message = getFriendlyError(error, "Could not connect as volunteer. Please sign in again.");
        setAuthError(message);
        clearSession();
        navigate(`/volunteer/login?eventId=${encodeURIComponent(eventId ?? "")}`, {
          replace: true,
          state: { authError: message },
        });
      })
      .finally(() => {
        setIsConnecting(false);
      });
  }, [
    clearSession,
    eventId,
    hasValidSession,
    isConnecting,
    navigate,
    role,
    session,
    signInVolunteer,
    status,
    user,
  ]);

  // After reconnect, if the restored anonymous uid doesn't match the stored session, force re-login.
  useEffect(() => {
    if (
      hasValidSession &&
      status === "authenticated" &&
      role === "judge" &&
      user &&
      session &&
      user.uid !== session.sessionId &&
      !isConnecting
    ) {
      clearSession();
      navigate(`/volunteer/login?eventId=${encodeURIComponent(eventId ?? "")}`, {
        replace: true,
        state: { authError: "Session expired. Please sign in again." },
      });
    }
  }, [
    clearSession,
    eventId,
    hasValidSession,
    isConnecting,
    navigate,
    role,
    session,
    status,
    user,
  ]);

  if (!eventId || !session || session.eventId !== eventId) {
    const loginPath = eventId
      ? `/volunteer/login?eventId=${encodeURIComponent(eventId)}`
      : "/volunteer/login";
    return <Navigate replace state={{ from: location.pathname }} to={loginPath} />;
  }

  if (authError) {
    return null;
  }

  if (
    status === "loading" ||
    isConnecting ||
    (status === "unauthenticated" && hasValidSession) ||
    (status === "authenticated" && role === "judge" && !sessionMatchesAuth)
  ) {
    return (
      <section className="mx-auto w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Connecting
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          Signing in as volunteer
        </h1>
      </section>
    );
  }

  if (status !== "authenticated" || role !== "judge") {
    const loginPath = `/volunteer/login?eventId=${encodeURIComponent(eventId)}`;
    return <Navigate replace state={{ from: location.pathname }} to={loginPath} />;
  }

  return children;
}
