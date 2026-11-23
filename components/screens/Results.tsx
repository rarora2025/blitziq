"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { LobbyView, Question, QuarterResult } from "@/lib/types";
import { useStored } from "@/lib/client";
import { Avatar, Button, Label, cx } from "../ui";
import { CheckIcon, LockIcon } from "../icons";
import { Leaderboard } from "./Leaderboard";
import { Shell, ease } from "./common";

const STEP_MS = 3600;

export function ResultsScreen({ view, onNext, nextLabel, busy }: { view: LobbyView; onNext?: () => void; nextLabel?: string; busy?: boolean }) {
  const { lobby } = view;
  const quarter = lobby.publishedThrough;
  const result = view.results.find((r) => r.quarter === quarter);
  const questions = useMemo(
    () => view.questions.filter((q) => q.quarter === quarter).sort((a, b) => a.position - b.position),
    [view.questions, quarter],
  );
  const [seen, setSeen] = useStored<boolean>(`blitz:${lobby.code}:seen:q${quarter}`, false);
  const [step, setStep] = useState(-1); // -1 intro, 0..n-1 questions, n standings
  const n = questions.length;

  useEffect(() => {
    if (seen) setStep(n);
  }, [seen, n]);

  const advance = useCallback(() => {
    setStep((s) => {
      const next = Math.min(n, s + 1);
      if (next === n) setSeen(true);
      return next;
    });
  }, [n, setSeen]);

  useEffect(() => {
    if (step >= n) return;
    const t = setTimeout(advance, step === -1 ? 1400 : STEP_MS);
    return () => clearTimeout(t);
  }, [step, n, advance]);

  if (!result) return null;
  const myTotal = view.me.playerId ? (result.totals[view.me.playerId] ?? null) : null;

  return (
    <Shell
      footer={
        step >= n ? (
          onNext ? (
            <Button block onClick={onNext} loading={busy}>
              {nextLabel}
            </Button>
          ) : undefined
        ) : (
          <div className="flex items-center justify-between h-14">
            <div className="flex gap-1.5">
              {questions.map((q, i) => (
                <span key={q.id} className={cx("h-1.5 rounded-full transition-all duration-300", i === step ? "w-6 bg-volt" : i < step ? "w-1.5 bg-fg/60" : "w-1.5 bg-raised-2")} />
              ))}
            </div>
            <button onClick={() => (setStep(n), setSeen(true))} className="text-[15px] font-semibold text-dim hover:text-fg h-11 px-2">
              Skip to standings
            </button>
          </div>
        )
      }
    >
      <AnimatePresence mode="wait">
        {step === -1 && (
          <motion.section
            key="intro"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.5, ease }}
            className="min-h-[60dvh] flex flex-col items-center justify-center text-center"
            onClick={advance}
          >
            <Label>Results</Label>
            <div className="mt-3 font-display font-bold text-[120px] leading-none tracking-tight">Q{quarter}</div>
            <p className="mt-2 text-dim text-[17px]">Let&apos;s see who called it.</p>
          </motion.section>
        )}

        {step >= 0 && step < n && (
          <motion.section
            key={questions[step].id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35, ease }}
            onClick={advance}
            className="pt-6 cursor-pointer select-none"
          >
            <Reveal q={questions[step]} result={result} view={view} index={step} total={n} />
          </motion.section>
        )}

        {step >= n && (
          <motion.section key="standings" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease }} className="pt-6">
            <div className="flex items-end justify-between">
              <div>
                <Label>{lobby.phase === "final" ? "Final standings" : `Standings after Q${quarter}`}</Label>
                <h1 className="mt-1.5 text-[34px] font-bold tracking-[-0.03em] leading-none">Leaderboard</h1>
              </div>
              {myTotal !== null && (
                <div className="text-right">
                  <div className="text-[12px] text-mute font-medium">Your Q{quarter}</div>
                  <div className={cx("font-display font-bold text-[28px] leading-none mt-1", myTotal > 0 ? "text-volt" : "text-mute")}>+{myTotal}</div>
                </div>
              )}
            </div>
            <div className="mt-6">
              <Leaderboard rows={view.leaderboard} meId={view.me.playerId} reveal={!seen || step === n} latestLabel={`Q${quarter}`} />
            </div>
            {!onNext && lobby.phase === "results" && (
              <p className="mt-8 text-center text-[15px] text-dim">
                {quarter < 4 ? `Waiting for host to start Q${quarter + 1}.` : "Waiting for the host to crown the winner."}
              </p>
            )}
            <button onClick={() => (setStep(-1), setSeen(false))} className="mt-4 mx-auto block text-[13px] text-mute hover:text-dim h-10">
              Replay Q{quarter} reveal
            </button>
          </motion.section>
        )}
      </AnimatePresence>
    </Shell>
  );
}

function Reveal({ q, result, view, index, total }: { q: Question; result: QuarterResult; view: LobbyView; index: number; total: number }) {
  const outcome = result.questions.find((o) => o.questionId === q.id)!;
  const meId = view.me.playerId;
  const mine = meId ? result.picks[meId]?.[q.id] : undefined;
  const names = new Map(view.players.map((p) => [p.id, p.nickname]));
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 900);
    return () => clearTimeout(t);
  }, []);

  const uniqueWinner =
    outcome.correctCount === 1
      ? Object.entries(result.picks).find(([, picks]) => picks[q.id]?.correct)?.[0]
      : undefined;

  return (
    <div>
      <div className="flex items-center gap-2">
        <Label className="text-volt/80">{q.category}</Label>
        <span className="text-mute text-[12px]">·</span>
        <span className="text-[12px] text-mute tnum font-medium">
          {index + 1}/{total}
        </span>
      </div>
      <h2 className="mt-3 text-[28px] leading-[1.12] font-semibold tracking-[-0.025em] text-balance">{q.prompt}</h2>

      <div className="mt-6 space-y-2.5">
        {q.options.map((o) => {
          const count = outcome.counts[o.id] ?? 0;
          const isCorrect = shown && outcome.correct === o.id;
          const isWrong = shown && !outcome.voided && outcome.correct !== o.id;
          const isMine = mine?.option === o.id;
          return (
            <motion.div
              key={o.id}
              animate={isCorrect ? { scale: [1, 1.03, 1] } : { scale: 1 }}
              transition={{ duration: 0.45, ease }}
              className={cx(
                "relative min-h-[60px] px-4 py-3 rounded-2xl border flex items-center gap-3 transition-all duration-500",
                isCorrect ? "bg-volt text-volt-ink border-volt" : "bg-raised border-line",
                isWrong && "opacity-40",
              )}
            >
              <span className="flex-1 min-w-0">
                <span className="block text-[17px] font-semibold tracking-tight leading-snug">{o.label}</span>
                {isMine && (
                  <span className={cx("mt-0.5 inline-flex items-center gap-1 text-[12px] font-semibold uppercase tracking-[0.1em]", isCorrect ? "text-volt-ink/70" : "text-dim")}>
                    Your pick {mine?.lock && <LockIcon size={11} strokeWidth={2.8} />}
                  </span>
                )}
              </span>
              <span className="text-[15px] font-semibold tnum shrink-0">
                {count} {count === 1 ? "pick" : "picks"}
              </span>
              {isCorrect && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 18 }} className="size-7 rounded-full bg-volt-ink text-volt flex items-center justify-center shrink-0">
                  <CheckIcon size={16} strokeWidth={3} />
                </motion.span>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6 min-h-[88px]">
        <AnimatePresence>
          {shown && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease, delay: 0.25 }}>
              {outcome.voided ? (
                <div className="rounded-2xl bg-panel border border-line p-4 text-dim text-[15px]">Voided. No points for anyone.</div>
              ) : uniqueWinner ? (
                <div className="rounded-2xl border border-volt/40 bg-volt/[0.07] p-4 flex items-center gap-3.5">
                  <Avatar name={names.get(uniqueWinner) ?? "?"} size={44} me={uniqueWinner === meId} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-volt">Only one called it</div>
                    <div className="text-[17px] font-semibold tracking-tight truncate">
                      {uniqueWinner === meId ? "You did." : names.get(uniqueWinner)}
                    </div>
                  </div>
                  <motion.span
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 12, delay: 0.5 }}
                    className="font-display font-bold text-[34px] text-volt leading-none"
                  >
                    +{result.picks[uniqueWinner][q.id].points}
                  </motion.span>
                </div>
              ) : (
                <div className="rounded-2xl bg-panel border border-line p-4 flex items-center justify-between gap-3">
                  <span className="text-[15px] text-dim">
                    {outcome.correctCount === 0 ? "Nobody got this one." : `${outcome.correctCount} of ${outcome.answered} got it.`}
                  </span>
                  {mine && (
                    <span className={cx("font-display font-bold text-[26px] leading-none", mine.points ? "text-volt" : "text-mute")}>
                      {mine.points ? `+${mine.points}` : "+0"}
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
