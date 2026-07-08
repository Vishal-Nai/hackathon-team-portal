import { Fragment, useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Loader2, Pin, Search, Users } from "lucide-react";
import type { ColumnMapping, CsvRow } from "../types/dashboard";
import { extractTeamSummary } from "../utils/dataAnalysis";
import { cn } from "../utils/cn";
import { isLinkValue, LinkCell } from "./LinkCell";

interface DataTableProps {
  columns: string[];
  displayColumns: string[];
  pinnedColumns?: string[];
  rows: CsvRow[];
  columnMapping?: ColumnMapping;
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onIssuesOnlyChange: (value: boolean) => void;
  onSearchChange: (query: string) => void;
  issuesOnly: boolean;
  searchQuery: string;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function DataTable({
  columns,
  displayColumns,
  pinnedColumns = [],
  rows,
  columnMapping,
  page,
  pageSize,
  totalCount,
  hasMore,
  isLoading = false,
  onPageChange,
  onPageSizeChange,
  onIssuesOnlyChange,
  onSearchChange,
  issuesOnly,
  searchQuery,
}: DataTableProps) {
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(searchQuery);
  const pinned = new Set(pinnedColumns);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, onSearchChange]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const hiddenCount = columns.length - displayColumns.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none ring-slate-950 focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-white"
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search across all fields..."
            type="search"
            value={searchInput}
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <input
              checked={issuesOnly}
              className="size-4 rounded border-slate-300"
              onChange={(event) => onIssuesOnlyChange(event.target.checked)}
              type="checkbox"
            />
            Mismatches only
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            Rows per page
            <select
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-800 dark:bg-slate-950"
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              value={pageSize}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-300">
        {totalCount} teams total · page {currentPage + 1} of {totalPages}
        {hiddenCount > 0 ? ` · ${hiddenCount} column${hiddenCount === 1 ? "" : "s"} hidden` : ""}
        {searchInput ? " · search loads matching rows" : ""}
      </p>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="max-h-[70vh] overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-slate-500">
              <Loader2 className="animate-spin" size={16} />
              Loading rows...
            </div>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Team</th>
                  {displayColumns.map((column) => (
                    <th className="px-4 py-3 whitespace-nowrap" key={column}>
                      <span className="inline-flex items-center gap-1">
                        {pinned.has(column) ? <Pin size={10} className="text-slate-400" /> : null}
                        {column}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const team = extractTeamSummary(row, columns, columnMapping);
                  const hasIssues = row.issues.length > 0;
                  const isExpanded = expandedRowId === row.id;

                  return (
                    <Fragment key={row.id}>
                      <tr
                        className={cn(
                          "border-b border-slate-100 dark:border-slate-900",
                          hasIssues && "bg-amber-50/80 dark:bg-amber-950/20",
                        )}
                      >
                        <td className="px-4 py-3 text-slate-500">{row.rowIndex + 1}</td>
                        <td className="px-4 py-3">
                          {hasIssues ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                              title={row.issues.join("\n")}
                            >
                              <AlertTriangle size={12} />
                              {row.issues.length}
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                              OK
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            aria-expanded={isExpanded}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
                            onClick={() => setExpandedRowId(isExpanded ? null : row.id)}
                            type="button"
                          >
                            <Users size={14} />
                            {team?.members.length ?? 0}
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                        {displayColumns.map((column) => {
                          const value = row.fields[column] || "—";
                          return (
                            <td
                              className="max-w-[14rem] truncate px-4 py-3 text-slate-700 dark:text-slate-200"
                              key={column}
                              title={value}
                            >
                              {isLinkValue(value) ? <LinkCell value={value} /> : value}
                            </td>
                          );
                        })}
                      </tr>
                      {isExpanded ? (
                        <tr className="border-b border-slate-100 bg-slate-50 dark:border-slate-900 dark:bg-slate-900/50">
                          <td className="px-4 py-4" colSpan={displayColumns.length + 3}>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Team Members
                                </p>
                                {team && team.members.length > 0 ? (
                                  <ul className="mt-2 space-y-1 text-sm">
                                    {team.members.map((member, index) => (
                                      <li key={`${member.name}-${index}`}>
                                        <span className="font-medium">{member.name}</span>
                                        {member.email ? (
                                          <span className="text-slate-500"> · {member.email}</span>
                                        ) : null}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="mt-2 text-sm text-slate-500">
                                    No extra member fields detected — all CSV columns are still shown in the table.
                                  </p>
                                )}
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Issues</p>
                                {row.issues.length > 0 ? (
                                  <ul className="mt-2 space-y-1 text-sm text-amber-800 dark:text-amber-200">
                                    {row.issues.map((issue, index) => (
                                      <li key={`${row.id}-issue-${index}`}>• {issue}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
                                    No issues detected.
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {!isLoading && rows.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            {searchInput || issuesOnly ? "No rows match your filters." : "No rows to display."}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Page {currentPage + 1} of {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:hover:bg-slate-900"
            disabled={currentPage === 0 || isLoading}
            onClick={() => onPageChange(Math.max(0, currentPage - 1))}
            type="button"
          >
            Previous
          </button>
          <button
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:hover:bg-slate-900"
            disabled={currentPage >= totalPages - 1 || isLoading || (!hasMore && currentPage >= totalPages - 1)}
            onClick={() => onPageChange(currentPage + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
