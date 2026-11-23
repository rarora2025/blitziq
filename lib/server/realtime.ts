import "server-only";
import { EventEmitter } from "node:events";

/**
 * Realtime is a "lobby changed" ping; clients refetch their own filtered view.
 * - Local: an in-process emitter feeds a server-sent events stream.
 * - Supabase: the server broadcasts on channel `lobby:<CODE>` via the Realtime REST API.
 * Pings carry no game data, so nothing private leaks over the channel.
 */
type G = typeof globalThis & { __blitzBus?: EventEmitter };
const g = globalThis as G;
export const bus = g.__blitzBus ?? (g.__blitzBus = new EventEmitter().setMaxListeners(0));

export async function notify(code: string, version: number) {
  bus.emit(`lobby:${code}`, version);
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  try {
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ topic: `lobby:${code}`, event: "changed", payload: { v: version } }] }),
      signal: AbortSignal.timeout(2500),
    });
  } catch (err) {
    console.warn("[blitz] realtime broadcast failed", err);
  }
}
