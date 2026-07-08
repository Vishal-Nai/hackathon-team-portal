import { useState } from "react";
import type { JudgeEvaluation } from "../types/judge";
import { StarRating } from "./StarRating";
import { cn } from "../utils/cn";

interface JudgeFeedbackChipsProps {
  evaluations: JudgeEvaluation[];
  currentJudgeId?: string;
  currentJudgeName?: string;
  excludeCurrentJudge?: boolean;
}

export function JudgeFeedbackChips({
  evaluations,
  currentJudgeId,
  currentJudgeName,
  excludeCurrentJudge = false,
}: JudgeFeedbackChipsProps) {
  const visible = excludeCurrentJudge
    ? evaluations.filter((evaluation) => {
        if (currentJudgeId && evaluation.judgeId === currentJudgeId) {
          return false;
        }
        if (currentJudgeName && evaluation.judgeName.trim().toLowerCase() === currentJudgeName.trim().toLowerCase()) {
          return false;
        }
        return true;
      })
    : evaluations;

  if (visible.length === 0) {
    return <p className="text-sm text-slate-500">No other judge feedback yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {visible.map((evaluation) => (
        <JudgeFeedbackChip evaluation={evaluation} key={evaluation.judgeId} />
      ))}
    </div>
  );
}

function JudgeFeedbackChip({ evaluation }: { evaluation: JudgeEvaluation }) {
  const [expanded, setExpanded] = useState(false);
  const hasNotes = evaluation.notes.trim().length > 0;
  const preview =
    evaluation.notes.length > 120 && !expanded
      ? `${evaluation.notes.slice(0, 120)}…`
      : evaluation.notes;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white dark:bg-white dark:text-slate-900">
          {evaluation.judgeName}
        </span>
        <StarRating readOnly size="sm" value={evaluation.rating} />
      </div>
      {hasNotes ? (
        <p className={cn("mt-2 text-sm text-slate-600 dark:text-slate-300", !expanded && "line-clamp-2")}>
          {preview}
        </p>
      ) : (
        <p className="mt-2 text-sm italic text-slate-400">No notes</p>
      )}
      {hasNotes && evaluation.notes.length > 120 ? (
        <button
          className="mt-1 text-xs font-semibold text-slate-500 hover:underline dark:text-slate-400"
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}
