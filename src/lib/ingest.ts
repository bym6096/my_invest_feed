import { SECTIONS, type Section } from "@/config/sections";
import { getDb, latestBriefing } from "./db";
import { dedupe, fetchFeed, type RawItem } from "./feeds";
import { fetchIndicator, type IndicatorValue } from "./indicators";
import { curate } from "./curate";

const MAX_AGE_MS = 72 * 3600_000;
const MAX_CANDIDATES = 60;

export interface IngestResult {
  section: string;
  fetched: number;
  candidates: number;
  picked: number;
  errors: string[];
}

async function ingestSection(section: Section): Promise<IngestResult> {
  const db = await getDb();
  const errors: string[] = [];
  const now = Date.now();

  const settled = await Promise.allSettled(section.sources.map((s) => fetchFeed(s)));
  const all: RawItem[] = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") all.push(...r.value);
    else errors.push(`${section.sources[i].name}: ${r.reason instanceof Error ? r.reason.message : r.reason}`);
  });

  // official > major > specialist 순으로 먼저 두어 중복 시 공신력 높은 쪽이 남게 한다
  const rank = { official: 0, major: 1, specialist: 2 } as const;
  const fresh = all
    .filter((x) => now - x.publishedAt <= MAX_AGE_MS)
    .sort((a, b) => rank[a.tier] - rank[b.tier] || b.publishedAt - a.publishedAt);

  const seenRows = await db.execute({ sql: `SELECT id FROM seen WHERE seen_at >= ?`, args: [now - 14 * 86400_000] });
  const seen = new Set(seenRows.rows.map((r) => String(r.id)));

  const candidates = dedupe(fresh)
    .filter((x) => !seen.has(x.id))
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .slice(0, MAX_CANDIDATES);

  if (candidates.length === 0) return { section: section.id, fetched: all.length, candidates: 0, picked: 0, errors };

  const indicators = (await Promise.all((section.indicators ?? []).map(fetchIndicator))).filter(
    (x): x is IndicatorValue => x !== null,
  );
  const prev = await latestBriefing(section.id);
  const out = await curate({ section, candidates, previousBriefing: prev?.text ?? null, indicators });

  await db.batch(
    [
      ...out.picks.map((p) => {
        const c = candidates[p.i];
        return {
          sql: `INSERT OR IGNORE INTO items
                (id, section, source, kind, tier, url, orig_title, title_ko, snippet, published_at, score, note, created_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          args: [c.id, section.id, c.source, c.kind, c.tier, c.url, c.title, p.title_ko, c.snippet, c.publishedAt, p.score, p.note, now],
        };
      }),
      ...candidates.map((c) => ({ sql: `INSERT OR IGNORE INTO seen (id, seen_at) VALUES (?, ?)`, args: [c.id, now] })),
      {
        sql: `INSERT INTO briefings (section, created_at, text, meta) VALUES (?,?,?,?)`,
        args: [section.id, now, out.briefing, JSON.stringify({ indicators })],
      },
    ],
    "write",
  );

  return { section: section.id, fetched: all.length, candidates: candidates.length, picked: out.picks.length, errors };
}

export async function runIngest(only?: string[]): Promise<IngestResult[]> {
  const results: IngestResult[] = [];
  for (const s of SECTIONS) {
    if (only && !only.includes(s.id)) continue;
    try {
      results.push(await ingestSection(s));
    } catch (e) {
      results.push({ section: s.id, fetched: 0, candidates: 0, picked: 0, errors: [e instanceof Error ? e.message : String(e)] });
    }
  }
  return results;
}
