"use client";

import { motion } from "motion/react";
import type { LobbyView, Question, Submission } from "@/lib/types";
import { Label, Pic, cx, optionImage } from "../ui";
import { LockIcon } from "../icons";
import { AvatarStack, PlayerGrid, Shell, ease } from "./common";
import { Bars, Field, Scoreboard } from "./Scoreboard";

function currentQuestions(view: LobbyView) {
  return view.questions.filter((q) => q.quarter === view.lobby.quarter).sort((a, b) => a.position - b.position);
}

export function SubmittedScreen({ view }: { view: LobbyView }) {
  const { lobby, players, me, submittedCount, mySubmission } = view;
  const questions = currentQuestions(view);
  return (
    <Shell>
      <motion.section
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease }}
        className="pt-10 flex flex-col items-center text-center"
      >
        <motion.div
          initial={{ scale: 0.5, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.05 }}
          className="relative size-24 rounded-full bg-volt text-volt-ink flex items-center justify-center shadow-[0_0_60px_-10px_rgb(212_255_63/0.6)]"
        >
          <LockIcon size={40} strokeWidth={2.4} />
        </motion.div>
        <h1 className="mt-7 text-[36px] font-bold tracking-[-0.03em] leading-none">Picks locked.</h1>
        <p className="mt-3 text-[17px] text-dim">Waiting for host to start Q{lobby.quarter}.</p>
      </motion.section>

      <section className="mt-10 rounded-3xl bg-panel border border-line p-5">
        <div className="flex items-baseline justify-between mb-5">
          <Label>Locked in</Label>
          <span className="text-[22px] font-semibold tnum tracking-tight">
            {submittedCount}
            <span className="text-mute"> / {players.length}</span>
          </span>
        </div>
        <PlayerGrid players={players} meId={me.playerId} highlight="submitted" />
      </section>

      {mySubmission && (
        <section className="mt-6">
          <Label className="mb-3">Your picks</Label>
          <MyPicks questions={questions} submission={mySubmission} />
        </section>
      )}
    </Shell>
  );
}

export function MyPicks({ questions, submission }: { questions: Question[]; submission: Submission }) {
  return (
    <ul className="rounded-2xl border border-line divide-y divide-line overflow-hidden">
      {questions.map((q) => {
        const pick = q.options.find((o) => o.id === submission.answers[q.id]);
        const locked = submission.lock === q.id;
        return (
          <li key={q.id} className={cx("px-4 py-3 flex items-center gap-3", locked && "bg-volt/[0.05]")}>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] text-mute truncate">{q.prompt}</div>
              <div className={cx("text-[16px] font-semibold tracking-tight mt-0.5", !pick && "text-mute font-medium")}>
                {pick?.label ?? "No pick"}
              </div>
            </div>
            {locked && <LockIcon size={17} className="text-volt shrink-0" strokeWidth={2.5} />}
          </li>
        );
      })}
    </ul>
  );
}

/** Live round and grading: everyone's picks are now public. */
export function LiveScreen({ view }: { view: LobbyView }) {
  const { lobby, players, me, mySubmission, revealed } = view;
  const questions = currentQuestions(view);
  const grading = lobby.phase === "grading";
  const names = new Map(players.map((p) => [p.id, p.nickname]));
  const subs = revealed ?? [];

  return (
    <Shell>
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} className="pt-4 space-y-3">
        <Scoreboard lobby={lobby} />
        <Field lobby={lobby} />
        <div className="rounded-2xl bg-panel border border-line px-5 py-4 text-center">
          <div className="flex items-center justify-center gap-2.5 text-[19px] font-semibold tracking-tight">
            {!grading && <Bars />}
            {grading ? `Q${lobby.quarter} is in the books` : `Q${lobby.quarter} in progress`}
          </div>
          <p className="mt-1.5 text-[15px] text-dim leading-snug">
            {grading
              ? "The host is grading. Results drop any second."
              : mySubmission
                ? "Picks are locked. Results coming after the quarter."
                : `You sat this one out. You're in for Q${Math.min(4, lobby.quarter + 1)}.`}
          </p>
        </div>
      </motion.section>

      {mySubmission && (
        <section className="mt-8">
          <Label className="mb-3">Your picks</Label>
          <MyPicks questions={questions} submission={mySubmission} />
        </section>
      )}

      <div className="mt-8 flex items-center justify-between">
        <Label>How the lobby called it</Label>
        <span className="text-[13px] text-mute tnum">{subs.length} in</span>
      </div>
      <div className="mt-3 space-y-3">
        {questions.map((q, i) => (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 * i, duration: 0.4, ease }}
          >
            <Distribution q={q} subs={subs} meId={me.playerId} names={names} lobby={lobby} />
          </motion.div>
        ))}
      </div>
    </Shell>
  );
}

function Distribution({
  lobby,
  q,
  subs,
  meId,
  names,
}: {
  lobby: LobbyView["lobby"];
  q: Question;
  subs: Submission[];
  meId: string | null;
  names: Map<string, string>;
}) {
  const total = subs.filter((s) => s.answers[q.id]).length;
  const mine = subs.find((s) => s.playerId === meId);
  return (
    <div className="rounded-2xl bg-panel border border-line p-4">
      <div className="text-[16px] font-semibold tracking-tight leading-snug">{q.prompt}</div>
      <div className="mt-3.5 space-y-2">
        {q.options.map((o) => {
          const pickers = subs.filter((s) => s.answers[q.id] === o.id);
          const pct = total ? Math.round((pickers.length / total) * 100) : 0;
          const isMine = mine?.answers[q.id] === o.id;
          const myLock = isMine && mine?.lock === q.id;
          const lockers = pickers.filter((s) => s.lock === q.id).length;
          return (
            <div
              key={o.id}
              className={cx(
                "relative rounded-xl overflow-hidden px-3.5 h-12 flex items-center gap-3 bg-raised",
                isMine ? "ring-1 ring-volt/70" : "",
              )}
            >
              <motion.div
                className={cx("absolute inset-y-0 left-0", isMine ? "bg-volt/15" : "bg-raised-2")}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease }}
              />
              <span className="relative flex-1 min-w-0 flex items-center gap-2 text-[15px] font-medium truncate">
                {optionImage(o, lobby) && <Pic src={optionImage(o, lobby)!} size={24} />}
                {o.label}
                {myLock && <LockIcon size={14} className="text-volt shrink-0" strokeWidth={2.6} />}
              </span>
              <span className="relative flex items-center gap-2.5 shrink-0">
                {lockers > 0 && (
                  <span className="flex items-center gap-0.5 text-[12px] text-mute tnum" title={`${lockers} locked`}>
                    <LockIcon size={11} strokeWidth={2.6} />
                    {lockers}
                  </span>
                )}
                {pickers.length > 0 && <AvatarStack names={pickers.map((p) => names.get(p.playerId) ?? "?")} max={3} size={20} />}
                <span className="w-9 text-right text-[14px] font-semibold tnum">{pct}%</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
