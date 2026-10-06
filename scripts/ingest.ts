import { runIngest } from "../src/lib/ingest";

// 사용법: npm run ingest [-- macro crypto]
const only = process.argv.slice(2);
const results = await runIngest(only.length ? only : undefined);
for (const r of results) {
  console.log(`[${r.section}] fetched=${r.fetched} candidates=${r.candidates} picked=${r.picked}`);
  for (const e of r.errors) console.log(`  ! ${e}`);
}
