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

  const characterImage =
    student.character === "girl"
      ? "/characters/girl.png"
      : "/characters/boy.png";

  return (

    <div className="rounded-[28px] border border-[#333] bg-[#050505] p-4 space-y-4">

      {/* 상단 */}
      <div className="flex items-center justify-between gap-3">

        {/* 왼쪽 */}
        <div className="min-w-0">

          <div className="text-3xl font-bold truncate">
            {student.name}
          </div>

          <div className="text-sm text-gray-400 mt-1">

            🏫 {student.school}

          </div>

          <div className="text-sm text-gray-400">

            {student.grade}학년 {student.class}반

          </div>

        </div>

        {/* 캐릭터 */}
        <div className="flex flex-col items-center shrink-0">

          <div className="w-[110px] h-[110px] rounded-full overflow-hidden border-4 border-[#444] bg-[#111]">

            <img
              src={characterImage}
              alt="캐릭터"
              className="w-full h-full object-cover"
            />

          </div>

          {/* 캐릭터 변경 */}
          <div className="flex gap-2 mt-2">

            <button
              onClick={() =>
                changeCharacter(student.id, "boy")
              }
              className="bg-blue-500 w-9 h-9 rounded-xl text-lg active:scale-95 transition"
            >
              👦
            </button>

            <button
              onClick={() =>
                changeCharacter(student.id, "girl")
              }
              className="bg-pink-500 w-9 h-9 rounded-xl text-lg active:scale-95 transition"
            >
              👧
            </button>

          </div>

        </div>

      </div>

      {/* 엽전 */}
      <div className="grid grid-cols-2 gap-3">

        <div className="bg-[#111] border border-[#333] rounded-2xl p-3">

          <div className="text-xs text-gray-400">
            🥇 동엽전
          </div>

          <div className="text-3xl font-bold mt-1">
            {student.bronze || 0}
          </div>

        </div>

        <div className="bg-[#111] border border-[#333] rounded-2xl p-3">

          <div className="text-xs text-gray-400">
            🥈 은엽전
          </div>

          <div className="text-3xl font-bold mt-1">
            {student.silver || 0}
          </div>

        </div>

      </div>

      {/* 진행률 */}
      <div className="border border-[#333] rounded-2xl p-3">

        <div className="flex justify-between items-center mb-2">

          <div className="font-bold text-sm">
            🗺️ 진행률
          </div>

          <div className="text-sm font-bold">

            {currentStage} / 4

          </div>

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

      {/* 업적 */}
      {achievements.length > 0 && (

        <div>

          <div className="text-sm font-bold mb-2">
            🏆 업적
          </div>

          <div className="flex flex-wrap gap-2">

            {achievements.map((a, i) => (

              <div
                key={i}
                className="bg-[#1a1a1a] border border-[#444] rounded-xl px-3 py-2 text-xs"
              >
                {a}
              </div>

            ))}

          </div>

        </div>

      )}

      {/* 단계 */}
      <div>

        <div className="text-sm font-bold mb-2">
          ⚔️ 탐험 단계
        </div>

        {/* 🔥 가로 스크롤 */}
        <div className="flex gap-3 overflow-x-auto pb-1">

          {stageInfo.stages.map((s: any, i: number) => (

            <div
              key={i}
              className="min-w-[120px] bg-[#0d0d0d] border border-[#333] rounded-2xl p-3 text-center shrink-0"
            >

              <div className="text-3xl">
                {s.emoji}
              </div>

              <div className="text-sm font-bold mt-2">
                {s.name}
              </div>

              <div className="mt-2 text-xs">

                {currentStage > i
                  ? "✅ 완료"
                  : "🔒 미완료"}

              </div>

            </div>

          ))}

        </div>

      </div>

    </div>

  );
}