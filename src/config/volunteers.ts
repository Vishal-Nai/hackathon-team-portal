import { MAX_VOLUNTEER_NAME_LENGTH } from "../types/volunteer";

function parseVolunteerCode(): string {
  const raw = import.meta.env.VITE_VOLUNTEER_CODE;
  if (!raw || typeof raw !== "string") {
    return "";
  }
  return raw.trim();
}

const volunteerCode = parseVolunteerCode();

export function getVolunteerCode(): string {
  return volunteerCode;
}

export function isVolunteerPortalConfigured(): boolean {
  return volunteerCode.length > 0;
}

export function validateVolunteerCode(code: string): boolean {
  if (!volunteerCode) {
    return false;
  }
  return code.trim() === volunteerCode;
}

export function validateVolunteerName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return "Your name is required.";
  }
  if (trimmed.length > MAX_VOLUNTEER_NAME_LENGTH) {
    return `Name must be ${MAX_VOLUNTEER_NAME_LENGTH} characters or fewer.`;
  }
  return null;
}
