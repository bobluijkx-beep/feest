"use client";

import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "scanner-queue";
const STORE_NAME = "pending-scans";

interface QueuedScan {
  id: string;
  qrToken: string;
  device: string;
  queuedAt: number;
}

export interface TicketInfo {
  buyerName: string;
  ticketTypeName: string;
}

export type CheckinResult =
  | { status: "ok"; ticket: TicketInfo | null }
  | { status: "already_checked_in"; ticket: TicketInfo | null }
  | { status: "cancelled"; ticket?: null }
  | { status: "invalid"; ticket?: null }
  | { status: "queued" };

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

async function callCheckinApi(qrToken: string, device: string): Promise<Response> {
  return fetch("/api/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ qrToken, device }),
  });
}

/** Probeert een scan meteen te versturen; bij een netwerkfout of serverfout wordt de scan
 * lokaal gebufferd (IndexedDB) in plaats van verloren te gaan. Auth-fouten (401/403)
 * worden wél meteen als resultaat teruggegeven — die lost een offline-retry niet op. */
export async function submitScan(qrToken: string, device: string): Promise<CheckinResult> {
  try {
    const res = await callCheckinApi(qrToken, device);
    if (!res.ok && res.status >= 500) throw new Error(`Server gaf status ${res.status}`);
    return (await res.json()) as CheckinResult;
  } catch {
    await queueScan(qrToken, device);
    return { status: "queued" };
  }
}

async function queueScan(qrToken: string, device: string): Promise<void> {
  const db = await getDb();
  const entry: QueuedScan = { id: crypto.randomUUID(), qrToken, device, queuedAt: Date.now() };
  await db.add(STORE_NAME, entry);
}

export async function getQueueCount(): Promise<number> {
  const db = await getDb();
  return db.count(STORE_NAME);
}

/** Probeert alle gebufferde scans opnieuw te versturen, in volgorde van opslaan. Stopt
 * zodra er weer een netwerkfout optreedt (nog steeds offline) — de rest blijft gewacht in
 * de wachtrij voor de volgende poging. */
export async function flushQueue(onResult?: (qrToken: string, result: CheckinResult) => void): Promise<void> {
  const db = await getDb();
  const all = (await db.getAll(STORE_NAME)) as QueuedScan[];

  for (const entry of all.sort((a, b) => a.queuedAt - b.queuedAt)) {
    let res: Response;
    try {
      res = await callCheckinApi(entry.qrToken, entry.device);
    } catch {
      break; // nog steeds offline, stop deze ronde
    }
    if (!res.ok && res.status >= 500) break; // server tijdelijk niet bereikbaar, probeer later opnieuw

    const result = (await res.json()) as CheckinResult;
    await db.delete(STORE_NAME, entry.id);
    onResult?.(entry.qrToken, result);
  }
}
