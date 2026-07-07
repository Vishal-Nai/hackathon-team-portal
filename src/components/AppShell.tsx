import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Calendar, LayoutDashboard, LogIn, LogOut, Menu, X } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import { PortalLogo } from "./PortalLogo";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./Button";
import { useAuth } from "../hooks/useAuth";
import { appConfig } from "../constants/config";
import { cn } from "../utils/cn";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { status, user, signOut } = useAuth();
  const location = useLocation();
  const { eventId } = useParams<{ eventId: string }>();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const isAuthenticated = status === "authenticated";
  const isLoginPage = location.pathname === "/login";
  const isInsideEvent = Boolean(eventId);

  const navItems = useMemo(() => {
    if (!isInsideEvent || !eventId) {
      return [{ to: "/", label: "Events", icon: LayoutDashboard }];
    }

    return [
      { to: "/", label: "Events", icon: LayoutDashboard },
      { to: `/events/${eventId}`, label: "Overview", icon: Calendar },
      { to: `/events/${eventId}/registrations`, label: "Registrations" },
      { to: `/events/${eventId}/submissions`, label: "Submissions" },
    ];
  }, [eventId, isInsideEvent]);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
      toast.success("Signed out.");
    } catch {
      toast.error("Could not sign out. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  }

  function isNavActive(path: string) {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname === path;
  }

  return (
    <div
      className={cn(
        "bg-slate-50 text-slate-950 transition-colors dark:bg-slate-950 dark:text-white",
        isLoginPage ? "h-dvh overflow-hidden" : "min-h-screen",
      )}
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.08),_transparent_38rem)] dark:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_34rem)]" />
      <div
        className={cn(
          "relative mx-auto flex w-full max-w-7xl flex-col px-4 sm:px-6 lg:px-8",
          isLoginPage ? "h-full py-3" : "min-h-screen py-4",
        )}
      >
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 py-2">
          <Link className="group flex items-center gap-3" to={isAuthenticated ? "/" : "/login"}>
            <PortalLogo />
            <span>
              <span className="block text-sm font-bold tracking-tight">{appConfig.appName}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">Admin portal</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <nav className="mr-2 hidden items-center gap-1 lg:flex">
                  {navItems.map((item) => (
                    <Link
                      className={cn(
                        "rounded-full px-3 py-2 text-sm font-semibold transition",
                        isNavActive(item.to)
                          ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900",
                      )}
                      key={item.to}
                      to={item.to}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
                <button
                  aria-label="Toggle navigation menu"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 px-3 lg:hidden dark:border-slate-800"
                  onClick={() => setMobileNavOpen((open) => !open)}
                  type="button"
                >
                  {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
              </>
            ) : (
              <Link
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950"
                to="/login"
              >
                <LogIn size={16} />
                Sign in
              </Link>
            )}

            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-1 dark:border-slate-800 dark:bg-slate-950">
                <div className="hidden items-center gap-2 px-2 sm:flex" title={user.email ?? undefined}>
                  {user.photoURL ? (
                    <img alt="" className="size-8 rounded-full object-cover" src={user.photoURL} />
                  ) : (
                    <span className="flex size-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold dark:bg-slate-800">
                      {(user.displayName ?? user.email ?? "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="max-w-[10rem] truncate text-xs font-medium text-slate-600 dark:text-slate-300">
                    {user.email}
                  </span>
                </div>
                <Button
                  className="min-h-9 px-3 py-2 text-xs"
                  isLoading={isSigningOut}
                  onClick={() => void handleSignOut()}
                  type="button"
                  variant="ghost"
                >
                  <LogOut size={14} />
                  <span className="hidden sm:inline">Sign out</span>
                </Button>
              </div>
            ) : null}

            <ThemeToggle />
          </div>
        </header>

        {isAuthenticated && mobileNavOpen ? (
          <nav className="mb-2 flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-2 lg:hidden dark:border-slate-800 dark:bg-slate-950">
            {navItems.map((item) => (
              <Link
                className={cn(
                  "rounded-xl px-4 py-3 text-sm font-semibold",
                  isNavActive(item.to)
                    ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900",
                )}
                key={item.to}
                onClick={() => setMobileNavOpen(false)}
                to={item.to}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}

        <main
          className={cn(
            "flex min-h-0 flex-1",
            isLoginPage ? "items-center overflow-hidden py-2" : "items-start py-6 sm:py-8",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
