# blitz.

**Call the quarter.** A live, host-run NFL prediction game for friends watching together.

The host opens five questions before each quarter. Everyone picks on their phone and can set one **Lock**. The host grades what actually happened, and the leaderboard updates. After Q4, someone gets crowned.

No betting, no money, no odds. Just bragging rights.

## Run it locally (no accounts needed)

```bash
npm install
npm run dev
```

Open http://localhost:3000 on your laptop and create a lobby. Without any configuration, Blitz stores everything in an embedded Postgres (PGlite) under `.blitz/` and syncs devices with server-sent events, so state survives refreshes and restarts.

**Phones on the same Wi-Fi:** `npm run dev` listens on your network. Open `http://<your-laptop-ip>:3000` on each phone, or share the invite link from the lobby.

**Testing solo?** Fill a lobby with bots that join and lock in random picks whenever you open picks:

```bash
npm run bots -- ABCDE        # 5 bots in lobby ABCDE
npm run bots -- ABCDE 8      # 8 bots
```

## How a game runs

| Host presses | What players see |
| --- | --- |
| **Create Lobby** | Join with the code or link and a nickname. Friends pop in live. |
| **Open Picks** | Five questions. Pick answers, set one Lock, then **Lock In Picks**. |
| **Start Round** | Picks freeze and become visible: how the lobby called each question. |
| **Grade Questions** | "Q1 is in the books." Host taps the answer that happened, or voids it. |
| **Publish Results** | A question-by-question reveal, then the updated leaderboard. |
| **Next Quarter** | Repeat for Q2 to Q4, then **Crown the Winner**. |

Every lobby starts with a balanced set of five seeded questions per quarter, so a host can run a whole game without touching the bank. Before picks open, the host can swap any question from the bank, edit it, or write their own. Grades can be corrected at any time, including after the game ends, and every score recalculates.

### Scoring

For each question, Blitz compares every submitted answer in the lobby:

| | Others also got it right | Only you got it right |
| --- | --- | --- |
| Correct | 10 | 50 |
| Correct **Lock** | 20 | 100 |

The values are alternatives, never added together. Wrong, unanswered and voided questions score 0. A pick is "unique" when no one else answered correctly, whatever they locked. Ties share a rank.

## Deploy with Supabase + Vercel

1. Create a Supabase project.
2. Set these environment variables (see `.env.example`):

   | Variable | Where to find it |
   | --- | --- |
   | `DATABASE_URL` | Project Settings → Database → Connection string → **Transaction pooler** (port 6543) |
   | `SUPABASE_URL` | Project Settings → API → Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → `service_role` key (server only) |
   | `NEXT_PUBLIC_SUPABASE_URL` | Same as `SUPABASE_URL` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → `anon` key |

3. Deploy to Vercel. The schema in `supabase/migrations/0001_init.sql` is applied automatically on first request (it is idempotent). You can also apply it yourself with `supabase db push` or the SQL editor.

### Optional: AI question drafts

Set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`, default `gpt-4o-mini`). A **Draft with AI** button appears in the question bank. Drafts are never shown to players; the host approves each one into the bank first. Without a key, everything works with the built-in bank and manual questions.

## How it's built

- **Next.js App Router, React, TypeScript, Tailwind CSS v4, Motion.**
- **Postgres** through one small SQL adapter (`lib/server/db.ts`): Supabase via `DATABASE_URL` in production, PGlite locally. Same SQL in both.
- **Server-side authority.** Browsers never touch the database. Every read and write goes through the API routes, which check an httpOnly session cookie (a random token stored only as a SHA-256 hash). Host and player sessions are separate, so a player can't act as host by guessing a URL. Row level security is enabled on every table with no policies, so the public anon key can't read anything.
- **Per-viewer views.** `GET /api/lobbies/:code` returns only what that viewer may see: no questions before picks open, nobody else's picks before the round starts, and no official answers until results are published. Answer keys live in their own table (`question_keys`).
- **Realtime** is a "lobby changed" ping on channel `lobby:<CODE>` (Supabase Realtime broadcast, or server-sent events locally). Clients refetch their own filtered view, so the channel never carries game data. A 15-second refresh and refocus refresh cover missed pings and reconnects.
- **Deterministic scoring.** Scores are never stored. `lib/scoring.ts` recomputes them from picks and answer keys, so corrections are always consistent. Submissions are one immutable row per player per quarter (`unique (player_id, quarter)`), and host transitions run in a transaction that locks the lobby row.

```
app/                     routes: landing, /create, /j/:code invite, /play/:code, /play/:code/host, API
components/screens/      player screens: waiting room, picks, submitted, live, results reveal, leaderboard, final
components/host/         host dashboard, grader, question bank + editor, AI drafts
lib/scoring.ts           scoring and leaderboard (unit tested)
lib/server/game.ts       lobby lifecycle, actions, authorization, per-viewer views
lib/seed-questions.ts    30 seeded question templates
supabase/migrations/     schema
scripts/bots.mjs         bot players for testing
```

## Scripts

```bash
npm run dev      # local dev server, reachable from phones on your network
npm run build    # production build
npm test         # scoring tests
npm run lint     # type check
npm run bots -- <CODE> [count] [baseUrl]
```
