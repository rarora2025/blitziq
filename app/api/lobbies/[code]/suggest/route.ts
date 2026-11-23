import { GameError, requireHost } from "@/lib/server/game";
import { readTokens } from "@/lib/server/auth";
import { body, handle } from "@/lib/server/http";
import { CATEGORIES } from "@/lib/types";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ code: string }> };

export async function GET() {
  return handle(async () => ({ enabled: !!process.env.OPENAI_API_KEY }));
}

// Drafts only: nothing is saved or shown to players until the host approves a draft.
export async function POST(req: Request, ctx: Ctx) {
  const { code } = await ctx.params;
  return handle(async () => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new GameError(400, "AI suggestions aren't set up. Add OPENAI_API_KEY to enable them.");
    const { lobby } = await requireHost(code, await readTokens(code.toUpperCase()));
    const input = await body(req);
    const category = CATEGORIES.includes(input.category as never) ? String(input.category) : "any category";
    const quarter = Math.min(4, Math.max(1, Number(input.quarter) || lobby.quarter));

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.9,
        messages: [
          {
            role: "system",
            content:
              "You write fun prediction questions for friends watching an NFL game together. Each question is about one quarter, " +
              "has 2 to 4 mutually exclusive answers that cover every outcome, and an objective one-sentence settlement rule a host " +
              "can check from the box score or play-by-play. Avoid betting language, odds, and over/under lines. Keep prompts under 90 characters " +
              'and answers under 30. Reply as JSON: {"questions":[{"category":string,"prompt":string,"options":string[],"rule":string}]}',
          },
          {
            role: "user",
            content: `Game: ${lobby.away_team} at ${lobby.home_team}. Quarter: Q${quarter}. Category: ${category}. Allowed categories: ${CATEGORIES.join(", ")}. Write 4 questions.`,
          },
        ],
      }),
    });
    if (!res.ok) throw new GameError(502, "The AI service didn't respond. Try again.");
    const data = await res.json();
    let parsed: { questions?: unknown[] } = {};
    try {
      parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
    } catch {}
    const questions = (parsed.questions ?? [])
      .map((q) => q as { category?: string; prompt?: string; options?: string[]; rule?: string })
      .filter((q) => q.prompt && Array.isArray(q.options) && q.options.length >= 2 && q.options.length <= 4)
      .slice(0, 4)
      .map((q) => ({
        category: CATEGORIES.includes(q.category as never) ? q.category : "Wild cards",
        prompt: String(q.prompt).slice(0, 140),
        options: q.options!.slice(0, 4).map((o, i) => ({ id: "abcd"[i], label: String(o).slice(0, 48) })),
        rule: String(q.rule ?? "").slice(0, 280),
      }));
    return { questions };
  });
}
