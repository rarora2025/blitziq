"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { LobbyView, Question } from "@/lib/types";
import { useStored } from "@/lib/client";
import { Button, CategoryChip, Pic, Worth, cx, optionImage } from "../ui";
import { CheckIcon, ChevronLeft, LockIcon } from "../icons";
import { Shell, ease } from "./common";

type Draft = { answers: Record<string, string>; lock: string | null };

export function PicksScreen({
  view,
  onSubmit,
  submitting,
}: {
  view: LobbyView;
  onSubmit: (d: Draft) => void;
  submitting?: boolean;
}) {
  const { lobby } = view;
  const questions = useMemo(
    () => view.questions.filter((q) => q.quarter === lobby.quarter).sort((a, b) => a.position - b.position),
    [view.questions, lobby.quarter],
  );
  const [draft, setDraft] = useStored<Draft>(`blitz:${lobby.code}:q${lobby.quarter}:draft`, { answers: {}, lock: null });
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const n = questions.length;
  const reviewing = index >= n;

  // Drop picks for questions that no longer exist.
  useEffect(() => {
    const ids = new Set(questions.map((q) => q.id));
    if (Object.keys(draft.answers).some((k) => !ids.has(k)) || (draft.lock && !ids.has(draft.lock))) {
      setDraft((d) => ({
        answers: Object.fromEntries(Object.entries(d.answers).filter(([k]) => ids.has(k))),
        lock: d.lock && ids.has(d.lock) ? d.lock : null,
      }));
    }
  }, [questions, draft, setDraft]);

  const go = (i: number) => {
    setDir(i > index ? 1 : -1);
    setIndex(Math.max(0, Math.min(n, i)));
  };

  const choose = (q: Question, optionId: string) => {
    setDraft((d) => {
      const same = d.answers[q.id] === optionId;
      const answers = { ...d.answers };
      if (same) delete answers[q.id];
      else answers[q.id] = optionId;
      return { answers, lock: same && d.lock === q.id ? null : d.lock };
    });
  };

  const toggleLock = (q: Question) => {
    if (!draft.answers[q.id]) return;
    setDraft((d) => ({ ...d, lock: d.lock === q.id ? null : q.id }));
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(8);
  };

  const answered = questions.filter((q) => draft.answers[q.id]).length;
  const current = questions[index];

  return (
    <Shell
      footer={
        reviewing ? (
          <div>
            <p className="text-center text-[13px] text-mute mb-3 h-5">
              {answered < n
                ? `${n - answered} unanswered ${n - answered === 1 ? "question scores" : "questions score"} zero.`
                : draft.lock
                  ? "Picks can't be changed after this."
                  : "Tip: set a Lock on your most confident pick."}
            </p>
            <Button block onClick={() => onSubmit(draft)} loading={submitting} disabled={answered === 0}>
              <LockIcon size={19} />
              Lock In Picks
            </Button>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous question" className="w-14 px-0">
              <ChevronLeft />
            </Button>
            <Button block variant={draft.answers[current?.id] ? "primary" : "secondary"} onClick={() => go(index + 1)}>
              {index === n - 1 ? "Review picks" : draft.answers[current?.id] ? "Next" : "Skip"}
            </Button>
          </div>
        )
      }
    >
      <div className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[15px] font-semibold tracking-tight">Q{lobby.quarter} picks</span>
          <span className="text-[13px] text-mute tnum">
            {answered} of {n} answered
          </span>
        </div>
        <div className="flex gap-1.5" role="tablist" aria-label="Questions">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => go(i)}
              aria-label={`Question ${i + 1}`}
              className="relative flex-1 h-8 flex items-center"
            >
              <span
                className={cx(
                  "relative h-1.5 w-full rounded-full overflow-hidden transition-colors duration-300",
                  i === index ? "bg-volt" : draft.answers[q.id] ? "bg-fg/70" : "bg-raised-2",
                )}
              />
              {draft.lock === q.id && (
                <motion.span layoutId="lock-dot" className="absolute left-1/2 -translate-x-1/2 -top-1.5 text-volt">
                  <LockIcon size={12} strokeWidth={2.75} />
                </motion.span>
              )}
            </button>
          ))}
          <button onClick={() => go(n)} aria-label="Review" className="relative w-8 h-8 flex items-center">
            <span className={cx("h-1.5 w-full rounded-full transition-colors", reviewing ? "bg-volt" : "bg-raised-2")} />
          </button>
        </div>
      </div>

      <div className="relative mt-6 overflow-hidden -mx-5 px-5">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={reviewing ? "review" : current?.id}
            custom={dir}
            variants={{
              enter: (d: number) => ({ x: d * 48, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: d * -48, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease }}
          >
            {reviewing ? (
              <Review questions={questions} draft={draft} onEdit={go} onLock={toggleLock} />
            ) : (
              current && (
                <QuestionCard
                  lobby={lobby}
                  q={current}
                  index={index}
                  total={n}
                  picked={draft.answers[current.id]}
                  locked={draft.lock === current.id}
                  lockTaken={!!draft.lock && draft.lock !== current.id}
                  onChoose={(o) => choose(current, o)}
                  onLock={() => toggleLock(current)}
                />
              )
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </Shell>
  );
}

function QuestionCard({
  lobby,
  q,
  index,
  total,
  picked,
  locked,
  lockTaken,
  onChoose,
  onLock,
}: {
  lobby: LobbyView["lobby"];
  q: Question;
  index: number;
  total: number;
  picked?: string;
  locked: boolean;
  lockTaken: boolean;
  onChoose: (optionId: string) => void;
  onLock: () => void;
}) {
  const [showRule, setShowRule] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <CategoryChip>{q.category}</CategoryChip>
        <span className="text-[13px] text-mute tnum font-medium">
          {index + 1} of {total}
        </span>
      </div>
      <h2 className="mt-4 text-[30px] leading-[1.12] font-semibold tracking-[-0.025em] text-balance">{q.prompt}</h2>
      <Worth locked={locked} className="mt-3" />

      <div className="mt-7 space-y-2.5" role="radiogroup">
        {q.options.map((o, i) => {
          const sel = picked === o.id;
          return (
            <motion.button
              key={o.id}
              role="radio"
              aria-checked={sel}
              onClick={() => onChoose(o.id)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i, duration: 0.3, ease }}
              whileTap={{ scale: 0.98 }}
              className={cx(
                "w-full min-h-[64px] px-5 py-4 rounded-2xl border text-left flex items-center justify-between gap-4 transition-colors duration-150",
                sel ? "bg-volt/[0.09] border-volt text-fg" : "bg-raised border-line hover:border-line-strong text-fg",
              )}
            >
              <span className="flex items-center gap-3.5 min-w-0">
                {optionImage(o, lobby) && <Pic src={optionImage(o, lobby)!} size={44} />}
                <span className="text-[18px] font-semibold tracking-tight leading-snug">{o.label}</span>
              </span>
              <span
                className={cx(
                  "size-7 shrink-0 rounded-full flex items-center justify-center transition-all duration-200",
                  sel ? "bg-volt text-volt-ink scale-100" : "border-2 border-line-strong scale-90",
                )}
              >
                {sel && (
                  <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 600, damping: 25 }}>
                    <CheckIcon size={16} strokeWidth={3} />
                  </motion.span>
                )}
              </span>
            </motion.button>
          );
        })}
      </div>

      <LockToggle locked={locked} disabled={!picked} lockTaken={lockTaken} onClick={onLock} />

      {q.rule && (
        <div className="mt-5">
          <button onClick={() => setShowRule((v) => !v)} className="text-[13px] text-mute hover:text-dim font-medium">
            {showRule ? "Hide" : "How it's settled"}
          </button>
          <AnimatePresence>
            {showRule && (
              <motion.p
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden text-[14px] text-dim leading-relaxed"
              >
                <span className="block pt-1.5">{q.rule}</span>
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function LockToggle({
  locked,
  disabled,
  lockTaken,
  onClick,
}: {
  locked: boolean;
  disabled: boolean;
  lockTaken: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={locked}
      className={cx(
        "mt-4 w-full rounded-2xl px-4 py-3.5 flex items-center gap-3.5 text-left transition-all duration-200 border",
        locked ? "bg-volt text-volt-ink border-volt" : "bg-transparent border-dashed border-line-strong text-fg",
        disabled && "opacity-40",
      )}
    >
      <motion.span
        key={String(locked)}
        initial={{ rotate: locked ? -18 : 0, scale: locked ? 1.25 : 1 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 15 }}
        className={cx("size-9 rounded-full flex items-center justify-center shrink-0", locked ? "bg-volt-ink/10" : "bg-raised-2")}
      >
        <LockIcon size={18} open={!locked} strokeWidth={2.4} />
      </motion.span>
      <span className="flex-1 min-w-0">
        <span className="block text-[16px] font-semibold tracking-tight">
          {locked ? "This is your Lock" : lockTaken ? "Move your Lock here" : "Make this your Lock"}
        </span>
        <span className={cx("block text-[13px] mt-0.5", locked ? "text-volt-ink/70" : "text-mute")}>
          {disabled ? "Pick an answer first" : "20 pts if right / 100 if you're the only one"}
        </span>
      </span>
    </button>
  );
}

function Review({
  questions,
  draft,
  onEdit,
  onLock,
}: {
  questions: Question[];
  draft: Draft;
  onEdit: (i: number) => void;
  onLock: (q: Question) => void;
}) {
  return (
    <div>
      <h2 className="text-[30px] leading-tight font-semibold tracking-[-0.025em]">Your picks</h2>
      <p className="mt-1.5 text-[15px] text-dim">Tap the lock on your most confident call.</p>
      <ul className="mt-6 space-y-2">
        {questions.map((q, i) => {
          const pick = q.options.find((o) => o.id === draft.answers[q.id]);
          const locked = draft.lock === q.id;
          return (
            <li
              key={q.id}
              className={cx(
                "rounded-2xl border flex items-stretch overflow-hidden transition-colors",
                locked ? "border-volt bg-volt/[0.06]" : "border-line bg-raised",
              )}
            >
              <button onClick={() => onEdit(i)} className="flex-1 min-w-0 text-left px-4 py-3.5">
                <span className="block text-[14px] text-dim leading-snug line-clamp-2">{q.prompt}</span>
                <span className="mt-1 flex items-baseline gap-2">
                  <span className={cx("text-[17px] font-semibold tracking-tight", pick ? "text-fg" : "text-mute")}>{pick ? pick.label : "No pick"}</span>
                  {pick && (
                    <span className={cx("text-[12px] font-semibold tnum", locked ? "text-volt" : "text-mute")}>
                      {locked ? "20 / 100 pts" : "10 / 50 pts"}
                    </span>
                  )}
                </span>
              </button>
              <button
                onClick={() => onLock(q)}
                disabled={!pick}
                aria-label={locked ? "Remove Lock" : "Set as Lock"}
                aria-pressed={locked}
                className={cx(
                  "w-14 shrink-0 flex items-center justify-center transition-colors",
                  locked ? "text-volt" : pick ? "text-mute hover:text-fg" : "text-transparent",
                )}
              >
                {pick && (
                  <motion.span
                    key={String(locked)}
                    initial={{ scale: locked ? 1.4 : 1 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 14 }}
                    className="flex"
                  >
                    <LockIcon size={20} open={!locked} strokeWidth={2.4} />
                  </motion.span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
