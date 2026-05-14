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

    <div className="rounded-2xl border border-[#333] bg-[#050505] overflow-hidden">

      {/* 프로필 영역 (축소) */}
      <div className="grid lg:grid-cols-2 gap-6 p-4 items-center">

        {/* 왼쪽 */}
        <div>

          <div className="text-lg font-bold mb-3">
            👤 탐험가 정보
          </div>

          <div className="text-3xl font-bold mb-2">
            {student.name}
          </div>

          <div className="text-sm text-gray-300 mb-1">
            🏫 {student.school || "미지정"}
          </div>

          <div className="text-sm text-gray-300 mb-4">
            {student.grade}학년 {student.class}반
          </div>

          {/* 엽전 (축소) */}
          <div className="grid grid-cols-2 gap-3 mb-4">

            <div className="bg-[#111] border border-[#333] rounded-xl p-3">

              <div className="text-sm mb-1">🥇 동엽전</div>
              <div className="text-2xl font-bold">
                {student.bronze || 0}
              </div>

            </div>

            <div className="bg-[#111] border border-[#333] rounded-xl p-3">

              <div className="text-sm mb-1">🥈 은엽전</div>
              <div className="text-2xl font-bold">
                {student.silver || 0}
              </div>

            </div>

          </div>

          {/* 업적 */}
          <div className="border-t border-[#333] pt-3">

            <div className="text-sm font-bold mb-2">
              🏆 업적
            </div>

            {achievements.length > 0 ? (

              <div className="flex flex-wrap gap-2">

                {achievements.map((a, i) => (

                  <div
                    key={i}
                    className="bg-[#1a1a1a] border border-[#444] rounded-lg px-3 py-1 text-sm"
                  >
                    {a}
                  </div>

                ))}

              </div>

            ) : (

              <div className="text-xs text-gray-500">
                업적 없음
              </div>

            )}

          </div>

        </div>

        {/* 오른쪽 캐릭터 (축소) */}
        <div className="flex flex-col items-center">

          <div className="rounded-full p-2 border-4 border-[#555]">

            <img
              src={
                student.character === "girl"
                  ? "/characters/girl.png"
                  : "/characters/boy.png"
              }
              className="w-[180px] h-[180px] rounded-full object-cover"
            />

          </div>

          <div className="flex gap-2 mt-3">

            <button
              onClick={() =>
                changeCharacter(student.id, "boy")
              }
              className="bg-blue-500 px-3 py-1 rounded-lg text-sm"
            >
              👦
            </button>

            <button
              onClick={() =>
                changeCharacter(student.id, "girl")
              }
              className="bg-pink-500 px-3 py-1 rounded-lg text-sm"
            >
              👧
            </button>

          </div>

        </div>

      </div>

      {/* 진행률 (축소) */}
      <div className="px-4 pb-4">

        <div className="rounded-xl border border-[#333] bg-[#050505] p-3">

          <div className="flex justify-between mb-2 text-sm">

            <div>🗺️ 진행률</div>

            <div>{currentStage} / 4</div>

          </div>

          <div className="w-full h-3 bg-[#111] rounded-full overflow-hidden">

            <div
              className="h-full bg-gradient-to-r from-gray-300 to-gray-500"
              style={{
                width: `${(currentStage / 4) * 100}%`,
              }}
            />

          </div>

        </div>

      </div>

      {/* 단계 (축소) */}
      <div className="p-4 pt-0">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">

          {stageInfo.stages.map((s: any, i: number) => (

            <div
              key={i}
              className="bg-[#0d0d0d] border border-[#333] rounded-xl p-2 text-center"
            >

              <div className="text-2xl">{s.emoji}</div>

              <div className="text-xs font-bold">
                {s.name}
              </div>

              <div className="text-xs mt-1">
                {currentStage > i ? "✅" : "🔒"}
              </div>

            </div>

          ))}

        </div>

      </div>

    </div>

  );
}