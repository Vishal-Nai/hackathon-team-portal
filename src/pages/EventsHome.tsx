import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, ExternalLink, Plus } from "lucide-react";
import { Button } from "../components/Button";
import { CreateEventModal } from "../components/CreateEventModal";
import { LoadingSkeleton } from "../components/ConfirmDialog";
import { useAuth } from "../hooks/useAuth";
import { formatEventDate, listEvents } from "../services/events";
import type { HackathonEvent } from "../types/event";
import { getFriendlyError } from "../utils/errors";

export function EventsHome() {
  const { user } = useAuth();
  const [events, setEvents] = useState<HackathonEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function loadEventList() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await listEvents();
      setEvents(data);
    } catch (error) {
      setLoadError(getFriendlyError(error, "Failed to load events."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadEventList();
  }, []);

  return (
    <section className="w-full space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Events
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Your hackathons</h1>
          <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
            Create an event, then manage its registrations and submissions separately.
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} type="button">
          <Plus size={16} />
          Create event
        </Button>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={3} />
      ) : loadError ? (
        <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          {loadError}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-950">
          <Calendar className="mx-auto text-slate-400" size={32} />
          <h2 className="mt-4 text-xl font-semibold text-slate-950 dark:text-white">No events yet</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Create your first hackathon event to start uploading registration and submission CSVs.
          </p>
          <div className="mt-6">
            <Button onClick={() => setShowCreateModal(true)} type="button">
              <Plus size={16} />
              Create event
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event) => (
            <EventCard event={event} key={event.id} />
          ))}
        </div>
      )}

      {user?.email ? (
        <CreateEventModal
          createdBy={user.email}
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={(event) => setEvents((prev) => [event, ...prev])}
        />
      ) : null}
    </section>
  );
}

function EventCard({ event }: { event: HackathonEvent }) {
  return (
    <Link
      className="group flex h-full flex-col rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
      to={`/events/${event.id}`}
    >
      <div className="flex-1">
        <h2 className="text-xl font-bold leading-snug text-slate-950 dark:text-white">{event.name}</h2>

        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <Calendar size={14} />
          {formatEventDate(event.date)}
        </div>

        <a
          className="mt-4 flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          href={event.lumaEventLink}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          rel="noreferrer"
          target="_blank"
        >
          <ExternalLink className="shrink-0" size={14} />
          <span className="truncate" title={event.lumaEventLink}>
            Luma event page
          </span>
        </a>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
        <span className="text-sm font-semibold text-slate-950 group-hover:underline dark:text-white">
          Open event
        </span>
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-slate-900 text-white transition group-hover:translate-x-0.5 dark:bg-white dark:text-slate-900">
          <ArrowRight size={16} />
        </span>
      </div>
    </Link>
  );
}
