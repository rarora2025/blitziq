"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Action, LobbyView } from "@/lib/types";
import { ApiError } from "@/lib/client";
import { Avatar, Button, Field, ImageField, Label, Sheet, cx, inputCls } from "../ui";

/** Seconds left until `closeAt`, corrected for the device clock using the server's `now`. */
export function useSecondsLeft(closeAt: string | null, serverNow: string) {
  const offset = useMemo(() => Date.parse(serverNow) - Date.now(), [serverNow]);
  const calc = () => (closeAt ? Math.max(0, Math.ceil((Date.parse(closeAt) - (Date.now() + offset)) / 1000)) : null);
  const [left, setLeft] = useState<number | null>(calc);
  useEffect(() => {
    setLeft(calc());
    if (!closeAt) return;
    const t = setInterval(() => setLeft(calc()), 250);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeAt, offset]);
  return left;
}

export const fmtClock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Pick-window clock. Turns red in the last 30 seconds. */
export function Countdown({ seconds, label = "Picks lock in", compact }: { seconds: number; label?: string; compact?: boolean }) {
  const urgent = seconds <= 30;
  const done = seconds === 0;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 rounded-full font-semibold transition-colors",
        compact ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-[15px]",
        done ? "bg-raised-2 text-dim" : urgent ? "bg-[#e5372b] text-white" : "bg-volt/[0.12] text-volt ring-1 ring-inset ring-volt/25",
      )}
      role="timer"
      aria-live="off"
    >
      {done ? (
        "Picks locked"
      ) : (
        <>
          <span className={cx(urgent && "pulse-dot")}>{label}</span>
          <span className={cx("font-display font-bold tnum tracking-wide", compact ? "text-[16px]" : "text-[19px]")}>{fmtClock(seconds)}</span>
        </>
      )}
    </span>
  );
}

const QUICK = ["Called it", "No way", "Let's go!", "Refs!", "Ice cold", "Choke job", "Lock it in", "Pain."];

/** Lobby chat and one-tap reactions for the downtime between picks and results. */
export function LobbyChat({ view, act }: { view: LobbyView; act?: (a: Action) => Promise<unknown> }) {
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const names = new Map(view.players.map((p) => [p.id, p.nickname]));
  const canPost = !!view.me.playerId && !!act;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [view.messages.length]);

  const send = async (body: string) => {
    if (!body.trim() || !act) return;
    setSending(true);
    setErr(null);
    try {
      await act({ type: "chat", body });
      setText("");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Didn't send.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="rounded-3xl bg-panel border border-line overflow-hidden">
      <div className="px-4 pt-4 flex items-center justify-between">
        <Label>Trash talk</Label>
        <span className="text-[12px] text-mute">{view.players.length} in the lobby</span>
      </div>
      <div ref={listRef} className="mt-3 px-4 max-h-[300px] overflow-y-auto space-y-3 [scrollbar-width:none]">
        {view.messages.length === 0 ? (
          <p className="py-6 text-center text-[14px] text-mute">Quiet in here. Say something.</p>
        ) : (
          <AnimatePresence initial={false}>
            {view.messages.map((m) => {
              const name = names.get(m.playerId) ?? "Someone";
              const mine = m.playerId === view.me.playerId;
              return (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className={cx("flex items-end gap-2.5", mine && "flex-row-reverse")}
                >
                  <Avatar name={name} size={28} />
                  <div className={cx("max-w-[78%]", mine && "text-right")}>
                    {!mine && <div className="text-[12px] text-mute mb-0.5 ml-1">{name}</div>}
                    <div
                      className={cx(
                        "inline-block px-3.5 py-2 rounded-2xl text-[15px] leading-snug text-left break-words",
                        mine ? "bg-volt text-volt-ink rounded-br-md" : "bg-raised-2 rounded-bl-md",
                      )}
                    >
                      {m.body}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
      {canPost && (
        <div className="p-3 mt-3 border-t border-line">
          <div className="flex gap-1.5 overflow-x-auto pb-2.5 [scrollbar-width:none]">
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                disabled={sending}
                className="h-8 px-3 rounded-full bg-raised-2 hover:bg-[#2a2a30] text-[13px] font-semibold whitespace-nowrap active:scale-95 transition"
              >
                {q}
              </button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send(text);
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 140))}
              placeholder="Talk your talk"
              enterKeyHint="send"
              className="flex-1 min-w-0 h-11 rounded-xl bg-raised border border-line px-3.5 text-[16px] outline-none focus:border-volt/60"
            />
            <Button size="md" type="submit" disabled={!text.trim()} loading={sending}>
              Send
            </Button>
          </form>
          {err && <p className="mt-2 text-[13px] text-miss">{err}</p>}
        </div>
      )}
    </section>
  );
}

/** Players change their photo and nickname. */
export function ProfileSheet({
  open,
  onClose,
  view,
  act,
}: {
  open: boolean;
  onClose: () => void;
  view: LobbyView;
  act: (a: Action) => Promise<unknown>;
}) {
  const me = view.players.find((p) => p.id === view.me.playerId);
  const [name, setName] = useState(me?.nickname ?? "");
  const [avatar, setAvatar] = useState<string | null>(me?.avatar ?? null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(me?.nickname ?? "");
      setAvatar(me?.avatar ?? null);
      setErr(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!me) return null;
  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await act({ type: "profile", nickname: name, avatar });
      try {
        localStorage.setItem("blitz:nickname", name.trim());
      } catch {}
      onClose();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Your profile">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={name || me.nickname} size={88} src={avatar} />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-dim mb-2">Profile picture</div>
            <div className="flex flex-wrap items-center gap-2">
              <ImageField value={avatar} onChange={setAvatar} size={44} label="Change profile picture" />
              <span className="text-[13px] text-mute">Tap to upload or paste a link</span>
            </div>
          </div>
        </div>
        <Field label="Nickname">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value.slice(0, 18))} autoComplete="nickname" />
        </Field>
        {err && <p className="text-[14px] text-miss">{err}</p>}
        <Button block onClick={save} loading={busy} disabled={!name.trim()}>
          Save
        </Button>
      </div>
    </Sheet>
  );
}
