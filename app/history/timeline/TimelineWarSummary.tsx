// 전쟁 세부 정보는 기록으로 확인한 사건만 표시한다.
// 승패가 기록만으로 명확하지 않은 전쟁은 결과를 임의로 판정하지 않는다.
const WARS: Record<string, { opponent: string; place: string; result: string }> = {
  "goguryeo-salsu": {
    opponent: "수나라",
    place: "살수 일대",
    result: "고구려 승리 · 수나라 군대를 크게 물리침",
  },
  "goguryeo-hanseong": {
    opponent: "백제",
    place: "한성(백제의 수도)",
    result: "고구려가 한성을 점령 · 백제는 웅진으로 천도",
  },
  "baekje-gwamisong-lost": {
    opponent: "고구려",
    place: "관미성",
    result: "백제 패배 · 고구려가 관미성을 차지함",
  },
  "baekje-daeyaseong": {
    opponent: "신라",
    place: "대야성",
    result: "백제가 대야성을 점령",
  },
  "baekje-falls": {
    opponent: "신라·당 연합군",
    place: "백제의 수도 사비 등",
    result: "백제 패배 · 660년 멸망",
  },
  "goguryeo-falls": {
    opponent: "신라·당 연합군",
    place: "평양성 등",
    result: "고구려 패배 · 668년 멸망",
  },
  "goryeo-khitan-first-993": {
    opponent: "거란",
    place: "고려 북쪽 국경 · 외교 담판",
    result: "서희의 담판으로 협상을 이끌어 냄 · 고려가 강동 6주를 확보",
  },
  "goryeo-khitan-second-1010": {
    opponent: "거란",
    place: "고려 북부와 개경 등",
    result: "개경이 위협받고 현종이 피란함 · 전쟁 뒤 고려가 국방을 재정비",
  },
  "goryeo-khitan-third-1018": {
    opponent: "거란",
    place: "고려 북부 · 흥화진 등",
    result: "고려군이 침입한 거란군에 맞서 싸움 · 이듬해 귀주에서 결정적 승리",
  },
  "goryeo-gwiju-1019": {
    opponent: "거란",
    place: "귀주(현재 북한 평안북도 일대)",
    result: "고려 승리 · 강감찬이 지휘한 고려군이 거란군을 크게 물리침",
  },
  "goryeo-yun-gwan-1107": {
    opponent: "여진",
    place: "고려 북동쪽 변경",
    result: "고려가 여진 세력을 밀어내고 동북 9성을 설치 · 뒤에 성을 반환",
  },
  "balhae-deungju-attack": {
    opponent: "당나라",
    place: "등주(중국 산둥반도)",
    result: "발해가 당나라의 등주를 공격함",
  },
};

export default function TimelineWarSummary({ id }: { id: string }) {
  const info = WARS[id];
  if (!info) return null;
  return (
    <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-2.5 text-xs leading-5 text-slate-800">
      <strong className="text-orange-900">⚔ 전쟁 핵심 정리</strong>
      <div><b>상대:</b> {info.opponent}</div>
      <div><b>장소:</b> {info.place}</div>
      <div><b>결과:</b> {info.result}</div>
    </div>
  );
}
