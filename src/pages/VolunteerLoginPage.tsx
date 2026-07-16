import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Users } from "lucide-react";
import { Button } from "../components/Button";
import {
  isVolunteerPortalConfigured,
  validateVolunteerCode,
  validateVolunteerName,
} from "../config/volunteers";
import { useAuth } from "../hooks/useAuth";
import { useVolunteerSession } from "../hooks/useVolunteerSession";
import { getEvent } from "../services/events";
import { getFirebaseAuth } from "../services/firebase";
import { getFriendlyError } from "../utils/errors";

export function VolunteerLoginPage() {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get("eventId")?.trim() ?? "";
  const navigate = useNavigate();
  const location = useLocation();
  const { signInVolunteer, signOut, status, role, user } = useAuth();
  const { saveSession, session, hasSessionForEvent } = useVolunteerSession();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    (location.state as { authError?: string } | null)?.authError ?? null,
  );

  useEffect(() => {
    if (
      eventId &&
      session &&
      hasSessionForEvent(eventId) &&
      status === "authenticated" &&
      role === "judge" &&
      user?.uid === session.sessionId
    ) {
      navigate(`/volunteer/events/${eventId}`, { replace: true });
    }
  }, [eventId, hasSessionForEvent, navigate, role, session, status, user?.uid]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!eventId) {
      setError("Missing event link. Ask the organizer for the full volunteer URL.");
      return;
    }

    if (!isVolunteerPortalConfigured()) {
      setError("Volunteer portal is not configured. Contact the organizer.");
      return;
    }

    if (!validateVolunteerCode(code)) {
      setError("Invalid code. Check the code shared with you and try again.");
      return;
    }

    const nameError = validateVolunteerName(name);
    if (nameError) {
      setError(nameError);
      return;
    }

    if (role === "admin") {
      const confirmed = window.confirm(
        "You are signed in as an admin. Continuing will sign you out of the admin portal. Use incognito for volunteer access instead. Continue?",
      );
      if (!confirmed) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await signInVolunteer({ forceFresh: true });
      const authUser = getFirebaseAuth().currentUser;
      if (!authUser?.uid) {
        await signOut();
        setError("Could not establish a volunteer session. Please try again.");
        return;
      }

      const eventData = await getEvent(eventId);
      if (!eventData) {
        await signOut();
        setError("Event not found. Check the link shared by the organizer.");
        return;
      }

      const displayName = name.trim();
      saveSession({ sessionId: authUser.uid, name: displayName, eventId });
      toast.success(`Welcome, ${displayName}.`);
      navigate(`/volunteer/events/${eventId}`, { replace: true });
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
        <Users className="text-slate-700 dark:text-slate-200" size={22} />
      </div>
      <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        Volunteer portal
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
        Track team progress
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Supporting evaluation for the judging panel — not the final score. Enter the shared access code and your name.
      </p>

      <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Your name</span>
          <input
            autoComplete="name"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-slate-950 focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-white"
            onChange={(event) => setName(event.target.value)}
            placeholder="How should we credit your feedback?"
            type="text"
            value={name}
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Access code</span>
          <input
            autoComplete="off"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-slate-950 focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-white"
            onChange={(event) => setCode(event.target.value)}
            placeholder="Shared volunteer code"
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
