/** 강화 역사 탐방 시범 자료. 학생 공개 전 교사 검토용. 안내판 사진은 표시하지 않는다. */
export type HeritagePilotNote = {
  id: string;
  title: string;
  era: "고려" | "조선";
  visitedOn: string;
  location: string;
  source: string;
  explanation: string;
  relatedEventKeywords: string[];
  status: "draft" | "published";
  publicImageUrls: string[];
  linkedEventIds: string[];
};

export const GANGHWA_HERITAGE_PILOT: HeritagePilotNote[] = [
  {
    id: "ganghwa-goryeo-palace-site-20261031",
    title: "강화 고려궁지",
    era: "고려",
    visitedOn: "2026-10-31",
    location: "인천광역시 강화군 강화읍 북문길 42",
    source: "강화 고려궁지 현장 안내판(사용자 촬영, 2026-10-31)",
    explanation: "고려는 몽골의 침입에 맞서 고종 19년(1232) 도읍을 개경에서 강화도로 옮겼습니다. 강화에 궁궐을 건립해 39년 동안 사용했으나, 1270년 개경으로 환도할 때 몽골의 요구로 궁궐과 성곽 등이 파괴되었습니다. 조선 시대에는 이곳에 강화유수부 동헌과 외규장각 등 여러 건물이 들어섰습니다.",
    relatedEventKeywords: ["강화 천도", "몽골 침입", "개경 환도"],
    status: "draft",
    publicImageUrls: [],
    linkedEventIds: [],
  },
  {
    id: "ganghwa-yusubu-dongheon-20261031",
    title: "강화유수부 동헌",
    era: "조선",
    visitedOn: "2026-10-31",
    location: "인천광역시 강화군 강화읍 강화 고려궁지 일대",
    source: "강화유수부 동헌 현장 안내판(사용자 촬영, 2026-10-31)",
    explanation: "강화유수가 행정 업무를 보던 중심 건물입니다. 안내판에 따르면 인조 16년(1638) 유수 김신국이 수리했으며, 영조 45년(1769) 유수 황경원이 '현윤관'이라 이름 붙였습니다. 1977년 보수 정비되었습니다.",
    relatedEventKeywords: ["조선 지방 행정", "강화유수부"],
    status: "draft",
    publicImageUrls: [],
    linkedEventIds: [],
  },
  {
    id: "ganghwa-oegyujanggak-20261031",
    title: "외규장각",
    era: "조선",
    visitedOn: "2026-10-31",
    location: "인천광역시 강화군 강화읍 강화 고려궁지 일대",
    source: "외규장각 현장 안내판(사용자 촬영, 2026-10-31)",
    explanation: "외규장각은 왕실 관련 도서를 보관하기 위해 1782년 정조의 명으로 강화에 설치되었습니다. 왕실과 국가 주요 행사의 내용을 정리한 의궤 등의 서적과 왕실 물품을 보관했습니다. 1866년 병인양요 때 프랑스군이 강화도를 공격하면서 건물이 파괴되고 서적이 약탈되었습니다. 1995~2001년 발굴 조사 후 2003년 건물을 복원했습니다.",
    relatedEventKeywords: ["정조", "외규장각", "병인양요"],
    status: "published",
    publicImageUrls: [],
    linkedEventIds: ["joseon-jeongjo-1776", "joseon-byeonginyangyo-1866"],
  },
  {
    id: "ganghwa-yusubu-hyeongbangcheong-20261031",
    title: "강화유수부 형방청",
    era: "조선",
    visitedOn: "2026-10-31",
    location: "인천광역시 강화군 강화읍 북문4길 16번길 5",
    source: "강화유수부 형방청 현장 안내판(사용자 촬영, 2026-10-31)",
    explanation: "강화유수부에 속해 형벌 등 사법 행정의 실무를 담당하던 건물입니다. 건립 시기는 확실하지 않으며, 여러 차례 개축과 용도 변경을 거쳤습니다. 2020년 본래 위치에서 약 100m 떨어진 현재 자리로 이전 개축했습니다.",
    relatedEventKeywords: ["조선 지방 행정", "강화유수부", "형방청"],
    status: "draft",
    publicImageUrls: [],
    linkedEventIds: [],
  },
];

/** Only teacher-reviewed links are shown; draft records remain private. */
export const getPublishedGanghwaNotesForEvent = (eventId: string) =>
  GANGHWA_HERITAGE_PILOT.filter((note) => note.status === "published" && note.linkedEventIds.includes(eventId));
