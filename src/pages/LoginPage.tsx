import { useState } from "react";
import toast from "react-hot-toast";
import {
  AlertCircle,
  AlertTriangle,
  ClipboardList,
  FileSpreadsheet,
  Rocket,
  Shield,
  Upload,
} from "lucide-react";
import { Button } from "../components/Button";
import { PortalLogo } from "../components/PortalLogo";
import { useAuth } from "../hooks/useAuth";
import { appConfig } from "../constants/config";
import { getFriendlyError } from "../utils/errors";

const features = [
  {
    icon: ClipboardList,
    title: "Registrations",
    description: "Dynamic CSV table with team leads and members.",
  },
  {
    icon: Rocket,
    title: "Submissions",
    description: "GitHub, demo links, and cross-checks.",
  },
  {
    icon: AlertTriangle,
    title: "Mismatch alerts",
    description: "Duplicate emails, missing data, invalid URLs.",
  },
];

const steps = [
  { icon: Upload, label: "Export from Typeform" },
  { icon: FileSpreadsheet, label: "Upload CSV" },
  { icon: Shield, label: "Review & export" },
];

export function LoginPage() {
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const isConfigured = appConfig.firebase.apiKey.length > 0;

  async function handleSignIn() {
    if (!isConfigured) {
      toast.error("Admin portal is not configured. Check your environment variables.");
      return;
    }

    setIsLoading(true);
    try {
      await signIn();
      toast.success("Signed in successfully.");
    } catch (error) {
      toast.error(getFriendlyError(error, "Sign in failed."));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="grid h-full min-h-0 w-full items-center gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:gap-6">
      <div className="hidden min-h-0 flex-col justify-center rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 lg:flex lg:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Hackathon operations
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white xl:text-3xl">
          Manage registrations & submissions in one place
        </h1>
        <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-300">
          Collect data via Typeform, upload CSV exports, and get instant visibility into teams and data
          quality.
        </p>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {steps.map((step) => (
            <div
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900"
              key={step.label}
            >
              <step.icon className="text-slate-500 dark:text-slate-400" size={16} />
              <p className="mt-1.5 text-[11px] font-semibold leading-tight text-slate-700 dark:text-slate-200">
                {step.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-2.5">
          {features.map((feature) => (
            <div
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900"
              key={feature.title}
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-slate-950">
                <feature.icon size={15} />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-slate-950 dark:text-white">{feature.title}</h2>
                <p className="text-xs text-slate-600 dark:text-slate-300">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 items-center justify-center">
        <div className="w-full max-w-md rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
          <div className="flex items-center gap-3">
            <PortalLogo />
            <div>
              <p className="text-sm font-bold">{appConfig.appName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Admin access only</p>
            </div>
          </div>

          <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Sign in</h2>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
            Use your authorized Google account to access the dashboards.
          </p>

          {!isConfigured ? (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-left text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertCircle className="mt-0.5 shrink-0" size={16} />
              <span>
                Set Firebase config in <code className="font-mono text-xs">.env.local</code> and add your email to
                Firestore <code className="font-mono text-xs">config/admins</code>.
              </span>
            </div>
          ) : null}

          <div className="mt-6">
            <Button
              className="w-full"
              disabled={!isConfigured}
              isLoading={isLoading}
              onClick={() => void handleSignIn()}
              type="button"
            >
              Continue with Google
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
