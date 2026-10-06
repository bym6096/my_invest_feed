import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Invest Feed",
  description: "시장 흐름을 놓치지 않기 위한 큐레이션 피드",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
