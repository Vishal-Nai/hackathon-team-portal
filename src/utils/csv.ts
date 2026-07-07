import Papa from "papaparse";
import type { ParsedCsv } from "../types/dashboard";

export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        if (results.errors.length > 0) {
          const message = results.errors.map((error) => error.message).join(" ");
          reject(new Error(message || "Failed to parse CSV file."));
          return;
        }

        const columns = (results.meta.fields ?? []).filter(Boolean);
        const rows = results.data
          .map((row) => normalizeRow(row, columns))
          .filter((row) => Object.values(row).some((value) => value.trim().length > 0));

        resolve({ columns, rows });
      },
      error: (error) => reject(error),
    });
  });
}

function normalizeRow(row: Record<string, string>, columns: string[]): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const column of columns) {
    normalized[column] = (row[column] ?? "").trim();
  }
  return normalized;
}

export function rowsToCsv(columns: string[], rows: Record<string, string>[]): string {
  return Papa.unparse({ fields: columns, data: rows.map((row) => columns.map((col) => row[col] ?? "")) });
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
