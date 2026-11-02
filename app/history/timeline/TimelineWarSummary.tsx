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
