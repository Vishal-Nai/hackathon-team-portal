import { TYPEFORM_REGISTRATION_COLUMNS, findColumn } from "../constants/registrationSchema";
import { parseEmailsFromValue } from "./columnDetection";

/**
 * Typeform exports include in-progress "partial" rows. Those are not real registrations.
 */
export function getResponseType(fields: Record<string, string>): string {
  const key =
    Object.keys(fields).find((column) => column === TYPEFORM_REGISTRATION_COLUMNS.responseType) ??
    Object.keys(fields).find((column) => /response\s*type/i.test(column));
  return (key ? fields[key] : "").trim().toLowerCase();
}

export function getTeamLeadEmailFromFields(fields: Record<string, string>): string {
  const columns = Object.keys(fields);
  const leadColumn =
    findColumn(columns, TYPEFORM_REGISTRATION_COLUMNS.teamLeadEmail, [
      /team\s*lead.*email/i,
      /lead\s*email/i,
    ]) ?? "";
  if (leadColumn) {
    const emails = parseEmailsFromValue(fields[leadColumn] ?? "");
    if (emails[0]) {
      return emails[0];
    }
  }
  return "";
}

/** Keep completed Typeform rows (or rows with a lead email when Response Type is absent). */
export function isUsableRegistrationRow(fields: Record<string, string>): boolean {
  const responseType = getResponseType(fields);
  if (responseType === "partial") {
    return false;
  }

  const leadEmail = getTeamLeadEmailFromFields(fields);
  if (!leadEmail) {
    return false;
  }

  // If Response Type exists, prefer completed; allow empty for older exports with email present.
  if (responseType && responseType !== "completed") {
    return false;
  }

  return true;
}

export function filterRegistrationRows(
  rows: Record<string, string>[],
): { kept: Record<string, string>[]; droppedPartial: number; droppedNoEmail: number } {
  let droppedPartial = 0;
  let droppedNoEmail = 0;
  const kept: Record<string, string>[] = [];

  for (const row of rows) {
    const responseType = getResponseType(row);
    if (responseType === "partial") {
      droppedPartial += 1;
      continue;
    }
    if (!getTeamLeadEmailFromFields(row)) {
      droppedNoEmail += 1;
      continue;
    }
    if (responseType && responseType !== "completed") {
      droppedPartial += 1;
      continue;
    }
    kept.push(row);
  }

  return { kept, droppedPartial, droppedNoEmail };
}
