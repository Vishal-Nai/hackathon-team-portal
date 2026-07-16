import type { CheckpointId, DomainId } from "../types/volunteer";
import { MAX_CHECKPOINT_RATING } from "../types/volunteer";

export interface CheckpointDef {
  id: Exclude<CheckpointId, "final">;
  label: string;
  shortLabel: string;
  timeWindow: string;
  description: string;
  maxPoints: number;
  checklist: string[];
}

export interface DomainDef {
  id: DomainId;
  label: string;
  checks: string[];
}

export const VOLUNTEER_DOMAINS: DomainDef[] = [
  {
    id: "learning",
    label: "Next-Gen Learning",
    checks: ["Improves learning, teaching, or education", "AI enhances the learning experience"],
  },
  {
    id: "health",
    label: "Digital Health & Wellness",
    checks: ["Solves a healthcare or wellness challenge", "AI improves care, guidance, or well-being"],
  },
  {
    id: "cities",
    label: "Future Cities & Civic Innovation",
    checks: ["Addresses a civic or urban problem", "Improves public services, sustainability, or community impact"],
  },
  {
    id: "everyday",
    // Exact Typeform label (capital "For")
    label: "AI For Everyday Experiences",
    checks: ["Solves a common everyday problem", "AI is central to simplifying daily life"],
  },
];

export const VOLUNTEER_CHECKPOINTS: CheckpointDef[] = [
  {
    id: "cp1",
    label: "Checkpoint 1 — Planning",
    shortLabel: "CP1 Planning",
    timeWindow: "11:00 AM – 12:00 PM",
    description: "Domain, problem, solution approach, and AI plan are clear.",
    maxPoints: MAX_CHECKPOINT_RATING,
    checklist: [
      "Domain selected",
      "Real user problem identified",
      "Target users defined",
      "Solution approach finalized",
      "AI integration planned",
      "Responsibilities assigned",
    ],
  },
  {
    id: "cp2",
    label: "Checkpoint 2 — MVP",
    shortLabel: "CP2 MVP",
    timeWindow: "12:00 PM – 1:00 PM",
    description: "Development started; architecture and AI work underway.",
    maxPoints: MAX_CHECKPOINT_RATING,
    checklist: [
      "Development started",
      "Core setup done",
      "AI integration in progress",
      "Basic workflow taking shape",
      "Blockers identified",
    ],
  },
  {
    id: "cp3",
    label: "Checkpoint 3 — Features",
    shortLabel: "CP3 Features",
    timeWindow: "1:00 PM – 2:30 PM",
    description: "Core features mostly done; AI working; usable end-to-end.",
    maxPoints: MAX_CHECKPOINT_RATING,
    checklist: [
      "Core features mostly complete",
      "AI functionality working",
      "End-to-end flow available",
      "UI becoming usable",
      "Testing started",
    ],
  },
  {
    id: "cp4",
    label: "Checkpoint 4 — Demo ready",
    shortLabel: "CP4 Demo",
    timeWindow: "2:30 PM – 3:30 PM",
    description: "MVP complete, demo flow ready for judging.",
    maxPoints: MAX_CHECKPOINT_RATING,
    checklist: [
      "MVP completed",
      "Major bugs resolved",
      "Demo flow finalized",
      "Value proposition clear",
      "Ready for judging",
    ],
  },
];

export const FINAL_CHECKPOINT = {
  id: "final" as const,
  label: "Final recommendation",
  description: "Overall recommendation after the last checkpoint. Supporting evaluation — not the final judging score.",
};

export function getCheckpointDef(id: Exclude<CheckpointId, "final">): CheckpointDef {
  const found = VOLUNTEER_CHECKPOINTS.find((checkpoint) => checkpoint.id === id);
  if (!found) {
    throw new Error(`Unknown checkpoint: ${id}`);
  }
  return found;
}

export function getDomainLabel(domainId: DomainId | ""): string {
  if (!domainId) {
    return "Not set";
  }
  return VOLUNTEER_DOMAINS.find((domain) => domain.id === domainId)?.label ?? domainId;
}
