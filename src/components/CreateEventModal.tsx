import { useState } from "react";
import toast from "react-hot-toast";
import { Calendar, Link2, Plus, X } from "lucide-react";
import { Button } from "./Button";
import { createEvent } from "../services/events";
import type { CreateEventInput, HackathonEvent } from "../types/event";
import { getFriendlyError } from "../utils/errors";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (event: HackathonEvent) => void;
  createdBy: string;
}

const emptyForm: CreateEventInput = {
  name: "",
  date: "",
  lumaEventLink: "",
  typeformRegistrationUrl: "",
  typeformSubmissionUrl: "",
};

export function CreateEventModal({ isOpen, onClose, onCreated, createdBy }: CreateEventModalProps) {
  const [form, setForm] = useState<CreateEventInput>(emptyForm);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    try {
      const created = await createEvent(form, createdBy);
      toast.success(`Event "${created.name}" created.`);
      setForm(emptyForm);
      onCreated(created);
      onClose();
    } catch (error) {
      toast.error(getFriendlyError(error, "Failed to create event."));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close dialog"
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />
      <form
        className="relative w-full max-w-lg rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <button
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
          onClick={onClose}
          type="button"
        >
          <X size={18} />
        </button>

        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">New event</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">Create hackathon event</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Registrations and submissions will be scoped to this event.
        </p>

        <div className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Event name
            <input
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none ring-slate-950 focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-white"
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Cursor Hackathon Mumbai 2026"
              required
              value={form.name}
            />
          </label>

          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={14} />
              Event date
            </span>
            <input
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none ring-slate-950 focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-white"
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              required
              type="date"
              value={form.date}
            />
          </label>

          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            <span className="inline-flex items-center gap-1.5">
              <Link2 size={14} />
              Luma event link
            </span>
            <input
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none ring-slate-950 focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-white"
              onChange={(e) => setForm((prev) => ({ ...prev, lumaEventLink: e.target.value }))}
              placeholder="https://lu.ma/your-event"
              required
              type="url"
              value={form.lumaEventLink}
            />
          </label>

          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Typeform registration link (optional)
            <input
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none ring-slate-950 focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-white"
              onChange={(e) => setForm((prev) => ({ ...prev, typeformRegistrationUrl: e.target.value }))}
              placeholder="https://form.typeform.com/to/..."
              type="url"
              value={form.typeformRegistrationUrl ?? ""}
            />
          </label>

          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Typeform submission link (optional)
            <input
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none ring-slate-950 focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-white"
              onChange={(e) => setForm((prev) => ({ ...prev, typeformSubmissionUrl: e.target.value }))}
              placeholder="https://form.typeform.com/to/..."
              type="url"
              value={form.typeformSubmissionUrl ?? ""}
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button onClick={onClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button isLoading={isLoading} type="submit">
            <Plus size={16} />
            Create event
          </Button>
        </div>
      </form>
    </div>
  );
}
