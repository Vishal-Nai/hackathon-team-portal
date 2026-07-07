import { Toaster } from "react-hot-toast";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { DashboardPage } from "./pages/DashboardPage";
import { EventDashboardHome } from "./pages/EventDashboardHome";
import { EventTeamsPage } from "./pages/EventTeamsPage";
import { EventsHome } from "./pages/EventsHome";
import { LoginPage } from "./pages/LoginPage";

export function App() {
  return (
    <div className="h-full">
      <AuthProvider>
        <AppShell>
          <AppRoutes />
          <Toaster
            position="bottom-center"
            toastOptions={{
              className:
                "border border-slate-200 bg-white text-slate-950 shadow-lg dark:border-slate-800 dark:bg-slate-950 dark:text-white",
              duration: 3500,
            }}
          />
        </AppShell>
      </AuthProvider>
    </div>
  );
}

function AppRoutes() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <section className="mx-auto w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Loading
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          Starting admin portal
        </h1>
      </section>
    );
  }

  return (
    <Routes>
      <Route
        element={status === "authenticated" ? <Navigate replace to="/" /> : <LoginPage />}
        path="/login"
      />
      <Route
        element={
          <ProtectedRoute>
            <EventsHome />
          </ProtectedRoute>
        }
        path="/"
      />
      <Route
        element={
          <ProtectedRoute>
            <EventDashboardHome />
          </ProtectedRoute>
        }
        path="/events/:eventId"
      />
      <Route
        element={
          <ProtectedRoute>
            <EventTeamsPage />
          </ProtectedRoute>
        }
        path="/events/:eventId/teams"
      />
      <Route
        element={
          <ProtectedRoute>
            <DashboardPage
              description="Import your Typeform registration export. All CSV columns are shown dynamically. Expand any row to see team members and detected data issues."
              title="Registrations"
              type="registrations"
            />
          </ProtectedRoute>
        }
        path="/events/:eventId/registrations"
      />
      <Route
        element={
          <ProtectedRoute>
            <DashboardPage
              description="Import your Typeform project submission export. Cross-checks against registrations to flag teams that registered but did not submit (and vice versa)."
              title="Submissions"
              type="submissions"
            />
          </ProtectedRoute>
        }
        path="/events/:eventId/submissions"
      />
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  );
}
