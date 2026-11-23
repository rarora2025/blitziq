import { deleteBankQuestion, listBank, saveBankQuestion } from "@/lib/server/game";
import { readTokens } from "@/lib/server/auth";
import { body, handle } from "@/lib/server/http";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ code: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { code } = await ctx.params;
  return handle(async () => listBank(code, await readTokens(code.toUpperCase())));
}

export async function POST(req: Request, ctx: Ctx) {
  const { code } = await ctx.params;
  return handle(async () => saveBankQuestion(code, await readTokens(code.toUpperCase()), await body(req)));
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { code } = await ctx.params;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  return handle(async () => deleteBankQuestion(code, await readTokens(code.toUpperCase()), id));
}
