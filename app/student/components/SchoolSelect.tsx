type Props = {
  schools: string[];
  onSelect: (school: string) => void;
};

export default function SchoolSelect({
  schools,
  onSelect,
}: Props) {

  return (

    <div className="min-h-[100dvh] bg-gradient-to-br from-sky-100 via-amber-50 to-yellow-100 text-slate-800 px-4 py-8">

      <div className="max-w-xl mx-auto">

        <div className="text-3xl font-bold mb-6 text-center text-slate-800">

          🏫 학교/수업 장소 선택

        </div>

        <div className="space-y-3 rounded-[32px] border border-white/80 bg-white/80 p-4 shadow-sm">

          {schools.map((school) => (

            <button
              key={school}
              onClick={() => onSelect(school)}
              className="w-full bg-white border border-sky-100 rounded-3xl p-5 text-lg font-bold text-slate-700 hover:bg-sky-50 transition"
            >
              {school}
            </button>

          ))}

        </div>

      </div>

    </div>

  );

}
