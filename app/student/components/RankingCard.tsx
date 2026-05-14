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
  
    return (
  
      <div
        className={`rounded-[30px] border p-5 ${bgColor} ${borderColor}`}
      >
  
        <div className="text-2xl font-bold mb-5">
  
          {icon} {title}
  
        </div>
  
        <div className="space-y-4">
  
          {students.map(
            (student, index) => (
  
              <div
                key={student.id}
                className="flex justify-between text-lg"
              >
  
                <div>
  
                  {index === 0 &&
                    "🥈 "}
  
                  {index === 1 &&
                    "🥇 "}
  
                  {index === 2 &&
                    `${icon} `}
  
                  {student.name}
  
                </div>
  
                <div>
  
                  {getScore(student)}점
  
                </div>
  
              </div>
  
            )
          )}
  
        </div>
  
      </div>
  
    );
  }