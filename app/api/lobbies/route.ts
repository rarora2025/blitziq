import { createLobby } from "@/lib/server/game";
import { setHostToken, setPlayerToken } from "@/lib/server/auth";
import { body, handle } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    const input = await body(req);
    const { code, hostToken, playerToken } = await createLobby(input as Parameters<typeof createLobby>[0]);
    await setHostToken(code, hostToken);
    if (playerToken) await setPlayerToken(code, playerToken);
    return { code };
  });
}
