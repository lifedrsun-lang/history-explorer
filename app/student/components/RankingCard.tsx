type Props = {
  title: string;
  icon: string;
  students: any[];
  getScore: (student: any) => number;
  bgColor: string;
  borderColor: string;
};

export default function RankingCard({
  title,
  icon,
  students,
  getScore,
  bgColor,
  borderColor,
}: Props) {

  const medals = ["🥇", "🥈", "🥉"];

  return (

    <div
      className={`${bgColor} border ${borderColor} rounded-[28px] p-4`}
    >

      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-4">

        <div className="text-2xl">
          {icon}
        </div>

        <div className="text-xl font-bold">
          {title}
        </div>

      </div>

      {/* 랭킹 */}
      <div className="space-y-2">

        {students.length > 0 ? (

          students.map((student, index) => (

            <div
              key={student.id}
              className="bg-black/20 border border-white/10 rounded-2xl px-3 py-3 flex items-center justify-between"
            >

              {/* 왼쪽 */}
              <div className="flex items-center gap-3 min-w-0">

                <div className="text-2xl shrink-0">

                  {medals[index]}

                </div>

                <div className="min-w-0">

                  <div className="font-bold truncate">

                    {student.name}

                  </div>

                  <div className="text-xs opacity-70">

                    {student.grade}학년
                    {" "}
                    {student.class}반

                  </div>

                </div>

              </div>

              {/* 점수 */}
              <div className="text-right shrink-0">

                <div className="text-2xl font-bold">

                  {getScore(student)}

                </div>

                <div className="text-[10px] opacity-60">

                  SCORE

                </div>

              </div>

            </div>

          ))

        ) : (

          <div className="text-sm opacity-60">

            랭킹 데이터 없음

          </div>

        )}

      </div>

    </div>

  );
}