# My Invest Feed

시장 흐름을 놓치지 않기 위한 큐레이션 피드. 뉴스를 쏟아내지 않고, 섹션별로 "지금 흐름" 브리핑과 소수의 선별 항목만 보여줍니다. 상세 내용은 버튼을 눌렀을 때만 번역·정리합니다.

## 동작 방식 (비용 최소화 설계)

1. **수집 (하루 1~2회, `npm run ingest` 또는 Vercel Cron)**: 섹션별 RSS/Atom을 가져와 URL·제목 중복 제거, 이미 본 후보 제외.
2. **큐레이션 (Haiku 4.5, 섹션당 1회 호출)**: 후보 최대 60건의 제목·요약만 보내 선별, 한국어 제목, 한 줄 이유, 점수, "지금 흐름" 브리핑을 한 번에 받음. 결과는 DB에 저장.
3. **화면**: DB만 읽음 → 새로고침해도 LLM 호출 없음.
4. **상세 보기 (Sonnet 5.5, 버튼 클릭 시에만)**: 원문을 가져와 번역·정리. 결과는 DB에 캐시되고, 하루 생성 횟수 상한(`DETAIL_DAILY_LIMIT`, 기본 30)이 있음.

## 실행

```bash
npm install
cp .env.example .env.local   # ANTHROPIC_API_KEY 입력
npm run check-feeds          # 소스 URL이 살아있는지 점검 (실패한 건 sections.ts에서 교체)
npm run ingest               # 수집+큐레이션 (특정 섹션만: npm run ingest -- crypto)
npm run dev
```

## 섹션/소스 추가

`src/config/sections.ts`의 `SECTIONS`에 객체를 추가하면 됩니다(id, 이름, 선별 기준 `focus`, 소스 목록). DB·화면·수집은 코드 수정 없이 따라갑니다.

- `kind: "issue"`는 사건·발표, `"insight"`는 분석 글(완성도 점수로 걸러짐).
- `tier`(official / major / specialist)는 중복 시 우선순위와 큐레이션의 공신력 판단에 쓰입니다.

## 배포

- 로컬/자체 서버: 기본값(SQLite 파일 `data/feed.db`)으로 충분합니다.
- Vercel 등 서버리스: 파일 DB가 유지되지 않으므로 [Turso](https://turso.tech) 무료 구간을 쓰고 `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`을 설정하세요. `vercel.json`에 하루 1회 크론이 있고, `CRON_SECRET`을 설정해야 동작합니다(미설정이면 401).

## 알려진 한계

- 인사이트 완성도는 제목·요약만 보고 평가합니다(비용 절감). 본문까지 읽는 2차 평가는 필요해지면 추가하세요.
- Google News RSS 링크는 JS 리다이렉트라 본문을 못 가져옵니다. 이 경우 상세 보기는 제목·요약 기준으로 정리하고 그렇다고 표시합니다.
- 일부 사이트는 봇 요청을 막거나 유료 장벽이 있어 본문을 못 가져올 수 있습니다.
- `sections.ts`의 일부 피드 URL은 개발 환경에서 접속 검증을 하지 못했습니다. 처음에 `npm run check-feeds`로 확인하세요.
- 투자 권유가 아닌 정보 제공 용도입니다.
