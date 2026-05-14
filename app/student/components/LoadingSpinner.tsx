export default function LoadingSpinner() {

    return (
  
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
  
        <div className="flex flex-col items-center">
  
          {/* 회전 링 */}
          <div className="relative w-20 h-20">
  
            <div className="absolute inset-0 rounded-full border-4 border-[#222]" />
  
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-white animate-spin" />
  
            {/* 중앙 아이콘 */}
            <div className="absolute inset-0 flex items-center justify-center text-3xl">
  
              🧭
  
            </div>
  
          </div>
  
          {/* 텍스트 */}
          <div className="mt-6 text-xl font-bold">
  
            탐험 기록 불러오는 중...
  
          </div>
  
          <div className="mt-2 text-sm text-gray-500 text-center">
  
            잠시만 기다려 주세요
  
          </div>
  
        </div>
  
      </div>
  
    );
  }