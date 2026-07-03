import { useEffect, useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { Workflow } from "../types/forms";

const DRAFT_PREFIX = "hackathon-portal-draft";

export function getDraftKey(workflow: Workflow, portalId?: string) {
  const scope = portalId ?? "unscoped";
  return `${DRAFT_PREFIX}:${scope}:${workflow}`;
}

export function useDraftForm<T extends Record<string, unknown>>(
  workflow: Workflow,
  form: UseFormReturn<T>,
  portalId?: string,
) {
  const draftKey = useMemo(() => getDraftKey(workflow, portalId), [portalId, workflow]);

  useEffect(() => {
    if (!portalId) {
      return;
    }

    const savedDraft = window.localStorage.getItem(draftKey);
    if (!savedDraft) {
      return;
    }

    try {
      form.reset(JSON.parse(savedDraft) as T);
    } catch {
      window.localStorage.removeItem(draftKey);
    }
  }, [draftKey, form, portalId]);

  useEffect(() => {
    if (!portalId) {
      return;
    }

    const subscription = form.watch((value) => {
      window.localStorage.setItem(draftKey, JSON.stringify(value));
    });

    return () => subscription.unsubscribe();
  }, [draftKey, form, portalId]);

  return {
    clearDraft: () => window.localStorage.removeItem(draftKey),
  };
}
