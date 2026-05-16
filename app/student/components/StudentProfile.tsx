"use client";

interface Props {
  student: any;
  currentStage: number;
  stageInfo: any;
  achievements: any[];
  changeCharacter: (
    studentId: string,
    type: string
  ) => void;
}

export default function StudentProfile({
  student,
  currentStage,
  stageInfo,
  achievements,
  changeCharacter,
}: Props) {

  // 전체 시대 수
  const TOTAL_STAGE_GROUPS = 23;

  // 시대당 단계 수
  const STAGES_PER_GROUP = 4;

  // 전체 진행 개수
  const TOTAL_PROGRESS =
    TOTAL_STAGE_GROUPS *
    STAGES_PER_GROUP;

  // 현재 완료 개수
  const completedCount =
    Math.max(currentStage, 0);

  // 진행률 %
  const progressPercent =
    (completedCount /
      TOTAL_PROGRESS) *
    100;

  const stages = [
    {
      stage: 1,
      emoji: "🐴",
      title: "고구려1-1",
    },
    {
      stage: 2,
      emoji: "🏹",
      title: "고구려1-2",
    },
    {
      stage: 3,
      emoji: "⚔️",
      title: "고구려1-3",
    },
    {
      stage: 4,
      emoji: "👑",
      title: "고구려1-4",
    },
  ];

  return (

    <div className="space-y-4">

      {/* 상단 프로필 */}
      <div className="rounded-[32px] border border-[#333] bg-black p-4">

        <div className="flex items-start justify-between gap-3">

          {/* 왼쪽 */}
          <div className="flex-1 min-w-0">

            <div className="text-4xl font-black leading-none truncate">
              {student?.name}
            </div>

            <div className="mt-3 text-lg text-gray-300 truncate">
              🏫 {student?.school}
            </div>

            <div className="text-lg text-white mt-1">
              {student?.grade}학년 {student?.class}반
            </div>

          </div>

          {/* 오른쪽 */}
          <div className="flex flex-col items-center shrink-0">

            <div className="w-[110px] h-[110px] rounded-full border-[4px] border-[#444] overflow-hidden bg-[#111]">

              <img
                src={
                  student?.character === "girl"
                    ? "/characters/girl.png"
                    : "/characters/boy.png"
                }
                alt="character"
                className="w-full h-full object-cover"
              />

            </div>

            <div className="flex gap-2 mt-3">

              <button
                onClick={() =>
                  changeCharacter(
                    student.id,
                    "boy"
                  )
                }
                className="bg-[#3478f6] rounded-2xl px-4 py-2 text-xl"
              >
                👦
              </button>

              <button
                onClick={() =>
                  changeCharacter(
                    student.id,
                    "girl"
                  )
                }
                className="bg-pink-500 rounded-2xl px-4 py-2 text-xl"
              >
                👧
              </button>

            </div>

          </div>

        </div>

        {/* 현재 시대 */}
        <div className="mt-5 rounded-[24px] border border-[#333] bg-[#080808] p-4">

          <div className="text-sm text-gray-400">
            🏛 현재 시대
          </div>

          <div className="mt-2 text-2xl font-black leading-snug">
            광활한 영토에 우뚝 선 고구려1
          </div>

        </div>

        {/* 메달 */}
        <div className="grid grid-cols-2 gap-3 mt-4">

          <div className="rounded-[24px] border border-[#333] bg-[#080808] p-4">

            <div className="text-sm text-gray-300">
              🥇 동업전
            </div>

            <div className="text-5xl font-black mt-2">
              {student?.bronze || 0}
            </div>

          </div>

          <div className="rounded-[24px] border border-[#333] bg-[#080808] p-4">

            <div className="text-sm text-gray-300">
              🥈 은업전
            </div>

            <div className="text-5xl font-black mt-2">
              {student?.silver || 0}
            </div>

          </div>

        </div>

        {/* 진행률 */}
        <div className="mt-4 rounded-[24px] border border-[#333] bg-[#080808] p-4">

          <div className="flex items-center justify-between mb-3">

            <div className="text-2xl font-black">
              🗺 진행률
            </div>

            <div className="text-2xl font-black">
              {completedCount} / {TOTAL_PROGRESS}
            </div>

          </div>

          <div className="w-full h-4 rounded-full bg-[#111] overflow-hidden">

            <div
              className="h-full bg-gray-300 transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
              }}
            />

          </div>

        </div>

        {/* 탐험 단계 */}
        <div className="mt-5">

          <div className="text-2xl font-black mb-4">
            ⚔️ 탐험 단계
          </div>

          <div className="grid grid-cols-2 gap-3">

            {stages.map((item) => {

              // 현재 단계만 정확히 완료 처리
              const completed =
                currentStage === item.stage;

              // 이전 단계들
              const cleared =
                currentStage > item.stage;

              return (

                <div
                  key={item.stage}
                  className="rounded-[24px] border border-[#333] bg-[#050505] p-4 text-center"
                >

                  <div className="text-4xl mb-3">
                    {item.emoji}
                  </div>

                  <div className="text-2xl font-black mb-3">
                    {item.title}
                  </div>

                  {completed || cleared ? (

                    <div className="text-lg font-bold text-white">
                      ✅ 완료
                    </div>

                  ) : (

                    <div className="text-lg font-bold text-gray-400">
                      🔒 미완료
                    </div>

                  )}

                </div>

              );

            })}

          </div>

        </div>

      </div>

    </div>

  );

}