import type { HistoryTimelineEvent } from "./historyTimeline";

/**
 * 04호 《700년 역사의 끝 고구려 2》를 확인해 추가한 사건.
 * 03호와 중복되는 사건은 별도 복제하지 않고 아래 공유 ID에 04호를 붙인다.
 */
export const HISTORY_TIMELINE_FOURTH_EVENTS: HistoryTimelineEvent[] = [
  {
    id: "goguryeo-sui-war-begins",
    sortYear: 598,
    dateLabel: "598년",
    stateOrEra: "고구려",
    eraFilter: "고구려",
    title: "고구려와 수나라의 전쟁이 시작됨",
    summary: "고구려와 수나라의 충돌이 전쟁으로 이어졌어요. 고구려는 수나라의 압박에 맞섰어요.",
    life: "수나라의 공격에 대비해 성을 고치고 군사를 준비했어요.",
    artifact: "수나라와 고구려의 전쟁 경로 지도",
    image: { kind: "emoji", value: "🛡️", alt: "고구려와 수나라의 대립" },
    textbookPages: ["4호 본문 6~7쪽(PDF 8~9쪽)"],
    sourceIssueNumbers: [4],
  },
  {
    id: "goguryeo-yeongaesomun-coup",
    sortYear: 642,
    dateLabel: "642년",
    stateOrEra: "고구려",
    eraFilter: "고구려",
    title: "연개소문, 권력을 장악함",
    summary: "연개소문이 정변을 일으키고 보장왕을 왕위에 올렸어요.",
    life: "고구려의 정치적 갈등이 심해졌고, 당나라와의 관계도 긴장되었어요.",
    artifact: "연개소문의 집권에 관한 역사 기록",
    image: { kind: "emoji", value: "📜", alt: "연개소문 집권 기록" },
    textbookPages: ["4호 본문 10~13쪽(PDF 12~15쪽)", "4호 PDF 6~7쪽 연표"],
    sourceIssueNumbers: [4],
  },
  {
    id: "silla-kim-chunchu-seeks-goguryeo-help",
    sortYear: 642,
    dateLabel: "642년",
    stateOrEra: "신라",
    eraFilter: "고구려",
    title: "김춘추, 고구려에 도움을 요청함",
    summary: "신라의 김춘추가 고구려에 지원을 요청했지만 협상은 이루어지지 않았어요.",
    life: "삼국 사이의 갈등 속에서 각 나라의 외교 관계가 바뀌어 갔어요.",
    artifact: "김춘추의 고구려 방문에 관한 기록",
    image: { kind: "emoji", value: "🤝", alt: "신라와 고구려의 외교" },
    textbookPages: ["4호 본문 18~21쪽(PDF 20~23쪽)"],
    sourceIssueNumbers: [4],
  },
  {
    id: "tang-andong-protectorate",
    sortYear: 668,
    dateLabel: "668년",
    stateOrEra: "고구려",
    eraFilter: "고구려",
    title: "당나라, 안동도호부를 설치함",
    summary: "고구려 멸망 뒤 당나라가 옛 고구려 지역을 다스리려고 평양에 안동도호부를 두었어요.",
    life: "고구려 유민들은 당나라의 지배에 맞서 부흥 운동을 이어 갔어요.",
    artifact: "안동도호부에 관한 역사 기록",
    image: { kind: "emoji", value: "🏛️", alt: "안동도호부 설치" },
    textbookPages: ["4호 본문 23~24쪽(PDF 25~26쪽)"],
    sourceIssueNumbers: [4],
  },
];

/** 04호 첫머리 연표에 다시 실리거나 04호 본문에서 자세히 다루는 기존 사건들. */
export const HISTORY_TIMELINE_FOURTH_SHARED_IDS = new Set([
  "goguryeo-jumong-founded",
  "goguryeo-domestic-capital",
  "goguryeo-jindae",
  "goguryeo-buddhism",
  "goguryeo-gwanggaeto-king",
  "goguryeo-jangsu-king",
  "goguryeo-pyeongyang-move",
  "goguryeo-hanseong",
  "goguryeo-salsu",
  "goguryeo-cheolli",
  "goguryeo-bojang",
  "goguryeo-ansiseong",
  "goguryeo-falls",
  "goguryeo-revival-fails",
  "balhae-founded",
]);

export const HISTORY_TIMELINE_FOURTH_SHARED_SOURCE = "4호 PDF 6~7쪽 연표";
