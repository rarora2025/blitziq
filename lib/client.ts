"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Action, LobbyView } from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: init?.json !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? "Something went wrong.");
  return data as T;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Subscribe to "lobby changed" pings. Supabase Realtime when configured, else server-sent events. */
function subscribe(code: string, onPing: () => void): () => void {
  if (SUPABASE_URL && SUPABASE_KEY) {
    let stop = () => {};
    let cancelled = false;
    import("@supabase/supabase-js").then(({ createClient }) => {
      if (cancelled) return;
      const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
      const ch = sb
        .channel(`lobby:${code}`)
        .on("broadcast", { event: "changed" }, onPing)
        .subscribe((status) => {
          if (status === "SUBSCRIBED") onPing();
        });
      stop = () => {
        sb.removeChannel(ch);
      };
    });
    return () => {
      cancelled = true;
      stop();
    };
  }
  const es = new EventSource(`/api/lobbies/${code}/stream`);
  es.onmessage = onPing;
  es.onopen = onPing; // catch up after a reconnect
  return () => es.close();
}

export function useLobby(code: string) {
  const [view, setView] = useState<LobbyView | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const versionRef = useRef(0);
  const inflight = useRef<Promise<void> | null>(null);
  const again = useRef(false);

  const accept = useCallback((v: LobbyView) => {
    if (v.lobby.version >= versionRef.current) {
      versionRef.current = v.lobby.version;
      setView(v);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (inflight.current) {
      again.current = true;
      return inflight.current;
    }
    inflight.current = (async () => {
      try {
        accept(await api<LobbyView>(`/api/lobbies/${code}`));
        setError(null);
      } catch (e) {
        if (e instanceof ApiError) setError(e);
      } finally {
        inflight.current = null;
        if (again.current) {
          again.current = false;
          void refresh();
        }
      }
    })();
    return inflight.current;
  }, [code, accept]);

  useEffect(() => {
    void refresh();
    const unsub = subscribe(code, () => void refresh());
    const onVis = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onVis);
    // Safety net in case a realtime ping is missed.
    const poll = setInterval(() => document.visibilityState === "visible" && void refresh(), 15000);
    return () => {
      unsub();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onVis);
      clearInterval(poll);
    };
  }, [code, refresh]);

  const act = useCallback(
    async (action: Action) => {
      const v = await api<LobbyView>(`/api/lobbies/${code}/action`, { method: "POST", json: action });
      accept(v);
      return v;
    },
    [code, accept],
  );

  return { view, error, refresh, act };
}

export function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const loaded = useRef<string | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      setValue(raw ? (JSON.parse(raw) as T) : initial);
    } catch {
      setValue(initial);
    }
    loaded.current = key;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    [key],
  );
  return [value, set] as const;
}
