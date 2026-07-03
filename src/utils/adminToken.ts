const ADMIN_TOKEN_PREFIX = "hackathon-portal-admin";

function storageKey(portalId: string) {
  return `${ADMIN_TOKEN_PREFIX}:${portalId}`;
}

export function storeAdminToken(portalId: string, adminToken: string) {
  sessionStorage.setItem(storageKey(portalId), adminToken);
}

export function getStoredAdminToken(portalId: string) {
  return sessionStorage.getItem(storageKey(portalId)) ?? undefined;
}

export function clearStoredAdminToken(portalId: string) {
  sessionStorage.removeItem(storageKey(portalId));
}
