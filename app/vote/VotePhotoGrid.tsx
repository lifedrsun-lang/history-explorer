import type { VoteChoice, VoteView } from "@/lib/liveVote";
import styles from "./VoteLayout.module.css";

function optionLabel(value: string, number: VoteChoice) {
  return value.replace(new RegExp("^\\s*" + number + "\\s*번\\s*"), "").trim();
}
export default function VotePhotoGrid({
  vote, choices = {}, disabled = false, onSelect, compact = false, fitScreen = false,
}: {
  vote: VoteView;
  choices?: Record<string, VoteChoice>;
  disabled?: boolean;
  onSelect?: (itemId: string, choice: VoteChoice) => void;
  compact?: boolean;
  fitScreen?: boolean;
}) {
  return <div className={"grid grid-cols-1 gap-5 sm:grid-cols-2 " + (fitScreen ? styles.fitGrid : "")} aria-label="문항별 실시간 투표 결과">
    {vote.items.map((item, index) => {
      const counts = vote.countsByItem[item.id] || [0, 0];
      const total = Math.max(1, counts[0] + counts[1]);
      return <section key={item.id} className={styles.photoCard + " min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"}>
        <h3 className={styles.photoTitle + " mb-3 text-lg font-black text-slate-800"}>{index + 1}번 사진</h3>
        {item.imageUrl ? <div className={styles.photo + " " + (compact ? "h-[18vh] min-h-[100px]" : "aspect-video") + " overflow-hidden rounded-xl bg-slate-100"}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.imageUrl} alt={(index + 1) + "번 투표 사진"} className="h-full w-full object-contain" />
        </div> : <div className={styles.photo + " flex items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-400 " + (compact ? "h-[18vh] min-h-[100px]" : "aspect-video")}>사진을 등록하지 않았습니다</div>}
        <div className={styles.results + " mt-4 grid grid-cols-2 gap-3"}>
          {([1, 2] as const).map(number => {
            const count = counts[number - 1];
            const selected = choices[item.id] === number;
            const label = optionLabel(number === 1 ? vote.option1 : vote.option2, number);
            const choiceClass = styles.choice + " mt-2 w-full break-words rounded-xl border-2 px-2 py-3 text-base font-black " +
              (selected ? "border-slate-900 bg-slate-900 text-white" : number === 1 ? "border-blue-200 bg-blue-50 text-blue-800" : "border-orange-200 bg-orange-50 text-orange-800");
            return <div key={number} className="min-w-0 text-center">
              <p className={styles.count + " text-2xl font-black text-slate-800 sm:text-3xl"}>{count}명</p>
              <div className={styles.bar + " mt-1 flex items-end justify-center rounded-lg bg-slate-100 " + (compact ? "h-9" : "h-14")}>
                <div className={"w-2/3 rounded-t-md transition-[height] duration-300 " + (number === 1 ? "bg-blue-500" : "bg-orange-400")}
                  style={{ height: (count ? Math.max(8, count / total * 100) : 0) + "%" }} />
              </div>
              {onSelect ? <button type="button" disabled={disabled} aria-pressed={selected}
                onClick={() => onSelect(item.id, number)}
                className={choiceClass + " disabled:opacity-50"}>
                {number}번 {label} {selected ? "✓" : ""}
              </button> : <p className={choiceClass}>{number}번 {label}</p>}
            </div>;
          })}
        </div>
      </section>;
    })}
  </div>;
}

