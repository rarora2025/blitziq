"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { api, ApiError } from "@/lib/client";
import { TEAMS } from "@/lib/teams";
import { Button, Field, TeamChip, Wordmark, cx, inputCls } from "./ui";
import { ChevronLeft } from "./icons";

const ease = [0.16, 1, 0.3, 1] as const;

function nextSunday() {
  const d = new Date();
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function TeamSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <TeamChip name={value} size="sm" />
      </span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cx(inputCls, "appearance-none pl-14 pr-9 font-semibold cursor-pointer")}
      >
        {TEAMS.map((t) => (
          <option key={t.name} value={t.name}>
            {t.city} {t.name}
          </option>
        ))}
      </select>
      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-mute">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>
    </div>
  );
}

export function CreateLobby() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [hostName, setHostName] = useState("");
  const [away, setAway] = useState("Patriots");
  const [home, setHome] = useState("Bills");
  const [gameDate, setGameDate] = useState(nextSunday());
  const [hostPlays, setHostPlays] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostName.trim()) return setError("Add your name so friends know who's hosting.");
    if (home === away) return setError("Pick two different teams.");
    setBusy(true);
    setError(null);
    try {
      const { code } = await api<{ code: string }>("/api/lobbies", {
        method: "POST",
        json: { name: name.trim() || "Game Day", hostName, home, away, gameDate, hostPlays },
      });
      try {
        localStorage.setItem("blitz:nickname", hostName.trim());
      } catch {}
      router.push(`/play/${code}/host`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create the lobby.");
      setBusy(false);
    }
  };

  return (
    <main className="field-light min-h-dvh safe-t safe-b px-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between h-12">
          <Link href="/" className="-ml-2 h-10 w-10 flex items-center justify-center rounded-full text-dim hover:text-fg">
            <ChevronLeft />
          </Link>
          <Wordmark className="text-2xl" />
          <span className="w-10" />
        </div>

        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease }}
          className="pt-8 pb-6"
        >
          <h1 className="text-[34px] font-bold tracking-[-0.03em] leading-tight">Host a game</h1>
          <p className="mt-2 text-dim text-[17px]">Pick the matchup. You run the quarters.</p>

          <div className="mt-8 rounded-3xl bg-panel border border-line p-5">
            <div className="flex items-center justify-center gap-4 py-3">
              <div className="flex flex-col items-center gap-2 w-24">
                <TeamChip name={away} size="lg" />
                <span className="text-sm text-dim font-medium truncate max-w-full">{away}</span>
              </div>
              <span className="font-display text-xl font-bold text-mute">AT</span>
              <div className="flex flex-col items-center gap-2 w-24">
                <TeamChip name={home} size="lg" />
                <span className="text-sm text-dim font-medium truncate max-w-full">{home}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <TeamSelect label="Away team" value={away} onChange={setAway} />
              <TeamSelect label="Home team" value={home} onChange={setHome} />
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <Field label="Lobby name">
              <input
                className={inputCls}
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 32))}
                placeholder="Sunday Boys"
              />
            </Field>
            <Field label="Your name">
              <input
                className={inputCls}
                value={hostName}
                onChange={(e) => setHostName(e.target.value.slice(0, 18))}
                placeholder="Rahul"
                autoComplete="nickname"
              />
            </Field>
            <Field label="Game day">
              <input type="date" className={cx(inputCls, "tnum")} value={gameDate} onChange={(e) => setGameDate(e.target.value)} />
            </Field>

            <button
              type="button"
              onClick={() => setHostPlays((v) => !v)}
              className="w-full flex items-center justify-between gap-4 rounded-xl bg-raised border border-line px-4 py-3.5 text-left"
              role="switch"
              aria-checked={hostPlays}
            >
              <span>
                <span className="block text-[16px] font-medium">I&apos;m playing too</span>
                <span className="block text-[13px] text-mute mt-0.5">Make your own picks alongside your friends.</span>
              </span>
              <span className={cx("relative h-7 w-12 shrink-0 rounded-full transition-colors", hostPlays ? "bg-volt" : "bg-raised-2")}>
                <motion.span
                  layout
                  transition={{ type: "spring", stiffness: 600, damping: 35 }}
                  className={cx("absolute top-1 size-5 rounded-full", hostPlays ? "right-1 bg-volt-ink" : "left-1 bg-dim")}
                />
              </span>
            </button>
          </div>

          <p className={cx("h-6 mt-4 text-[15px] text-miss", !error && "invisible")}>{error}</p>
          <Button type="submit" block loading={busy} className="mt-2">
            Create Lobby
          </Button>
          <p className="mt-4 text-center text-[13px] text-mute">
            Five questions per quarter are ready to go. Swap any of them before you open picks.
          </p>
        </motion.form>
      </div>
    </main>
  );
}
