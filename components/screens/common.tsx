"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import type { LobbyInfo, PlayerSummary } from "@/lib/types";
import { Avatar, Matchup, QuarterTag, cx } from "../ui";
import { GridIcon } from "../icons";

export const ease = [0.16, 1, 0.3, 1] as const;

export function GameHeader({
  lobby,
  hostLink,
  right,
}: {
  lobby: LobbyInfo;
  hostLink?: boolean;
  right?: ReactNode;
}) {
  const live = lobby.phase === "live";
  return (
    <header className="sticky top-0 z-20 bg-ink/85 backdrop-blur-md safe-t">
      <div className="max-w-md mx-auto px-5 h-14 flex items-center justify-between gap-3">
        <div className="min-w-0 flex items-center gap-3">
          {lobby.phase !== "final" && <QuarterTag quarter={lobby.quarter} live={live} />}
          <div className="min-w-0">
            <div className="text-[15px] font-semibold tracking-tight truncate leading-tight">{lobby.name}</div>
            <div className="text-[12px] text-mute truncate leading-tight mt-0.5">
              {lobby.away} at {lobby.home}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {right}
          {hostLink && (
            <Link
              href={`/play/${lobby.code}/host`}
              className="h-9 pl-2.5 pr-3 rounded-full bg-raised hover:bg-raised-2 flex items-center gap-1.5 text-[13px] font-semibold text-dim hover:text-fg transition-colors"
            >
              <GridIcon size={15} />
              Host
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function Shell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <>
      <div className={cx("max-w-md mx-auto px-5", footer ? "pb-36" : "pb-10")}>{children}</div>
      {footer && (
        <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-ink from-75% to-transparent pt-10">
          <div className="max-w-md mx-auto px-5 safe-b">{footer}</div>
        </div>
      )}
    </>
  );
}

export function PlayerGrid({ players, meId, highlight }: { players: PlayerSummary[]; meId: string | null; highlight?: "submitted" }) {
  return (
    <motion.ul layout className="grid grid-cols-3 sm:grid-cols-4 gap-x-2 gap-y-5">
      <AnimatePresence initial={false}>
        {players.map((p) => (
          <motion.li
            key={p.id}
            layout
            initial={{ opacity: 0, scale: 0.6, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className="flex flex-col items-center gap-2 min-w-0"
          >
            <span className="relative">
              <Avatar name={p.nickname} size={56} me={p.id === meId} dim={highlight === "submitted" && !p.submitted} />
              {highlight === "submitted" && p.submitted && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -bottom-0.5 -right-0.5 size-5 rounded-full bg-volt text-volt-ink flex items-center justify-center ring-[3px] ring-ink"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                </motion.span>
              )}
            </span>
            <span className={cx("text-[13px] font-medium truncate max-w-full", p.id === meId ? "text-fg" : "text-dim")}>
              {p.nickname}
              {p.isHost && <span className="text-mute font-normal"> · host</span>}
            </span>
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ul>
  );
}

export function AvatarStack({ names, max = 5, size = 24 }: { names: string[]; max?: number; size?: number }) {
  const shown = names.slice(0, max);
  return (
    <span className="inline-flex items-center">
      {shown.map((n, i) => (
        <span key={n + i} className="rounded-full ring-2 ring-panel" style={{ marginLeft: i ? -size * 0.3 : 0 }}>
          <Avatar name={n} size={size} />
        </span>
      ))}
      {names.length > max && <span className="ml-1.5 text-[12px] text-mute tnum">+{names.length - max}</span>}
    </span>
  );
}

export function CountUp({ value, from = 0, duration = 900, className }: { value: number; from?: number; duration?: number; className?: string }) {
  const [n, setN] = useState(from);
  const start = useRef<number | null>(null);
  useEffect(() => {
    let raf = 0;
    start.current = null;
    const base = from;
    const step = (t: number) => {
      if (start.current === null) start.current = t;
      const p = Math.min(1, (t - start.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(base + (value - base) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, from, duration]);
  return <span className={cx("tnum", className)}>{n}</span>;
}

export function MatchupCard({ lobby }: { lobby: LobbyInfo }) {
  const date = lobby.gameDate
    ? new Date(lobby.gameDate + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
    : null;
  return (
    <div className="rounded-2xl bg-panel border border-line px-4 py-3.5 flex items-center justify-between gap-3">
      <Matchup home={lobby.home} away={lobby.away} homeLogo={lobby.homeLogo} awayLogo={lobby.awayLogo} size="sm" />
      {date && <span className="text-[13px] text-mute shrink-0">{date}</span>}
    </div>
  );
}
