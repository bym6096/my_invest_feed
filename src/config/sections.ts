// 섹션 추가 = 이 배열에 객체 하나 추가. DB/UI/수집 파이프라인은 코드 수정 없이 따라갑니다.

export type SourceKind = "issue" | "insight";
// official: 기관 원문 / major: 공신력 있는 매체 / specialist: 전문 매체·리서치
export type SourceTier = "official" | "major" | "specialist";

export interface Source {
  name: string;
  url: string; // RSS 또는 Atom
  kind: SourceKind;
  tier: SourceTier;
}

export interface Section {
  id: string;
  name: string;
  // 큐레이션 모델에게 주는 이 섹션의 선별 기준
  focus: string;
  maxItems: number; // 한 번 수집 때 새로 올릴 최대 개수
  sources: Source[];
  indicators?: IndicatorId[]; // 브리핑과 화면에 쓰는 객관 지표
}

export type IndicatorId = "fear_greed";

const gnews = (q: string, lang: "en" | "ko" = "en") =>
  lang === "ko"
    ? `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=ko&gl=KR&ceid=KR:ko`
    : `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

export const SECTIONS: Section[] = [
  {
    id: "macro",
    name: "거시경제",
    maxItems: 8,
    focus: [
      "물가, 금리, 환율, 고용, 중앙은행 정책 등 투자시장 전반에 큰 영향을 주는 거시 요인만 다룬다.",
      "개별 기업 실적, 특정 종목 뉴스, 단순 시황 중계, 주가 예측성 기사는 제외한다.",
      "FOMC·CPI·고용지표 같은 이벤트는 결과와 시장 해석이 함께 담긴 것을 우선한다.",
    ].join("\n"),
    sources: [
      { name: "Federal Reserve", url: "https://www.federalreserve.gov/feeds/press_all.xml", kind: "issue", tier: "official" },
      { name: "ECB", url: "https://www.ecb.europa.eu/rss/press.html", kind: "issue", tier: "official" },
      { name: "BLS", url: "https://www.bls.gov/feed/bls_latest.rss", kind: "issue", tier: "official" },
      {
        name: "News: Reuters/Bloomberg/FT",
        url: gnews("(inflation OR CPI OR FOMC OR \"interest rate\" OR \"treasury yields\" OR dollar OR yen) when:2d (site:reuters.com OR site:bloomberg.com OR site:ft.com)"),
        kind: "issue",
        tier: "major",
      },
      {
        name: "News: 한국 거시",
        url: gnews("기준금리 OR 환율 OR 소비자물가 OR 연준 when:2d", "ko"),
        kind: "issue",
        tier: "major",
      },
      { name: "NY Fed Liberty Street", url: "https://libertystreeteconomics.newyorkfed.org/feed/", kind: "insight", tier: "official" },
      { name: "Calculated Risk", url: "https://www.calculatedriskblog.com/feeds/posts/default", kind: "insight", tier: "specialist" },
    ],
  },
  {
    id: "crypto",
    name: "코인 동향",
    maxItems: 8,
    indicators: ["fear_greed"],
    focus: [
      "비트코인 중심. 중요한 이슈, 투자 심리, 사이클이 어느 단계인지 판단하는 데 도움이 되는 내용을 고른다(ETF 자금 흐름, 온체인 지표, 거시 연동, 규제, 대형 보유자 움직임 등).",
      "알트코인은 아래 목록과 직접 관련된 이슈만 허용한다. 그 외 알트코인 기사는 제외한다.",
      "허용 알트코인: Ethereum(ETH), Solana(SOL), Sui(SUI), Akash Network(AKT), Ondo Finance(ONDO), Render(RENDER), Artificial Superintelligence Alliance(FET).",
      "가격 예측, 단순 시세 중계, 밈코인·홍보성 글은 제외한다.",
    ].join("\n"),
    sources: [
      { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/", kind: "issue", tier: "major" },
      { name: "The Block", url: "https://www.theblock.co/rss.xml", kind: "issue", tier: "major" },
      { name: "Cointelegraph", url: "https://cointelegraph.com/rss", kind: "issue", tier: "specialist" },
      { name: "Decrypt", url: "https://decrypt.co/feed", kind: "issue", tier: "specialist" },
      { name: "Bitcoin Magazine", url: "https://bitcoinmagazine.com/.rss/full/", kind: "issue", tier: "specialist" },
      { name: "Ethereum Foundation", url: "https://blog.ethereum.org/feed.xml", kind: "issue", tier: "official" },
      {
        name: "News: 지정 알트코인",
        url: gnews("(Solana OR Sui OR \"Akash Network\" OR \"Ondo Finance\" OR \"Render Network\" OR \"Artificial Superintelligence Alliance\") when:2d (site:coindesk.com OR site:theblock.co OR site:reuters.com OR site:bloomberg.com)"),
        kind: "issue",
        tier: "major",
      },
      { name: "Glassnode Insights", url: "https://insights.glassnode.com/rss/", kind: "insight", tier: "specialist" },
    ],
  },
];

export const sectionById = (id: string) => SECTIONS.find((s) => s.id === id);
