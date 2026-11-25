import type { Metadata } from "next";
import TimelineClient from "../TimelineClient";

export const metadata: Metadata = {
  title: "별꼼역사 연표 | Sun Lab",
  description: "별꼼역사 교재와 수업 자료를 중심으로 학습한 사건을 시간 순서대로 살펴보는 연표",
};

export default function ByeolkkumTimelinePage() {
  return <TimelineClient edition="byeolkkum" />;
}
