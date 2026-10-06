import { SECTIONS } from "../src/config/sections";
import { fetchFeed } from "../src/lib/feeds";

// 소스 URL이 살아 있는지 점검: npm run check-feeds
let bad = 0;
for (const s of SECTIONS) {
  for (const src of s.sources) {
    try {
      const items = await fetchFeed(src);
      console.log(`OK   [${s.id}] ${src.name}: ${items.length}건 / 최신: ${items[0]?.title.slice(0, 60) ?? "-"}`);
      if (items.length === 0) bad++;
    } catch (e) {
      bad++;
      console.log(`FAIL [${s.id}] ${src.name}: ${e instanceof Error ? e.message : e}`);
    }
  }
}
process.exit(bad ? 1 : 0);
