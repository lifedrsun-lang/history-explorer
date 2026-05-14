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

  // 캐릭터 이미지
  const characterImage =
    student.character === "girl"
      ? "/characters/girl.png"
      : "/characters/boy.png";

  return (

    <div className="rounded-[30px] border border-[#333] bg-[#050505] p-4">

      {/* 상단 정보 */}
      <div>

        <div className="text-xl font-bold mb-3">
          👤 탐험가 정보
        </div>

        <div className="text-4xl font-bold leading-none">
          {student.name}
        </div>

        <div className="text-gray-400 text-sm mt-3">
          🏫 {student.school}
        </div>

        <div className="text-gray-400 text-sm">
          {student.grade}학년 {student.class}반
        </div>

      </div>

      {/* 엽전 */}
      <div className="grid grid-cols-2 gap-3 mt-5">

        <div className="bg-[#111] border border-[#333] rounded-2xl p-4 text-center">

          <div className="text-sm mb-2">
            🥇 동엽전
          </div>

          <div className="text-4xl font-bold">
            {student.bronze || 0}
          </div>

        </div>

        <div className="bg-[#111] border border-[#333] rounded-2xl p-4 text-center">

          <div className="text-sm mb-2">
            🥈 은엽전
          </div>

          <div className="text-4xl font-bold">
            {student.silver || 0}
          </div>

        </div>

      </div>

      {/* 업적 */}
      <div className="mt-5">

        <div className="text-lg font-bold mb-2">
          🏆 업적
        </div>

        {achievements.length > 0 ? (

          <div className="flex flex-wrap gap-2">

            {achievements.map((a, i) => (

              <div
                key={i}
                className="bg-[#1a1a1a] border border-[#444] rounded-xl px-3 py-2 text-sm"
              >
                {a}
              </div>

            ))}

          </div>

        ) : (

          <div className="text-sm text-gray-500">
            업적 없음
          </div>

        )}

      </div>

      {/* 캐릭터 */}
      <div className="flex flex-col items-center mt-6">

        <div className="w-[180px] h-[180px] rounded-full overflow-hidden border-[6px] border-[#444] bg-[#111]">

          <img
            src={characterImage}
            alt="캐릭터"
            className="w-full h-full object-cover"
          />

        </div>

        {/* 캐릭터 선택 */}
        <div className="flex gap-3 mt-4">

          <button
            onClick={() =>
              changeCharacter(student.id, "boy")
            }
            className="bg-blue-500 w-14 h-14 rounded-2xl text-2xl"
          >
            👦
          </button>

          <button
            onClick={() =>
              changeCharacter(student.id, "girl")
            }
            className="bg-pink-500 w-14 h-14 rounded-2xl text-2xl"
          >
            👧
          </button>

        </div>

      </div>

      {/* 진행률 */}
      <div className="mt-6 border border-[#333] rounded-2xl p-4">

        <div className="flex justify-between items-center mb-3">

          <div className="text-lg font-bold">
            🗺️ 진행률
          </div>

          <div className="text-xl font-bold">
            {currentStage} / 4
          </div>

        </div>

        <div className="w-full h-4 bg-[#111] rounded-full overflow-hidden">

          <div
            className="h-full bg-gradient-to-r from-gray-300 to-gray-500"
            style={{
              width: `${(currentStage / 4) * 100}%`,
            }}
          />

        </div>

      </div>

      {/* 단계 */}
      <div className="mt-5 grid grid-cols-2 gap-3">

        {stageInfo.stages.map((s: any, i: number) => (

          <div
            key={i}
            className="bg-[#0d0d0d] border border-[#333] rounded-2xl p-4 text-center"
          >

            <div className="text-4xl mb-2">
              {s.emoji}
            </div>

            <div className="font-bold text-lg">
              {s.name}
            </div>

            <div className="mt-3 text-sm">

              {currentStage > i
                ? "✅ 완료"
                : "🔒 미완료"}

            </div>

          </div>

        ))}

      </div>

    </div>

  );
}