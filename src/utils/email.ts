export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function emailToDocumentId(email: string) {
  return normalizeEmail(email);
}
