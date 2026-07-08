import type { EventTeamsData } from "../types/teams";
import { buildMergedTeams, computeEventSummary } from "../utils/teamMerge";
import { loadDashboard } from "./dashboardData";

export async function loadEventTeams(eventId: string): Promise<EventTeamsData> {
  const [regDataset, subDataset] = await Promise.all([
    loadDashboard(eventId, "registrations"),
    loadDashboard(eventId, "submissions"),
  ]);

  const teams = buildMergedTeams(
    regDataset.rows,
    subDataset.rows,
    regDataset.meta?.columns ?? [],
    subDataset.meta?.columns ?? [],
    regDataset.meta?.columnMapping,
    subDataset.meta?.columnMapping,
  );

  const summary = computeEventSummary(teams, regDataset.meta, subDataset.meta);

  return {
    teams,
    summary,
    regMeta: regDataset.meta,
    subMeta: subDataset.meta,
  };
}
