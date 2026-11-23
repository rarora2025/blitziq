import { act } from "@/lib/server/game";
import { readTokens } from "@/lib/server/auth";
import { body, handle } from "@/lib/server/http";
import type { Action } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  return handle(async () => act(code, await readTokens(code.toUpperCase()), (await body(req)) as Action));
}
