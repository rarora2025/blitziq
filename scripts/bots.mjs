#!/usr/bin/env node
// Fill a lobby with bot players for solo testing.
//   npm run bots -- ABCDE            (5 bots against http://localhost:3000)
//   npm run bots -- ABCDE 8 https://your-app.vercel.app
// Bots join, then make random picks (and a random Lock) whenever the host opens picks.
const [code, count = "5", base = "http://localhost:3000"] = process.argv.slice(2);
if (!code) {
  console.error("Usage: npm run bots -- <LOBBY CODE> [count] [base url]");
  process.exit(1);
}
const NAMES = ["Sam", "Priya", "Jordan", "Alex", "Mo", "Danny", "Kev", "Tash", "Luis", "Bea", "Omar", "Jules"];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

async function call(cookie, path, body) {
  const res = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: { "content-type": "application/json", cookie: cookie ?? "" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? res.status);
  return { data, cookie: res.headers.getSetCookie?.()[0]?.split(";")[0] ?? cookie };
}

const bots = [];
for (const name of NAMES.slice(0, Number(count))) {
  try {
    const { cookie } = await call(null, `/api/lobbies/${code}/join`, { nickname: `${name} (bot)`.slice(0, 18) });
    bots.push({ name, cookie, done: new Set() });
    console.log(`joined: ${name}`);
  } catch (e) {
    console.log(`${name}: ${e.message}`);
  }
}

console.log("Bots will lock in picks whenever picks open. Ctrl+C to stop.");
for (;;) {
  for (const bot of bots) {
    try {
      const { data: v } = await call(bot.cookie, `/api/lobbies/${code}`);
      if (v.lobby.phase === "final") process.exit(0);
      const key = v.lobby.quarter;
      if (v.lobby.phase !== "picks" || v.mySubmission || bot.done.has(key)) continue;
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 2500));
      const qs = v.questions.filter((q) => q.quarter === key);
      const answers = Object.fromEntries(qs.filter(() => Math.random() > 0.1).map((q) => [q.id, pick(q.options).id]));
      const answered = Object.keys(answers);
      await call(bot.cookie, `/api/lobbies/${code}/action`, { type: "submit", answers, lock: answered.length ? pick(answered) : null });
      bot.done.add(key);
      console.log(`${bot.name} locked in Q${key}`);
    } catch (e) {
      console.log(`${bot.name}: ${e.message}`);
    }
  }
  await new Promise((r) => setTimeout(r, 1500));
}
