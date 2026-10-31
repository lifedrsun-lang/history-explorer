import type { Metadata } from "next";

import TimelineClient from "./TimelineClient";

export const metadata: Metadata = {
  title: "별꼼역사 한국사 연표 | Sun Lab",
  description: "수강한 별꼼역사 사건을 실제 시간 순서로 이어 보는 통합 한국사 연표",
};

export default function HistoryTimelinePage() {
  return <TimelineClient />;
}
