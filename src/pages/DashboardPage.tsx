import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { AlertCircle, Download, FileText, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "../components/Button";
import { ColumnControls } from "../components/ColumnControls";
import { ColumnMappingPanel } from "../components/ColumnMappingPanel";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { CsvUpload } from "../components/CsvUpload";
import { DataTable } from "../components/DataTable";
import { EmptyState, LoadingSkeleton } from "../components/ConfirmDialog";
import { useAuth } from "../hooks/useAuth";
import {
  importCsvToDashboard,
  loadAllRowsForExport,
  loadDashboardPage,
  reanalyzeDashboard,
  saveColumnMapping,
  wipeDashboard,
} from "../services/dashboardData";
import type { ColumnMapping, CsvRow, DashboardMeta, DashboardType } from "../types/dashboard";
import { DEFAULT_PAGE_SIZE } from "../types/dashboard";
import { formatEventDate, getEvent } from "../services/events";
import type { HackathonEvent } from "../types/event";
import { downloadCsv, parseCsvFile, rowsToCsv } from "../utils/csv";
import { getFriendlyError } from "../utils/errors";
import {
  loadColumnPreferences,
  orderDisplayColumns,
  saveColumnPreferences,
  suggestPinnedColumns,
} from "../utils/columnPreferences";

interface DashboardPageProps {
  type: DashboardType;
  title: string;
  description: string;
}

export function DashboardPage({ type, title, description }: DashboardPageProps) {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const [event, setEvent] = useState<HackathonEvent | null>(null);
  const [meta, setMeta] = useState<DashboardMeta | null>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [columnPreferences, setColumnPreferences] = useState(() =>
    eventId ? loadColumnPreferences(eventId, type) : { hidden: [], pinned: [] },
  );

  useEffect(() => {
    if (eventId) {
      setColumnPreferences(loadColumnPreferences(eventId, type));
    }
  }, [eventId, type]);

  const sampleRows = useMemo(() => rows.map((row) => row.fields), [rows]);
  const displayColumns = useMemo(() => {
    if (!meta) {
      return [];
    }
    return orderDisplayColumns(meta.columns, columnPreferences, sampleRows);
  }, [meta, columnPreferences, sampleRows]);
  const pinnedColumns = useMemo(() => {
    if (!meta) {
      return [];
    }
    return columnPreferences.pinned.length > 0
      ? columnPreferences.pinned
      : suggestPinnedColumns(meta.columns, sampleRows);
  }, [meta, columnPreferences, sampleRows]);

  function handleColumnPreferencesChange(next: typeof columnPreferences) {
    if (!eventId) {
      return;
    }
    setColumnPreferences(next);
    saveColumnPreferences(eventId, type, next);
  }

  const loadPage = useCallback(async () => {
    if (!eventId) {
      return;
    }

    setIsTableLoading(true);
    try {
      const result = await loadDashboardPage(eventId, type, {
        page,
        pageSize,
        issuesOnly,
        searchQuery,
      });
      setMeta(result.meta);
      setRows(result.rows);
      setTotalCount(result.totalCount);
      setHasMore(result.hasMore);
    } catch (error) {
      const message = getFriendlyError(error, "Failed to load dashboard data.");
      setLoadError(message);
      toast.error(message);
    } finally {
      setIsTableLoading(false);
      setIsLoading(false);
    }
  }, [eventId, type, page, pageSize, issuesOnly, searchQuery]);

  useEffect(() => {
    if (!eventId) {
      return;
    }

    const currentEventId = eventId;

    async function loadEvent() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const eventData = await getEvent(currentEventId);
        if (!eventData) {
          setLoadError("Event not found.");
          return;
        }
        setEvent(eventData);
      } catch (error) {
        setLoadError(getFriendlyError(error, "Failed to load event."));
      }
    }

    void loadEvent();
  }, [eventId]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  useEffect(() => {
    setPage(0);
  }, [issuesOnly, searchQuery, pageSize]);

  async function importFile(file: File) {
    if (!user?.email || !eventId) {
      toast.error("You must be signed in to upload data.");
      return;
    }

    setIsBusy(true);
    try {
      const parsed = await parseCsvFile(file);
      if (parsed.columns.length === 0 || parsed.rows.length === 0) {
        throw new Error("The CSV file is empty or has no recognizable columns.");
      }

      const imported = await importCsvToDashboard(eventId, type, parsed, file.name, user.email);
      setMeta(imported.meta);
      setPage(0);
      toast.success(`Imported ${imported.meta?.rowCount ?? 0} rows from ${file.name}`);
      await loadPage();
    } catch (error) {
      toast.error(getFriendlyError(error, "Failed to import CSV."));
    } finally {
      setIsBusy(false);
      setPendingFile(null);
    }
  }

  function handleFileSelect(file: File) {
    if (meta) {
      setPendingFile(file);
      return;
    }
    void importFile(file);
  }

  async function handleReanalyze() {
    if (!eventId) {
      return;
    }

    setIsBusy(true);
    try {
      const updated = await reanalyzeDashboard(eventId, type);
      setMeta(updated.meta);
      toast.success("Re-analyzed data for mismatches.");
      await loadPage();
    } catch (error) {
      toast.error(getFriendlyError(error, "Failed to re-analyze data."));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSaveMapping(mapping: ColumnMapping) {
    if (!eventId) {
      return;
    }

    setIsBusy(true);
    try {
      const updated = await saveColumnMapping(eventId, type, mapping);
      setMeta(updated.meta);
      await loadPage();
    } finally {
      setIsBusy(false);
    }
  }

  async function handleClearData() {
    if (!eventId) {
      return;
    }

    setIsBusy(true);
    try {
      await wipeDashboard(eventId, type);
      setMeta(null);
      setRows([]);
      setTotalCount(0);
      toast.success("Dashboard data cleared.");
    } catch (error) {
      toast.error(getFriendlyError(error, "Failed to clear data."));
    } finally {
      setIsBusy(false);
      setShowClearConfirm(false);
    }
  }

  async function handleExport() {
    if (!eventId || !meta || !event) {
      return;
    }

    setIsBusy(true);
    try {
      const dataset = await loadAllRowsForExport(eventId, type);
      const exportRows = dataset.rows.map((row) => {
        const exportRow: Record<string, string> = { ...row.fields };
        exportRow._issues = row.issues.join("; ");
        return exportRow;
      });

      const columns = [...meta.columns, "_issues"];
      const csv = rowsToCsv(columns, exportRows);
      const slug = event.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
      downloadCsv(`${slug}-${type}-${new Date().toISOString().slice(0, 10)}.csv`, csv);
      toast.success("CSV exported.");
    } catch (error) {
      toast.error(getFriendlyError(error, "Failed to export CSV."));
    } finally {
      setIsBusy(false);
    }
  }

  if (!eventId) {
    return null;
  }

  if (isLoading && !meta) {
    return (
      <section className="w-full space-y-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm text-slate-500">Loading {title.toLowerCase()}...</p>
          <div className="mt-6">
            <LoadingSkeleton rows={4} />
          </div>
        </div>
      </section>
    );
  }

  if (loadError || !event) {
    return (
      <section className="w-full">
        <EmptyState
          action={
            <Button onClick={() => void loadPage()} type="button">
              <RefreshCw size={16} />
              Try again
            </Button>
          }
          description={loadError ?? "Event not found."}
          icon={<AlertCircle size={32} />}
          title={`Could not load ${title.toLowerCase()}`}
        />
      </section>
    );
  }

  return (
    <section className="w-full space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
        <Link
          className="text-sm font-semibold text-slate-500 hover:underline dark:text-slate-400"
          to={`/events/${eventId}`}
        >
          ← {event.name}
        </Link>
        <p className="mt-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          {formatEventDate(event.date)} · Admin Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{title}</h1>
        <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-300">{description}</p>

        <div className="mt-6">
          <CsvUpload isLoading={isBusy} onFileSelect={handleFileSelect} />
        </div>

        {meta ? (
          <>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-900">
              <FileText className="shrink-0 text-slate-400" size={16} />
              <span className="text-slate-600 dark:text-slate-300">
                Current file: <strong className="text-slate-950 dark:text-white">{meta.fileName}</strong>
                {" · "}
                Uploaded {new Date(meta.uploadedAt).toLocaleString()}
              </span>
            </div>

            <div className="mt-4">
              <ColumnMappingPanel
                columns={meta.columns}
                isSaving={isBusy}
                mapping={meta.columnMapping}
                onSave={handleSaveMapping}
                sampleRows={rows.map((row) => row.fields)}
              />
            </div>

            <div className="mt-4">
              <ColumnControls
                columns={meta.columns}
                onChange={handleColumnPreferencesChange}
                preferences={columnPreferences}
                sampleRows={sampleRows}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Button isLoading={isBusy} onClick={() => void handleReanalyze()} type="button" variant="secondary">
                <RefreshCw size={16} />
                Re-analyze
              </Button>
              <Button isLoading={isBusy} onClick={() => void handleExport()} type="button" variant="secondary">
                <Download size={16} />
                Export CSV
              </Button>
              <Button onClick={() => setShowClearConfirm(true)} type="button" variant="ghost">
                <Trash2 size={16} />
                Clear data
              </Button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Rows" value={String(meta.rowCount)} />
              <StatCard label="Columns" value={String(meta.columns.length)} />
              <StatCard highlight={meta.issueCount > 0} label="Issues" value={String(meta.issueCount)} />
              <StatCard label="Uploaded by" value={meta.uploadedBy} />
            </div>
          </>
        ) : null}
      </div>

      {meta ? (
        <DataTable
          columnMapping={meta.columnMapping}
          columns={meta.columns}
          displayColumns={displayColumns}
          hasMore={hasMore}
          isLoading={isTableLoading}
          issuesOnly={issuesOnly}
          onIssuesOnlyChange={setIssuesOnly}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSearchChange={setSearchQuery}
          page={page}
          pageSize={pageSize}
          pinnedColumns={pinnedColumns}
          rows={rows}
          searchQuery={searchQuery}
          totalCount={totalCount}
        />
      ) : (
        <EmptyState
          description="Export responses from your Typeform as CSV, then upload here. All columns are detected automatically — no fixed schema required."
          icon={<FileText size={32} />}
          title="No data yet"
        />
      )}

      <ConfirmDialog
        confirmLabel="Replace data"
        description={`This will replace all existing ${title.toLowerCase()} data for "${event.name}" with "${pendingFile?.name}". Your previous data is kept safe until the new import completes.`}
        isLoading={isBusy}
        isOpen={pendingFile !== null}
        onCancel={() => setPendingFile(null)}
        onConfirm={() => pendingFile && void importFile(pendingFile)}
        title="Replace existing data?"
      />

      <ConfirmDialog
        confirmLabel="Clear all"
        description={`This will permanently delete all ${title.toLowerCase()} data for "${event.name}". You can re-upload a CSV anytime.`}
        isLoading={isBusy}
        isOpen={showClearConfirm}
        onCancel={() => setShowClearConfirm(false)}
        onConfirm={() => void handleClearData()}
        title="Clear all data?"
        variant="danger"
      />
    </section>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        highlight
          ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
          : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 truncate text-lg font-bold text-slate-950 dark:text-white" title={value}>
        {value}
      </p>
    </div>
  );
}
