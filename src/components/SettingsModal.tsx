import { Copy, X } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { appConfig } from "../constants/config";
import { usePortalConfig } from "../hooks/usePortalConfig";
import { Button } from "./Button";
import { TextInput, TextareaInput } from "./FormField";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { adminLink, attendeeLink, portalConfig, savePortalConfig } = usePortalConfig();
  const [title, setTitle] = useState(appConfig.defaultHackathonName);
  const [tagline, setTagline] = useState(appConfig.defaultTagline);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const isUpdating = Boolean(portalConfig?.portalId);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setTitle(portalConfig?.title ?? appConfig.defaultHackathonName);
    setTagline(portalConfig?.tagline ?? appConfig.defaultTagline);
    setError(undefined);
  }, [isOpen, portalConfig]);

  if (!isOpen) {
    return null;
  }

  async function copyLink(label: string, link?: string) {
    if (!link) {
      return;
    }

    await navigator.clipboard.writeText(link);
    toast.success(`${label} copied.`);
  }

  async function handleSave() {
    if (!title.trim()) {
      setError("Hackathon title is required.");
      return;
    }

    if (!tagline.trim()) {
      setError("Tagline is required.");
      return;
    }

    try {
      setIsSaving(true);
      setError(undefined);
      await savePortalConfig({
        title: title.trim(),
        tagline: tagline.trim(),
      });
      toast.success(isUpdating ? "Portal settings updated." : "Portal configuration saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save portal settings.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      aria-labelledby="settings-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-end bg-slate-950/40 p-3 backdrop-blur-sm sm:place-items-center sm:p-6"
      role="dialog"
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Organizer Settings
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white" id="settings-title">
              {isUpdating ? "Update Portal" : "Configure Portal"}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {isUpdating
                ? "Update the hackathon title and tagline without changing the attendee link."
                : "Save a hackathon setup in Firebase and share a unique attendee link."}
            </p>
          </div>
          <button
            aria-label="Close settings"
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-950 dark:hover:bg-slate-900 dark:hover:text-white dark:focus:ring-white"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <TextInput
            label="Hackathon Title"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Cursor Buildathon 2026"
            value={title}
          />
          <TextareaInput
            currentLength={tagline.length}
            label="Tagline"
            maxLength={220}
            onChange={(event) => setTagline(event.target.value)}
            placeholder="Register your idea, build fast, and submit before judging starts."
            value={tagline}
          />

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-900/40">
            <h3 className="font-semibold text-slate-950 dark:text-white">How storage works</h3>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              Firebase stores one hackathon record for these settings. Team registrations and final
              submissions are stored under that hackathon in Firestore.
            </p>
            {isUpdating ? (
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Saving updates the existing portal. The attendee link stays the same.
              </p>
            ) : (
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Configure Firebase once in environment variables. Organizers only need to create and
                share their hackathon link from this form.
              </p>
            )}
          </div>

          {error ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          ) : null}

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <h3 className="text-sm font-semibold text-slate-950 dark:text-white">Share Links</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {isUpdating
                ? "Attendee and admin links remain available after saving."
                : "Save settings first, then copy the attendee link for teams."}
            </p>
            <div className="mt-4 grid gap-3">
              <ShareLink label="Attendee link" link={attendeeLink} onCopy={copyLink} />
              <ShareLink label="Admin edit link" link={adminLink} onCopy={copyLink} />
            </div>
            {isUpdating ? (
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Admin links include a secret token. Copy once and store it safely. The token is kept
                in this browser session only after the first visit.
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 dark:border-slate-800 sm:flex-row sm:justify-end">
          <Button onClick={onClose} type="button" variant="secondary">
            Close
          </Button>
          <Button isLoading={isSaving} onClick={handleSave} type="button">
            {isUpdating ? "Save Settings" : "Save and Generate Link"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ShareLink({
  label,
  link,
  onCopy,
}: {
  label: string;
  link?: string;
  onCopy: (label: string, link?: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <button
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
          disabled={!link}
          onClick={() => onCopy(label, link)}
          type="button"
        >
          <Copy aria-hidden="true" size={13} />
          Copy
        </button>
      </div>
      <p className="mt-2 break-all text-sm text-slate-700 dark:text-slate-200">
        {link ?? "Available after saving settings."}
      </p>
    </div>
  );
}
