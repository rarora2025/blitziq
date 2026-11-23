export type Phase = "setup" | "picks" | "live" | "grading" | "results" | "final";

export const CATEGORIES = [
  "Player battles",
  "Biggest plays",
  "Touchdowns",
  "Comebacks",
  "Turnovers",
  "Coaching decisions",
  "Quarter scoring",
  "Fourth-down gambles",
  "Wild cards",
] as const;
export type Category = (typeof CATEGORIES)[number] | string;

export interface Option {
  id: string;
  label: string;
}

/** A reusable template in the bank. May contain {home}, {away} and {q} placeholders. */
export interface BankQuestion {
  id: string;
  category: Category;
  prompt: string;
  options: Option[];
  rule: string;
  isSeed: boolean;
  mine?: boolean;
}

/** A question assigned to a lobby quarter, rendered with team names. */
export interface Question {
  id: string;
  quarter: number;
  position: number;
  category: Category;
  prompt: string;
  options: Option[];
  rule: string;
}

export interface Key {
  correct: string | null;
  voided: boolean;
}

export interface Submission {
  playerId: string;
  quarter: number;
  answers: Record<string, string>;
  lock: string | null;
  submittedAt: string;
}

export interface PlayerSummary {
  id: string;
  nickname: string;
  isHost: boolean;
  joinedQuarter: number;
  submitted: boolean;
}

export interface PickResult {
  option: string | null;
  lock: boolean;
  correct: boolean;
  unique: boolean;
  points: number;
}

export interface QuestionOutcome {
  questionId: string;
  correct: string | null;
  voided: boolean;
  counts: Record<string, number>;
  correctCount: number;
  answered: number;
}

export interface QuarterResult {
  quarter: number;
  questions: QuestionOutcome[];
  /** playerId -> questionId -> result */
  picks: Record<string, Record<string, PickResult>>;
  /** playerId -> points for the quarter */
  totals: Record<string, number>;
}

export interface LeaderRow {
  playerId: string;
  nickname: string;
  rank: number;
  total: number;
  latest: number;
  /** positive = moved up */
  movement: number;
}

export interface LobbyInfo {
  id: string;
  code: string;
  name: string;
  home: string;
  away: string;
  gameDate: string | null;
  hostName: string;
  quarter: number;
  phase: Phase;
  publishedThrough: number;
  homeScore: number;
  awayScore: number;
  version: number;
}

export interface LobbyView {
  lobby: LobbyInfo;
  me: { playerId: string | null; nickname: string | null; isHost: boolean };
  players: PlayerSummary[];
  /** Current quarter's questions; empty for players while the host is still setting up. */
  questions: Question[];
  mySubmission: Submission | null;
  submittedCount: number;
  /** Everyone's picks for the current quarter, once the round has started. */
  revealed: Submission[] | null;
  /** Published quarters only. */
  results: QuarterResult[];
  leaderboard: LeaderRow[];
  host?: {
    allQuestions: Question[];
    keys: Record<string, Key>;
    /** Live scoring of the current quarter from the host's grades, before publishing. */
    preview: QuarterResult | null;
  };
}

export type Action =
  | { type: "openPicks" }
  | { type: "startRound" }
  | { type: "endRound" }
  | { type: "publish" }
  | { type: "nextQuarter" }
  | { type: "grade"; questionId: string; correct: string | null; voided: boolean }
  | { type: "assign"; quarter: number; position: number; bankId: string }
  | {
      type: "saveQuestion";
      quarter: number;
      position: number;
      question: { category: string; prompt: string; options: Option[]; rule: string };
      saveToBank?: boolean;
    }
  | { type: "removeQuestion"; questionId: string }
  | { type: "moveQuestion"; questionId: string; direction: -1 | 1 }
  | { type: "addScore"; side: "home" | "away"; delta: number }
  | { type: "updateGame"; name: string; home: string; away: string; gameDate: string | null }
  | { type: "submit"; answers: Record<string, string>; lock: string | null }
  | { type: "removePlayer"; playerId: string };
