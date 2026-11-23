import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import { db, type Db } from "./db";
import { hashToken, newToken, sameHash } from "./auth";
import { notify } from "./realtime";
import { DEFAULT_QUARTERS, render } from "@/lib/seed-questions";
import { leaderboard, scoreQuarter } from "@/lib/scoring";
import type {
  Action,
  BankQuestion,
  Key,
  LobbyInfo,
  LobbyView,
  Option,
  Phase,
  Question,
  Submission,
} from "@/lib/types";

export class GameError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type LobbyRow = {
  id: string;
  code: string;
  name: string;
  home_team: string;
  away_team: string;
  game_date: string | null;
  host_name: string;
  quarter: number;
  phase: Phase;
  published_through: number;
  version: number;
};
type PlayerRow = { id: string; nickname: string; is_host: boolean; joined_quarter: number; token_hash: string };
type QuestionRow = {
  id: string;
  quarter: number;
  position: number;
  category: string;
  prompt: string;
  options: Option[];
  rule: string;
};
type KeyRow = { question_id: string; correct_option: string | null; voided: boolean };
type SubmissionRow = {
  player_id: string;
  quarter: number;
  answers: Record<string, string>;
  lock_question: string | null;
  submitted_at: string | Date;
};
type BankRow = {
  id: string;
  category: string;
  prompt: string;
  options: Option[];
  rule: string;
  is_seed: boolean;
  created_by_lobby: string | null;
};

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export const normalizeCode = (c: string) => c.trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5);

const toIso = (d: string | Date | null) => (d == null ? null : typeof d === "string" ? d : d.toISOString());
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function requireUuid(id: unknown, what: string) {
  if (typeof id !== "string" || !UUID.test(id)) throw new GameError(404, `${what} not found.`);
  return id;
}

const lobbyInfo = (l: LobbyRow): LobbyInfo => ({
  id: l.id,
  code: l.code,
  name: l.name,
  home: l.home_team,
  away: l.away_team,
  gameDate: l.game_date,
  hostName: l.host_name,
  quarter: l.quarter,
  phase: l.phase,
  publishedThrough: l.published_through,
  version: l.version,
});
const question = (q: QuestionRow): Question => ({ ...q });
const submission = (s: SubmissionRow): Submission => ({
  playerId: s.player_id,
  quarter: s.quarter,
  answers: s.answers ?? {},
  lock: s.lock_question,
  submittedAt: toIso(s.submitted_at)!,
});
const bankQuestion = (b: BankRow, lobbyId?: string): BankQuestion => ({
  id: b.id,
  category: b.category,
  prompt: b.prompt,
  options: b.options,
  rule: b.rule,
  isSeed: b.is_seed,
  mine: !!lobbyId && b.created_by_lobby === lobbyId,
});

// ---------- validation ----------

const clean = (s: unknown, max: number) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

function cleanNickname(n: unknown) {
  const v = clean(n, 18);
  if (v.length < 1) throw new GameError(400, "Pick a nickname.");
  return v;
}

function cleanQuestion(q: { category?: unknown; prompt?: unknown; options?: unknown; rule?: unknown }) {
  const prompt = clean(q.prompt, 140);
  if (prompt.length < 6) throw new GameError(400, "Write a question first.");
  const labels = (Array.isArray(q.options) ? q.options : [])
    .map((o: unknown) => clean(typeof o === "string" ? o : (o as Option)?.label, 48))
    .filter(Boolean);
  if (labels.length < 2 || labels.length > 4) throw new GameError(400, "Questions need 2 to 4 answers.");
  if (new Set(labels.map((l) => l.toLowerCase())).size !== labels.length)
    throw new GameError(400, "Each answer needs to be different.");
  const options = labels.map((label, i) => ({ id: "abcd"[i], label }));
  return { category: clean(q.category, 32) || "Wild cards", prompt, options, rule: clean(q.rule, 280) };
}

// ---------- lobby lifecycle ----------

export async function createLobby(input: {
  name: unknown;
  hostName: unknown;
  home: unknown;
  away: unknown;
  gameDate: unknown;
  hostPlays: unknown;
}) {
  const name = clean(input.name, 32) || "Game Day";
  const hostName = cleanNickname(input.hostName);
  const home = clean(input.home, 24);
  const away = clean(input.away, 24);
  if (!home || !away) throw new GameError(400, "Pick both teams.");
  if (home.toLowerCase() === away.toLowerCase()) throw new GameError(400, "Pick two different teams.");
  const gameDate = /^\d{4}-\d{2}-\d{2}$/.test(String(input.gameDate ?? "")) ? String(input.gameDate) : null;
  const hostPlays = input.hostPlays !== false;

  const d = await db();
  const hostToken = newToken();
  const playerToken = hostPlays ? newToken() : null;

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = Array.from({ length: 5 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
    try {
      await d.tx(async (t) => {
        const [lobby] = await t.query<{ id: string }>(
          `insert into lobbies (code, name, home_team, away_team, game_date, host_name)
           values ($1, $2, $3, $4, $5, $6) returning id`,
          [code, name, home, away, gameDate, hostName],
        );
        await t.query(`insert into lobby_hosts (lobby_id, token_hash) values ($1, $2)`, [lobby.id, hashToken(hostToken)]);
        if (playerToken) {
          await t.query(
            `insert into players (lobby_id, nickname, token_hash, is_host) values ($1, $2, $3, true)`,
            [lobby.id, hostName, hashToken(playerToken)],
          );
        }
        const bank = await t.query<BankRow>(`select * from question_bank where is_seed`);
        const byId = new Map(bank.map((b) => [b.id, b]));
        for (let qi = 0; qi < 4; qi++) {
          for (let pos = 0; pos < DEFAULT_QUARTERS[qi].length; pos++) {
            const b = byId.get(DEFAULT_QUARTERS[qi][pos]);
            if (b) await insertFromBank(t, lobby.id, { home, away }, qi + 1, pos, b);
          }
        }
      });
      return { code, hostToken, playerToken };
    } catch (err) {
      if (String((err as Error).message).includes("lobbies_code_key")) continue;
      throw err;
    }
  }
  throw new GameError(500, "Could not create a lobby. Try again.");
}

async function insertFromBank(
  t: Db,
  lobbyId: string,
  teams: { home: string; away: string },
  quarter: number,
  position: number,
  b: { category: string; prompt: string; options: Option[]; rule: string; id?: string | null },
) {
  const ctx = { ...teams, quarter };
  const rows = await t.query<{ id: string }>(
    `insert into lobby_questions (lobby_id, quarter, position, category, prompt, options, rule, bank_id)
     values ($1, $2, $3, $4, $5, $6::text::jsonb, $7, $8)
     on conflict (lobby_id, quarter, position) do update set
       category = excluded.category, prompt = excluded.prompt, options = excluded.options,
       rule = excluded.rule, bank_id = excluded.bank_id
     returning id`,
    [
      lobbyId,
      quarter,
      position,
      b.category,
      render(b.prompt, ctx),
      JSON.stringify(b.options.map((o) => ({ id: o.id, label: render(o.label, ctx) }))),
      render(b.rule, ctx),
      b.id ?? null,
    ],
  );
  await t.query(`delete from question_keys where question_id = $1`, [rows[0].id]);
}

export async function joinLobby(rawCode: string, rawNickname: unknown, existingToken: string | null) {
  const code = normalizeCode(rawCode);
  const d = await db();
  const [lobby] = await d.query<LobbyRow>(`select * from lobbies where code = $1`, [code]);
  if (!lobby) throw new GameError(404, "No lobby with that code.");

  if (existingToken) {
    const [p] = await d.query<{ id: string }>(`select id from players where lobby_id = $1 and token_hash = $2`, [
      lobby.id,
      hashToken(existingToken),
    ]);
    if (p) return { code, token: existingToken };
  }
  if (lobby.phase === "final") throw new GameError(409, "This game is already over.");

  const nickname = cleanNickname(rawNickname);
  const token = newToken();
  const joinedQuarter = lobby.phase === "setup" || lobby.phase === "picks" ? lobby.quarter : lobby.quarter + 1;
  const rows = await d.query<{ id: string }>(
    `insert into players (lobby_id, nickname, token_hash, joined_quarter)
     values ($1, $2, $3, $4) on conflict do nothing returning id`,
    [lobby.id, nickname, hashToken(token), Math.min(joinedQuarter, 4)],
  );
  if (!rows.length) throw new GameError(409, `Someone's already playing as ${nickname}. Try another name.`);
  await notify(code, await bump(d, lobby));
  return { code, token };
}

export async function lobbyExists(rawCode: string) {
  const d = await db();
  const [l] = await d.query<{ name: string; home_team: string; away_team: string; phase: Phase }>(
    `select name, home_team, away_team, phase from lobbies where code = $1`,
    [normalizeCode(rawCode)],
  );
  return l ? { name: l.name, home: l.home_team, away: l.away_team, over: l.phase === "final" } : null;
}

async function bump(d: Db, lobby: LobbyRow) {
  const [r] = await d.query<{ version: number }>(
    `update lobbies set version = version + 1 where id = $1 returning version`,
    [lobby.id],
  );
  lobby.version = r.version;
  return r.version;
}

// ---------- identity ----------

type Tokens = { player: string | null; host: string | null };

async function identify(d: Db, lobby: LobbyRow, tokens: Tokens) {
  let isHost = false;
  if (tokens.host) {
    const [h] = await d.query<{ token_hash: string }>(`select token_hash from lobby_hosts where lobby_id = $1`, [
      lobby.id,
    ]);
    isHost = !!h && sameHash(h.token_hash, hashToken(tokens.host));
  }
  let player: PlayerRow | null = null;
  if (tokens.player) {
    const [p] = await d.query<PlayerRow>(`select * from players where lobby_id = $1 and token_hash = $2`, [
      lobby.id,
      hashToken(tokens.player),
    ]);
    player = p ?? null;
  }
  return { isHost, player };
}

// ---------- view ----------

export async function getView(rawCode: string, tokens: Tokens, d?: Db): Promise<LobbyView> {
  d ??= await db();
  const code = normalizeCode(rawCode);
  const [lobby] = await d.query<LobbyRow>(`select * from lobbies where code = $1`, [code]);
  if (!lobby) throw new GameError(404, "No lobby with that code.");
  return buildView(d, lobby, tokens);
}

async function buildView(d: Db, lobby: LobbyRow, tokens: Tokens): Promise<LobbyView> {
  const { isHost, player } = await identify(d, lobby, tokens);
  if (!isHost && !player) throw new GameError(401, "Join this lobby first.");

  const [playerRows, questionRows, keyRows, submissionRows] = await Promise.all([
    d.query<PlayerRow>(`select * from players where lobby_id = $1 order by created_at, id`, [lobby.id]),
    d.query<QuestionRow>(
      `select id, quarter, position, category, prompt, options, rule from lobby_questions
       where lobby_id = $1 order by quarter, position`,
      [lobby.id],
    ),
    d.query<KeyRow>(`select question_id, correct_option, voided from question_keys where lobby_id = $1`, [lobby.id]),
    d.query<SubmissionRow>(
      `select player_id, quarter, answers, lock_question, submitted_at from submissions where lobby_id = $1`,
      [lobby.id],
    ),
  ]);

  const info = lobbyInfo(lobby);
  const all = questionRows.map(question);
  const keys: Record<string, Key> = {};
  for (const k of keyRows) keys[k.question_id] = { correct: k.correct_option, voided: k.voided };
  const subs = submissionRows.map(submission);
  const currentSubs = subs.filter((s) => s.quarter === lobby.quarter);
  const submittedIds = new Set(currentSubs.map((s) => s.playerId));

  const visible = all.filter(
    (q) => isHost || q.quarter < lobby.quarter || (q.quarter === lobby.quarter && lobby.phase !== "setup"),
  );
  const roundStarted = ["live", "grading", "results", "final"].includes(lobby.phase);

  const results = [];
  for (let q = 1; q <= lobby.published_through; q++) results.push(scoreQuarter(q, all, keys, subs));

  const players = playerRows.map((p) => ({
    id: p.id,
    nickname: p.nickname,
    isHost: p.is_host,
    joinedQuarter: p.joined_quarter,
    submitted: submittedIds.has(p.id),
  }));

  return {
    lobby: info,
    me: { playerId: player?.id ?? null, nickname: player?.nickname ?? null, isHost },
    players,
    questions: visible,
    mySubmission: player ? (currentSubs.find((s) => s.playerId === player.id) ?? null) : null,
    submittedCount: currentSubs.length,
    revealed: roundStarted ? currentSubs : null,
    results,
    leaderboard: leaderboard(players, results),
    host: isHost
      ? {
          allQuestions: all,
          keys,
          preview: roundStarted ? scoreQuarter(lobby.quarter, all, keys, subs) : null,
        }
      : undefined,
  };
}

// ---------- actions ----------

const NEXT: Partial<Record<Action["type"], [Phase, Phase]>> = {
  openPicks: ["setup", "picks"],
  startRound: ["picks", "live"],
  endRound: ["live", "grading"],
};

export async function act(rawCode: string, tokens: Tokens, action: Action): Promise<LobbyView> {
  const d = await db();
  const code = normalizeCode(rawCode);
  let changed = false;
  let version = 0;

  const view = await d.tx(async (t) => {
    const [lobby] = await t.query<LobbyRow>(`select * from lobbies where code = $1 for update`, [code]);
    if (!lobby) throw new GameError(404, "No lobby with that code.");
    const { isHost, player } = await identify(t, lobby, tokens);

    if (action.type === "submit") {
      if (!player) throw new GameError(401, "Join this lobby first.");
      changed = await submit(t, lobby, player, action);
    } else {
      if (!isHost) throw new GameError(403, "Only the host can do that.");
      changed = await hostAction(t, lobby, action);
    }
    if (changed) version = await bump(t, lobby);
    return buildView(t, lobby, tokens);
  });

  if (changed) await notify(code, version);
  return view;
}

async function submit(t: Db, lobby: LobbyRow, player: PlayerRow, a: Extract<Action, { type: "submit" }>) {
  if (lobby.phase !== "picks") throw new GameError(409, "Picks are closed.");
  const qs = await t.query<QuestionRow>(
    `select id, options from lobby_questions where lobby_id = $1 and quarter = $2`,
    [lobby.id, lobby.quarter],
  );
  const answers: Record<string, string> = {};
  for (const q of qs) {
    const pick = a.answers?.[q.id];
    if (pick && q.options.some((o) => o.id === pick)) answers[q.id] = pick;
  }
  const lock = a.lock && answers[a.lock] ? a.lock : null;
  const rows = await t.query(
    `insert into submissions (lobby_id, player_id, quarter, answers, lock_question)
     values ($1, $2, $3, $4::text::jsonb, $5) on conflict (player_id, quarter) do nothing returning id`,
    [lobby.id, player.id, lobby.quarter, JSON.stringify(answers), lock],
  );
  // A repeat submission is a no-op: the first set of picks stands.
  return rows.length > 0;
}

function checkSlot(quarter: unknown, position: unknown) {
  const ok = (n: unknown, lo: number, hi: number) => Number.isInteger(n) && (n as number) >= lo && (n as number) <= hi;
  if (!ok(quarter, 1, 4) || !ok(position, 0, 4)) throw new GameError(400, "Bad slot.");
}

function editable(lobby: LobbyRow, quarter: number) {
  return quarter > lobby.quarter || (quarter === lobby.quarter && lobby.phase === "setup");
}

async function hostAction(t: Db, lobby: LobbyRow, a: Action): Promise<boolean> {
  const transition = NEXT[a.type];
  if (transition) {
    const [from, to] = transition;
    if (lobby.phase !== from) return false;
    if (a.type === "openPicks") {
      const [{ n }] = await t.query<{ n: number }>(
        `select count(*)::int as n from lobby_questions where lobby_id = $1 and quarter = $2`,
        [lobby.id, lobby.quarter],
      );
      if (n === 0) throw new GameError(400, `Add at least one question to Q${lobby.quarter} first.`);
    }
    await t.query(`update lobbies set phase = $2 where id = $1`, [lobby.id, to]);
    lobby.phase = to;
    return true;
  }

  switch (a.type) {
    case "grade": {
      requireUuid(a.questionId, "Question");
      const [q] = await t.query<QuestionRow>(`select id, quarter, options from lobby_questions where id = $1 and lobby_id = $2`, [
        a.questionId,
        lobby.id,
      ]);
      if (!q) throw new GameError(404, "Question not found.");
      const started = q.quarter < lobby.quarter || ["live", "grading", "results", "final"].includes(lobby.phase);
      if (!started) throw new GameError(409, "Grade questions once the round has started.");
      const correct = a.voided ? null : a.correct;
      if (correct !== null && !q.options.some((o) => o.id === correct)) throw new GameError(400, "Unknown answer.");
      if (correct === null && !a.voided) {
        await t.query(`delete from question_keys where question_id = $1`, [q.id]);
      } else {
        await t.query(
          `insert into question_keys (question_id, lobby_id, correct_option, voided) values ($1, $2, $3, $4)
           on conflict (question_id) do update set correct_option = excluded.correct_option,
             voided = excluded.voided, graded_at = now()`,
          [q.id, lobby.id, correct, !!a.voided],
        );
      }
      return true;
    }
    case "publish": {
      if (lobby.phase !== "grading" && lobby.phase !== "live") return false;
      const [{ n }] = await t.query<{ n: number }>(
        `select count(*)::int as n from lobby_questions q
         left join question_keys k on k.question_id = q.id
         where q.lobby_id = $1 and q.quarter = $2 and (k.question_id is null or (k.correct_option is null and not k.voided))`,
        [lobby.id, lobby.quarter],
      );
      if (n > 0) throw new GameError(400, `Grade or void ${n === 1 ? "the last question" : `${n} more questions`} first.`);
      await t.query(`update lobbies set phase = 'results', published_through = quarter where id = $1`, [lobby.id]);
      lobby.phase = "results";
      lobby.published_through = lobby.quarter;
      return true;
    }
    case "nextQuarter": {
      if (lobby.phase !== "results") return false;
      if (lobby.quarter >= 4) {
        await t.query(`update lobbies set phase = 'final' where id = $1`, [lobby.id]);
        lobby.phase = "final";
      } else {
        await t.query(`update lobbies set phase = 'setup', quarter = quarter + 1 where id = $1`, [lobby.id]);
        lobby.phase = "setup";
        lobby.quarter += 1;
      }
      return true;
    }
    case "assign": {
      checkSlot(a.quarter, a.position);
      if (!editable(lobby, a.quarter)) throw new GameError(409, "Picks are already open for that quarter.");
      const [b] = await t.query<BankRow>(`select * from question_bank where id = $1`, [a.bankId]);
      if (!b) throw new GameError(404, "Question not found.");
      await insertFromBank(t, lobby.id, { home: lobby.home_team, away: lobby.away_team }, a.quarter, a.position, b);
      return true;
    }
    case "saveQuestion": {
      checkSlot(a.quarter, a.position);
      if (!editable(lobby, a.quarter)) throw new GameError(409, "Picks are already open for that quarter.");
      const q = cleanQuestion(a.question);
      let bankId: string | null = null;
      if (a.saveToBank) {
        bankId = `c-${randomUUID()}`;
        await t.query(
          `insert into question_bank (id, category, prompt, options, rule, created_by_lobby)
           values ($1, $2, $3, $4::text::jsonb, $5, $6)`,
          [bankId, q.category, q.prompt, JSON.stringify(q.options), q.rule, lobby.id],
        );
      }
      await insertFromBank(t, lobby.id, { home: lobby.home_team, away: lobby.away_team }, a.quarter, a.position, {
        ...q,
        id: bankId,
      });
      return true;
    }
    case "removeQuestion": {
      requireUuid(a.questionId, "Question");
      const [q] = await t.query<QuestionRow>(`select quarter from lobby_questions where id = $1 and lobby_id = $2`, [
        a.questionId,
        lobby.id,
      ]);
      if (!q) return false;
      if (!editable(lobby, q.quarter)) throw new GameError(409, "Picks are already open for that quarter.");
      await t.query(`delete from lobby_questions where id = $1`, [a.questionId]);
      return true;
    }
    case "updateGame": {
      const name = clean(a.name, 32) || lobby.name;
      const home = clean(a.home, 24) || lobby.home_team;
      const away = clean(a.away, 24) || lobby.away_team;
      if (home.toLowerCase() === away.toLowerCase()) throw new GameError(400, "Pick two different teams.");
      const gameDate = a.gameDate && /^\d{4}-\d{2}-\d{2}$/.test(a.gameDate) ? a.gameDate : null;
      // Carry team renames into questions that players haven't seen yet.
      const swaps: [string, string][] = [];
      if (home !== lobby.home_team) swaps.push([lobby.home_team, home]);
      if (away !== lobby.away_team) swaps.push([lobby.away_team, away]);
      if (swaps.length) {
        const qs = await t.query<QuestionRow>(`select * from lobby_questions where lobby_id = $1`, [lobby.id]);
        const swap = (s: string) => swaps.reduce((acc, [from, to]) => acc.replaceAll(from, to), s);
        for (const q of qs.filter((q) => editable(lobby, q.quarter))) {
          await t.query(`update lobby_questions set prompt = $2, options = $3::text::jsonb, rule = $4 where id = $1`, [
            q.id,
            swap(q.prompt),
            JSON.stringify(q.options.map((o) => ({ ...o, label: swap(o.label) }))),
            swap(q.rule),
          ]);
        }
      }
      await t.query(`update lobbies set name = $2, home_team = $3, away_team = $4, game_date = $5 where id = $1`, [
        lobby.id,
        name,
        home,
        away,
        gameDate,
      ]);
      Object.assign(lobby, { name, home_team: home, away_team: away, game_date: gameDate });
      return true;
    }
    case "removePlayer": {
      requireUuid(a.playerId, "Player");
      const rows = await t.query(`delete from players where id = $1 and lobby_id = $2 returning id`, [
        a.playerId,
        lobby.id,
      ]);
      return rows.length > 0;
    }
    default:
      throw new GameError(400, "Unknown action.");
  }
}

// ---------- question bank ----------

async function requireHost(rawCode: string, tokens: Tokens) {
  const d = await db();
  const [lobby] = await d.query<LobbyRow>(`select * from lobbies where code = $1`, [normalizeCode(rawCode)]);
  if (!lobby) throw new GameError(404, "No lobby with that code.");
  const { isHost } = await identify(d, lobby, tokens);
  if (!isHost) throw new GameError(403, "Only the host can do that.");
  return { d, lobby };
}

export async function listBank(rawCode: string, tokens: Tokens) {
  const { d, lobby } = await requireHost(rawCode, tokens);
  const rows = await d.query<BankRow>(
    `select * from question_bank order by is_seed asc, (created_by_lobby = $1) desc nulls last, created_at desc, id`,
    [lobby.id],
  );
  return rows.map((r) => bankQuestion(r, lobby.id));
}

export async function saveBankQuestion(
  rawCode: string,
  tokens: Tokens,
  input: { id?: string; category?: unknown; prompt?: unknown; options?: unknown; rule?: unknown },
) {
  const { d, lobby } = await requireHost(rawCode, tokens);
  const q = cleanQuestion(input);
  if (input.id) {
    const [existing] = await d.query<BankRow>(`select * from question_bank where id = $1`, [input.id]);
    if (existing && !existing.is_seed && existing.created_by_lobby === lobby.id) {
      const [row] = await d.query<BankRow>(
        `update question_bank set category = $2, prompt = $3, options = $4::text::jsonb, rule = $5 where id = $1 returning *`,
        [input.id, q.category, q.prompt, JSON.stringify(q.options), q.rule],
      );
      return bankQuestion(row, lobby.id);
    }
  }
  // New question, or an edit of a built-in/someone else's question: save as your own copy.
  const [row] = await d.query<BankRow>(
    `insert into question_bank (id, category, prompt, options, rule, created_by_lobby)
     values ($1, $2, $3, $4::text::jsonb, $5, $6) returning *`,
    [`c-${randomUUID()}`, q.category, q.prompt, JSON.stringify(q.options), q.rule, lobby.id],
  );
  return bankQuestion(row, lobby.id);
}

export async function deleteBankQuestion(rawCode: string, tokens: Tokens, id: string) {
  const { d, lobby } = await requireHost(rawCode, tokens);
  const rows = await d.query(
    `delete from question_bank where id = $1 and not is_seed and created_by_lobby = $2 returning id`,
    [id, lobby.id],
  );
  if (!rows.length) throw new GameError(403, "You can only delete questions you created.");
}

export { requireHost };
