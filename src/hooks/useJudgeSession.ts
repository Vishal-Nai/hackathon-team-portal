import { useCallback, useState } from "react";
import type { JudgeSession } from "../types/judge";

const STORAGE_KEY = "judgeSession";

function readSession(): JudgeSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as JudgeSession;
    if (
      typeof parsed.id === "string" &&
      typeof parsed.name === "string" &&
      typeof parsed.eventId === "string" &&
      parsed.id.trim() &&
      parsed.name.trim() &&
      parsed.eventId.trim()
    ) {
      return {
        id: parsed.id.trim(),
        name: parsed.name.trim(),
        eventId: parsed.eventId.trim(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function useJudgeSession() {
  const [session, setSession] = useState<JudgeSession | null>(() => readSession());

  const saveSession = useCallback((next: JudgeSession) => {
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
