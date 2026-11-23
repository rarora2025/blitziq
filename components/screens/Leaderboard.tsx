"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import type { LeaderRow } from "@/lib/types";
import { Avatar, cx } from "../ui";
import { TriangleDown, TriangleUp } from "../icons";
import { CountUp } from "./common";

/**
 * Kahoot-clear standings. With `reveal`, rows start in the previous order with previous
 * totals, then slide into the new order while the points count up.
 */
export function Leaderboard({
  rows,
  meId,
  reveal,
  latestLabel,
}: {
  rows: LeaderRow[];
  meId: string | null;
  reveal?: boolean;
  latestLabel?: string;
}) {
  const [settled, setSettled] = useState(!reveal);
  useEffect(() => {
    if (!reveal) return;
    setSettled(false);
    const t = setTimeout(() => setSettled(true), 700);
    return () => clearTimeout(t);
  }, [reveal, rows]);

  const ordered = useMemo(() => {
    if (settled) return rows;
    return [...rows].sort((a, b) => b.total - b.latest - (a.total - a.latest) || a.rank - b.rank);
  }, [rows, settled]);

  if (rows.length === 0) return <p className="py-10 text-center text-dim">No players yet.</p>;

  return (
    <ol className="space-y-2">
      {ordered.map((r, i) => {
        const top = settled && r.rank <= 3;
        const first = settled && r.rank === 1;
        const me = r.playerId === meId;
        return (
          <motion.li
            key={r.playerId}
            layout
            initial={reveal ? { opacity: 0, y: 14 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              layout: { type: "spring", stiffness: 260, damping: 30 },
              opacity: { delay: reveal ? i * 0.04 : 0, duration: 0.3 },
              y: { delay: reveal ? i * 0.04 : 0, duration: 0.3 },
            }}
            className={cx(
              "relative flex items-center gap-3.5 rounded-2xl px-4 border transition-colors duration-500",
              top ? "h-[76px]" : "h-16",
              first ? "bg-volt/[0.08] border-volt/40" : me ? "bg-raised-2 border-line-strong" : "bg-panel border-line",
            )}
          >
            <span
              className={cx(
                "w-8 shrink-0 text-center font-display font-bold tnum leading-none transition-colors duration-500",
                top ? "text-[30px]" : "text-[22px]",
                first ? "text-volt" : top ? "text-fg" : "text-mute",
              )}
            >
              {settled ? r.rank : r.rank + r.movement}
            </span>
            <Avatar name={r.nickname} size={top ? 44 : 36} me={me} />
            <div className="flex-1 min-w-0">
              <div className={cx("font-semibold tracking-tight truncate", top ? "text-[18px]" : "text-[16px]")}>
                {r.nickname}
                {me && <span className="ml-1.5 text-[13px] text-mute font-medium">you</span>}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[13px] leading-none">
                <span className={cx("tnum font-semibold", r.latest > 0 ? "text-volt" : "text-mute")}>
                  +{r.latest}
                  {latestLabel && <span className="font-medium text-mute"> {latestLabel}</span>}
                </span>
                {settled && r.movement !== 0 && (
                  <motion.span
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className={cx("inline-flex items-center gap-0.5 tnum font-semibold", r.movement > 0 ? "text-fg" : "text-mute")}
                  >
                    {r.movement > 0 ? <TriangleUp size={10} /> : <TriangleDown size={10} />}
                    {Math.abs(r.movement)}
                  </motion.span>
                )}
              </div>
            </div>
            <span className={cx("font-display font-bold tracking-tight leading-none", top ? "text-[34px]" : "text-[26px]")}>
              {reveal ? <CountUp value={settled ? r.total : r.total - r.latest} from={r.total - r.latest} duration={1000} /> : <span className="tnum">{r.total}</span>}
            </span>
          </motion.li>
        );
      })}
    </ol>
  );
}
