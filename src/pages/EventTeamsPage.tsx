import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Search,
} from "lucide-react";
import { Button } from "../components/Button";
import { LoadingSkeleton } from "../components/ConfirmDialog";
import { loadEventTeams } from "../services/eventTeams";
import { formatEventDate, getEvent } from "../services/events";
import type { HackathonEvent } from "../types/event";
import type { MergedTeam, TeamMatchStatus } from "../types/teams";
import { downloadCsv, rowsToCsv } from "../utils/csv";
import { getFriendlyError } from "../utils/errors";
import { buildChaseListRows } from "../utils/teamMerge";

const PAGE_SIZE = 25;
const STATUS_FILTERS: Array<{ id: "all" | TeamMatchStatus | "issues"; label: string }> = [
  { id: "all", label: "All teams" },
  { id: "complete", label: "Matched" },
  { id: "registered_only", label: "Missing submission" },
  { id: "submitted_only", label: "Submission only" },
  { id: "issues", label: "Has issues" },
];

export function EventTeamsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<HackathonEvent | null>(null);
  const [teams, setTeams] = useState<MergedTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]["id"]>("all");
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) {
      return;
    }

    const currentEventId = eventId;

    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [eventData, teamsData] = await Promise.all([
          getEvent(currentEventId),
          loadEventTeams(currentEventId),
        ]);

        if (!eventData) {
          setLoadError("Event not found.");
          return;
        }

        setEvent(eventData);
        setTeams(teamsData.teams);
      } catch (error) {
        setLoadError(getFriendlyError(error, "Failed to load teams."));
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [eventId]);

  const filteredTeams = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return teams.filter((team) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "issues" ? team.issues.length > 0 : team.status === statusFilter);
      const matchesSearch =
        !query ||
        team.teamName.toLowerCase().includes(query) ||
        team.primaryEmail.toLowerCase().includes(query) ||
        team.allEmails.some((email) => email.includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [teams, searchQuery, statusFilter]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTeams.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageTeams = filteredTeams.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  function handleExportChaseList() {
    const chaseRows = buildChaseListRows(teams);
    if (chaseRows.length === 0) {
      toast.error("No teams missing submissions.");
      return;
    }
    const columns = ["primary_email", "team_name", "all_emails", "status", "registration_issues"];
    const csv = rowsToCsv(columns, chaseRows);
    const slug = (event?.name ?? "event").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    downloadCsv(`${slug}-chase-list-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    toast.success(`Exported ${chaseRows.length} teams.`);
  }

  function handleExportAll() {
    if (filteredTeams.length === 0) {
      toast.error("No teams to export.");
      return;
    }
    const rows = filteredTeams.map((team) => ({
      team_name: team.teamName,
      primary_email: team.primaryEmail,
      all_emails: team.allEmails.join("; "),
      status: team.status,
      links: team.links.map((link) => link.url).join("; "),
      issues: team.issues.join("; "),
    }));
    const columns = ["team_name", "primary_email", "all_emails", "status", "links", "issues"];
    const csv = rowsToCsv(columns, rows);
    const slug = (event?.name ?? "event").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    downloadCsv(`${slug}-teams-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    toast.success(`Exported ${filteredTeams.length} teams.`);
  }

  if (!eventId) {
    return null;
  }

  if (isLoading) {
    return <LoadingSkeleton rows={5} />;
  }

  if (loadError || !event) {
    return (
      <section className="w-full rounded-[2rem] border border-red-200 bg-red-50 p-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
        {loadError ?? "Event not found."}{" "}
        <Link className="font-semibold underline" to="/">
          Back to events
        </Link>
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
          {formatEventDate(event.date)} · Unified view
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">All teams</h1>
        <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-300">
          Registration and submission data merged by email. Click links to open GitHub, demo, and other URLs.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={handleExportChaseList} type="button" variant="secondary">
            <Download size={16} />
            Export chase list
          </Button>
          <Button onClick={handleExportAll} type="button" variant="secondary">
            <Download size={16} />
            Export filtered teams
          </Button>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none ring-slate-950 focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-white"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search team name or email..."
              type="search"
              value={searchQuery}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => (
              <button
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  statusFilter === filter.id
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
                }`}
                key={filter.id}
                onClick={() => setStatusFilter(filter.id)}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          {filteredTeams.length} teams · page {currentPage + 1} of {totalPages}
        </p>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="max-h-[70vh] overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Links</th>
                  <th className="px-4 py-3">Issues</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {pageTeams.map((team) => (
                  <TeamRow
                    expanded={expandedId === team.id}
                    key={team.id}
                    onToggle={() => setExpandedId(expandedId === team.id ? null : team.id)}
                    team={team}
                  />
                ))}
              </tbody>
            </table>
            {pageTeams.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-500">No teams match your filters.</div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex justify-between gap-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Page {currentPage + 1} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-800"
              disabled={currentPage === 0}
              onClick={() => setPage(Math.max(0, currentPage - 1))}
              type="button"
            >
              Previous
            </button>
            <button
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-800"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPage(currentPage + 1)}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function TeamRow({
  team,
  expanded,
  onToggle,
}: {
  team: MergedTeam;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="border-b border-slate-100 dark:border-slate-900">
        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
          <span className="block">{team.teamName}</span>
          {team.projectTitle ? (
            <span className="mt-0.5 block text-xs font-normal text-slate-500">{team.projectTitle}</span>
          ) : null}
          {team.domain ? (
            <span className="mt-0.5 block text-xs font-normal text-slate-500">{team.domain}</span>
          ) : null}
        </td>
        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
          {team.leadName ? <span className="mb-0.5 block text-xs text-slate-500">{team.leadName}</span> : null}
          {team.primaryEmail}
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={team.status} />
        </td>
        <td className="px-4 py-3">
          {team.links.length > 0 ? (
            <div className="flex flex-col gap-1">
              {team.links.slice(0, 2).map((link) => (
                <a
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                  href={link.url}
                  key={`${team.id}-${link.url}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ExternalLink size={12} />
                  {link.label}
                </a>
              ))}
              {team.links.length > 2 ? (
                <span className="text-xs text-slate-500">+{team.links.length - 2} more</span>
              ) : null}
            </div>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </td>
        <td className="px-4 py-3">
          {team.issues.length > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              <AlertTriangle size={12} />
              {team.issues.length}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
              <CheckCircle2 size={12} />
              OK
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          <button
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
            onClick={onToggle}
            type="button"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            View
          </button>
        </td>
      </tr>
      {expanded ? (
        <tr className="border-b border-slate-100 bg-slate-50 dark:border-slate-900 dark:bg-slate-900/50">
          <td className="px-4 py-4" colSpan={6}>
            <div className="grid gap-4 lg:grid-cols-2">
              <DatasetPanel
                fields={team.registration?.fields ?? null}
                title="Registration"
                emptyLabel="No registration found"
              />
              <DatasetPanel
                fields={team.submission?.fields ?? null}
                links={team.links}
                title="Submission"
                emptyLabel="No submission found"
              />
              {team.issues.length > 0 ? (
                <div className="lg:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Issues</p>
                  <ul className="mt-2 space-y-1 text-sm text-amber-800 dark:text-amber-200">
                    {team.issues.map((issue, index) => (
                      <li key={`${team.id}-issue-${index}`}>• {issue}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function DatasetPanel({
  title,
  fields,
  emptyLabel,
  links,
}: {
  title: string;
  fields: Record<string, string> | null;
  emptyLabel: string;
  links?: MergedTeam["links"];
}) {
  if (!fields) {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
        <p className="mt-2 text-sm text-slate-500">{emptyLabel}</p>
      </div>
    );
  }

  const entries = Object.entries(fields).filter(([, value]) => value.trim());

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <dl className="mt-2 space-y-1 text-sm">
        {entries.map(([key, value]) => (
          <div className="grid grid-cols-[minmax(0,40%)_1fr] gap-2" key={key}>
            <dt className="truncate text-slate-500" title={key}>
              {key}
            </dt>
            <dd className="truncate text-slate-800 dark:text-slate-100" title={value}>
              {/^https?:\/\//i.test(value) ? (
                <a className="text-blue-600 hover:underline dark:text-blue-400" href={value} rel="noreferrer" target="_blank">
                  {value}
                </a>
              ) : (
                value
              )}
            </dd>
          </div>
        ))}
      </dl>
      {links && links.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {links.map((link) => (
            <a
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-slate-100 dark:border-slate-700 dark:text-blue-400 dark:hover:bg-slate-900"
              href={link.url}
              key={link.url}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink size={12} />
              {link.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: TeamMatchStatus }) {
  if (status === "complete") {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
        Matched
      </span>
    );
  }
  if (status === "registered_only") {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
        Missing submission
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
      Submission only
    </span>
  );
}
