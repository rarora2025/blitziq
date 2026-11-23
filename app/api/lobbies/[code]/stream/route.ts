import { bus } from "@/lib/server/realtime";
import { normalizeCode } from "@/lib/server/game";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Local realtime: a server-sent events stream of "lobby changed" pings.
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const code = normalizeCode((await ctx.params).code);
  const enc = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const send = (s: string) => {
        try {
          controller.enqueue(enc.encode(s));
        } catch {
          cleanup();
        }
      };
      const onChange = (v: number) => send(`data: ${v}\n\n`);
      const beat = setInterval(() => send(`: ping\n\n`), 20000);
      bus.on(`lobby:${code}`, onChange);
      cleanup = () => {
        clearInterval(beat);
        bus.off(`lobby:${code}`, onChange);
      };
      req.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {}
      });
      send(`retry: 2000\n\n`);
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
