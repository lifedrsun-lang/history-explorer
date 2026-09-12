import Link from "next/link";

type ManagementItem = {
  href: string;
  icon: string;
  title: string;
  description: string;
  className: string;
};

type ManagementSection = {
  eyebrow: string;
  icon: string;
  title: string;
  description: string;
  items: ManagementItem[];
};

const sections: Record<string, ManagementSection> = {
  "after-school": {
    eyebrow: "AFTER SCHOOL",
    icon: "🌙",
    title: "방과후 관리",
    description: "수강생·출석·진도·과제·복습·수강료를 한 영역에서 관리합니다.",
    items: [
      {
        href: "/teacher/students?status=active",
        icon: "🟢",
        title: "방과후 수강생",
        description: "수강중 학생의 출석·진도·코인·교재와 학생 정보를 관리",
        className: "border-blue-200 bg-blue-50 text-blue-900",
      },
      {
        href: "/teacher/students?status=paused",
        icon: "🟡",
        title: "쉬는중 수강생",
        description: "쉬는 학생의 수강이력 확인과 수강 재개 관리",
        className: "border-amber-200 bg-amber-50 text-amber-900",
      },
      {
        href: "/teacher/assignments",
        icon: "📸",
        title: "과제 관리",
        description: "과제 등록·제출 확인·승인·다시 해오기 처리",
        className: "border-violet-200 bg-violet-50 text-violet-900",
      },
      {
        href: "/teacher/presentations/review",
        icon: "📝",
        title: "복습문제",
        description: "복습문제 만들기·배포·완료 결과 확인",
        className: "border-indigo-200 bg-indigo-50 text-indigo-900",
      },
      {
        href: "/teacher/coin-exchanges",
        icon: "🎁",
        title: "은엽전 교환",
        description: "학생의 은엽전 상품 교환 신청 처리",
        className: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900",
      },
      {
        href: "/teacher/fees",
        icon: "💰",
        title: "수강료 관리",
        description: "방과후 수강료와 수입 내역을 확인하고 관리",
        className: "border-teal-200 bg-teal-50 text-teal-900",
      },
    ],
  },
  "sun-lab": {
    eyebrow: "SUN LAB",
    icon: "☀️",
    title: "SUN LAB 관리",
    description: "선랩 수강생과 헬로메이플·도서관 등 선랩 전용 기능을 관리합니다.",
    items: [
      {
        href: "/teacher/sun-lab-students",
        icon: "👧",
        title: "선랩 수강생",
        description: "SUN LAB 회원만 따로 조회하고 계정·권한·헬로메이플 정보를 수정",
        className: "border-emerald-200 bg-emerald-50 text-emerald-900",
      },
      {
        href: "/teacher/hello-maple-missions",
        icon: "🍁",
        title: "헬로메이플 미션",
        description: "미션 링크·대상 학생·순서·공개 여부를 바로 설정",
        className: "border-orange-200 bg-orange-50 text-orange-900",
      },
      {
        href: "/teacher/library",
        icon: "📚",
        title: "선랩 도서관",
        description: "Google Drive의 PDF를 골라 선랩 디지털 책장에 배포",
        className: "border-green-200 bg-green-50 text-green-900",
      },
      {
        href: "/teacher/student-preview",
        icon: "📱",
        title: "학생 화면 확인",
        description: "학생에게 보이는 화면을 교사용 미리보기로 점검",
        className: "border-sky-200 bg-sky-50 text-sky-900",
      },
    ],
  },
  materials: {
    eyebrow: "CONTENTS",
    icon: "📂",
    title: "자료 관리",
    description: "수업에 사용하는 자료와 개인 보관 자료, 복습문제를 한곳에서 관리합니다.",
    items: [
      {
        href: "/teacher/presentations",
        icon: "📽️",
        title: "수업자료",
        description: "PPT·수업자료 링크를 등록하고 수업용 자료를 관리",
        className: "border-sky-200 bg-sky-50 text-sky-900",
      },
      {
        href: "/teacher/presentations?section=archive",
        icon: "📁",
        title: "자료실",
        description: "공부자료·퍼실리테이터·보드게임·코딩 자료를 보관",
        className: "border-rose-200 bg-rose-50 text-rose-900",
      },
      {
        href: "/teacher/presentations/review",
        icon: "📝",
        title: "복습문제 자료",
        description: "복습문제를 만들고 배포 상태와 결과를 확인",
        className: "border-blue-200 bg-blue-50 text-blue-900",
      },
    ],
  },
  operations: {
    eyebrow: "OPERATIONS",
    icon: "⚙️",
    title: "일정 · 운영",
    description: "교사 일정과 비용·운영 상태처럼 공통 관리 기능을 모았습니다.",
    items: [
      {
        href: "/teacher/schedule",
        icon: "📅",
        title: "교사일정",
        description: "학교별 안내·제출·행정 일정과 Google Calendar 연동 관리",
        className: "border-rose-200 bg-rose-50 text-rose-900",
      },
      {
        href: "/teacher/application-documents",
        icon: "📄",
        title: "지원 · 제출서류",
        description: "학교명·기본정보·등록 서명을 반영해 필수 동의서를 작성하고 PDF로 저장",
        className: "border-indigo-200 bg-indigo-50 text-indigo-900",
      },
      {
        href: "/teacher/resume-master",
        icon: "🗂️",
        title: "마스터 이력",
        description: "학력·경력·연수·자격을 한 번 저장하고 지원서마다 필요한 항목만 체크해서 사용",
        className: "border-violet-200 bg-violet-50 text-violet-900",
      },
      {
        href: "/teacher/fees",
        icon: "💰",
        title: "수입 · 정산",
        description: "수강료와 계약강의 차시별 강사료 계산 확인",
        className: "border-teal-200 bg-teal-50 text-teal-900",
      },
      {
        href: "/teacher/students?status=paused",
        icon: "🗂️",
        title: "휴강 · 수강이력",
        description: "쉬는 학생과 기존 수강이력을 확인하고 재수강 관리",
        className: "border-slate-200 bg-slate-50 text-slate-800",
      },
    ],
  },
};

export default async function TeacherManagementSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const config = sections[section];

  if (!config) {
    return (
      <main className="min-h-[100dvh] bg-[#f5f7fb] p-4 sm:p-6">
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-lg">
          <div className="text-4xl">🧭</div>
          <h1 className="mt-3 text-2xl font-black text-slate-900">관리 메뉴를 찾을 수 없어요.</h1>
          <Link href="/teacher" className="mt-5 inline-block rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white">
            ← 교사용 홈
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#f5f7fb] p-3 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-[28px] bg-white p-5 shadow-xl sm:rounded-[32px] sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs font-black tracking-[0.18em] text-slate-400">{config.eyebrow}</div>
              <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-4xl">
                {config.icon} {config.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-bold leading-relaxed text-slate-500">
                {config.description}
              </p>
            </div>
            <Link href="/teacher" className="w-fit rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
              ← 교사용 홈
            </Link>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
          {config.items.map((item) => (
            <Link
              key={`${item.href}-${item.title}`}
              href={item.href}
              className={`rounded-[24px] border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:rounded-[30px] sm:p-6 ${item.className}`}
            >
              <div className="text-3xl sm:text-4xl">{item.icon}</div>
              <div className="mt-2 text-base font-black leading-tight sm:mt-4 sm:text-2xl">{item.title}</div>
              <div className="mt-2 hidden text-sm font-bold leading-relaxed opacity-70 sm:block">{item.description}</div>
              <div className="mt-3 text-xs font-black opacity-80 sm:mt-5 sm:text-sm">관리하기 →</div>
            </Link>
          ))}
        </section>

        <div className="mt-4 rounded-3xl border border-slate-200 bg-white px-5 py-4 text-xs font-bold leading-relaxed text-slate-500 shadow-sm sm:text-sm">
          기존 데이터와 기능은 그대로 유지하고, 관리 동선만 영역별로 분리했습니다.
        </div>
      </div>
    </main>
  );
}
