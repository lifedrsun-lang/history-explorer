import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-yellow-100 to-orange-100 flex items-center justify-center p-10">
      <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-xl w-full text-center">

        <h1 className="text-5xl font-black text-orange-700 mb-6">
          역사논술탐험
        </h1>

        <p className="text-gray-600 text-lg mb-10">
          학생과 교사를 위한 역사 탐험 플랫폼
        </p>

        <div className="flex flex-col gap-5">

          <Link
            href="/student"
            className="bg-yellow-400 hover:bg-yellow-500 transition-all rounded-2xl py-5 text-2xl font-bold"
          >
            학생 입장
          </Link>

          <Link
            href="/teacher"
            className="bg-blue-500 hover:bg-blue-600 text-white transition-all rounded-2xl py-5 text-2xl font-bold"
          >
            교사 입장
          </Link>

        </div>
      </div>
    </main>
  );
}