"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import type { LobbyView } from "@/lib/types";
import { Avatar, Label } from "../ui";
import { Leaderboard } from "./Leaderboard";
import { Shell, ease } from "./common";

export function FinalScreen({ view }: { view: LobbyView }) {
  const rows = view.leaderboard;
  const winners = rows.filter((r) => r.rank === 1 && r.total > 0);
  const meWon = winners.some((w) => w.playerId === view.me.playerId);

  useEffect(() => {
    if (!winners.length) return;
    let cancelled = false;
    import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) return;
      const colors = ["#d4ff3f", "#f4f4f2", "#a3a3a8"];
      const fire = (x: number, angle: number) =>
        confetti({ particleCount: 70, spread: 60, startVelocity: 48, angle, origin: { x, y: 0.75 }, colors, scalar: 0.9, ticks: 220, disableForReducedMotion: true });
      setTimeout(() => (fire(0.1, 60), fire(0.9, 120)), 450);
      setTimeout(() => fire(0.5, 90), 900);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winners.map((w) => w.playerId).join()]);

  return (
    <Shell>
      <section className="pt-10 pb-2 flex flex-col items-center text-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <Label>Final · {view.lobby.away} at {view.lobby.home}</Label>
        </motion.div>

        {winners.length ? (
          <>
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.25 }}
              className="mt-8 flex -space-x-4"
            >
              {winners.slice(0, 3).map((w) => (
                <span key={w.playerId} className="rounded-full ring-4 ring-ink shadow-[0_0_80px_-10px_rgb(212_255_63/0.55)]">
                  <Avatar name={w.nickname} size={winners.length > 1 ? 84 : 104} me={w.playerId === view.me.playerId} />
                </span>
              ))}
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease, delay: 0.45 }}
              className="mt-7 text-[44px] font-bold tracking-[-0.04em] leading-[1.02] text-balance"
            >
              {meWon && winners.length === 1 ? "You win." : winners.length > 1 ? `${winners.map((w) => w.nickname).join(" & ")} tie for the win.` : `${winners[0].nickname} wins.`}
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75, duration: 0.5 }} className="mt-3 text-[17px] text-dim">
              <span className="font-display font-bold text-[24px] text-volt align-[-2px] tnum">{winners[0].total}</span> points across four quarters
            </motion.p>
          </>
        ) : (
          <h1 className="mt-8 text-[40px] font-bold tracking-[-0.035em] leading-tight">That&apos;s the game.</h1>
        )}
      </section>

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.5, ease }} className="mt-10">
        <Label className="mb-3">Full standings</Label>
        <Leaderboard rows={rows} meId={view.me.playerId} latestLabel="Q4" />
      </motion.section>

      <div className="mt-10 flex flex-col items-center gap-1">
        <Link href="/create" className="h-11 inline-flex items-center text-[15px] font-semibold text-fg underline decoration-volt decoration-2 underline-offset-4">
          Host another game
        </Link>
      </div>
    </Shell>
  );
}
