type Props = {
    schools: string[];
    onSelect: (school: string) => void;
  };
  
  export default function SchoolSelect({
    schools,
    onSelect,
  }: Props) {
  
    return (
  
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-5">
  
        <div className="w-full max-w-2xl rounded-[35px] border border-[#333] bg-[#050505] p-10">
  
          <div className="text-5xl font-bold mb-10 text-center">
  
            🏫 학교 선택
  
          </div>
  
          <div className="space-y-4">
  
            {schools.map((school) => (
  
              <button
                key={school}
                onClick={() =>
                  onSelect(school)
                }
                className="w-full bg-[#111] hover:bg-[#1a1a1a] border border-[#333] rounded-2xl p-5 text-2xl font-bold transition"
              >
  
                {school}
  
              </button>
  
            ))}
  
          </div>
  
        </div>
  
      </div>
  
    );
  }