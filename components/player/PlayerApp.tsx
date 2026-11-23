"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useLobby, ApiError } from "@/lib/client";
import { defaultPickMinutes, type Action, type LobbyView } from "@/lib/types";
import { Avatar, AvatarProvider, Toast, Wordmark } from "../ui";
import { LobbyChat, ProfileSheet, useSecondsLeft } from "../screens/social";
import { GameHeader, ease } from "../screens/common";
import { WaitingRoom } from "../screens/WaitingRoom";
import { PicksScreen } from "../screens/Picks";
import { LiveScreen, SubmittedScreen } from "../screens/Round";
import { ResultsScreen } from "../screens/Results";
import { FinalScreen } from "../screens/Final";

export function screenFor(view: LobbyView, timeUp = false) {
  const { phase } = view.lobby;
  if (phase === "setup") return "waiting";
  if (phase === "picks") return view.mySubmission || !view.me.playerId ? "submitted" : timeUp ? "missed" : "picks";
  if (phase === "live" || phase === "grading") return "live";
  if (phase === "results") return "results";
  return "final";
}

export function PlayerScreens({
  view,
  act,
  busy,
}: {
  view: LobbyView;
  act?: (a: Action) => Promise<unknown>;
  busy?: string | null;
}) {
  const secondsLeft = useSecondsLeft(view.lobby.phase === "picks" ? view.lobby.picksCloseAt : null, view.now);
  // Hold the picks screen for a moment at 0:00 so the auto-submit can land.
  const [graceOver, setGraceOver] = useState(false);
  useEffect(() => {
    setGraceOver(false);
    if (secondsLeft !== 0) return;
    const t = setTimeout(() => setGraceOver(true), 3000);
    return () => clearTimeout(t);
  }, [secondsLeft]);
  const screen = screenFor(view, secondsLeft === 0 && graceOver);
  const host = view.me.isHost && act;
  const q = view.lobby.quarter;
  const [profileOpen, setProfileOpen] = useState(false);
  const meName = view.me.nickname;
  return (
    <AvatarProvider players={view.players}>
      <GameHeader
        lobby={view.lobby}
        hostLink={view.me.isHost}
        right={
          meName && act ? (
            <button onClick={() => setProfileOpen(true)} aria-label="Your profile" className="rounded-full active:scale-95 transition">
              <Avatar name={meName} size={34} />
            </button>
          ) : undefined
        }
      />
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={screen + q}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.32, ease }}
        >
          {screen === "waiting" && (
            <WaitingRoom view={view} onOpenPicks={host ? () => act({ type: "openPicks", minutes: defaultPickMinutes(q) }) : undefined} opening={busy === "openPicks"} />
          )}
          {screen === "picks" && (
            <PicksScreen view={view} secondsLeft={secondsLeft} submitting={busy === "submit"} onSubmit={(d) => act?.({ type: "submit", ...d })} />
          )}
          {screen === "missed" && <MissedScreen view={view} act={act} />}
          {screen === "submitted" && <SubmittedScreen view={view} secondsLeft={secondsLeft} act={act} />}
          {screen === "live" && <LiveScreen view={view} act={act} />}
          {screen === "results" && (
            <ResultsScreen
              view={view}
              onNext={host ? () => act({ type: "nextQuarter" }) : undefined}
              nextLabel={q < 4 ? `Start Q${q + 1}` : "Crown the Winner"}
              busy={busy === "nextQuarter"}
            />
          )}
          {screen === "final" && <FinalScreen view={view} />}
        </motion.main>
      </AnimatePresence>
      {act && <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} view={view} act={act} />}
    </AvatarProvider>
  );
}

function MissedScreen({ view, act }: { view: LobbyView; act?: (a: Action) => Promise<unknown> }) {
  const quarter = view.lobby.quarter;
  return (
    <div className="max-w-md mx-auto px-5 pt-16 pb-10 text-center">
      <h1 className="text-[36px] font-bold tracking-[-0.03em] leading-none">Time&apos;s up.</h1>
      <p className="mt-3 text-[17px] text-dim">
        Q{quarter} picks are locked. {quarter < 4 ? `You're in for Q${quarter + 1}.` : "Catch the results when they drop."}
      </p>
      <div className="mt-10 text-left">
        <LobbyChat view={view} act={act} />
      </div>
    </div>
  );
}

export function PlayerApp({ code }: { code: string }) {
  const router = useRouter();
  const { view, error, act } = useLobby(code);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (error?.status === 401) router.replace(`/j/${code}`);
  }, [error, code, router]);

  useEffect(() => {
    if (view && view.me.isHost && !view.me.playerId) router.replace(`/play/${code}/host`);
  }, [view, code, router]);

  const run = async (a: Action) => {
    setBusy(a.type);
    try {
      await act(a);
      if (a.type === "submit") {
        try {
          localStorage.removeItem(`blitz:${code}:q${view?.lobby.quarter}:draft`);
        } catch {}
        navigator.vibrate?.([10, 40, 18]);
      }
    } catch (e) {
      setToast(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  };

  if (error && error.status === 404) return <NotFound />;
  if (!view) return <Loading />;

  return (
    <div className="min-h-dvh field-light">
      <PlayerScreens view={view} act={run} busy={busy} />
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}

export function Loading() {
  return (
    <div className="min-h-dvh flex items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.6, repeat: Infinity, delay: 0.2 }}>
        <Wordmark className="text-4xl" />
      </motion.div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center text-center px-6">
      <Wordmark className="text-5xl" />
      <p className="mt-6 text-[20px] font-semibold tracking-tight">This lobby doesn&apos;t exist.</p>
      <p className="mt-2 text-dim">Double-check the code with your host.</p>
      <Link href="/" className="mt-8 h-12 px-6 rounded-2xl bg-raised-2 font-semibold inline-flex items-center">
        Enter a code
      </Link>
    </div>
  );
}
