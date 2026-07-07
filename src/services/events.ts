import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
} from "firebase/firestore";
import type { CreateEventInput, HackathonEvent } from "../types/event";
import { getFirebaseDb } from "./firebase";

function timestampToIso(value: Timestamp | string | undefined): string {
  if (!value) {
    return new Date().toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return value.toDate().toISOString();
}

function mapEventDoc(id: string, data: Record<string, unknown>): HackathonEvent {
  return {
    id,
    name: (data.name as string) ?? "Untitled event",
    date: (data.date as string) ?? "",
    lumaEventLink: (data.lumaEventLink as string) ?? "",
    typeformRegistrationUrl: (data.typeformRegistrationUrl as string) ?? "",
    typeformSubmissionUrl: (data.typeformSubmissionUrl as string) ?? "",
    createdAt: timestampToIso(data.createdAt as Timestamp | string | undefined),
    createdBy: (data.createdBy as string) ?? "",
  };
}

function normalizeOptionalUrl(value: string | undefined): string {
  return value?.trim() ?? "";
}

function validateEventInput(input: CreateEventInput) {
  const name = input.name.trim();
  const lumaEventLink = input.lumaEventLink.trim();
  const typeformRegistrationUrl = normalizeOptionalUrl(input.typeformRegistrationUrl);
  const typeformSubmissionUrl = normalizeOptionalUrl(input.typeformSubmissionUrl);

  if (!name) {
    throw new Error("Event name is required.");
  }
  if (!input.date) {
    throw new Error("Event date is required.");
  }
  if (!lumaEventLink) {
    throw new Error("Luma event link is required.");
  }
  if (!/^https?:\/\/.+/i.test(lumaEventLink)) {
    throw new Error("Enter a valid HTTPS Luma event link.");
  }

  for (const [label, url] of [
    ["Typeform registration link", typeformRegistrationUrl],
    ["Typeform submission link", typeformSubmissionUrl],
  ] as const) {
    if (url && !/^https?:\/\/.+/i.test(url)) {
      throw new Error(`Enter a valid HTTPS ${label}.`);
    }
  }

  return { name, date: input.date, lumaEventLink, typeformRegistrationUrl, typeformSubmissionUrl };
}

export async function listEvents(): Promise<HackathonEvent[]> {
  const snapshot = await getDocs(query(collection(getFirebaseDb(), "events"), orderBy("date", "desc")));
  return snapshot.docs.map((eventDoc) => mapEventDoc(eventDoc.id, eventDoc.data()));
}

export async function getEvent(eventId: string): Promise<HackathonEvent | null> {
  const snapshot = await getDoc(doc(getFirebaseDb(), "events", eventId));
  if (!snapshot.exists()) {
    return null;
  }
  return mapEventDoc(snapshot.id, snapshot.data());
}

export async function createEvent(input: CreateEventInput, createdBy: string): Promise<HackathonEvent> {
  const { name, date, lumaEventLink, typeformRegistrationUrl, typeformSubmissionUrl } = validateEventInput(input);
  const eventId = crypto.randomUUID();
  const eventRef = doc(getFirebaseDb(), "events", eventId);

  await setDoc(eventRef, {
    name,
    date,
    lumaEventLink,
    typeformRegistrationUrl,
    typeformSubmissionUrl,
    createdAt: serverTimestamp(),
    createdBy,
  });

  return {
    id: eventId,
    name,
    date,
    lumaEventLink,
    typeformRegistrationUrl,
    typeformSubmissionUrl,
    createdAt: new Date().toISOString(),
    createdBy,
  };
}

export async function updateEvent(eventId: string, input: CreateEventInput): Promise<HackathonEvent> {
  const { name, date, lumaEventLink, typeformRegistrationUrl, typeformSubmissionUrl } = validateEventInput(input);
  const eventRef = doc(getFirebaseDb(), "events", eventId);
  const existing = await getDoc(eventRef);

  if (!existing.exists()) {
    throw new Error("Event not found.");
  }

  await updateDoc(eventRef, {
    name,
    date,
    lumaEventLink,
    typeformRegistrationUrl,
    typeformSubmissionUrl,
  });

  const data = existing.data();
  return {
    id: eventId,
    name,
    date,
    lumaEventLink,
    typeformRegistrationUrl,
    typeformSubmissionUrl,
    createdAt: timestampToIso(data.createdAt as Timestamp | string | undefined),
    createdBy: (data.createdBy as string) ?? "",
  };
}

export function formatEventDate(date: string): string {
  if (!date) {
    return "Date TBD";
  }

  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatUploadTime(iso: string | null): string {
  if (!iso) {
    return "Never";
  }
  return new Date(iso).toLocaleString();
}
