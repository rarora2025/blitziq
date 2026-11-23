"use client";

import { motion } from "motion/react";
import type { LobbyView } from "@/lib/types";
import { Button, InviteButton, Label } from "../ui";
import { MatchupCard, PlayerGrid, Shell, ease } from "./common";

export function WaitingRoom({
  view,
  onOpenPicks,
  opening,
}: {
  view: LobbyView;
  onOpenPicks?: () => void;
  opening?: boolean;
}) {
  const { lobby, players, me } = view;
  const late = me.playerId && players.find((p) => p.id === me.playerId)?.joinedQuarter;
  const count = players.length;

  return (
    <Shell
      footer={
        me.isHost && onOpenPicks ? (
          <Button block onClick={onOpenPicks} loading={opening}>
            Open Q{lobby.quarter} Picks
          </Button>
        ) : undefined
      }
    >
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} className="pt-6">
        <h1 className="text-[40px] font-bold tracking-[-0.035em] leading-[1.02]">{lobby.name}</h1>
        <p className="mt-2 text-[15px] text-dim">
          Hosted by <span className="text-fg font-medium">{lobby.hostName}</span>
        </p>
        <div className="mt-5">
          <MatchupCard lobby={lobby} />
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease }}
        className="mt-6 rounded-2xl border border-volt/25 bg-volt/[0.04] px-4 py-4 flex items-center gap-3.5"
      >
        <span className="relative flex size-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-volt opacity-60 animate-ping" />
          <span className="relative inline-flex size-2.5 rounded-full bg-volt" />
        </span>
        <div>
          <div className="text-[17px] font-semibold tracking-tight">
            {me.isHost ? `Open Q${lobby.quarter} picks when everyone's in.` : `Waiting for host to open Q${lobby.quarter}.`}
          </div>
          <div className="text-[14px] text-dim mt-0.5">
            {lobby.quarter === 1 ? "Five questions. One Lock. Most points wins." : `Q${lobby.quarter} picks are next.`}
          </div>
        </div>
      </motion.section>

      <section className="mt-9">
        <div className="flex items-end justify-between mb-5">
          <div>
            <Label>In the lobby</Label>
            <div className="mt-1.5 text-[22px] font-semibold tracking-tight tnum">
              {count} {count === 1 ? "player" : "players"} joined
            </div>
          </div>
          <InviteButton code={lobby.code} />
        </div>
        {count === 0 ? (
          <p className="text-dim text-[15px] py-6 text-center">Share the code. Friends show up here as they join.</p>
        ) : (
          <PlayerGrid players={players} meId={me.playerId} />
        )}
        {typeof late === "number" && late > lobby.quarter && (
          <p className="mt-6 text-[14px] text-mute text-center">You&apos;re in from Q{late}.</p>
        )}
      </section>
    </Shell>
  );
}
