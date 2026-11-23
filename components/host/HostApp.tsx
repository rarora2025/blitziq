"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useLobby, ApiError } from "@/lib/client";
import { defaultPickMinutes, type Action, type LobbyView, type Phase, type Question } from "@/lib/types";
import { Avatar, AvatarProvider, Button, Field, ImageField, InviteButton, Label, Matchup, Sheet, TeamChip, Toast, Wordmark, cx, inputCls } from "../ui";
import { ArrowRight, CheckIcon, GridIcon, LockIcon, PencilIcon, PlusIcon, SwapIcon, TrashIcon, XIcon } from "../icons";
import { Loading } from "../player/PlayerApp";
import { Leaderboard } from "../screens/Leaderboard";
import { TeamSelect } from "../CreateLobby";
import { Grader } from "./Grader";
import { Countdown, useSecondsLeft } from "../screens/social";
import { QuestionBank, QuestionEditor, type Draft } from "./QuestionBank";

const STEPS = ["Open Picks", "Start Round", "Grade Questions", "Publish Results", "Next Quarter"];
const STEP_OF: Record<Phase, number> = { setup: 0, picks: 1, live: 2, grading: 3, results: 4, final: 5 };
const ease = [0.16, 1, 0.3, 1] as const;

export function HostApp({ code }: { code: string }) {
  const { view, error, act } = useLobby(code);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const run = async (a: Action) => {
    setBusy(a.type);
    try {
      await act(a);
    } catch (e) {
      setToast(e instanceof ApiError ? e.message : "Something went wrong.");
      throw e;
    } finally {
      setBusy(null);
    }
  };
  const runQuiet = (a: Action) => run(a).catch(() => {});

  if (error && (error.status === 401 || error.status === 404)) return <NotHost code={code} missing={error.status === 404} />;
  if (!view) return <Loading />;
  if (!view.me.isHost) return <NotHost code={code} />;

  return (
    <div className="min-h-dvh">
      <AvatarProvider players={view.players}>
        <Dashboard view={view} run={run} runQuiet={runQuiet} busy={busy} />
      </AvatarProvider>
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}

function NotHost({ code, missing }: { code: string; missing?: boolean }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center text-center px-6">
      <Wordmark className="text-5xl" />
      <p className="mt-6 text-[20px] font-semibold tracking-tight">{missing ? "This lobby doesn't exist." : "Host controls live on the host's device."}</p>
      <p className="mt-2 text-dim max-w-sm">
        {missing ? "Double-check the code." : "Only the browser that created this lobby can run it."}
      </p>
      {!missing && (
        <Link href={`/play/${code}`} className="mt-8 h-12 px-6 rounded-2xl bg-raised-2 font-semibold inline-flex items-center">
          Go to the game
        </Link>
      )}
    </div>
  );
}

type Run = (a: Action) => Promise<void>;

function Dashboard({ view, run, runQuiet, busy }: { view: LobbyView; run: Run; runQuiet: (a: Action) => void; busy: string | null }) {
  const { lobby } = view;
  const [tab, setTab] = useState<number | null>(null);
  const shown = tab ?? lobby.quarter;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 bg-ink/85 backdrop-blur-md border-b border-line safe-t">
        <div className="max-w-6xl mx-auto px-5 lg:px-8 h-16 flex items-center gap-4">
          <Wordmark className="text-[26px]" />
          <span className="h-6 w-px bg-line-strong hidden sm:block" />
          <button onClick={() => setSettingsOpen(true)} className="min-w-0 text-left group hidden sm:block">
            <div className="text-[15px] font-semibold tracking-tight truncate flex items-center gap-1.5">
              {lobby.name}
              <PencilIcon size={13} className="text-mute opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-[12px] text-mute truncate">
              {lobby.away} at {lobby.home}
            </div>
          </button>
          <div className="flex-1" />
          <button onClick={() => setSettingsOpen(true)} className="hidden md:inline-flex h-9 px-3 rounded-lg text-[14px] font-semibold text-dim hover:text-fg hover:bg-white/5 items-center">
            Teams &amp; logos
          </button>
          <button onClick={() => setBankOpen(true)} className="hidden md:inline-flex h-9 px-3 rounded-lg text-[14px] font-semibold text-dim hover:text-fg hover:bg-white/5 items-center">
            Question bank
          </button>
          {view.me.playerId && (
            <Link href={`/play/${lobby.code}`} className="h-9 px-3 rounded-lg text-[14px] font-semibold text-dim hover:text-fg hover:bg-white/5 inline-flex items-center gap-1.5">
              <GridIcon size={15} />
              <span className="hidden sm:inline">My picks</span>
            </Link>
          )}
          <InviteButton code={lobby.code} compact />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 lg:px-8 pt-6 pb-24">
        <button onClick={() => setSettingsOpen(true)} className="sm:hidden mb-5 text-left">
          <div className="text-[26px] font-bold tracking-tight leading-tight">{lobby.name}</div>
          <div className="mt-2">
            <Matchup home={lobby.home} away={lobby.away} size="sm" />
          </div>
        </button>

        <Control view={view} run={runQuiet} busy={busy} />

        <div className="mt-8 grid lg:grid-cols-[minmax(0,1fr)_380px] gap-8">
          <section className="min-w-0">
            <QuarterTabs view={view} value={shown} onChange={(q) => setTab(q === lobby.quarter ? null : q)} />
            <div className="mt-5">
              <QuarterPanel view={view} quarter={shown} run={run} runQuiet={runQuiet} />
            </div>
          </section>
          <aside className="space-y-8">
            {lobby.phase !== "setup" && lobby.phase !== "final" && <ScorePanel view={view} run={runQuiet} />}
            <PlayersPanel view={view} run={runQuiet} />
            <section>
              <div className="flex items-baseline justify-between mb-3">
                <Label>Leaderboard</Label>
                {lobby.publishedThrough > 0 && <span className="text-[12px] text-mute">After Q{lobby.publishedThrough}</span>}
              </div>
              {lobby.publishedThrough === 0 ? (
                <p className="rounded-2xl border border-dashed border-line-strong px-4 py-6 text-center text-[14px] text-mute">Standings appear after you publish Q1.</p>
              ) : (
                <Leaderboard rows={view.leaderboard} meId={view.me.playerId} latestLabel={`Q${lobby.publishedThrough}`} />
              )}
            </section>
          </aside>
        </div>
      </main>

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} view={view} run={run} />
      <QuestionBank open={bankOpen} onClose={() => setBankOpen(false)} code={lobby.code} teams={{ home: lobby.home, away: lobby.away }} quarter={lobby.quarter} />
    </>
  );
}

/** The one big control: where we are in the quarter, and the single next action. */
function Control({ view, run, busy }: { view: LobbyView; run: (a: Action) => void; busy: string | null }) {
  const { lobby, players, submittedCount } = view;
  const step = STEP_OF[lobby.phase];
  const q = lobby.quarter;
  const [windowMin, setWindowMin] = useState<number>(defaultPickMinutes(q));
  useEffect(() => setWindowMin(defaultPickMinutes(q)), [q]);
  const secondsLeft = useSecondsLeft(lobby.phase === "picks" ? lobby.picksCloseAt : null, view.now);
  const qs = view.host!.allQuestions.filter((x) => x.quarter === q);
  const graded = qs.filter((x) => view.host!.keys[x.id]?.voided || view.host!.keys[x.id]?.correct).length;

  const cfg: { title: string; sub: string; action?: Action; label?: string; disabled?: boolean } = (() => {
    switch (lobby.phase) {
      case "setup":
        return {
          title: `Get Q${q} ready`,
          sub: qs.length === 5 ? "Five questions are set. Swap any of them, then open picks." : `${qs.length} of 5 questions set.`,
          action: { type: "openPicks", minutes: windowMin },
          label: `Open Q${q} Picks`,
          disabled: qs.length === 0,
        };
      case "picks":
        return {
          title: `Q${q} picks are open`,
          sub:
            submittedCount === players.length && players.length > 0
              ? "Everyone's locked in. Start the round at kickoff."
              : `${submittedCount} of ${players.length} locked in. Anyone who hasn't submitted scores zero.`,
          action: { type: "startRound" },
          label: `Start Q${q}`,
        };
      case "live":
        return {
          title: `Q${q} is live`,
          sub: "Picks are locked and visible to everyone. Grade as plays happen, or when the quarter ends.",
          action: { type: "endRound" },
          label: "Grade Questions",
        };
      case "grading":
        return {
          title: `Grade Q${q}`,
          sub: graded === qs.length ? "All graded. Publish to reveal the results." : `${graded} of ${qs.length} graded. Tap what actually happened.`,
          action: { type: "publish" },
          label: "Publish Results",
          disabled: graded < qs.length,
        };
      case "results":
        return {
          title: `Q${q} results are out`,
          sub: q < 4 ? "Fix any grade below and scores update instantly." : "That's four quarters. Time to crown someone.",
          action: { type: "nextQuarter" },
          label: q < 4 ? `Next Quarter: Q${q + 1}` : "Crown the Winner",
        };
      default:
        return { title: "Final", sub: `${view.leaderboard[0]?.nickname ?? "Nobody"} wins. You can still fix a grade from any quarter.` };
    }
  })();

  return (
    <section className="rounded-3xl bg-panel border border-line overflow-hidden">
      <div className="px-5 lg:px-7 pt-6 pb-6 flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
        <div className="flex items-center gap-5 min-w-0 flex-1">
          <div
            className={cx(
              "size-[72px] shrink-0 rounded-2xl flex items-center justify-center font-display font-bold text-[40px] leading-none",
              lobby.phase === "live" ? "bg-volt text-volt-ink" : "bg-raised-2",
            )}
          >
            {lobby.phase === "final" ? <span className="text-[22px] tracking-wide">FINAL</span> : `Q${q}`}
          </div>
          <div className="min-w-0">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={lobby.phase + q} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25, ease }}>
                <h1 className="text-[26px] font-bold tracking-[-0.03em] leading-tight flex items-center gap-2.5">
                  {lobby.phase === "live" && <span className="size-2.5 rounded-full bg-volt pulse-dot" />}
                  {cfg.title}
                </h1>
                <p className="mt-1 text-[15px] text-dim leading-snug">{cfg.sub}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        {cfg.action && (
          <div className="flex flex-col gap-3 md:items-end">
            <Button onClick={() => run(cfg.action!)} loading={busy === cfg.action.type} disabled={cfg.disabled} className="md:min-w-[240px]">
              {cfg.label} <ArrowRight size={18} />
            </Button>
            {lobby.phase === "setup" && (
              <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
                <span className="text-[13px] text-mute mr-1">Pick window</span>
                {[0, 1, 2, 3, 5, 10, 15].map((m) => (
                  <button
                    key={m}
                    onClick={() => setWindowMin(m)}
                    className={cx(
                      "h-8 px-2.5 rounded-lg text-[13px] font-semibold tnum transition-colors",
                      windowMin === m ? "bg-fg text-ink" : "bg-raised-2 text-dim hover:text-fg",
                    )}
                  >
                    {m === 0 ? "None" : `${m}m`}
                  </button>
                ))}
              </div>
            )}
            {lobby.phase === "picks" && secondsLeft != null && (
              <div className="flex items-center gap-2 md:justify-end">
                <Countdown seconds={secondsLeft} compact />
                <button onClick={() => run({ type: "extendPicks", minutes: 1 })} className="h-8 px-3 rounded-lg bg-raised-2 text-[13px] font-semibold text-dim hover:text-fg">
                  +1 min
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <ol className="flex border-t border-line overflow-x-auto [scrollbar-width:none]">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={cx(
              "flex-1 min-w-max px-4 py-3 text-[13px] font-semibold whitespace-nowrap flex items-center gap-2 border-r border-line last:border-r-0 transition-colors",
              i === step ? "text-fg bg-raised" : i < step ? "text-dim" : "text-mute",
            )}
          >
            <span
              className={cx(
                "size-5 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold",
                i < step ? "bg-volt/20 text-volt" : i === step ? "bg-volt text-volt-ink" : "bg-raised-2 text-mute",
              )}
            >
              {i < step ? <CheckIcon size={11} strokeWidth={3.5} /> : i + 1}
            </span>
            {s === "Next Quarter" && q === 4 ? "Crown Winner" : s}
          </li>
        ))}
      </ol>
    </section>
  );
}

function QuarterTabs({ view, value, onChange }: { view: LobbyView; value: number; onChange: (q: number) => void }) {
  const { lobby } = view;
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4].map((q) => {
        const status =
          q <= lobby.publishedThrough
            ? "Final"
            : q === lobby.quarter
              ? ({ live: "Live", picks: "Picks open", grading: "Grading" } as Record<string, string>)[lobby.phase] ?? "Up next"
              : q === lobby.quarter + 1 && lobby.phase === "results"
                ? "Up next"
                : "Later";
        return (
          <button
            key={q}
            onClick={() => onChange(q)}
            className={cx(
              "flex-1 rounded-2xl px-4 py-3 text-left border transition-colors",
              value === q ? "bg-raised-2 border-line-strong" : "bg-transparent border-line hover:bg-raised",
            )}
          >
            <div className="font-display font-bold text-[22px] leading-none">Q{q}</div>
            <div className={cx("mt-1.5 text-[12px] font-semibold", status === "Live" ? "text-volt" : "text-mute")}>{status}</div>
          </button>
        );
      })}
    </div>
  );
}

function QuarterPanel({ view, quarter, run, runQuiet }: { view: LobbyView; quarter: number; run: Run; runQuiet: (a: Action) => void }) {
  const { lobby } = view;
  const editable = quarter > lobby.quarter || (quarter === lobby.quarter && lobby.phase === "setup");
  const started = quarter < lobby.quarter || (quarter === lobby.quarter && ["live", "grading", "results", "final"].includes(lobby.phase));

  if (editable) return <QuestionSlots view={view} quarter={quarter} run={run} />;
  if (started)
    return (
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <Label>{quarter <= lobby.publishedThrough ? `Q${quarter} grades · tap to correct` : `Grade Q${quarter}`}</Label>
          <span className="text-[12px] text-mute">Saves instantly</span>
        </div>
        <Grader view={view} quarter={quarter} onGrade={(questionId, correct, voided) => run({ type: "grade", questionId, correct, voided })} />
      </div>
    );
  // Picks open: questions are frozen.
  const qs = view.host!.allQuestions.filter((q) => q.quarter === quarter).sort((a, b) => a.position - b.position);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <Label>Q{quarter} questions</Label>
        <span className="text-[12px] text-mute inline-flex items-center gap-1">
          <LockIcon size={12} /> Locked while picks are open
        </span>
      </div>
      <div className="space-y-2">
        {qs.map((q, i) => (
          <QuestionRow key={q.id} q={q} index={i} />
        ))}
      </div>
    </div>
  );
}

function QuestionRow({ q, index, actions }: { q: Question; index: number; actions?: React.ReactNode }) {
  return (
    <motion.div layout className="group rounded-2xl bg-panel border border-line p-4 flex gap-4">
      <span className="font-display font-bold text-[22px] text-mute w-5 leading-none pt-0.5">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-mute">{q.category}</div>
        <div className="mt-1 text-[16px] font-semibold tracking-tight leading-snug">{q.prompt}</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {q.options.map((o) => (
            <span key={o.id} className="h-6 px-2 rounded-md bg-raised-2 text-[12px] text-dim inline-flex items-center">
              {o.label}
            </span>
          ))}
        </div>
      </div>
      {actions && <div className="flex items-start gap-0.5 shrink-0">{actions}</div>}
    </motion.div>
  );
}

function QuestionSlots({ view, quarter, run }: { view: LobbyView; quarter: number; run: Run }) {
  const { lobby } = view;
  const qs = useMemo(() => view.host!.allQuestions.filter((q) => q.quarter === quarter), [view.host, quarter]);
  const bySlot = new Map(qs.map((q) => [q.position, q]));
  const [bankSlot, setBankSlot] = useState<number | null>(null);
  const [editSlot, setEditSlot] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const iconBtn = "size-9 rounded-lg text-mute hover:text-fg hover:bg-white/5 flex items-center justify-center transition-colors";

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <Label>Q{quarter} questions</Label>
        <span className="text-[12px] text-mute tnum">{qs.length} of 5</span>
      </div>
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map((slot) => {
          const q = bySlot.get(slot);
          if (!q)
            return (
              <div key={slot} className="rounded-2xl border border-dashed border-line-strong p-2 flex gap-2">
                <button onClick={() => setBankSlot(slot)} className="flex-1 h-12 rounded-xl text-[15px] font-semibold text-dim hover:text-fg hover:bg-white/5 inline-flex items-center justify-center gap-2">
                  <PlusIcon size={17} /> From the bank
                </button>
                <button
                  onClick={() => (setDraft(null), setEditSlot(slot))}
                  className="flex-1 h-12 rounded-xl text-[15px] font-semibold text-dim hover:text-fg hover:bg-white/5 inline-flex items-center justify-center gap-2"
                >
                  <PencilIcon size={16} /> Write your own
                </button>
              </div>
            );
          return (
            <QuestionRow
              key={q.id}
              q={q}
              index={slot}
              actions={
                <>
                  <button className={iconBtn} title="Swap from bank" aria-label="Swap from bank" onClick={() => setBankSlot(slot)}>
                    <SwapIcon size={17} />
                  </button>
                  <button
                    className={iconBtn}
                    title="Edit"
                    aria-label="Edit"
                    onClick={() => (setDraft({ category: q.category, prompt: q.prompt, options: q.options, rule: q.rule }), setEditSlot(slot))}
                  >
                    <PencilIcon size={16} />
                  </button>
                  <button className={cx(iconBtn, "hover:text-miss")} title="Remove" aria-label="Remove" onClick={() => run({ type: "removeQuestion", questionId: q.id }).catch(() => {})}>
                    <TrashIcon size={16} />
                  </button>
                </>
              }
            />
          );
        })}
      </div>

      <QuestionBank
        open={bankSlot !== null}
        onClose={() => setBankSlot(null)}
        code={lobby.code}
        teams={{ home: lobby.home, away: lobby.away }}
        quarter={quarter}
        targetLabel={bankSlot !== null ? `Q${quarter} · #${bankSlot + 1}` : null}
        onUse={(bankId) => run({ type: "assign", quarter, position: bankSlot!, bankId })}
      />
      <QuestionEditor
        open={editSlot !== null}
        slotMode
        initial={draft}
        title={draft ? `Edit Q${quarter} · #${(editSlot ?? 0) + 1}` : `New question for Q${quarter}`}
        onClose={() => setEditSlot(null)}
        onSave={(d, saveToBank) => run({ type: "saveQuestion", quarter, position: editSlot!, question: d, saveToBank })}
      />
    </div>
  );
}

function PlayersPanel({ view, run }: { view: LobbyView; run: (a: Action) => void }) {
  const { players, lobby } = view;
  const [confirm, setConfirm] = useState<string | null>(null);
  const showStatus = lobby.phase === "picks";
  const sorted = showStatus ? [...players].sort((a, b) => Number(a.submitted) - Number(b.submitted)) : players;
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <Label>Players</Label>
        <span className="text-[12px] text-mute tnum">{showStatus ? `${view.submittedCount} of ${players.length} locked in` : `${players.length} joined`}</span>
      </div>
      {players.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong px-4 py-6 text-center">
          <p className="text-[14px] text-dim">Nobody yet. Share the code:</p>
          <div className="mt-3 flex justify-center">
            <InviteButton code={lobby.code} />
          </div>
        </div>
      ) : (
        <ul className="rounded-2xl border border-line divide-y divide-line overflow-hidden">
          <AnimatePresence initial={false}>
            {sorted.map((p) => (
              <motion.li
                key={p.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="group bg-panel"
              >
                <div className="px-4 h-14 flex items-center gap-3">
                  <Avatar name={p.nickname} size={32} me={p.id === view.me.playerId} />
                  <span className="flex-1 min-w-0 truncate text-[15px] font-medium">
                    {p.nickname}
                    {p.isHost && <span className="text-mute font-normal"> · you</span>}
                  </span>
                  {showStatus &&
                    (p.submitted ? (
                      <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-volt">
                        <CheckIcon size={14} strokeWidth={3} /> Locked in
                      </span>
                    ) : (
                      <span className="text-[13px] text-mute">Picking…</span>
                    ))}
                  {!p.isHost &&
                    (confirm === p.id ? (
                      <span className="flex items-center gap-1">
                        <button onClick={() => (run({ type: "removePlayer", playerId: p.id }), setConfirm(null))} className="h-8 px-2.5 rounded-lg bg-miss/15 text-miss text-[13px] font-semibold">
                          Remove
                        </button>
                        <button onClick={() => setConfirm(null)} className="size-8 rounded-lg text-mute hover:text-fg flex items-center justify-center" aria-label="Cancel">
                          <XIcon size={15} />
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirm(p.id)}
                        className="size-8 rounded-lg text-mute hover:text-miss flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                        aria-label={`Remove ${p.nickname}`}
                      >
                        <XIcon size={15} />
                      </button>
                    ))}
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}

function SettingsSheet({ open, onClose, view, run }: { open: boolean; onClose: () => void; view: LobbyView; run: Run }) {
  const { lobby } = view;
  const [name, setName] = useState(lobby.name);
  const [home, setHome] = useState(lobby.home);
  const [away, setAway] = useState(lobby.away);
  const [date, setDate] = useState(lobby.gameDate ?? "");
  const [homeLogo, setHomeLogo] = useState<string | null>(lobby.homeLogo);
  const [awayLogo, setAwayLogo] = useState<string | null>(lobby.awayLogo);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    setName(lobby.name);
    setHome(lobby.home);
    setAway(lobby.away);
    setDate(lobby.gameDate ?? "");
    setHomeLogo(lobby.homeLogo);
    setAwayLogo(lobby.awayLogo);
  }, [open, lobby.name, lobby.home, lobby.away, lobby.gameDate]);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Game settings"
    >
      <div className="space-y-5">
        <Field label="Lobby name">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value.slice(0, 32))} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Away">
            <TeamSelect label="Away team" value={away} onChange={setAway} />
          </Field>
          <Field label="Home">
            <TeamSelect label="Home team" value={home} onChange={setHome} />
          </Field>
        </div>
        <div>
          <span className="block text-[13px] font-medium text-dim mb-2">Team logos (optional)</span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="flex flex-wrap items-center gap-3">
              <ImageField value={awayLogo} onChange={setAwayLogo} label={`${away} logo`} />
              <span className="text-[14px] text-dim">{away}</span>
            </span>
            <span className="flex flex-wrap items-center gap-3">
              <ImageField value={homeLogo} onChange={setHomeLogo} label={`${home} logo`} />
              <span className="text-[14px] text-dim">{home}</span>
            </span>
          </div>
        </div>
        <Field label="Game day">
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <p className="text-[13px] text-mute">Changing teams updates questions players haven&apos;t seen yet.</p>
        <Button
          block
          loading={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await run({ type: "updateGame", name, home, away, gameDate: date || null, homeLogo, awayLogo });
              onClose();
            } catch {
            } finally {
              setSaving(false);
            }
          }}
        >
          Save
        </Button>
      </div>
    </Sheet>
  );
}

/** The host keeps the scoreboard on players' live screens up to date. */
function ScorePanel({ view, run }: { view: LobbyView; run: (a: Action) => void }) {
  const { lobby } = view;
  const row = (side: "away" | "home") => {
    const name = side === "away" ? lobby.away : lobby.home;
    const score = side === "away" ? lobby.awayScore : lobby.homeScore;
    const bump = (delta: number) => run({ type: "addScore", side, delta });
    return (
      <div className="flex items-center gap-3 px-4 h-16">
        <TeamChip name={name} />
        <span className="w-10 font-display font-bold text-[30px] leading-none tnum">{score}</span>
        <div className="flex-1 flex justify-end gap-1.5">
          {[7, 3, 2, 1].map((n) => (
            <button key={n} onClick={() => bump(n)} className="h-9 min-w-9 px-2 rounded-lg bg-raised-2 hover:bg-[#2a2a30] text-[14px] font-semibold tnum active:scale-95 transition">
              +{n}
            </button>
          ))}
          <button onClick={() => bump(-1)} disabled={score === 0} className="h-9 w-9 rounded-lg text-mute hover:text-fg hover:bg-white/5 text-[14px] font-semibold disabled:opacity-30" aria-label={`Take a point from ${name}`}>
            −1
          </button>
        </div>
      </div>
    );
  };
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <Label>Scoreboard</Label>
        <span className="text-[12px] text-mute">Shows on players&apos; live screen</span>
      </div>
      <div className="rounded-2xl border border-line bg-panel divide-y divide-line">
        {row("away")}
        {row("home")}
      </div>
    </section>
  );
}
