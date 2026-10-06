import { describe, expect, it } from "vitest";
import { dedupe, itemId, normalizeTitle, parseFeed } from "../src/lib/feeds";
import { htmlToText } from "../src/lib/detail";

const src = { name: "T", url: "x", kind: "issue", tier: "major" } as const;

describe("parseFeed", () => {
  it("parses RSS", () => {
    const xml = `<rss><channel><item><title>Fed holds rates</title><link>https://a.com/x?utm_source=1</link>
      <description>&lt;p&gt;Hello &amp;amp; bye&lt;/p&gt;</description><pubDate>Mon, 05 Oct 2026 12:00:00 GMT</pubDate></item></channel></rss>`;
    const [it] = parseFeed(xml, src);
    expect(it.title).toBe("Fed holds rates");
    expect(it.publishedAt).toBe(Date.parse("2026-10-05T12:00:00Z"));
    expect(it.snippet).toContain("Hello");
  });
  it("parses Atom with link array", () => {
    const xml = `<feed><entry><title>Post</title><link rel="self" href="https://s"/><link rel="alternate" href="https://b.com/p"/>
      <updated>2026-10-05T00:00:00Z</updated><summary>S</summary></entry></feed>`;
    const [it] = parseFeed(xml, src);
    expect(it.url).toBe("https://b.com/p");
  });
  it("skips entries without http link", () => {
    expect(parseFeed(`<rss><channel><item><title>t</title></item></channel></rss>`, src)).toEqual([]);
  });
});

describe("ids and dedupe", () => {
  it("ignores tracking params", () => {
    expect(itemId("https://a.com/x?utm_source=1")).toBe(itemId("https://a.com/x/"));
  });
  it("dedupes by normalized title (Google News suffix)", () => {
    expect(normalizeTitle("Fed holds rates - Reuters")).toBe(normalizeTitle("Fed holds rates!"));
    const mk = (url: string, title: string) => ({ id: itemId(url), url, title, snippet: "", publishedAt: 0, source: "s", kind: "issue" as const, tier: "major" as const });
    const out = dedupe([mk("https://a/1", "Fed holds rates"), mk("https://b/2", "Fed holds rates - Reuters"), mk("https://c/3", "ECB cuts")]);
    expect(out.map((x) => x.url)).toEqual(["https://a/1", "https://c/3"]);
  });
});

describe("htmlToText", () => {
  it("drops scripts and tags", () => {
    expect(htmlToText("<script>x()</script><p>Hi&nbsp;there</p>")).toBe("Hi there");
  });
});
