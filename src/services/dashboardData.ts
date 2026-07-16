import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import type {
  ColumnMapping,
  CsvRow,
  DashboardDataset,
  DashboardMeta,
  DashboardType,
  PaginatedRowsResult,
  ParsedCsv,
} from "../types/dashboard";
import { DEFAULT_PAGE_SIZE } from "../types/dashboard";
import {
  analyzeRows,
  buildSearchText,
  countIssues,
  getCrossReferenceEmails,
  suggestColumnMapping,
} from "../utils/dataAnalysis";
import { filterRegistrationRows } from "../utils/registrationRows";
import { getFirebaseDb } from "./firebase";

export interface ImportCsvResult {
  dataset: DashboardDataset;
  droppedPartial: number;
  droppedNoEmail: number;
}

const BATCH_SIZE = 400;

function rowsCollection(eventId: string, type: DashboardType) {
  return collection(getFirebaseDb(), "events", eventId, "datasets", type, "rows");
}

function metaDoc(eventId: string, type: DashboardType) {
  return doc(getFirebaseDb(), "events", eventId, "datasets", type);
}

function timestampToIso(value: Timestamp | string | undefined): string {
  if (!value) {
    return new Date().toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return value.toDate().toISOString();
}

function mapMeta(data: Record<string, unknown>, sampleRows: Record<string, string>[] = []): DashboardMeta {
  const columns = (data.columns as string[]) ?? [];
  const columnMapping =
    (data.columnMapping as ColumnMapping | undefined) ?? suggestColumnMapping(columns, sampleRows);

  return {
    columns,
    fileName: (data.fileName as string) ?? "unknown.csv",
    uploadedAt: timestampToIso(data.uploadedAt as Timestamp | string | undefined),
    uploadedBy: (data.uploadedBy as string) ?? "",
    rowCount: (data.rowCount as number) ?? 0,
    issueCount: (data.issueCount as number) ?? 0,
    activeImportId: (data.activeImportId as string) ?? "",
    columnMapping,
  };
}

function mapRow(rowDoc: QueryDocumentSnapshot): CsvRow {
  const rowData = rowDoc.data();
  return {
    id: rowDoc.id,
    rowIndex: (rowData.rowIndex as number) ?? 0,
    fields: (rowData.fields as Record<string, string>) ?? {},
    issues: (rowData.issues as string[]) ?? [],
    importId: rowData.importId as string | undefined,
    hasIssues: rowData.hasIssues as boolean | undefined,
  };
}

export async function loadDashboardMeta(
  eventId: string,
  type: DashboardType,
): Promise<DashboardMeta | null> {
  const metaSnapshot = await getDoc(metaDoc(eventId, type));
  if (!metaSnapshot.exists()) {
    return null;
  }
  return mapMeta(metaSnapshot.data());
}

export async function loadDashboard(eventId: string, type: DashboardType): Promise<DashboardDataset> {
  const meta = await loadDashboardMeta(eventId, type);
  if (!meta) {
    return { meta: null, rows: [] };
  }

  const rows = await loadAllRows(eventId, type, meta.activeImportId);
  return { meta, rows };
}

async function loadAllRows(eventId: string, type: DashboardType, activeImportId: string): Promise<CsvRow[]> {
  if (!activeImportId) {
    const rowsSnapshot = await getDocs(query(rowsCollection(eventId, type), orderBy("rowIndex")));
    return rowsSnapshot.docs.map(mapRow).sort((a, b) => a.rowIndex - b.rowIndex);
  }

  const rowsSnapshot = await getDocs(
    query(rowsCollection(eventId, type), where("importId", "==", activeImportId), orderBy("rowIndex")),
  );
  return rowsSnapshot.docs.map(mapRow).sort((a, b) => a.rowIndex - b.rowIndex);
}

export async function loadDashboardPage(
  eventId: string,
  type: DashboardType,
  options: {
    page?: number;
    pageSize?: number;
    issuesOnly?: boolean;
    searchQuery?: string;
    cursor?: DocumentSnapshot | null;
  } = {},
): Promise<PaginatedRowsResult & { meta: DashboardMeta | null; cursor: DocumentSnapshot | null }> {
  const meta = await loadDashboardMeta(eventId, type);
  if (!meta) {
    return { meta: null, rows: [], totalCount: 0, page: 0, pageSize: DEFAULT_PAGE_SIZE, hasMore: false, cursor: null };
  }

  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const searchQuery = options.searchQuery?.trim().toLowerCase();

  if (searchQuery) {
    const allRows = await loadAllRows(eventId, type, meta.activeImportId);
    const filtered = allRows.filter((row) => {
      const matchesSearch = buildSearchText(row.fields).includes(searchQuery);
      const matchesIssues = !options.issuesOnly || row.hasIssues;
      return matchesSearch && matchesIssues;
    });
    const page = options.page ?? 0;
    const start = page * pageSize;
    return {
      meta,
      rows: filtered.slice(start, start + pageSize),
      totalCount: filtered.length,
      page,
      pageSize,
      hasMore: start + pageSize < filtered.length,
      cursor: null,
    };
  }

  let rowQuery = query(rowsCollection(eventId, type), orderBy("rowIndex"));

  if (meta.activeImportId) {
    rowQuery = query(
      rowsCollection(eventId, type),
      where("importId", "==", meta.activeImportId),
      orderBy("rowIndex"),
    );
  }

  if (options.issuesOnly) {
    if (meta.activeImportId) {
      rowQuery = query(
        rowsCollection(eventId, type),
        where("importId", "==", meta.activeImportId),
        where("hasIssues", "==", true),
        orderBy("rowIndex"),
      );
    } else {
      rowQuery = query(rowsCollection(eventId, type), where("hasIssues", "==", true), orderBy("rowIndex"));
    }
  }

  if (options.cursor) {
    rowQuery = query(rowQuery, startAfter(options.cursor));
  }

  const page = options.page ?? 0;
  const offset = page * pageSize;

  if (!options.cursor && offset > 0) {
    const skipQuery = query(rowQuery, limit(offset));
    const skipSnapshot = await getDocs(skipQuery);
    const lastVisible = skipSnapshot.docs[skipSnapshot.docs.length - 1];
    if (!lastVisible) {
      return { meta, rows: [], totalCount: meta.rowCount, page, pageSize, hasMore: false, cursor: null };
    }
    rowQuery = query(rowQuery, startAfter(lastVisible));
  }

  const rowsSnapshot = await getDocs(query(rowQuery, limit(pageSize + 1)));
  const hasMore = rowsSnapshot.docs.length > pageSize;
  const docs = hasMore ? rowsSnapshot.docs.slice(0, pageSize) : rowsSnapshot.docs;
  const lastCursor = docs.length > 0 ? docs[docs.length - 1] : null;

  const totalCount = options.issuesOnly ? meta.issueCount : meta.rowCount;

  return {
    meta,
    rows: docs.map(mapRow),
    totalCount,
    page,
    pageSize,
    hasMore,
    cursor: lastCursor,
  };
}

export async function loadCrossReferenceDataset(
  eventId: string,
  type: DashboardType,
): Promise<DashboardDataset | null> {
  const otherType: DashboardType = type === "registrations" ? "submissions" : "registrations";
  const dataset = await loadDashboard(eventId, otherType);
  return dataset.meta ? dataset : null;
}

export async function importCsvToDashboard(
  eventId: string,
  type: DashboardType,
  parsed: ParsedCsv,
  fileName: string,
  uploadedBy: string,
): Promise<ImportCsvResult> {
  let importRows = parsed.rows;
  let droppedPartial = 0;
  let droppedNoEmail = 0;

  if (type === "registrations") {
    const filtered = filterRegistrationRows(parsed.rows);
    importRows = filtered.kept;
    droppedPartial = filtered.droppedPartial;
    droppedNoEmail = filtered.droppedNoEmail;

    if (importRows.length === 0) {
      throw new Error(
        `No completed registrations found. Skipped ${droppedPartial} partial and ${droppedNoEmail} rows without a team lead email.`,
      );
    }
  }

  const existingMeta = await loadDashboardMeta(eventId, type);
  const columnsChanged =
    existingMeta &&
    JSON.stringify(existingMeta.columns) !== JSON.stringify(parsed.columns);

  const columnMapping =
    existingMeta?.columnMapping?.manualOverride && !columnsChanged
      ? existingMeta.columnMapping
      : suggestColumnMapping(parsed.columns, importRows);

  const crossRef = await loadCrossReferenceDataset(eventId, type);
  const crossEmails =
    crossRef?.meta && crossRef.rows.length > 0
      ? getCrossReferenceEmails(
          crossRef.meta.columns,
          crossRef.rows,
          crossRef.meta.columnMapping,
        )
      : undefined;

  const importId = crypto.randomUUID();
  const rawRows = importRows.map((fields, index) => ({
    id: `row-${index}`,
    rowIndex: index,
    fields,
  }));

  const analyzedRows = analyzeRows(type, parsed.columns, rawRows, columnMapping, crossEmails);

  // Safe import: write new rows first, only remove old data after success.
  let batch = writeBatch(getFirebaseDb());
  let batchCount = 0;

  for (const row of analyzedRows) {
    const rowRef = doc(rowsCollection(eventId, type), `${importId}-${row.id}`);
    batch.set(rowRef, {
      rowIndex: row.rowIndex,
      fields: row.fields,
      issues: row.issues,
      hasIssues: row.hasIssues ?? row.issues.length > 0,
      importId,
      searchText: buildSearchText(row.fields),
    });
    batchCount += 1;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      batch = writeBatch(getFirebaseDb());
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  const issueCount = countIssues(analyzedRows);
  const previousImportId = existingMeta?.activeImportId;

  const meta: DashboardMeta = {
    columns: parsed.columns,
    fileName,
    uploadedAt: new Date().toISOString(),
    uploadedBy,
    rowCount: analyzedRows.length,
    issueCount,
    activeImportId: importId,
    columnMapping,
  };

  await setDoc(metaDoc(eventId, type), {
    ...meta,
    uploadedAt: serverTimestamp(),
  });

  try {
    await purgeStaleRows(eventId, type, importId);
  } catch (error) {
    // New data is active; stale rows can be cleaned on next import.
    console.error("Stale row cleanup failed:", error);
  }

  if (previousImportId && previousImportId !== importId) {
    try {
      await deleteRowsByImportId(eventId, type, previousImportId);
    } catch (error) {
      console.error("Previous import cleanup failed:", error);
    }
  }

  const otherType = type === "registrations" ? "submissions" : "registrations";
  try {
    await reanalyzeDashboard(eventId, otherType);
  } catch {
    // Other dashboard may not exist yet.
  }

  return {
    dataset: { meta, rows: analyzedRows },
    droppedPartial,
    droppedNoEmail,
  };
}

async function deleteRowsByImportId(eventId: string, type: DashboardType, importId: string) {
  const snapshot = await getDocs(
    query(rowsCollection(eventId, type), where("importId", "==", importId)),
  );

  if (snapshot.empty) {
    return;
  }

  let batch = writeBatch(getFirebaseDb());
  let batchCount = 0;

  for (const rowDoc of snapshot.docs) {
    batch.delete(rowDoc.ref);
    batchCount += 1;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      batch = writeBatch(getFirebaseDb());
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }
}

async function purgeStaleRows(eventId: string, type: DashboardType, activeImportId: string) {
  const snapshot = await getDocs(rowsCollection(eventId, type));
  if (snapshot.empty) {
    return;
  }

  let batch = writeBatch(getFirebaseDb());
  let batchCount = 0;

  for (const rowDoc of snapshot.docs) {
    const rowImportId = rowDoc.data().importId as string | undefined;
    if (rowImportId === activeImportId) {
      continue;
    }

    batch.delete(rowDoc.ref);
    batchCount += 1;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      batch = writeBatch(getFirebaseDb());
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }
}

export async function saveColumnMapping(
  eventId: string,
  type: DashboardType,
  columnMapping: ColumnMapping,
): Promise<DashboardDataset> {
  const current = await loadDashboard(eventId, type);
  if (!current.meta) {
    throw new Error("Upload a CSV before configuring column mapping.");
  }

  await updateDoc(metaDoc(eventId, type), { columnMapping: { ...columnMapping, manualOverride: true } });
  return reanalyzeDashboard(eventId, type);
}

export async function reanalyzeDashboard(eventId: string, type: DashboardType): Promise<DashboardDataset> {
  const current = await loadDashboard(eventId, type);
  if (!current.meta) {
    return current;
  }

  const crossRef = await loadCrossReferenceDataset(eventId, type);
  const crossEmails =
    crossRef?.meta && crossRef.rows.length > 0
      ? getCrossReferenceEmails(
          crossRef.meta.columns,
          crossRef.rows,
          crossRef.meta.columnMapping,
        )
      : undefined;

  const rawRows = current.rows.map((row) => ({
    id: row.id,
    rowIndex: row.rowIndex,
    fields: row.fields,
  }));

  const analyzedRows = analyzeRows(
    type,
    current.meta.columns,
    rawRows,
    current.meta.columnMapping,
    crossEmails,
  );

  let batch = writeBatch(getFirebaseDb());
  let batchCount = 0;

  for (const row of analyzedRows) {
    const rowRef = doc(rowsCollection(eventId, type), row.id);
    batch.update(rowRef, {
      issues: row.issues,
      hasIssues: row.hasIssues ?? row.issues.length > 0,
    });
    batchCount += 1;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      batch = writeBatch(getFirebaseDb());
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  const issueCount = countIssues(analyzedRows);
  await updateDoc(metaDoc(eventId, type), { issueCount });

  return {
    meta: { ...current.meta, issueCount },
    rows: analyzedRows,
  };
}

export async function loadAllRowsForExport(eventId: string, type: DashboardType): Promise<DashboardDataset> {
  return loadDashboard(eventId, type);
}

export async function wipeDashboard(eventId: string, type: DashboardType): Promise<void> {
  const meta = await loadDashboardMeta(eventId, type);
  if (meta?.activeImportId) {
    await deleteRowsByImportId(eventId, type, meta.activeImportId);
  } else {
    const snapshot = await getDocs(rowsCollection(eventId, type));
    let batch = writeBatch(getFirebaseDb());
    let batchCount = 0;
    for (const rowDoc of snapshot.docs) {
      batch.delete(rowDoc.ref);
      batchCount += 1;
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        batch = writeBatch(getFirebaseDb());
        batchCount = 0;
      }
    }
    if (batchCount > 0) {
      await batch.commit();
    }
  }

  const metaSnapshot = await getDoc(metaDoc(eventId, type));
  if (metaSnapshot.exists()) {
    await deleteDoc(metaDoc(eventId, type));
  }
}
