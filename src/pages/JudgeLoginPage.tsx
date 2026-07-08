import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { KeyRound } from "lucide-react";
import { Button } from "../components/Button";
import { isJudgePortalConfigured, validateJudgeCode } from "../config/judges";
import { useAuth } from "../hooks/useAuth";
import { useJudgeSession } from "../hooks/useJudgeSession";
import { getEvent } from "../services/events";
import { getFriendlyError } from "../utils/errors";

export function JudgeLoginPage() {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get("eventId")?.trim() ?? "";
  const navigate = useNavigate();
  const location = useLocation();
  const { signInJudge, signOut, status, role } = useAuth();
  const { saveSession, session, hasSessionForEvent } = useJudgeSession();
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    (location.state as { authError?: string } | null)?.authError ?? null,
  );

  useEffect(() => {
    if (eventId && session && hasSessionForEvent(eventId) && status === "authenticated" && role === "judge") {
      navigate(`/judge/events/${eventId}`, { replace: true });
    }
  }, [eventId, hasSessionForEvent, navigate, role, session, status]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!eventId) {
      setError("Missing event link. Ask the organizer for the full judge URL.");
      return;
    }

    if (!isJudgePortalConfigured()) {
      setError("Judge portal is not configured. Contact the organizer.");
      return;
    }

    const judge = validateJudgeCode(code);
    if (!judge) {
      setError("Invalid code. Check the code shared with you and try again.");
      return;
    }

    if (role === "admin") {
      const confirmed = window.confirm(
        "You are signed in as an admin. Continuing will sign you out of the admin portal. Use incognito for judge access instead. Continue?",
      );
      if (!confirmed) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await signInJudge({ forceFresh: true });

      const eventData = await getEvent(eventId);
      if (!eventData) {
        await signOut();
        setError("Event not found. Check the link shared by the organizer.");
        return;
      }

      saveSession({ id: judge.id, name: judge.name, eventId });
      toast.success(`Welcome, ${judge.name}.`);
      navigate(`/judge/events/${eventId}`, { replace: true });
    } catch (submitError) {
      const message = getFriendlyError(submitError, "Could not sign in. Please try again.");
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-900">
        <KeyRound className="text-slate-700 dark:text-slate-200" size={22} />
      </div>
      <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        Judge portal
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Enter access code</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Use the private code shared with you to view teams and submit ratings.
      </p>

      <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Access code</span>
          <input
            autoComplete="off"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-slate-950 focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-white"
            onChange={(event) => setCode(event.target.value)}
            placeholder="Enter your code"
            spellCheck={false}
            type="password"
            value={code}
          />
        </label>

        {error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </p>
        ) : null}

        <Button className="w-full" isLoading={isSubmitting} type="submit">
          Continue
        </Button>
      </form>
    </section>
  );
}
