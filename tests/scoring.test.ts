import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreQuarter, leaderboard } from "../lib/scoring.ts";
import type { Question, Submission } from "../lib/types.ts";

const q = (id: string, position: number): Question => ({
  id, quarter: 1, position, category: "Player battles", prompt: id, rule: "",
  options: [{ id: "a", label: "Allen" }, { id: "b", label: "Maye" }],
});
const sub = (playerId: string, answers: Record<string, string>, lock: string | null = null): Submission => ({
  playerId, quarter: 1, answers, lock, submittedAt: "",
});
const questions = [q("q1", 0), q("q2", 1)];

test("brief example: one correct = 50, as lock = 100", () => {
  const subs = [
    sub("p1", { q1: "a" }), sub("p2", { q1: "a" }), sub("p3", { q1: "a" }), sub("p4", { q1: "a" }),
    sub("p5", { q1: "b" }, "q1"),
  ];
  let r = scoreQuarter(1, questions, { q1: { correct: "b", voided: false } }, subs);
  assert.equal(r.totals.p5, 100);
  assert.equal(r.totals.p1, 0);
  r = scoreQuarter(1, questions, { q1: { correct: "b", voided: false } }, [...subs.slice(0, 4), sub("p5", { q1: "b" })]);
  assert.equal(r.totals.p5, 50);
});

test("two correct = 10 each, 20 for a lock (not cumulative)", () => {
  const subs = [sub("p1", { q1: "b" }, "q1"), sub("p2", { q1: "b" }), sub("p3", { q1: "a" }, "q1")];
  const r = scoreQuarter(1, questions, { q1: { correct: "b", voided: false } }, subs);
  assert.deepEqual(r.totals, { p1: 20, p2: 10, p3: 0 });
  assert.equal(r.picks.p1.q1.unique, false);
});

test("uniqueness ignores other players' locks", () => {
  const subs = [sub("p1", { q1: "b" }, "q1"), sub("p2", { q1: "b" }, "q1")];
  const r = scoreQuarter(1, questions, { q1: { correct: "b", voided: false } }, subs);
  assert.deepEqual(r.totals, { p1: 20, p2: 20 });
});

test("voided, ungraded and unanswered questions score zero", () => {
  const subs = [sub("p1", { q1: "b", q2: "a" }, "q1"), sub("p2", {})];
  const r = scoreQuarter(1, questions, { q1: { correct: "b", voided: true } }, subs);
  assert.deepEqual(r.totals, { p1: 0, p2: 0 });
});

test("a lock on an unanswered question does nothing", () => {
  const r = scoreQuarter(1, questions, { q1: { correct: "a", voided: false } }, [sub("p1", { q1: "a" }, "q2"), sub("p2", { q1: "a" })]);
  assert.deepEqual(r.totals, { p1: 10, p2: 10 });
});

test("leaderboard ranks ties together and tracks movement", () => {
  const players = [{ id: "p1", nickname: "Ann" }, { id: "p2", nickname: "Ben" }, { id: "p3", nickname: "Cal" }];
  const q1 = { quarter: 1, questions: [], picks: {}, totals: { p1: 50, p2: 10, p3: 0 } };
  const q2 = { quarter: 2, questions: [], picks: {}, totals: { p1: 0, p2: 40, p3: 60 } };
  const rows = leaderboard(players, [q1, q2]);
  assert.deepEqual(rows.map((r) => [r.nickname, r.rank, r.total, r.latest, r.movement]), [
    ["Cal", 1, 60, 60, 2],
    ["Ann", 2, 50, 0, -1],
    ["Ben", 2, 50, 40, 0],
  ]);
});
