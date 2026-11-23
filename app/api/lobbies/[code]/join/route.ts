import { joinLobby } from "@/lib/server/game";
import { readTokens, setPlayerToken } from "@/lib/server/auth";
import { body, handle } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code: raw } = await ctx.params;
  return handle(async () => {
    const { nickname } = await body(req);
    const existing = (await readTokens(raw.toUpperCase())).player;
    const { code, token } = await joinLobby(raw, nickname, existing);
    await setPlayerToken(code, token);
    return { code };
  });
}
