import Link from "next/link";

export default function HomePage() {

  return (

    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">

      <div className="w-full max-w-md space-y-6">

        {/* 제목 */}
        <div className="text-center">

          <h1 className="text-3xl sm:text-4xl font-bold whitespace-nowrap">

            역사논술탐험

          </h1>

          <p className="text-gray-400 mt-3 text-sm sm:text-base">

            역사 속 탐험가들의 기록

          </p>

        </div>

        {/* 학생용 */}
        <Link href="/student">

          <div className="w-full rounded-[32px] border border-[#333] bg-[#050505] p-6 hover:bg-[#111] transition cursor-pointer">

            <div className="text-4xl mb-3">

              🧭

            </div>

            <div className="text-2xl font-bold">

              학생 탐험대

            </div>

            <div className="text-gray-400 mt-2 text-sm">

              학생 탐험 기록 확인

            </div>

          </div>

        </Link>

        {/* 교사용 */}
        <Link href="/teacher">

          <div className="w-full rounded-[32px] border border-orange-500 bg-[#050505] p-6 hover:bg-[#111] transition cursor-pointer">

            <div className="text-4xl mb-3">

              🛡️

            </div>

            <div className="text-2xl font-bold">

              교사용 관리

            </div>

            <div className="text-orange-300 mt-2 text-sm">

              학생 데이터 관리

            </div>

          </div>

        </Link>

      </div>

    </main>

  );

}