import { getView, lobbyExists, GameError } from "@/lib/server/game";
import { readTokens } from "@/lib/server/auth";
import { handle } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const peek = new URL(req.url).searchParams.has("peek");
  return handle(async () => {
    if (peek) {
      const info = await lobbyExists(code);
      if (!info) throw new GameError(404, "No lobby with that code.");
      const tokens = await readTokens(code.toUpperCase());
      return { ...info, joined: !!(tokens.player || tokens.host) };
    }
    return getView(code, await readTokens(code.toUpperCase()));
  });
}
