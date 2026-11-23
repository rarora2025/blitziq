import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const MAX_AGE = 60 * 60 * 24 * 3;

export const newToken = () => randomBytes(24).toString("base64url");
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export function sameHash(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const playerCookie = (code: string) => `blitz_p_${code}`;
const hostCookie = (code: string) => `blitz_h_${code}`;

async function set(name: string, value: string) {
  (await cookies()).set(name, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export const setPlayerToken = (code: string, token: string) => set(playerCookie(code), token);
export const setHostToken = (code: string, token: string) => set(hostCookie(code), token);

export async function readTokens(code: string) {
  const jar = await cookies();
  return { player: jar.get(playerCookie(code))?.value ?? null, host: jar.get(hostCookie(code))?.value ?? null };
}
