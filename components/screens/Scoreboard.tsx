"use client";

import { motion, AnimatePresence } from "motion/react";
import type { LobbyInfo } from "@/lib/types";
import { team } from "@/lib/teams";
import { Pic, Wordmark } from "../ui";

function TeamMark({ name, logo }: { name: string; logo: string | null }) {
  const t = team(name);
  return (
    <div className="flex flex-col items-center gap-2 w-20">
      {logo ? (
        <Pic src={logo} size={56} rounded="xl" />
      ) : (
      <span
        className="size-14 rounded-2xl flex items-center justify-center font-display font-extrabold text-[20px] tracking-wide text-white"
        style={{ background: t.color, boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 0.14), 0 10px 30px -12px " + t.color }}
      >
        {t.abbr}
      </span>
      )}
      <span className="text-[14px] font-semibold text-dim truncate max-w-full">{t.name}</span>
    </div>
  );
}

function Score({ value }: { value: number }) {
  return (
    <span className="relative inline-flex justify-center min-w-[1.4ch] overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: "70%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-70%", opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="tnum"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Broadcast-style score bug: AWAY score – score HOME, with quarter status. */
export function Scoreboard({ lobby }: { lobby: LobbyInfo }) {
  const live = lobby.phase === "live";
  return (
    <div className="rounded-3xl bg-panel border border-line px-4 pt-5 pb-4">
      <div className="flex items-center justify-between">
        <TeamMark name={lobby.away} logo={lobby.awayLogo} />
        <div className="font-display font-bold text-[52px] leading-none tracking-tight flex items-center gap-3">
          <Score value={lobby.awayScore} />
          <span className="text-mute text-[40px]">–</span>
          <Score value={lobby.homeScore} />
        </div>
        <TeamMark name={lobby.home} logo={lobby.homeLogo} />
      </div>
      <div className="mt-4 flex items-center justify-center gap-2.5">
        {live ? (
          <span className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-3 rounded-full bg-[#e5372b] text-white text-[12px] font-bold tracking-[0.12em]">
            <svg width="9" height="9" viewBox="0 0 10 10" className="pulse-dot">
              <path d="M2 1l7 4-7 4z" fill="currentColor" />
            </svg>
            LIVE
          </span>
        ) : (
          <span className="inline-flex items-center h-7 px-3 rounded-full bg-raised-2 text-dim text-[12px] font-bold tracking-[0.12em]">END</span>
        )}
        <span className="font-display font-bold text-[18px] tracking-wide">Q{lobby.quarter}</span>
      </div>
    </div>
  );
}

/** Illustrated field: turf stripes, yard lines and team-colored end zones. */
export function Field({ lobby }: { lobby: LobbyInfo }) {
  const away = team(lobby.away);
  const home = team(lobby.home);
  const W = 400;
  const H = 210;
  const ez = 34;
  const play = W - ez * 2;
  const lines = Array.from({ length: 11 }, (_, i) => ez + (play / 10) * i);
  const nums = [10, 20, 30, 40, 50, 40, 30, 20, 10];
  return (
    <div className="relative rounded-3xl overflow-hidden border border-line">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full h-auto" role="img" aria-label={`${lobby.away} at ${lobby.home}`}>
        <defs>
          <linearGradient id="turf-shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0.45" />
            <stop offset="0.35" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        {Array.from({ length: 10 }, (_, i) => (
          <rect key={i} x={ez + (play / 10) * i} y="0" width={play / 10} height={H} fill={i % 2 ? "#1f5a2c" : "#236331"} />
        ))}
        <rect x="0" y="0" width={ez} height={H} fill={away.color} />
        <rect x={W - ez} y="0" width={ez} height={H} fill={home.color} />
        <text x={ez / 2} y={H / 2} fill="#fff" fillOpacity="0.9" fontSize="17" fontWeight="800" textAnchor="middle" dominantBaseline="middle" transform={`rotate(-90 ${ez / 2} ${H / 2})`} style={{ fontFamily: "var(--font-barlow)", letterSpacing: "0.2em" }}>
          {away.abbr}
        </text>
        <text x={W - ez / 2} y={H / 2} fill="#fff" fillOpacity="0.9" fontSize="17" fontWeight="800" textAnchor="middle" dominantBaseline="middle" transform={`rotate(90 ${W - ez / 2} ${H / 2})`} style={{ fontFamily: "var(--font-barlow)", letterSpacing: "0.2em" }}>
          {home.abbr}
        </text>
        {lines.map((x, i) => (
          <line key={i} x1={x} y1="0" x2={x} y2={H} stroke="#fff" strokeOpacity={i === 0 || i === 10 ? 0.85 : 0.55} strokeWidth={i === 0 || i === 10 ? 2 : 1.2} />
        ))}
        {Array.from({ length: 50 }, (_, i) => {
          const x = ez + (play / 50) * i;
          return i % 5 === 0 ? null : (
            <g key={i} stroke="#fff" strokeOpacity="0.4" strokeWidth="1">
              <line x1={x} y1="6" x2={x} y2="12" />
              <line x1={x} y1={H * 0.38} x2={x} y2={H * 0.38 + 5} />
              <line x1={x} y1={H * 0.62 - 5} x2={x} y2={H * 0.62} />
              <line x1={x} y1={H - 12} x2={x} y2={H - 6} />
            </g>
          );
        })}
        {nums.map((n, i) => (
          <g key={i} fill="#fff" fillOpacity="0.55" fontSize="15" fontWeight="700" textAnchor="middle" style={{ fontFamily: "var(--font-barlow)" }}>
            <text x={lines[i + 1]} y={H - 24}>{n}</text>
            <text x={lines[i + 1]} y={32} transform={`rotate(180 ${lines[i + 1]} 27)`}>{n}</text>
          </g>
        ))}
        <rect x="0" y="0" width={W} height={H} fill="url(#turf-shade)" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <Wordmark className="text-[44px] text-white/90 drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]" />
      </div>
    </div>
  );
}

export function Bars() {
  return (
    <span className="inline-flex items-end gap-[3px] h-4" aria-hidden>
      {[0.5, 0.8, 1].map((h, i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full bg-volt"
          animate={{ height: [`${h * 40}%`, `${h * 100}%`, `${h * 55}%`, `${h * 100}%`] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}
