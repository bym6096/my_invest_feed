import { XMLParser } from "fast-xml-parser";
import { createHash } from "node:crypto";
import type { Source } from "@/config/sections";

export interface RawItem {
  id: string;
  url: string;
  title: string;
  snippet: string;
  publishedAt: number; // epoch ms
  source: string;
  kind: Source["kind"];
  tier: Source["tier"];
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#text" });

const text = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "object" && "#text" in (v as object)) return String((v as Record<string, unknown>)["#text"]);
  return "";
};

export const stripHtml = (s: string) =>
  s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

// 추적 파라미터를 제거해 같은 기사를 같은 id로 만든다
export function itemId(url: string): string {
  let key = url;
  try {
    const u = new URL(url);
    for (const k of [...u.searchParams.keys()]) if (/^(utm_|fbclid|gclid|ref$)/i.test(k)) u.searchParams.delete(k);
    u.hash = "";
    key = u.toString().replace(/\/$/, "");
  } catch {
    /* keep raw */
  }
  return createHash("sha1").update(key).digest("hex").slice(0, 16);
}

export const normalizeTitle = (t: string) =>
  t
    .toLowerCase()
    .replace(/\s+-\s+[^-]+$/, "") // Google News의 " - 매체명" 접미사
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

export function parseFeed(xml: string, source: Source, now = Date.now()): RawItem[] {
  const doc = parser.parse(xml);
  const rssItems = doc?.rss?.channel?.item ?? doc?.["rdf:RDF"]?.item;
  const atomEntries = doc?.feed?.entry;
  const list: unknown[] = [rssItems, atomEntries].flat().filter(Boolean) as unknown[];

  const out: RawItem[] = [];
  for (const raw of list) {
    const e = raw as Record<string, unknown>;
    const title = stripHtml(text(e.title));
    let url = "";
    if (typeof e.link === "string") url = e.link;
    else if (Array.isArray(e.link)) {
      const alt = (e.link as Record<string, string>[]).find((l) => !l["@_rel"] || l["@_rel"] === "alternate");
      url = alt?.["@_href"] ?? "";
    } else if (e.link && typeof e.link === "object") {
      url = (e.link as Record<string, string>)["@_href"] ?? text(e.link);
    }
    if (!url) url = text(e.guid);
    if (!title || !/^https?:\/\//.test(url)) continue;

    const body = text(e.description) || text(e.summary) || text(e["content:encoded"]) || text(e.content);
    const dateStr = text(e.pubDate) || text(e.published) || text(e.updated) || text(e["dc:date"]);
    const t = Date.parse(dateStr);
    out.push({
      id: itemId(url),
      url,
      title,
      snippet: stripHtml(body).slice(0, 400),
      publishedAt: Number.isFinite(t) ? t : now,
      source: source.name,
      kind: source.kind,
      tier: source.tier,
    });
  }
  return out;
}

export async function fetchFeed(source: Source): Promise<RawItem[]> {
  const res = await fetch(source.url, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; my-invest-feed/0.1)", accept: "application/rss+xml, application/atom+xml, text/xml, */*" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseFeed(await res.text(), source);
}

// URL 중복 + 제목 중복(같은 기사가 여러 피드에 올라온 경우)을 제거. 먼저 나온 것(= 소스 순서상 공신력 높은 것)을 남김.
export function dedupe(items: RawItem[]): RawItem[] {
  const ids = new Set<string>();
  const titles = new Set<string>();
  const out: RawItem[] = [];
  for (const it of items) {
    const nt = normalizeTitle(it.title);
    if (ids.has(it.id) || titles.has(nt)) continue;
    ids.add(it.id);
    titles.add(nt);
    out.push(it);
  }
  return out;
}
