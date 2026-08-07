import Link from "next/link";

export default function TeacherPresentationsPage() {
  return (
    <main className="min-h-[100dvh] bg-[#f5f7fb] p-3 text-slate-800">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-md md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black md:text-3xl">
              📽️ 역사 수업자료 관리
            </h1>
            <p className="mt-2 text-sm font-bold text-slate-500">
              PPT 원본, 슬라이드 이미지, 동영상을 관리합니다.
            </p>
          </div>

          <Link
            href="/teacher"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
          >
            교사 관리화면으로 돌아가기
          </Link>
        </div>

        <section className="rounded-3xl bg-white p-5 shadow-md">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black">수업자료 목록</h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                업로드와 저장 기능은 다음 단계에서 연결됩니다.
              </p>
            </div>

            <button
              type="button"
              disabled
              className="rounded-2xl bg-yellow-400 px-4 py-3 text-sm font-black text-white opacity-60"
            >
              새 수업자료 등록 준비 중
            </button>
          </div>

          <div className="mt-6 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center">
            <div className="text-4xl">📚</div>
            <div className="mt-3 text-lg font-black text-slate-700">
              아직 등록된 수업자료가 없습니다.
            </div>
            <p className="mt-2 text-sm font-bold text-slate-500">
              Firebase Storage와 자료 등록 기능을 연결한 뒤 이곳에 목록이 표시됩니다.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
