import { useCallback, useState } from "react";
import type { VolunteerSession } from "../types/volunteer";

const STORAGE_KEY = "volunteerSession";

function readSession(): VolunteerSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as VolunteerSession;
    if (
      typeof parsed.sessionId === "string" &&
      typeof parsed.name === "string" &&
      typeof parsed.eventId === "string" &&
      parsed.sessionId.trim() &&
      parsed.name.trim() &&
      parsed.eventId.trim()
    ) {
      return {
        sessionId: parsed.sessionId.trim(),
        name: parsed.name.trim(),
        eventId: parsed.eventId.trim(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function useVolunteerSession() {
  const [session, setSession] = useState<VolunteerSession | null>(() => readSession());

  const saveSession = useCallback((next: VolunteerSession) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSession(next);
  }, []);

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  const hasSessionForEvent = useCallback(
    (eventId: string) => {
      return session?.eventId === eventId;
    },
    [session],
  );

  return {
    session,
    saveSession,
    clearSession,
    hasSessionForEvent,
  };
}
