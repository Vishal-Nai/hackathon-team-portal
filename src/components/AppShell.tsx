import type { ReactNode } from "react";
import { Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { usePortalConfig } from "../hooks/usePortalConfig";
import { SettingsModal } from "./SettingsModal";
import { PortalLogo } from "./PortalLogo";
import { ThemeToggle } from "./ThemeToggle";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { canManagePortal, getPortalPath, portalConfig } = usePortalConfig();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 transition-colors dark:bg-slate-950 dark:text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.08),_transparent_38rem)] dark:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_34rem)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 py-3">
          <Link className="group flex items-center gap-3" to={getPortalPath("/")}>
            <PortalLogo />
            <span>
              <span className="block text-sm font-bold tracking-tight">
                {portalConfig?.title ?? "Hackathon Team Portal"}
              </span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">Team portal</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {canManagePortal ? (
              <button
                aria-label="Open organizer settings"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 focus:ring-offset-white dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900 dark:focus:ring-white dark:focus:ring-offset-slate-950"
                onClick={() => setSettingsOpen(true)}
                type="button"
              >
                <Settings aria-hidden="true" size={16} />
                <span className="hidden sm:inline">Settings</span>
              </button>
            ) : null}
            <ThemeToggle />
          </div>
        </header>
        <main className="flex flex-1 items-center py-8 sm:py-12">{children}</main>
      </div>
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
