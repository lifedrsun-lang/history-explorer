import { HISTORY_TIMELINE_WAR_DETAILS } from "@/lib/historyTimelineWarDetails";

type Props = {
  id: string;
  summary: string;
  life: string;
};

/**
 * 연표에 등록된 모든 전쟁·전투·군사 충돌·항쟁 카드는 동일한 요약을 표시한다.
 * 사건의 서술은 원래의 연표 데이터를 그대로 사용하며, 확인되지 않은 승패는 덧붙이지 않는다.
 */
export default function TimelineWarSummary({ id, summary, life }: Props) {
  const info = HISTORY_TIMELINE_WAR_DETAILS[id];
  if (!info) return null;

  return (
    <details className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-2.5 text-xs leading-5 text-slate-800">
      <summary className="cursor-pointer font-semibold text-orange-900">
        ⚔ {info.kind} 요약 보기
      </summary>
      <div className="mt-2 space-y-1">
        <div><b>사건:</b> {summary}</div>
        {info.opponent && <div><b>상대·대립:</b> {info.opponent}</div>}
        {info.place && <div><b>지역:</b> {info.place}</div>}
        {info.progress && <div><b>전개:</b> {info.progress}</div>}
        {life.trim() && <div><b>관련 설명:</b> {life}</div>}
        {info.result && <div><b>결과·의의:</b> {info.result}</div>}
      </div>
    </details>
  );
}
