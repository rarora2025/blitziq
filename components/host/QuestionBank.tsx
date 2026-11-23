"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { api, ApiError } from "@/lib/client";
import { render } from "@/lib/seed-questions";
import { CATEGORIES, type BankQuestion, type Option } from "@/lib/types";
import { Button, Field, Sheet, Spinner, cx, inputCls } from "../ui";
import { PencilIcon, PlusIcon, SearchIcon, SparkIcon, TrashIcon, XIcon } from "../icons";

export type Draft = { id?: string; category: string; prompt: string; options: Option[]; rule: string };

const blank = (): Draft => ({
  category: "Wild cards",
  prompt: "",
  options: [
    { id: "a", label: "" },
    { id: "b", label: "" },
  ],
  rule: "",
});

/** Create or edit a question. Used for quarter slots and for the bank itself. */
export function QuestionEditor({
  open,
  initial,
  title,
  slotMode,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: Draft | null;
  title: string;
  slotMode?: boolean;
  onClose: () => void;
  onSave: (d: Draft, saveToBank: boolean) => Promise<void>;
}) {
  const [d, setD] = useState<Draft>(initial ?? blank());
  const [saveToBank, setSaveToBank] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setD(initial ?? blank());
      setSaveToBank(false);
      setError(null);
    }
  }, [open, initial]);

  const setOpt = (i: number, label: string) =>
    setD((x) => ({ ...x, options: x.options.map((o, j) => (j === i ? { ...o, label: label.slice(0, 48) } : o)) }));

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSave({ ...d, options: d.options.filter((o) => o.label.trim()) }, saveToBank);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="space-y-5">
        <Field label="Question" hint="Use {home}, {away} and {q} to fill in team names and the quarter.">
          <textarea
            value={d.prompt}
            onChange={(e) => setD({ ...d, prompt: e.target.value.slice(0, 140) })}
            rows={2}
            placeholder="Who makes the longest offensive play in {q}?"
            className={cx(inputCls, "h-auto py-3 resize-none leading-snug text-[18px] font-semibold tracking-tight")}
          />
        </Field>
        <div>
          <span className="block text-[13px] font-medium text-dim mb-2">Answers</span>
          <div className="space-y-2">
            {d.options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <span className="w-9 shrink-0 h-13 flex items-center justify-center font-semibold text-mute text-[15px]">
                  {"ABCD"[i]}
                </span>
                <input
                  value={o.label}
                  onChange={(e) => setOpt(i, e.target.value)}
                  placeholder={i === 0 ? "{away}" : i === 1 ? "{home}" : "Another answer"}
                  className={inputCls}
                />
                {d.options.length > 2 && (
                  <button
                    onClick={() => setD({ ...d, options: d.options.filter((_, j) => j !== i).map((x, j) => ({ ...x, id: "abcd"[j] })) })}
                    className="w-11 shrink-0 rounded-xl text-mute hover:text-fg hover:bg-white/5 flex items-center justify-center"
                    aria-label="Remove answer"
                  >
                    <XIcon size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {d.options.length < 4 && (
            <button
              onClick={() => setD({ ...d, options: [...d.options, { id: "abcd"[d.options.length], label: "" }] })}
              className="mt-2 ml-11 h-10 inline-flex items-center gap-1.5 text-[14px] font-semibold text-dim hover:text-fg"
            >
              <PlusIcon size={16} /> Add answer
            </button>
          )}
        </div>
        <Field label="How it's settled" hint="One objective sentence. Players can read this.">
          <textarea
            value={d.rule}
            onChange={(e) => setD({ ...d, rule: e.target.value.slice(0, 280) })}
            rows={2}
            placeholder="Longest single rush or reception in the quarter. A tie voids the question."
            className={cx(inputCls, "h-auto py-3 resize-none text-[15px] leading-relaxed")}
          />
        </Field>
        <Field label="Category">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setD({ ...d, category: c })}
                className={cx(
                  "h-8 px-3 rounded-full text-[13px] font-semibold transition-colors",
                  d.category === c ? "bg-fg text-ink" : "bg-raised text-dim hover:text-fg",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </Field>
        {slotMode && (
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input type="checkbox" checked={saveToBank} onChange={(e) => setSaveToBank(e.target.checked)} className="size-5 accent-[#d4ff3f]" />
            <span className="text-[15px]">Also save to the question bank for future games</span>
          </label>
        )}
        {error && <p className="text-[14px] text-miss">{error}</p>}
        <Button block onClick={save} loading={busy}>
          Save question
        </Button>
      </div>
    </Sheet>
  );
}

export function QuestionBank({
  open,
  code,
  teams,
  quarter,
  targetLabel,
  onClose,
  onUse,
}: {
  open: boolean;
  code: string;
  teams: { home: string; away: string };
  quarter: number;
  /** When set, the bank is picking a question for a slot. */
  targetLabel?: string | null;
  onClose: () => void;
  onUse?: (bankId: string) => Promise<void>;
}) {
  const [items, setItems] = useState<BankQuestion[] | null>(null);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("All");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [usingId, setUsingId] = useState<string | null>(null);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const load = async () => {
    try {
      setItems(await api<BankQuestion[]>(`/api/lobbies/${code}/bank`));
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    if (open) {
      void load();
      api<{ enabled: boolean }>(`/api/lobbies/${code}/suggest`).then((r) => setAiEnabled(r.enabled)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, code]);

  const ctx = { ...teams, quarter };
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items ?? []).filter(
      (b) =>
        (cat === "All" || (cat === "Mine" ? b.mine : b.category === cat)) &&
        (!q || b.prompt.toLowerCase().includes(q) || b.options.some((o) => o.label.toLowerCase().includes(q))),
    );
  }, [items, query, cat]);

  const saveBank = async (d: Draft) => {
    await api(`/api/lobbies/${code}/bank`, { method: "POST", json: d });
    await load();
  };

  const remove = async (id: string) => {
    await api(`/api/lobbies/${code}/bank?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
    await load();
  };

  const use = async (id: string) => {
    if (!onUse) return;
    setUsingId(id);
    try {
      await onUse(id);
      onClose();
    } finally {
      setUsingId(null);
    }
  };

  return (
    <>
      <Sheet open={open && !editorOpen && !aiOpen} onClose={onClose} wide title={targetLabel ? `Pick a question for ${targetLabel}` : "Question bank"}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search questions" className={cx(inputCls, "h-11 pl-10 text-[15px]")} />
          </div>
          <Button size="md" variant="secondary" onClick={() => (setEditing(null), setEditorOpen(true))}>
            <PlusIcon size={17} /> New
          </Button>
          {aiEnabled && (
            <Button size="md" variant="secondary" onClick={() => setAiOpen(true)} aria-label="AI drafts">
              <SparkIcon size={17} /> <span className="hidden sm:inline">Draft with AI</span>
            </Button>
          )}
        </div>
        <div className="mt-3 -mx-5 sm:-mx-6 px-5 sm:px-6 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          {["All", "Mine", ...CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cx(
                "h-8 px-3 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors",
                cat === c ? "bg-fg text-ink" : "bg-raised text-dim hover:text-fg",
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          {items === null ? (
            <div className="py-12 flex justify-center text-mute">
              <Spinner />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-dim">{cat === "Mine" ? "Questions you create show up here." : "Nothing matches."}</p>
          ) : (
            filtered.map((b) => (
              <div key={b.id} className="group rounded-2xl bg-raised border border-line p-4 flex gap-4 items-start">
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-mute">
                    {b.category}
                    {b.mine && <span className="text-volt/80"> · yours</span>}
                  </div>
                  <div className="mt-1 text-[16px] font-semibold tracking-tight leading-snug">{render(b.prompt, ctx)}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {b.options.map((o) => (
                      <span key={o.id} className="h-6 px-2 rounded-md bg-raised-2 text-[12px] text-dim inline-flex items-center">
                        {render(o.label, ctx)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => (setEditing({ id: b.id, category: b.category, prompt: b.prompt, options: b.options, rule: b.rule }), setEditorOpen(true))}
                    className="size-9 rounded-lg text-mute hover:text-fg hover:bg-white/5 flex items-center justify-center"
                    aria-label={b.mine ? "Edit" : "Edit a copy"}
                    title={b.mine ? "Edit" : "Edit a copy"}
                  >
                    <PencilIcon size={16} />
                  </button>
                  {b.mine && (
                    <button onClick={() => remove(b.id)} className="size-9 rounded-lg text-mute hover:text-miss hover:bg-white/5 flex items-center justify-center" aria-label="Delete">
                      <TrashIcon size={16} />
                    </button>
                  )}
                  {onUse && (
                    <Button size="sm" variant="secondary" onClick={() => use(b.id)} loading={usingId === b.id} className="ml-1 hover:bg-volt hover:text-volt-ink">
                      Use
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Sheet>

      <QuestionEditor
        open={editorOpen}
        initial={editing}
        title={editing?.id ? (items?.find((i) => i.id === editing.id)?.mine ? "Edit question" : "Edit a copy") : "New question"}
        onClose={() => setEditorOpen(false)}
        onSave={(d) => saveBank(d)}
      />

      <AiDrafts
        open={aiOpen}
        code={code}
        quarter={quarter}
        teams={teams}
        onClose={() => setAiOpen(false)}
        onApprove={async (d) => {
          await saveBank(d);
        }}
      />
    </>
  );
}

function AiDrafts({
  open,
  code,
  quarter,
  teams,
  onClose,
  onApprove,
}: {
  open: boolean;
  code: string;
  quarter: number;
  teams: { home: string; away: string };
  onClose: () => void;
  onApprove: (d: Draft) => Promise<void>;
}) {
  const [cat, setCat] = useState<string>("Any");
  const [drafts, setDrafts] = useState<(Draft & { _k: number })[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const seq = useRef(0);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ questions: Draft[] }>(`/api/lobbies/${code}/suggest`, { method: "POST", json: { category: cat, quarter } });
      setDrafts(r.questions.map((q) => ({ ...q, _k: ++seq.current })));
      if (!r.questions.length) setError("No usable drafts came back. Try again.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't reach the AI service.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} wide title="Draft questions with AI">
      <p className="text-[14px] text-dim -mt-1">Drafts are never shown to players. Approve the ones you like to add them to your bank.</p>
      <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {["Any", ...CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cx("h-8 px-3 rounded-full text-[13px] font-semibold whitespace-nowrap", cat === c ? "bg-fg text-ink" : "bg-raised text-dim hover:text-fg")}
          >
            {c}
          </button>
        ))}
      </div>
      <Button block size="md" className="mt-4" onClick={generate} loading={busy}>
        <SparkIcon size={17} /> {drafts.length ? "Draft more" : "Draft 4 questions"}
      </Button>
      {error && <p className="mt-3 text-[14px] text-miss">{error}</p>}
      <div className="mt-5 space-y-2">
        <AnimatePresence initial={false}>
          {drafts.map((d) => (
            <motion.div
              key={d._k}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="rounded-2xl bg-raised border border-line p-4"
            >
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-mute">{d.category}</div>
              <div className="mt-1 text-[16px] font-semibold tracking-tight">{render(d.prompt, { ...teams, quarter })}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {d.options.map((o) => (
                  <span key={o.id} className="h-6 px-2 rounded-md bg-raised-2 text-[12px] text-dim inline-flex items-center">
                    {o.label}
                  </span>
                ))}
              </div>
              {d.rule && <p className="mt-2 text-[13px] text-mute">{d.rule}</p>}
              <div className="mt-3 flex gap-2">
                {saved.has(d._k) ? (
                  <span className="h-9 inline-flex items-center text-[14px] font-semibold text-volt">Added to bank</span>
                ) : (
                  <>
                    <Button
                      size="sm"
                      onClick={async () => {
                        const { _k, ...rest } = d;
                        await onApprove(rest);
                        setSaved((s) => new Set(s).add(_k));
                      }}
                    >
                      Approve
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDrafts((ds) => ds.filter((x) => x._k !== d._k))}>
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Sheet>
  );
}
