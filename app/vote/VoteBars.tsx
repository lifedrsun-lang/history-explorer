import type { VoteChoice, VoteView } from "@/lib/liveVote";
export default function VoteBars({ vote, choice, disabled = false, onSelect }: { vote: VoteView; choice?: VoteChoice | null; disabled?: boolean; onSelect?: (choice: VoteChoice) => void }) {
  const max = Math.max(1, ...vote.counts);
  return <div className="grid grid-cols-2 gap-4 sm:gap-8" aria-label="실시간 투표 결과">
    {([1, 2] as const).map(number => <section key={number} className="min-w-0 text-center">
      <div className="flex h-64 flex-col items-center justify-end sm:h-80">
        <div className="mb-3 text-3xl font-black text-slate-900 sm:text-4xl" aria-label={`${number}번 ${vote.counts[number - 1]}명`}>{vote.counts[number - 1]}명</div>
        <div className={`w-3/4 max-w-40 rounded-t-2xl transition-[height] duration-300 ${number === 1 ? "bg-blue-500" : "bg-orange-400"}`} style={{ height: `${vote.counts[number - 1] / max * 75}%`, minHeight: vote.counts[number - 1] ? 8 : 0 }} aria-hidden="true" />
      </div>
      <div className="border-t-2 border-slate-200 pt-4">
        {onSelect ? <button type="button" disabled={disabled} aria-pressed={choice === number} onClick={() => onSelect(number)} className={`w-full rounded-2xl border-2 px-3 py-4 text-xl font-black transition disabled:opacity-50 ${choice === number ? "border-slate-900 bg-slate-900 text-white" : number === 1 ? "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100" : "border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100"}`}>{number}번 선택{choice === number && <span className="mt-1 block text-xs">선택했어요</span>}</button> : <div className="text-xl font-black text-slate-700">{number}번</div>}
        <p className="mt-3 whitespace-pre-wrap break-words text-base font-bold text-slate-600">{number === 1 ? vote.option1 : vote.option2}</p>
      </div>
    </section>)}
  </div>;
}
