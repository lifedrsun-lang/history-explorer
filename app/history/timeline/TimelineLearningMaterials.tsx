import type { TimelineLearningMaterial } from "@/lib/historyTimelineLearning";

export default function TimelineLearningMaterials({
  basic,
  advanced,
  showBasic,
  showAdvanced,
}: {
  basic: TimelineLearningMaterial[];
  advanced: TimelineLearningMaterial[];
  showBasic: boolean;
  showAdvanced: boolean;
}) {
  const visible = [
    ...(showBasic ? basic : []),
    ...(showAdvanced ? advanced : []),
  ];
  if (visible.length === 0) return null;

  return (
    <div className="mt-3 space-y-2" aria-label="한능검 학습자료">
      {visible.map((material) => (
        <details
          key={material.id}
          className={`rounded-xl border p-2.5 text-slate-800 ${
            material.level === "basic"
              ? "border-sky-200 bg-sky-50"
              : "border-violet-200 bg-violet-50"
          }`}
        >
          <summary className="cursor-pointer text-xs font-black leading-6">
            {material.level === "basic" ? "별별한국사 기본" : "별별한국사 심화"} · {material.title}
          </summary>
          <div className="mt-2 border-t border-current/15 pt-2 text-xs leading-6">
            <p className="font-bold">{material.summary}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {material.points.map((point) => <li key={point}>{point}</li>)}
            </ul>
            {material.origin === "authored_from_verified_exam_links" && (
              <p className="mt-2 text-[11px] text-slate-600">
                검증된 기출 연결을 바탕으로 새로 정리한 핵심 개념입니다. 원본 교재의 개념 해설을 옮긴 내용이 아닙니다.
              </p>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
