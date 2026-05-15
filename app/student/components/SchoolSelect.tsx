type Props = {
  schools: string[];
  onSelect: (school: string) => void;
};

export default function SchoolSelect({
  schools,
  onSelect,
}: Props) {

  return (

    <div className="min-h-screen bg-black text-white px-4 py-8">

      <div className="max-w-xl mx-auto">

        <div className="text-3xl font-bold mb-6 text-center">

          🏫 학교 선택

        </div>

        <div className="space-y-3">

          {schools.map((school) => (

            <button
              key={school}
              onClick={() => onSelect(school)}
              className="w-full bg-[#111] border border-[#333] rounded-3xl p-5 text-lg hover:bg-[#1a1a1a] transition"
            >
              {school}
            </button>

          ))}

        </div>

      </div>

    </div>

  );

}