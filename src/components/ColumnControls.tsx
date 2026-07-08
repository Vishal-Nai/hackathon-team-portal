import { useMemo, useState } from "react";
import { Columns3, Pin, PinOff, EyeOff, Eye } from "lucide-react";
import { Button } from "./Button";
import type { ColumnPreferences } from "../utils/columnPreferences";
import { suggestPinnedColumns } from "../utils/columnPreferences";

interface ColumnControlsProps {
  columns: string[];
  sampleRows: Record<string, string>[];
  preferences: ColumnPreferences;
  onChange: (preferences: ColumnPreferences) => void;
}

export function ColumnControls({ columns, sampleRows, preferences, onChange }: ColumnControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const suggested = useMemo(() => suggestPinnedColumns(columns, sampleRows), [columns, sampleRows]);
  const hidden = new Set(preferences.hidden);
  const pinned = new Set(preferences.pinned.length > 0 ? preferences.pinned : suggested);

  function toggleHidden(column: string) {
    const nextHidden = new Set(preferences.hidden);
    if (nextHidden.has(column)) {
      nextHidden.delete(column);
    } else {
      nextHidden.add(column);
    }
    onChange({ ...preferences, hidden: [...nextHidden] });
  }

  function togglePinned(column: string) {
    const basePinned = preferences.pinned.length > 0 ? preferences.pinned : suggested;
    const nextPinned = new Set(basePinned);
    if (nextPinned.has(column)) {
      nextPinned.delete(column);
    } else {
      nextPinned.add(column);
    }
    onChange({ ...preferences, pinned: [...nextPinned] });
  }

  function resetPreferences() {
    onChange({ hidden: [], pinned: [] });
  }

  const visibleCount = columns.filter((column) => !hidden.has(column)).length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <button
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setIsOpen((value) => !value)}
        type="button"
      >
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <Columns3 size={16} />
          Column controls
        </span>
        <span className="text-xs text-slate-500">
          {visibleCount} of {columns.length} visible
        </span>
      </button>

      {isOpen ? (
        <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Pin important columns (email, team, links) to the left. Hide columns you don&apos;t need. Saved in your
            browser for this dashboard.
          </p>

          <div className="mt-3 max-h-56 space-y-1 overflow-auto">
            {columns.map((column) => {
              const isHidden = hidden.has(column);
              const isPinned = pinned.has(column);
              return (
                <div
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-900"
                  key={column}
                >
                  <span
                    className={`truncate text-sm ${isHidden ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-100"}`}
                    title={column}
                  >
                    {column}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    <button
                      aria-label={isPinned ? "Unpin column" : "Pin column"}
                      className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      disabled={isHidden}
                      onClick={() => togglePinned(column)}
                      type="button"
                    >
                      {isPinned ? <Pin size={14} /> : <PinOff size={14} />}
                    </button>
                    <button
                      aria-label={isHidden ? "Show column" : "Hide column"}
                      className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => toggleHidden(column)}
                      type="button"
                    >
                      {isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3">
            <Button onClick={resetPreferences} type="button" variant="ghost">
              Reset columns
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
