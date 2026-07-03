import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { portalConfigService } from "../services/portalConfig";
import type { PortalConfig, PortalConfigInput } from "../types/portal";
import { clearStoredAdminToken, getStoredAdminToken, storeAdminToken } from "../utils/adminToken";

type PortalStatus = "idle" | "loading" | "ready" | "error";

interface PortalConfigContextValue {
  adminToken?: string;
  canManagePortal: boolean;
  error?: string;
  isAdminMode: boolean;
  portalConfig?: PortalConfig;
  status: PortalStatus;
  attendeeLink?: string;
  adminLink?: string;
  getPortalPath: (path: string, includeAdmin?: boolean) => string;
  savePortalConfig: (input: PortalConfigInput) => Promise<PortalConfig>;
  reloadPortalConfig: () => Promise<void>;
}

const PortalConfigContext = createContext<PortalConfigContextValue | undefined>(undefined);

function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const portalId = params.get("portal") ?? undefined;
  const urlAdminToken = params.get("admin") ?? undefined;
  const storedAdminToken = portalId ? getStoredAdminToken(portalId) : undefined;

  return {
    portalId,
    adminToken: urlAdminToken ?? storedAdminToken,
    urlAdminToken,
  };
}

function buildPortalUrl(portalId: string, adminToken?: string) {
  const url = new URL(window.location.origin);
  url.searchParams.set("portal", portalId);
  if (adminToken) {
    url.searchParams.set("admin", adminToken);
  }
  return url.toString();
}

function stripAdminTokenFromUrl() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("admin")) {
    return;
  }

  url.searchParams.delete("admin");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

export function PortalConfigProvider({ children }: { children: ReactNode }) {
  const [{ portalId, adminToken, urlAdminToken }, setParams] = useState(getUrlParams);
  const [portalConfig, setPortalConfig] = useState<PortalConfig | undefined>();
  const [status, setStatus] = useState<PortalStatus>(portalId ? "loading" : "idle");
  const [error, setError] = useState<string | undefined>();

  async function loadConfig(currentPortalId = portalId, currentAdminToken = adminToken) {
    if (!currentPortalId) {
      setPortalConfig(undefined);
      setStatus("idle");
      setError(undefined);
      return;
    }

    try {
      setStatus("loading");
      setError(undefined);
      const config = await portalConfigService.getPortalConfig(currentPortalId, currentAdminToken);
      setPortalConfig(config);
      setStatus("ready");
    } catch (loadError) {
      setPortalConfig(undefined);
      setStatus("error");
      setError(loadError instanceof Error ? loadError.message : "Could not load portal configuration.");
    }
  }

  useEffect(() => {
    void loadConfig(portalId, adminToken);
  }, [portalId, adminToken]);

  useEffect(() => {
    if (!portalId || !urlAdminToken) {
      return;
    }

    storeAdminToken(portalId, urlAdminToken);
    stripAdminTokenFromUrl();
    setParams((current) => ({
      ...current,
      adminToken: urlAdminToken,
      urlAdminToken: undefined,
    }));
  }, [portalId, urlAdminToken]);

  const value = useMemo<PortalConfigContextValue>(() => {
    const activeAdminToken = portalConfig?.adminToken ?? adminToken;
    const attendeeLink = portalConfig ? buildPortalUrl(portalConfig.portalId) : undefined;
    const adminLink =
      portalConfig && activeAdminToken ? buildPortalUrl(portalConfig.portalId, activeAdminToken) : undefined;
    const canManagePortal =
      !portalId || status === "idle" || Boolean(portalConfig?.canEdit) || Boolean(activeAdminToken);

    return {
      adminToken: activeAdminToken,
      canManagePortal,
      error,
      isAdminMode: Boolean(activeAdminToken),
      portalConfig,
      status,
      attendeeLink,
      adminLink,
      getPortalPath: (path: string, includeAdmin = false) => {
        const query = new URLSearchParams();
        const activePortalId = portalConfig?.portalId ?? portalId;
        const tokenForPath = includeAdmin ? activeAdminToken : undefined;

        if (activePortalId) {
          query.set("portal", activePortalId);
        }
        if (tokenForPath) {
          query.set("admin", tokenForPath);
        }

        const queryString = query.toString();
        return queryString ? `${path}?${queryString}` : path;
      },
      savePortalConfig: async (input: PortalConfigInput) => {
        const config = portalConfig?.portalId
          ? await portalConfigService.updatePortalConfig(
              portalConfig.portalId,
              input,
              portalConfig.adminToken ?? adminToken ?? getStoredAdminToken(portalConfig.portalId),
            )
          : await portalConfigService.createPortalConfig(input);

        if (config.adminToken) {
          storeAdminToken(config.portalId, config.adminToken);
        }

        setPortalConfig(config);
        setParams({ portalId: config.portalId, adminToken: config.adminToken, urlAdminToken: undefined });
        setStatus("ready");
        setError(undefined);

        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set("portal", config.portalId);
        nextUrl.searchParams.delete("admin");
        window.history.replaceState(null, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);

        return config;
      },
      reloadPortalConfig: () => loadConfig(portalId, adminToken),
    };
  }, [adminToken, error, portalConfig, portalId, status]);

  return <PortalConfigContext.Provider value={value}>{children}</PortalConfigContext.Provider>;
}

export function usePortalConfig() {
  const context = useContext(PortalConfigContext);
  if (!context) {
    throw new Error("usePortalConfig must be used inside PortalConfigProvider.");
  }

  return context;
}

export { clearStoredAdminToken, getStoredAdminToken, storeAdminToken };
