"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import type { Key, LobbyView, Question, QuarterResult } from "@/lib/types";
import { Pic, cx, optionImage } from "../ui";
import { CheckIcon, LockIcon, SlashIcon } from "../icons";

/**
 * One tap per question: tap the answer that happened. Tap it again to clear,
 * or void the question. Grades save instantly and can be corrected at any time.
 */
export function Grader({
  view,
  quarter,
  onGrade,
}: {
  view: LobbyView;
  quarter: number;
  onGrade: (questionId: string, correct: string | null, voided: boolean) => Promise<unknown>;
}) {
  const host = view.host!;
  const questions = host.allQuestions.filter((q) => q.quarter === quarter).sort((a, b) => a.position - b.position);
  const result: QuarterResult | null =
    view.results.find((r) => r.quarter === quarter) ?? (quarter === view.lobby.quarter ? host.preview : null);
  const [pending, setPending] = useState<Record<string, Key>>({});

  // Clear optimistic grades once the server confirms them.
  useEffect(() => {
    setPending((p) => {
      const next = { ...p };
      for (const [id, k] of Object.entries(p)) {
        const s = host.keys[id];
        if ((s?.correct ?? null) === k.correct && !!s?.voided === k.voided) delete next[id];
      }
      return next;
    });
  }, [host.keys]);

  const keyFor = (id: string): Key => pending[id] ?? host.keys[id] ?? { correct: null, voided: false };
  const grade = (q: Question, correct: string | null, voided: boolean) => {
    setPending((p) => ({ ...p, [q.id]: { correct, voided } }));
    onGrade(q.id, correct, voided).catch(() =>
      setPending((p) => {
        const n = { ...p };
        delete n[q.id];
        return n;
      }),
    );
  };

  return (
    <div className="space-y-3">
      {questions.map((q, i) => {
        const key = keyFor(q.id);
        const outcome = result?.questions.find((o) => o.questionId === q.id);
        const done = key.voided || !!key.correct;
        const subs = (quarter === view.lobby.quarter ? view.revealed : null) ?? [];
        return (
          <div key={q.id} className={cx("rounded-2xl border p-4 transition-colors", done ? "bg-panel border-line" : "bg-raised border-line-strong")}>
            <div className="flex items-start gap-3">
              <span
                className={cx(
                  "mt-0.5 size-6 shrink-0 rounded-full flex items-center justify-center font-display font-bold text-[14px] transition-colors",
                  done ? "bg-volt text-volt-ink" : "bg-raised-2 text-dim",
                )}
              >
                {done ? <CheckIcon size={13} strokeWidth={3.2} /> : i + 1}
              </span>
              <div className="flex-1 min-w-0 text-[16px] font-semibold tracking-tight leading-snug">{q.prompt}</div>
              <button
                onClick={() => grade(q, null, !key.voided)}
                className={cx(
                  "h-8 px-2.5 shrink-0 rounded-lg text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors",
                  key.voided ? "bg-miss/15 text-miss" : "text-mute hover:text-fg hover:bg-white/5",
                )}
              >
                <SlashIcon size={14} /> {key.voided ? "Voided" : "Void"}
              </button>
            </div>
            <div className={cx("mt-3 grid gap-2", q.options.length > 2 ? "grid-cols-2" : "grid-cols-2")}>
              {q.options.map((o) => {
                const sel = !key.voided && key.correct === o.id;
                const count = outcome?.counts[o.id] ?? subs.filter((s) => s.answers[q.id] === o.id).length;
                const locks = subs.filter((s) => s.answers[q.id] === o.id && s.lock === q.id).length;
                return (
                  <motion.button
                    key={o.id}
                    whileTap={{ scale: 0.97 }}
                    disabled={key.voided}
                    onClick={() => grade(q, sel ? null : o.id, false)}
                    className={cx(
                      "min-h-12 px-3.5 py-2.5 rounded-xl border text-left flex items-center gap-2 transition-colors",
                      sel ? "bg-volt border-volt text-volt-ink" : "bg-raised-2 border-transparent hover:border-line-strong",
                      key.voided && "opacity-40",
                    )}
                  >
                    {optionImage(o, view.lobby) && <Pic src={optionImage(o, view.lobby)!} size={26} />}
                    <span className="flex-1 min-w-0 text-[15px] font-semibold leading-tight">{o.label}</span>
                    <span className={cx("shrink-0 text-[13px] tnum font-semibold flex items-center gap-1", sel ? "text-volt-ink/70" : "text-mute")}>
                      {locks > 0 && (
                        <>
                          <LockIcon size={11} strokeWidth={2.8} />
                          {locks}
                          <span className="opacity-40">·</span>
                        </>
                      )}
                      {count}
                    </span>
                  </motion.button>
                );
              })}
            </div>
            {done && outcome && !key.voided && (
              <div className="mt-2.5 text-[13px] text-mute">
                {outcome.correctCount === 0
                  ? "Nobody got it."
                  : outcome.correctCount === 1
                    ? (() => {
                        const pid = Object.entries(result!.picks).find(([, p]) => p[q.id]?.correct)?.[0];
                        const pts = pid ? result!.picks[pid][q.id].points : 0;
                        return (
                          <>
                            <span className="text-volt font-semibold">Unique.</span> {view.players.find((p) => p.id === pid)?.nickname} gets {pts}.
                          </>
                        );
                      })()
                    : `${outcome.correctCount} players got it.`}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
