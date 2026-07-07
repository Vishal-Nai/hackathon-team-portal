import { useState } from "react";
import toast from "react-hot-toast";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Button } from "./Button";
import type { ColumnMapping } from "../types/dashboard";
import { detectSchema } from "../utils/columnDetection";
import { getFriendlyError } from "../utils/errors";

interface ColumnMappingPanelProps {
  columns: string[];
  mapping: ColumnMapping;
  sampleRows?: Record<string, string>[];
  isSaving?: boolean;
  onSave: (mapping: ColumnMapping) => Promise<void>;
}

export function ColumnMappingPanel({
  columns,
  mapping,
  sampleRows = [],
  isSaving = false,
  onSave,
}: ColumnMappingPanelProps) {
  const detected = detectSchema(columns, sampleRows);
  const [isOpen, setIsOpen] = useState(Boolean(mapping.manualOverride));
  const [teamLeadEmail, setTeamLeadEmail] = useState(mapping.teamLeadEmail ?? detected.teamLeadEmail);
  const [teamName, setTeamName] = useState(mapping.teamName ?? detected.teamName ?? "");

  async function handleSave() {
    if (!teamLeadEmail) {
      toast.error("Could not detect a primary email column. Pick one manually.");
      return;
    }

    try {
      await onSave({
        teamLeadEmail,
        ...(teamName ? { teamName } : {}),
        manualOverride: true,
      });
      toast.success("Override saved. Data re-analyzed.");
    } catch (error) {
      toast.error(getFriendlyError(error, "Failed to save column override."));
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="text-emerald-600" size={16} />
            <p className="text-sm font-semibold text-slate-950 dark:text-white">Auto-detected from your CSV</p>
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            Works with any Typeform field names — detection uses column headers and actual cell values, not a fixed
            schema.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-950"
          onClick={() => setIsOpen((value) => !value)}
          type="button"
        >
          Override
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <Badge label="Primary email" value={detected.teamLeadEmail || "Not found"} />
        {detected.teamName ? <Badge label="Team name" value={detected.teamName} /> : null}
        {detected.urlColumns.length > 0 ? (
          <Badge label="URL fields" value={detected.urlColumns.map((entry) => entry.column).join(", ")} />
        ) : null}
        {detected.memberEmailColumns.length > 0 ? (
          <Badge label="Member emails" value={detected.memberEmailColumns.join(", ")} />
        ) : null}
      </div>

      {isOpen ? (
        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Only use this if auto-detection picked the wrong column (e.g. multiple email fields).
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Primary email column
              <select
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
                onChange={(event) => setTeamLeadEmail(event.target.value)}
                value={teamLeadEmail}
              >
                <option value="">Select column</option>
                {columns.map((column) => (
                  <option key={column} value={column}>
                    {column}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Team name column (optional)
              <select
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
                onChange={(event) => setTeamName(event.target.value)}
                value={teamName}
              >
                <option value="">Auto-detect</option>
                {columns.map((column) => (
                  <option key={column} value={column}>
                    {column}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4">
            <Button isLoading={isSaving} onClick={() => void handleSave()} type="button" variant="secondary">
              Save override & re-analyze
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 dark:border-slate-700 dark:bg-slate-950">
      <span className="font-semibold text-slate-500">{label}:</span>
      <span className="text-slate-800 dark:text-slate-100">{value}</span>
    </span>
  );
}
