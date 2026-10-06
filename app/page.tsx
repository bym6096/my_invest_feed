import Link from "next/link";
import { SECTIONS, sectionById } from "@/config/sections";
import { latestBriefing, listItems } from "@/lib/db";
import DetailButton from "@/components/DetailButton";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 7;
const fmt = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function Home({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams;
  const section = sectionById(s ?? "") ?? SECTIONS[0];
  const [items, briefing] = await Promise.all([
    listItems(section.id, Date.now() - WINDOW_DAYS * 86400_000),
    latestBriefing(section.id),
  ]);
  const issues = items.filter((i) => i.kind === "issue");
  const insights = items.filter((i) => i.kind === "insight");
  const indicators = (briefing?.meta.indicators ?? []) as { label: string; value: number; text: string }[];

  return (
    <main>
      <h1>My Invest Feed</h1>
      <nav className="tabs">
        {SECTIONS.map((x) => (
          <Link key={x.id} href={`/?s=${x.id}`} className={x.id === section.id ? "tab on" : "tab"}>
            {x.name}
          </Link>
        ))}
      </nav>

      <section className="brief">
        <h2>지금 흐름</h2>
        {briefing ? (
          <>
            <p>{briefing.text}</p>
            {indicators.length > 0 && (
              <p className="meta">{indicators.map((i) => `${i.label} ${i.value} (${i.text})`).join(" · ")}</p>
            )}
            <p className="meta">업데이트 {fmt.format(briefing.createdAt)}</p>
          </>
        ) : (
          <p className="meta">아직 수집된 내용이 없어요. <code>npm run ingest</code>를 실행해보세요.</p>
        )}
      </section>

      <FeedList title="이슈" items={issues} />
      <FeedList title="인사이트" items={insights} />
    </main>
  );
}

function FeedList({ title, items }: { title: string; items: Awaited<ReturnType<typeof listItems>> }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2>{title}</h2>
      <ul className="list">
        {items.map((it) => (
          <li key={it.id}>
            <div className="meta">
              {it.source} · {fmt.format(it.published_at)}
              {it.kind === "insight" && ` · 완성도 ${"★".repeat(it.score)}`}
            </div>
            <a className="title" href={it.url} target="_blank" rel="noreferrer noopener">
              {it.title_ko}
            </a>
            <p className="note">{it.note}</p>
            <DetailButton id={it.id} initial={it.detail} />
          </li>
        ))}
      </ul>
    </section>
  );
}
