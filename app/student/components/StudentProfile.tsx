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

  // 배포 안정화
  if (!stageInfo || !stageInfo.current) {
    return null;
  }

  const characterImage =
    student.character === "girl"
      ? "/characters/girl.png"
      : "/characters/boy.png";

  // 현재 챕터 내부 단계
  const localStage =
    ((currentStage - 1) % 4) + 1;

  return (

    <div className="rounded-[28px] border border-[#333] bg-[#050505] p-4 space-y-4">

      {/* 상단 */}
      <div className="flex items-start justify-between gap-3">

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

          <div className="w-[100px] h-[100px] rounded-full overflow-hidden border-4 border-[#444] bg-[#111]">

            <img
              src={characterImage}
              alt="캐릭터"
              className="w-full h-full object-cover"
            />

          </div>

          <div className="flex gap-2 mt-2">

            <button
              onClick={() =>
                changeCharacter(student.id, "boy")
              }
              className="bg-blue-500 w-9 h-9 rounded-xl text-lg"
            >
              👦
            </button>

            <button
              onClick={() =>
                changeCharacter(student.id, "girl")
              }
              className="bg-pink-500 w-9 h-9 rounded-xl text-lg"
            >
              👧
            </button>

          </div>

        </div>

      </div>

      {/* 현재 시대 */}
      <div className="bg-[#111] border border-[#333] rounded-2xl p-4">

        <div className="text-xs text-gray-400 mb-1">

          🏛 현재 시대

        </div>

        <div className="text-lg font-bold leading-snug">

          {stageInfo.title}

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
            🗺 진행률
          </div>

          <div className="text-sm font-bold">

            {localStage} / 4

          </div>

        </div>

        <div className="w-full h-3 bg-[#111] rounded-full overflow-hidden">

          <div
            className="h-full bg-gradient-to-r from-gray-300 to-gray-500"
            style={{
              width: `${(localStage / 4) * 100}%`,
            }}
          />

        </div>

      </div>

      {/* 탐험 단계 */}
      <div>

        <div className="text-sm font-bold mb-3">
          ⚔ 탐험 단계
        </div>

        <div className="grid grid-cols-2 gap-3">

          {(stageInfo.stages || []).map(
            (s: any, i: number) => (

            <div
              key={i}
              className="bg-[#0d0d0d] border border-[#333] rounded-2xl p-4 text-center"
            >

              <div className="text-3xl">
                {s.emoji}
              </div>

              <div className="text-sm font-bold mt-3">

                {s.short}

              </div>

              <div className="mt-2 text-xs">

                {localStage > i
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