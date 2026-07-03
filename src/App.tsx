import { Toaster } from "react-hot-toast";
import { Navigate, Route, Routes } from "react-router-dom";
import { Button } from "./components/Button";
import { AppShell } from "./components/AppShell";
import { SuccessCard } from "./components/SuccessCard";
import { PortalConfigProvider, usePortalConfig } from "./hooks/usePortalConfig";
import { HomePage } from "./pages/HomePage";
import { RegisterPage } from "./pages/RegisterPage";
import { SubmitPage } from "./pages/SubmitPage";

export function App() {
  return (
    <PortalConfigProvider>
      <AppShell>
        <PortalRoutes />
        <Toaster
          position="bottom-center"
          toastOptions={{
            className:
              "border border-slate-200 bg-white text-slate-950 shadow-lg dark:border-slate-800 dark:bg-slate-950 dark:text-white",
            duration: 3500,
          }}
        />
      </AppShell>
    </PortalConfigProvider>
  );
}

function PortalRoutes() {
  const { error, getPortalPath, reloadPortalConfig, status } = usePortalConfig();

  if (status === "loading") {
    return (
      <section className="mx-auto w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Loading Portal
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          Preparing your hackathon portal
        </h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">Fetching the organizer configuration.</p>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="mx-auto w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-500">Invalid Link</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          We could not load this portal
        </h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          {error ?? "The portal link may be expired or incorrectly copied."}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={() => void reloadPortalConfig()} type="button" variant="secondary">
            Try Again
          </Button>
          <Button onClick={() => window.location.assign("/")} type="button">
            Go Home
          </Button>
        </div>
      </section>
    );
  }

  return (
    <Routes>
      <Route element={<HomePage />} path="/" />
      <Route element={<RegisterPage />} path="/register" />
      <Route
        element={
          <SuccessCard
            message="Your initial project idea has been recorded. Please use this portal again before the submission deadline to submit your GitHub repository and live demo."
            title="✅ Team Registered Successfully"
          />
        }
        path="/register/success"
      />
      <Route element={<SubmitPage />} path="/submit" />
      <Route
        element={
          <SuccessCard
            message="Your final hackathon submission has been received. Thank you for participating and good luck!"
            title="🎉 Project Submitted Successfully"
          />
        }
        path="/submit/success"
      />
      <Route element={<Navigate replace to={getPortalPath("/")} />} path="*" />
    </Routes>
  );
}
