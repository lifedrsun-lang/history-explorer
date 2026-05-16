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

    <div
      className="rounded-[30px] border border-[#333] bg-[#050505] overflow-hidden"
    >

      {/* 프로필 */}

      <div className="grid lg:grid-cols-2 gap-10 p-6 items-center">

        {/* 왼쪽 */}

        <div>

          <div className="text-2xl font-bold mb-5">

            👤 탐험가 정보

          </div>

          <div className="text-5xl font-bold mb-5">

            {student.name}

          </div>

          <div className="text-2xl mb-3">

            🏫 {student.school || "미지정"}

          </div>

          <div className="text-2xl mb-8">

            {student.grade}학년 {student.class}반

          </div>

          {/* 엽전 */}

          <div className="grid grid-cols-2 gap-5 mb-8">

            <div className="bg-[#111] border border-[#333] rounded-[25px] p-5">

              <div className="text-2xl mb-4">

                🥇 동엽전

              </div>

              <div className="text-5xl font-bold">

                {student.bronze || 0}

              </div>

            </div>

            <div className="bg-[#111] border border-[#333] rounded-[25px] p-5">

              <div className="text-2xl mb-4">

                🥈 은엽전

              </div>

              <div className="text-5xl font-bold">

                {student.silver || 0}

              </div>

            </div>

          </div>

          {/* 업적 */}

          <div className="border-t border-[#333] pt-5">

            <div className="text-2xl font-bold mb-4">

              🏆 업적

            </div>

            {achievements.length > 0 ? (

              <div className="flex flex-wrap gap-3">

                {achievements.map(
                  (
                    achievement,
                    index
                  ) => (

                    <div
                      key={index}
                      className="bg-[#1a1a1a] border border-[#444] rounded-2xl px-4 py-3 text-lg"
                    >

                      {achievement}

                    </div>

                  )
                )}

              </div>

            ) : (

              <div className="text-lg text-gray-400">

                완료한 업적 0개

              </div>

            )}

          </div>

        </div>

        {/* 캐릭터 */}

        <div className="flex flex-col items-center">

          <div className="rounded-full p-3 border-[5px] border-[#555] shadow-[0_0_50px_rgba(255,255,255,0.15)]">

            <img
              src={
                student.character ===
                "girl"
                  ? "/characters/girl.png"
                  : "/characters/boy.png"
              }
              alt="탐험가"
              className="w-[280px] h-[280px] rounded-full object-cover"
            />

          </div>

          <div className="flex gap-3 mt-5">

            <button
              onClick={() =>
                changeCharacter(
                  student.id,
                  "boy"
                )
              }
              className="bg-blue-500 hover:bg-blue-400 border border-white rounded-xl px-5 py-2 text-2xl"
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
              className="bg-pink-500 hover:bg-pink-400 border border-white rounded-xl px-5 py-2 text-2xl"
            >

              👧

            </button>

          </div>

        </div>

      </div>

      {/* 진행률 */}

      <div className="px-6 pb-5">

        <div className="rounded-[25px] border border-[#333] bg-[#050505] p-5">

          <div className="flex justify-between items-center mb-5">

            <div className="text-3xl font-bold">

              🗺️ 진행률

            </div>

            <div className="text-2xl font-bold">

              {currentStage} / 4 완료

            </div>

          </div>

          <div className="w-full h-6 rounded-full bg-[#111] overflow-hidden border border-[#444]">

            <div
              className="h-full bg-gradient-to-r from-gray-200 to-gray-400 transition-all duration-500"
              style={{
                width: `${(currentStage / 4) * 100}%`,
              }}
            />

          </div>

        </div>

      </div>

      {/* 단계 */}

      <div className="p-6 pt-2">

        <div className="rounded-[25px] border border-[#333] bg-[#050505] p-5">

          <div className="text-3xl font-bold mb-6">

            📜 탐험 진행 단계

          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

            {stageInfo.stages.map(
              (
                stageItem: any,
                index: number
              ) => (

                <div
                  key={index}
                  className="rounded-[25px] border border-[#333] bg-[#0d0d0d] p-4 text-center"
                >

                  <div className="text-4xl mb-4">

                    {
                      stageItem.emoji
                    }

                  </div>

                  <div className="text-2xl font-bold mb-2">

                    {index + 1}단계

                  </div>

                  <div className="text-2xl font-bold mb-5">

                    {
                      stageItem.name
                    }

                  </div>

                  <div
                    className={`rounded-2xl py-3 text-lg font-bold ${
                      currentStage >
                      index
                        ? "bg-green-600"
                        : "bg-[#222]"
                    }`}
                  >

                    {currentStage >
                    index
                      ? "✅ 완료"
                      : "🔒 미완료"}

                  </div>

                </div>

              )
            )}

          </div>

        </div>

      </div>

    </div>

  );
}