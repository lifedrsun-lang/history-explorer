type Props = {
  student: any;
  currentStage: number;
  stageInfo: any;
  achievements: string[];
  changeCharacter: (
    studentId: string,
    characterType: string
  ) => void;
};

export default function StudentProfile({
  student,
  currentStage,
  stageInfo,
  achievements,
  changeCharacter,
}: Props) {

  return (

    <div className="rounded-xl border border-[#333] bg-[#050505] overflow-hidden">

      {/* 상단 영역 (압축) */}
      <div className="grid lg:grid-cols-2 gap-4 p-3 items-center">

        {/* 왼쪽 */}
        <div>

          <div className="text-base font-bold mb-2">
            👤 탐험가 정보
          </div>

          <div className="text-2xl font-bold">
            {student.name}
          </div>

          <div className="text-xs text-gray-400 mt-1">
            🏫 {student.school || "미지정"}
          </div>

          <div className="text-xs text-gray-400 mt-1">
            {student.grade}학년 {student.class}반
          </div>

          {/* 엽전 (압축) */}
          <div className="grid grid-cols-2 gap-2 mt-3">

            <div className="bg-[#111] border border-[#333] rounded-lg p-2 text-center">

              <div className="text-xs">🥇 동엽전</div>
              <div className="text-lg font-bold">
                {student.bronze || 0}
              </div>

            </div>

            <div className="bg-[#111] border border-[#333] rounded-lg p-2 text-center">

              <div className="text-xs">🥈 은엽전</div>
              <div className="text-lg font-bold">
                {student.silver || 0}
              </div>

            </div>

          </div>

          {/* 업적 */}
          <div className="mt-3">

            <div className="text-xs font-bold mb-1">
              🏆 업적
            </div>

            {achievements.length > 0 ? (

              <div className="flex flex-wrap gap-1">

                {achievements.map((a, i) => (

                  <div
                    key={i}
                    className="bg-[#1a1a1a] border border-[#444] rounded-md px-2 py-1 text-[10px]"
                  >
                    {a}
                  </div>

                ))}

              </div>

            ) : (

              <div className="text-[10px] text-gray-500">
                업적 없음
              </div>

            )}

          </div>

        </div>

        {/* 오른쪽 캐릭터 (축소) */}
        <div className="flex flex-col items-center">

          <div className="rounded-full border-4 border-[#444] p-1">

            <img
              src={
                student.character === "girl"
                  ? "/characters/girl.png"
                  : "/characters/boy.png"
              }
              className="w-[140px] h-[140px] rounded-full object-cover"
            />

          </div>

          <div className="flex gap-2 mt-2">

            <button
              onClick={() =>
                changeCharacter(student.id, "boy")
              }
              className="bg-blue-500 px-2 py-1 rounded text-xs"
            >
              👦
            </button>

            <button
              onClick={() =>
                changeCharacter(student.id, "girl")
              }
              className="bg-pink-500 px-2 py-1 rounded text-xs"
            >
              👧
            </button>

          </div>

        </div>

      </div>

      {/* 진행률 (압축) */}
      <div className="px-3 pb-3">

        <div className="rounded-lg border border-[#333] bg-[#050505] p-2">

          <div className="flex justify-between text-xs mb-1">

            <div>🗺️ 진행률</div>

            <div>{currentStage} / 4</div>

          </div>

          <div className="w-full h-2 bg-[#111] rounded-full overflow-hidden">

            <div
              className="h-full bg-gradient-to-r from-gray-300 to-gray-500"
              style={{
                width: `${(currentStage / 4) * 100}%`,
              }}
            />

          </div>

        </div>

      </div>

      {/* 단계 (압축) */}
      <div className="px-3 pb-3">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">

          {stageInfo.stages.map((s: any, i: number) => (

            <div
              key={i}
              className="bg-[#0d0d0d] border border-[#333] rounded-lg p-2 text-center"
            >

              <div className="text-xl">{s.emoji}</div>

              <div className="text-[10px] font-bold">
                {s.name}
              </div>

              <div className="text-[10px] mt-1">
                {currentStage > i ? "✅" : "🔒"}
              </div>

            </div>

          ))}

        </div>

      </div>

    </div>

  );
}