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
      className={`${bgColor} border ${borderColor} rounded-[28px] p-4 shadow-sm text-slate-800`}
    >

      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-4">

        <div className="text-2xl">
          {icon}
        </div>

        <div className="text-xl font-bold text-slate-800">
          {title}
        </div>

      </div>

      {/* 랭킹 */}
      <div className="space-y-2">

        {students.length > 0 ? (

          students.map((student, index) => (

            <div
              key={student.id}
              className="bg-amber-50/80 border border-amber-100 rounded-2xl px-3 py-3 flex items-center justify-between"
            >

              {/* 왼쪽 */}
              <div className="flex items-center gap-3 min-w-0">

                <div className="text-2xl shrink-0">

                  {medals[index]}

                </div>

                <div className="min-w-0">

                  <div className="font-bold truncate text-slate-800">

                    {student.name}

                  </div>

                  <div className="text-xs text-slate-500">

                    {student.grade}학년
                    {" "}
                    {student.class}반

                  </div>

                </div>

              </div>

              {/* 점수 */}
              <div className="text-right shrink-0">

                <div className="text-2xl font-bold text-sky-700">

                  {getScore(student)}

                </div>

                <div className="text-[10px] text-slate-400">

                  SCORE

                </div>

              </div>

            </div>

          ))

        ) : (

          <div className="text-sm text-slate-500">

            랭킹 데이터 없음

          </div>

        )}

      </div>

    </div>

  );
}
