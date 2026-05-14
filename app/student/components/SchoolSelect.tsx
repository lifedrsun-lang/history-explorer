type Props = {
  schools: string[];
  onSelect: (school: string) => void;
};

export default function SchoolSelect({
  schools,
  onSelect,
}: Props) {

  return (

    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">

      <div className="w-full max-w-md rounded-[30px] border border-[#333] bg-[#050505] p-5">

        {/* 제목 */}
        <div className="flex items-center gap-2 justify-center mb-6">

          <div className="text-3xl">
            🏫
          </div>

          <div className="text-2xl font-bold whitespace-nowrap">

            학교 선택

          </div>

        </div>

        {/* 학교 목록 */}
        <div className="space-y-3">

          {schools.map((school) => (

            <button
              key={school}
              onClick={() =>
                onSelect(school)
              }
              className="w-full bg-[#111] hover:bg-[#1a1a1a] border border-[#333] rounded-2xl p-4 text-lg font-bold transition whitespace-nowrap overflow-hidden text-ellipsis"
            >

              {school}

            </button>

          ))}

        </div>

      </div>

    </div>

  );
}