import type { Key, LeaderRow, PickResult, Question, QuarterResult, Submission } from "./types";

export const POINTS = { correct: 10, unique: 50, lock: 20, uniqueLock: 100 } as const;

/** Points for one correct answer. Values are alternatives, never added together. */
export function pointsFor(isUnique: boolean, isLock: boolean) {
  if (isUnique) return isLock ? POINTS.uniqueLock : POINTS.unique;
  return isLock ? POINTS.lock : POINTS.correct;
}

/**
 * Scores one quarter. Pure and deterministic: the same questions, keys and submissions
 * always produce the same result, so corrections simply recompute from scratch.
 */
export function scoreQuarter(
  quarter: number,
  questions: Question[],
  keys: Record<string, Key>,
  submissions: Submission[],
): QuarterResult {
  const qs = questions.filter((q) => q.quarter === quarter).sort((a, b) => a.position - b.position);
  const subs = submissions.filter((s) => s.quarter === quarter);
  const picks: QuarterResult["picks"] = {};
  const totals: QuarterResult["totals"] = {};
  for (const s of subs) {
    picks[s.playerId] = {};
    totals[s.playerId] = 0;
  }

  const outcomes = qs.map((q) => {
    const key = keys[q.id];
    const voided = !!key?.voided;
    const correct = voided ? null : (key?.correct ?? null);
    const counts: Record<string, number> = {};
    for (const o of q.options) counts[o.id] = 0;
    let answered = 0;
    for (const s of subs) {
      const a = s.answers[q.id];
      if (a && a in counts) {
        counts[a]++;
        answered++;
      }
    }
    const correctCount = correct ? (counts[correct] ?? 0) : 0;
    const unique = correctCount === 1;

    for (const s of subs) {
      const option = s.answers[q.id] && s.answers[q.id] in counts ? s.answers[q.id] : null;
      const lock = s.lock === q.id && option !== null;
      const isCorrect = !voided && correct !== null && option === correct;
      const points = isCorrect ? pointsFor(unique, lock) : 0;
      const r: PickResult = { option, lock, correct: isCorrect, unique: isCorrect && unique, points };
      picks[s.playerId][q.id] = r;
      totals[s.playerId] += points;
    }
    return { questionId: q.id, correct, voided, counts, correctCount, answered };
  });

  return { quarter, questions: outcomes, picks, totals };
}

/** Standard competition ranking (1, 1, 3) by total; ties broken alphabetically for display. */
function rank(rows: { playerId: string; nickname: string; total: number }[]) {
  const sorted = [...rows].sort((a, b) => b.total - a.total || a.nickname.localeCompare(b.nickname));
  const ranks = new Map<string, number>();
  sorted.forEach((r, i) => {
    const prev = sorted[i - 1];
    ranks.set(r.playerId, prev && prev.total === r.total ? ranks.get(prev.playerId)! : i + 1);
  });
  return { sorted, ranks };
}

export function leaderboard(
  players: { id: string; nickname: string }[],
  results: QuarterResult[],
): LeaderRow[] {
  const ordered = [...results].sort((a, b) => a.quarter - b.quarter);
  const latest = ordered[ordered.length - 1];
  const totalThrough = (n: number, id: string) =>
    ordered.slice(0, n).reduce((sum, r) => sum + (r.totals[id] ?? 0), 0);

  const now = rank(players.map((p) => ({ playerId: p.id, nickname: p.nickname, total: totalThrough(ordered.length, p.id) })));
  const before = rank(
    players.map((p) => ({ playerId: p.id, nickname: p.nickname, total: totalThrough(ordered.length - 1, p.id) })),
  );

  return now.sorted.map((r) => ({
    playerId: r.playerId,
    nickname: r.nickname,
    rank: now.ranks.get(r.playerId)!,
    total: r.total,
    latest: latest ? (latest.totals[r.playerId] ?? 0) : 0,
    movement: ordered.length > 1 ? before.ranks.get(r.playerId)! - now.ranks.get(r.playerId)! : 0,
  }));
}
