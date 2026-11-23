"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { api, ApiError } from "@/lib/client";
import { Button, Matchup, Wordmark, cx } from "./ui";
import { ChevronLeft } from "./icons";

type Peek = { name: string; home: string; away: string; over: boolean; joined: boolean };
const ease = [0.16, 1, 0.3, 1] as const;

export function JoinFlow({ initialCode = "" }: { initialCode?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5));
  const [lobby, setLobby] = useState<Peek | null>(null);
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const nameRef = useRef<HTMLInputElement>(null);

  const fail = (msg: string) => {
    setError(msg);
    setShake((s) => s + 1);
  };

  const findLobby = async (c = code) => {
    if (c.length < 5) return fail("Lobby codes are 5 letters.");
    setBusy(true);
    setError(null);
    try {
      const info = await api<Peek>(`/api/lobbies/${c}?peek`);
      if (info.joined) return router.push(`/play/${c}`);
      if (info.over) return fail("That game has already finished.");
      setLobby(info);
      try {
        const saved = localStorage.getItem("blitz:nickname");
        if (saved) setNickname(saved);
      } catch {}
    } catch (e) {
      fail(e instanceof ApiError && e.status === 404 ? "No lobby with that code." : "Couldn't reach the lobby.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (initialCode && code.length === 5) void findLobby(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (lobby) setTimeout(() => nameRef.current?.focus(), 350);
  }, [lobby]);

  const join = async () => {
    const n = nickname.trim();
    if (!n) return fail("Pick a nickname.");
    setBusy(true);
    setError(null);
    try {
      await api(`/api/lobbies/${code}/join`, { method: "POST", json: { nickname: n } });
      try {
        localStorage.setItem("blitz:nickname", n);
      } catch {}
      router.push(`/play/${code}`);
    } catch (e) {
      fail(e instanceof ApiError ? e.message : "Couldn't join. Try again.");
      setBusy(false);
    }
  };

  return (
    <main className="field-light min-h-dvh flex flex-col safe-t safe-b px-6">
      <div className="flex-1 flex flex-col justify-center w-full max-w-sm mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="mb-12"
        >
          <Wordmark className="text-[76px]" />
        </motion.div>

        <AnimatePresence mode="wait" initial={false}>
          {!lobby ? (
            <motion.form
              key="code"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3, ease }}
              onSubmit={(e) => {
                e.preventDefault();
                void findLobby();
              }}
              className="space-y-3"
            >
              <motion.div key={shake} animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : {}} transition={{ duration: 0.35 }}>
                <CodeInput value={code} onChange={(v) => (setCode(v), setError(null))} autoFocus={!initialCode} />
              </motion.div>
              <Button type="submit" block loading={busy} disabled={code.length < 5}>
                Join Game
              </Button>
            </motion.form>
          ) : (
            <motion.form
              key="name"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.3, ease }}
              onSubmit={(e) => {
                e.preventDefault();
                void join();
              }}
              className="space-y-3"
            >
              <div className="rounded-2xl bg-panel border border-line p-4 mb-1">
                <div className="flex items-center justify-between">
                  <div className="text-[19px] font-semibold tracking-tight">{lobby.name}</div>
                  <button
                    type="button"
                    onClick={() => (setLobby(null), setError(null))}
                    className="text-sm text-mute hover:text-fg flex items-center gap-0.5 -mr-1"
                  >
                    <ChevronLeft size={16} />
                    {code}
                  </button>
                </div>
                <div className="mt-2.5">
                  <Matchup home={lobby.home} away={lobby.away} size="sm" />
                </div>
              </div>
              <motion.div key={shake} animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : {}} transition={{ duration: 0.35 }}>
                <input
                  ref={nameRef}
                  value={nickname}
                  onChange={(e) => (setNickname(e.target.value.slice(0, 18)), setError(null))}
                  placeholder="Your nickname"
                  autoComplete="nickname"
                  autoCapitalize="words"
                  enterKeyHint="go"
                  className="w-full h-16 rounded-2xl bg-raised border border-line px-5 text-[22px] font-semibold tracking-tight placeholder:text-mute placeholder:font-medium outline-none focus:border-volt/60 transition-colors"
                />
              </motion.div>
              <Button type="submit" block loading={busy} disabled={!nickname.trim()}>
                Let&apos;s go
              </Button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="h-7 mt-3">
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-[15px] text-miss text-center"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="w-full max-w-sm mx-auto text-center pb-2"
      >
        <Link href="/create" className="inline-flex h-11 items-center text-[15px] text-dim hover:text-fg transition-colors">
          Hosting? <span className="ml-1.5 font-semibold text-fg underline decoration-volt decoration-2 underline-offset-4">Create a lobby</span>
        </Link>
      </motion.div>
    </main>
  );
}

function CodeInput({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative" onClick={() => ref.current?.focus()}>
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus={autoFocus}
        autoCapitalize="characters"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="go"
        aria-label="Enter lobby code"
        className="absolute inset-0 opacity-0 w-full h-full cursor-text"
        maxLength={5}
      />
      <div
        className={cx(
          "h-20 rounded-2xl bg-raised border flex items-center justify-center gap-2 transition-colors",
          focused ? "border-volt/50" : "border-line",
        )}
      >
        {value.length === 0 && !focused ? (
          <span className="text-[22px] text-mute font-medium tracking-tight">Enter lobby code</span>
        ) : (
          Array.from({ length: 5 }).map((_, i) => {
            const ch = value[i];
            const active = focused && i === Math.min(value.length, 4) && value.length < 5;
            return (
              <span
                key={i}
                className={cx(
                  "relative w-11 h-14 flex items-center justify-center rounded-xl font-display font-bold text-[34px] tracking-wide",
                  ch ? "text-fg" : "text-transparent",
                  ch ? "bg-raised-2" : "bg-ink/40",
                )}
              >
                <AnimatePresence>
                  {ch && (
                    <motion.span
                      initial={{ y: 8, opacity: 0, scale: 0.8 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {ch}
                    </motion.span>
                  )}
                </AnimatePresence>
                {active && <span className="absolute bottom-2.5 h-0.5 w-5 rounded bg-volt pulse-dot" />}
              </span>
            );
          })
        )}
      </div>
    </div>
  );
}
