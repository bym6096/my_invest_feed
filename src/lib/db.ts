import { createClient, type Client } from "@libsql/client";
import { mkdirSync } from "node:fs";

let client: Client | null = null;
let ready: Promise<Client> | null = null;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    section TEXT NOT NULL,
    source TEXT NOT NULL,
    kind TEXT NOT NULL,
    tier TEXT NOT NULL,
    url TEXT NOT NULL,
    orig_title TEXT NOT NULL,
    title_ko TEXT NOT NULL,
    snippet TEXT NOT NULL DEFAULT '',
    published_at INTEGER NOT NULL,
    score INTEGER NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    detail TEXT,
    detail_limited INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS items_section_created ON items(section, created_at DESC)`,
  // 이미 LLM에 보낸 후보(선택/탈락 불문)는 다시 보내지 않는다 → 비용 절감
  `CREATE TABLE IF NOT EXISTS seen (id TEXT PRIMARY KEY, seen_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS briefings (
    section TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    text TEXT NOT NULL,
    meta TEXT NOT NULL DEFAULT '{}',
    PRIMARY KEY (section, created_at)
  )`,
  `CREATE TABLE IF NOT EXISTS usage (day TEXT PRIMARY KEY, detail_count INTEGER NOT NULL DEFAULT 0)`,
];

export function getDb(): Promise<Client> {
  if (!ready) {
    ready = (async () => {
      const url = process.env.TURSO_DATABASE_URL ?? "file:data/feed.db";
      if (url.startsWith("file:")) mkdirSync("data", { recursive: true });
      client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
      await client.batch(SCHEMA, "write");
      return client;
    })();
  }
  return ready;
}

export interface ItemRow {
  id: string;
  section: string;
  source: string;
  kind: "issue" | "insight";
  tier: string;
  url: string;
  orig_title: string;
  title_ko: string;
  snippet: string;
  published_at: number;
  score: number;
  note: string;
  created_at: number;
  detail: string | null;
  detail_limited: number;
}

export async function listItems(section: string, sinceMs: number): Promise<ItemRow[]> {
  const db = await getDb();
  const r = await db.execute({
    sql: `SELECT * FROM items WHERE section = ? AND created_at >= ?
          ORDER BY kind ASC, created_at DESC, score DESC LIMIT 100`,
    args: [section, sinceMs],
  });
  return r.rows as unknown as ItemRow[];
}

export async function latestBriefing(section: string) {
  const db = await getDb();
  const r = await db.execute({
    sql: `SELECT text, meta, created_at FROM briefings WHERE section = ? ORDER BY created_at DESC LIMIT 1`,
    args: [section],
  });
  const row = r.rows[0];
  if (!row) return null;
  return {
    text: String(row.text),
    meta: JSON.parse(String(row.meta)) as Record<string, unknown>,
    createdAt: Number(row.created_at),
  };
}

export async function getItem(id: string): Promise<ItemRow | null> {
  const db = await getDb();
  const r = await db.execute({ sql: `SELECT * FROM items WHERE id = ?`, args: [id] });
  return (r.rows[0] as unknown as ItemRow) ?? null;
}
