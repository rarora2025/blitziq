import "server-only";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { SEED_QUESTIONS } from "@/lib/seed-questions";

/**
 * Tiny SQL adapter. Production talks to Supabase Postgres through DATABASE_URL.
 * Local development without credentials uses PGlite, an embedded Postgres stored in .blitz/.
 * Both run the exact same SQL.
 */
export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  tx<T>(fn: (db: Db) => Promise<T>): Promise<T>;
}

type G = typeof globalThis & { __blitzDb?: Promise<Db> };
const g = globalThis as G;

export function db(): Promise<Db> {
  if (!g.__blitzDb) {
    g.__blitzDb = init().catch((err) => {
      g.__blitzDb = undefined;
      throw err;
    });
  }
  return g.__blitzDb;
}

async function init(): Promise<Db> {
  const conn = process.env.DATABASE_URL ? await connectPostgres(process.env.DATABASE_URL) : await connectPglite();
  const schema = readFileSync(path.join(process.cwd(), "supabase/migrations/0001_init.sql"), "utf8");
  await conn.exec(schema);
  await seedBank(conn.db);
  return conn.db;
}

async function connectPostgres(url: string) {
  const { default: postgres } = await import("postgres");
  const sql = postgres(url, { prepare: false, max: 5, idle_timeout: 20, onnotice: () => {} });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrap = (s: any): Db => ({
    async query<T>(text: string, params: unknown[] = []) {
      return (await s.unsafe(text, params)) as T[];
    },
    async tx<T>(fn: (db: Db) => Promise<T>) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (await sql.begin((t: any) => fn(wrap(t)))) as T;
    },
  });
  return { db: wrap(sql), exec: (text: string) => sql.unsafe(text).simple().then(() => undefined) };
}

async function connectPglite() {
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = path.join(process.cwd(), ".blitz", "db");
  mkdirSync(dir, { recursive: true });
  const pg = await PGlite.create(dir);
  type Q = { query: (t: string, p?: unknown[]) => Promise<{ rows: unknown[] }> };
  const wrap = (s: Q, inTx: boolean): Db => ({
    async query<T>(text: string, params: unknown[] = []) {
      return (await s.query(text, params)).rows as T[];
    },
    async tx<T>(fn: (db: Db) => Promise<T>) {
      if (inTx) return fn(wrap(s, true));
      return pg.transaction((t) => fn(wrap(t as unknown as Q, true)));
    },
  });
  return { db: wrap(pg as unknown as Q, false), exec: (text: string) => pg.exec(text).then(() => undefined) };
}

async function seedBank(d: Db) {
  const rows = SEED_QUESTIONS.map(({ id, category, prompt, options, rule }) => ({ id, category, prompt, options, rule }));
  await d.query(
    `insert into question_bank (id, category, prompt, options, rule, is_seed)
     select id, category, prompt, options, rule, true
     from jsonb_to_recordset($1::text::jsonb) as x(id text, category text, prompt text, options jsonb, rule text)
     on conflict (id) do update set category = excluded.category, prompt = excluded.prompt,
       options = excluded.options, rule = excluded.rule`,
    [JSON.stringify(rows)],
  );
}
