"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { auth } from "@/lib/firebase";
import type { ContractSchoolConfig } from "@/lib/contractSchools";
import type { SchoolDocumentKind } from "@/lib/schoolDocuments";
import { trimSignatureCanvas } from "@/lib/signatureCanvas";

type Profile = {
  name: string;
  phone: string;
  birthDate: string;
  signatureDataUrl: string | null;
};

type IdentityType = "resident" | "passport" | "foreign" | "driver";

type SchoolOption = Pick<
  ContractSchoolConfig,
  "slug" | "schoolName" | "displayName"
>;

const EMPTY_PROFILE: Profile = {
  name: "",
  phone: "",
  birthDate: "",
  signatureDataUrl: null,
};

const todayText = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const splitDate = (value: string) => {
  const [year = "", month = "", day = ""] = value.split("-");
  return {
    year,
    month: month.replace(/^0/, ""),
    day: day.replace(/^0/, ""),
  };
};

const checkedBox = (checked: boolean) => (checked ? "☑" : "□");

const DocumentSignature = ({
  dataUrl,
  className = "",
}: {
  dataUrl: string | null;
  className?: string;
}) => (
  <span className={`relative inline-block h-[11mm] w-[34mm] ${className}`}>
    <span className="absolute inset-0 flex items-center justify-center whitespace-nowrap text-[7.8pt] text-slate-500">
      (서명 또는 인)
    </span>
    {dataUrl && (
      <img
        src={dataUrl}
        alt="서명"
        className="absolute left-1/2 top-1/2 z-10 max-h-[11mm] max-w-[32mm] -translate-x-1/2 -translate-y-1/2 object-contain"
      />
    )}
  </span>
);

export default function TeacherApplicationDocumentsPage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signatureHasInk, setSignatureHasInk] = useState(false);

  const [schoolName, setSchoolName] = useState("");
  const [schoolSlug, setSchoolSlug] = useState("");
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [documentDate, setDocumentDate] = useState(todayText());
  const [policeStationName, setPoliceStationName] = useState("");
  const [residentNumber, setResidentNumber] = useState("");
  const [identityType, setIdentityType] = useState<IdentityType>("resident");
  const [identityNumber, setIdentityNumber] = useState("");
  const [includeCrimeConsent, setIncludeCrimeConsent] = useState(true);
  const [includeAdminConsent, setIncludeAdminConsent] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecking(false);
    });
  }, []);

  const getToken = useCallback(async () => {
    if (!user) throw new Error("교사 로그인이 필요합니다.");
    return user.getIdToken();
  }, [user]);

  const requestJson = useCallback(
    async (url: string, init?: RequestInit) => {
      const token = await getToken();
      const response = await fetch(url, {
        ...init,
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(init?.headers || {}),
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "요청 처리에 실패했습니다.");
      return data;
    },
    [getToken]
  );

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const paintSignature = useCallback(
    (dataUrl: string | null) => {
      clearCanvas();
      if (!dataUrl) {
        setSignatureHasInk(false);
        return;
      }
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) return;
      const image = new Image();
      image.onload = () => {
        const padding = 12;
        const scale = Math.min(
          (canvas.width - padding * 2) / image.width,
          (canvas.height - padding * 2) / image.height
        );
        const width = image.width * scale;
        const height = image.height * scale;
        context.drawImage(
          image,
          (canvas.width - width) / 2,
          (canvas.height - height) / 2,
          width,
          height
        );
        setSignatureHasInk(true);
      };
      image.src = dataUrl;
    },
    [clearCanvas]
  );

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const loadPageData = async () => {
      setLoading(true);
      try {
        const [data, schoolData] = await Promise.all([
          requestJson("/api/teacher/application-documents/profile"),
          requestJson("/api/teacher/contract-schools"),
        ]);
        if (cancelled) return;
        const profile = (data?.profile || EMPTY_PROFILE) as Profile;
        const nextSchools = Array.isArray(schoolData?.schools)
          ? (schoolData.schools as SchoolOption[])
          : [];
        setName(profile.name || "");
        setPhone(profile.phone || "");
        setBirthDate(profile.birthDate || "");
        setSignatureDataUrl(profile.signatureDataUrl || null);
        setSchools(nextSchools);

        const params = new URLSearchParams(window.location.search);
        const requestedSlug = params.get("schoolSlug") || "";
        const requestedSchool = nextSchools.find(
          (school) => school.slug === requestedSlug
        );
        if (requestedSchool) {
          setSchoolSlug(requestedSchool.slug);
          setSchoolName(requestedSchool.schoolName);
        }
        const requestedDate = params.get("documentDate") || "";
        if (/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
          setDocumentDate(requestedDate);
        }
        const requestedTypes = (params.get("documentTypes") || "")
          .split(",")
          .filter(Boolean);
        if (requestedTypes.length > 0) {
          setIncludeCrimeConsent(requestedTypes.includes("crime-consent"));
          setIncludeAdminConsent(
            requestedTypes.includes("administrative-consent")
          );
        }
        window.requestAnimationFrame(() => paintSignature(profile.signatureDataUrl || null));
      } catch (error) {
        if (!cancelled) setErrorMessage(error instanceof Error ? error.message : "기본정보를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadPageData();
    return () => {
      cancelled = true;
    };
  }, [paintSignature, requestJson, user]);

  const pointFromEvent = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const beginDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    lastPointRef.current = pointFromEvent(event);
  };

  const draw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const current = pointFromEvent(event);
    const previous = lastPointRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !current || !previous || !context) return;
    context.strokeStyle = "#020617";
    context.lineWidth = 9;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(previous.x, previous.y);
    context.lineTo(current.x, current.y);
    context.stroke();
    lastPointRef.current = current;
    setSignatureHasInk(true);
  };

  const endDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = false;
    lastPointRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const resetSignature = () => {
    clearCanvas();
    setSignatureHasInk(false);
    setSignatureDataUrl(null);
  };

  const saveProfile = async () => {
    setSaving(true);
    setNotice("");
    setErrorMessage("");
    try {
      const canvas = canvasRef.current;
      const nextSignature = signatureHasInk && canvas ? trimSignatureCanvas(canvas) : null;
      const data = await requestJson("/api/teacher/application-documents/profile", {
        method: "PUT",
        body: JSON.stringify({ name, phone, birthDate, signatureDataUrl: nextSignature }),
      });
      setSignatureDataUrl(data?.profile?.signatureDataUrl || null);
      setNotice("기본정보와 서명을 저장했습니다.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const signatureForDocument = (() => {
    const canvas = canvasRef.current;
    if (canvas && signatureHasInk) return trimSignatureCanvas(canvas);
    return signatureDataUrl;
  })();

  const dateParts = splitDate(documentDate);
  const identityNumberForDocument =
    identityType === "resident" ? residentNumber : identityNumber;
  const policeStationForDocument = policeStationName
    .trim()
    .replace(/경찰서장?$/, "");

  const printDocuments = async () => {
    if (!schoolName.trim()) return setErrorMessage("학교명을 입력해 주세요.");
    if (!name.trim()) return setErrorMessage("성명을 입력해 주세요.");
    if (!phone.trim()) return setErrorMessage("전화번호를 입력해 주세요.");
    if (!signatureHasInk) return setErrorMessage("등록 서명을 작성하거나 불러와 주세요.");
    if (includeCrimeConsent && !residentNumber.trim()) return setErrorMessage("첫 번째 동의서에 사용할 주민등록번호를 입력해 주세요.");
    if (includeAdminConsent && !birthDate) return setErrorMessage("생년월일을 입력해 주세요.");
    if (!includeCrimeConsent && !includeAdminConsent) return setErrorMessage("출력할 서류를 하나 이상 선택해 주세요.");
    setErrorMessage("");
    setNotice("");

    const documentKinds: SchoolDocumentKind[] = [];
    if (includeCrimeConsent) documentKinds.push("crime-consent");
    if (includeAdminConsent) documentKinds.push("administrative-consent");

    if (schoolSlug) {
      setRecording(true);
      try {
        await requestJson("/api/teacher/school-documents", {
          method: "POST",
          body: JSON.stringify({
            schoolSlug,
            documentDate,
            documentKinds,
          }),
        });
        setNotice("학교카드 제출서류함에 문서 기록을 추가했습니다. PDF 파일 자체는 브라우저에서 저장해 주세요.");
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? `${error.message} 문서 인쇄는 계속 진행합니다.`
            : "학교카드에 문서 기록을 남기지 못했지만 인쇄는 계속 진행합니다."
        );
      } finally {
        setRecording(false);
      }
    } else {
      setNotice("학교카드와 연결되지 않은 학교명입니다. 인쇄는 가능하지만 학교별 서류함에는 기록되지 않습니다.");
    }

    const originalTitle = document.title;
    const selectedTitles = [
      includeCrimeConsent ? "성범죄·아동학대 전력 조회 동의서" : "",
      includeAdminConsent ? "행정정보 공동이용 사전동의서" : "",
    ].filter(Boolean);
    document.title = `${schoolName}_${selectedTitles.join("_")}_${documentDate}`
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .trim();
    try {
      window.print();
    } finally {
      document.title = originalTitle;
    }
  };

  if (authChecking || loading) {
    return <main className="min-h-[100dvh] bg-slate-50 p-6 text-center font-bold text-slate-500">제출서류 정보를 불러오는 중입니다.</main>;
  }

  if (!user) {
    return (
      <main className="min-h-[100dvh] bg-slate-50 p-6">
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-lg">
          <h1 className="text-2xl font-black">교사 로그인이 필요합니다.</h1>
          <Link href="/teacher" className="mt-5 inline-block rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white">← 교사용 홈</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#eef2f7] p-3 sm:p-6">
      <style jsx global>{`
        @page { size: A4; margin: 0; }
        @media print {
          html, body { background: white !important; }
          .no-print { display: none !important; }
          .forms-preview { margin: 0 !important; gap: 0 !important; }
          .official-page {
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: 0 !important;
            page-break-after: always;
            overflow: hidden !important;
          }
          .official-page:last-child { page-break-after: auto; }
        }
      `}</style>

      <div className="no-print mx-auto max-w-6xl">
        <section className="rounded-[28px] bg-white p-5 shadow-xl sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs font-black tracking-[0.18em] text-slate-400">TEACHER DOCUMENTS</div>
              <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-4xl">📄 학교 필수서류 만들기</h1>
              <p className="mt-2 text-sm font-bold text-slate-500">원본 서식의 A4 배치와 선 구조를 유지한 상태로 필요한 항목만 채웁니다.</p>
            </div>
            <Link href="/teacher/manage/operations" className="w-fit rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">← 일정 · 운영</Link>
          </div>
        </section>

        {(notice || errorMessage) && (
          <div className={`mt-4 rounded-2xl px-4 py-3 text-sm font-black ${errorMessage ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{errorMessage || notice}</div>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <section className="rounded-[28px] bg-white p-5 shadow-lg sm:p-7">
            <h2 className="text-xl font-black">1. 내 기본정보 · 등록 서명</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-black">성명<input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold" /></label>
              <label className="text-sm font-black">전화번호<input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold" /></label>
              <label className="text-sm font-black sm:col-span-2">생년월일<input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold" /></label>
            </div>
            <div className="mt-5 flex items-center justify-between"><div><div className="text-sm font-black">등록 서명</div><div className="text-xs font-bold text-slate-400">크게 서명하면 여백을 정리해 모든 서류에 일괄 적용합니다.</div></div><button type="button" onClick={resetSignature} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black">지우기</button></div>
            <canvas ref={canvasRef} width={1200} height={440} onPointerDown={beginDrawing} onPointerMove={draw} onPointerUp={endDrawing} onPointerCancel={endDrawing} className="mt-3 h-64 w-full touch-none rounded-2xl border-2 border-dashed border-slate-300 bg-white" />
            <button type="button" onClick={saveProfile} disabled={saving} className="mt-5 w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{saving ? "저장 중..." : "기본정보 · 서명 저장"}</button>
          </section>

          <section className="rounded-[28px] bg-white p-5 shadow-lg sm:p-7">
            <h2 className="text-xl font-black">2. 이번 제출 정보</h2>
            <p className="mt-1 text-xs font-bold text-rose-500">주민등록번호·신분확인번호·경찰서명은 저장하지 않습니다.</p>
            <div className="mt-5 grid gap-4">
              <label className="text-sm font-black">학교카드 연결<select value={schoolSlug} onChange={(e) => { const nextSlug = e.target.value; const school = schools.find((item) => item.slug === nextSlug); setSchoolSlug(nextSlug); if (school) setSchoolName(school.schoolName); }} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold"><option value="">학교카드 미연결 · 직접 입력</option>{schools.map((school) => <option key={school.slug} value={school.slug}>{school.displayName}</option>)}</select></label>
              <label className="text-sm font-black">학교명<input value={schoolName} onChange={(e) => { const nextName = e.target.value; setSchoolName(nextName); const selected = schools.find((school) => school.slug === schoolSlug); if (selected && selected.schoolName !== nextName) setSchoolSlug(""); }} placeholder="예: 서울신상도초등학교" className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold" /><span className="mt-1 block text-[11px] font-bold text-slate-400">학교카드를 선택하면 생성 기록이 해당 학교 서류함에 연결됩니다.</span></label>
              <label className="text-sm font-black">작성일<input type="date" value={documentDate} onChange={(e) => setDocumentDate(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold" /></label>
              <label className="text-sm font-black">경찰서명 · 필요 시<input value={policeStationName} onChange={(e) => setPoliceStationName(e.target.value)} placeholder="예: 부천소사 또는 부천소사경찰서" className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold" /><span className="mt-1 block text-[11px] font-bold text-slate-400">입력하면 첫 번째 서식의 경찰서장 앞에 자동으로 표시됩니다.</span></label>
              <label className="text-sm font-black">주민등록번호<input value={residentNumber} onChange={(e) => setResidentNumber(e.target.value)} autoComplete="off" className="mt-2 w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 font-bold" /></label>
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-black">행정정보 공동이용 번호 · 필요 시</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-[150px_1fr]">
                  <select value={identityType} onChange={(e) => setIdentityType(e.target.value as IdentityType)} className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold"><option value="resident">주민등록</option><option value="passport">여권</option><option value="foreign">외국인등록</option><option value="driver">운전면허</option></select>
                  {identityType === "resident" ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{residentNumber || "위 주민등록번호가 자동으로 사용됩니다."}</div>
                  ) : (
                    <input value={identityNumber} onChange={(e) => setIdentityNumber(e.target.value)} autoComplete="off" placeholder="선택한 신분확인번호 입력" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold" />
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="mt-4 rounded-[28px] bg-white p-5 shadow-lg sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black">3. 서류 선택</h2>
              <div className="mt-3 flex flex-col gap-3 text-sm font-black sm:flex-row sm:gap-6"><label className="flex items-center gap-2"><input type="checkbox" checked={includeCrimeConsent} onChange={(e) => setIncludeCrimeConsent(e.target.checked)} className="h-5 w-5" />성범죄·아동학대 전력 조회 동의서</label><label className="flex items-center gap-2"><input type="checkbox" checked={includeAdminConsent} onChange={(e) => setIncludeAdminConsent(e.target.checked)} className="h-5 w-5" />행정정보 공동이용 사전동의서</label></div>
            </div>
            <button type="button" onClick={() => void printDocuments()} disabled={recording} className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg disabled:opacity-50">{recording ? "학교카드에 기록 중..." : "PDF로 저장 · 인쇄"}</button>
          </div>
        </section>
        <div className="mt-5 text-center text-xs font-bold text-slate-400">아래는 A4 실제 출력 미리보기입니다.</div>
      </div>

      <div className="forms-preview mx-auto mt-4 flex max-w-[210mm] flex-col gap-5">
        {includeCrimeConsent && (
          <section className="official-page relative h-[297mm] w-[210mm] bg-white text-black shadow-xl" style={{ fontFamily: '"Batang", "Times New Roman", serif' }}>
            <div className="absolute left-[22mm] right-[20mm] top-[17mm] whitespace-nowrap text-[7.5pt]">
              ■ 아동ㆍ청소년의 성보호에 관한 법률 시행규칙 [별지 제10호의2서식] &lt;개정 2022. 3. 14.&gt;
            </div>
            <div className="absolute right-[20mm] top-[17mm] text-[7pt]">(앞쪽)</div>
            <h2 className="absolute left-0 right-0 top-[30mm] text-center text-[15.8pt] font-bold tracking-[-0.02em]">성범죄 경력 및 아동학대관련범죄 전력 조회 동의서</h2>

            <div className="absolute left-[20mm] right-[20mm] top-[45mm] h-[51mm] border-y border-black text-[8.5pt]">
              <div className="absolute bottom-0 left-[16mm] top-0 border-l border-black" />
              <div className="absolute left-[16mm] right-0 top-[17mm] border-t border-black" />
              <div className="absolute left-[16mm] right-0 top-[34mm] border-t border-black" />
              <div className="absolute left-0 top-[20mm] w-[16mm] text-center font-bold">대상자</div>
              <div className="absolute left-[18mm] top-[5mm]">성&nbsp;&nbsp;명(외국인의 경우 영문명)</div>
              <div className="absolute right-[3mm] top-[5mm] font-sans text-[9.5pt] font-semibold">{name}</div>
              <div className="absolute left-[18mm] top-[21.5mm]">주민등록번호(외국인의 경우 외국인등록번호/국적)</div>
              <div className="absolute right-[3mm] top-[21.5mm] font-sans text-[9.5pt] font-semibold">{residentNumber}</div>
              <div className="absolute left-[18mm] top-[38.5mm]">연락처(휴대전화 등)</div>
              <div className="absolute right-[3mm] top-[38.5mm] font-sans text-[9.5pt] font-semibold">{phone}</div>
            </div>

            <p className="absolute left-[22mm] right-[20mm] top-[109mm] text-justify text-[8.3pt] leading-[1.75]">
              본인은 <strong className="font-sans">{schoolName || "________________"}</strong>의 취업(예정)자 또는 노무 제공(예정)자로서 「아동ㆍ청소년의 성보호에 관한 법률」 제56조 및 같은 법 시행령 제25조에 따른 성범죄 경력 조회와 「아동복지법」 제29조의3 및 같은 법 시행령 제26조의5에 따른 아동학대관련범죄 전력 조회에 동의합니다.
            </p>

            <div className="absolute right-[31mm] top-[137mm] text-[8.5pt]">{dateParts.year || "202 "}년&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{dateParts.month}월&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{dateParts.day}일</div>
            <div className="absolute left-[109mm] top-[154mm] flex h-[11mm] items-center text-[8.5pt]">
              <span className="w-[21mm]">동의자</span>
              <span className="w-[29mm] font-sans font-semibold">{name}</span>
              <DocumentSignature dataUrl={signatureForDocument} />
            </div>
            <div className="absolute left-[43mm] top-[177mm] w-[51mm] border-b border-black" />
            {policeStationForDocument && (
              <div className="absolute left-[43mm] top-[171.5mm] w-[51mm] text-center font-sans text-[9.5pt] font-semibold">{policeStationForDocument}</div>
            )}
            <div className="absolute left-[94mm] top-[171.5mm] text-[11pt] font-bold">경찰서장</div>
            <div className="absolute left-[123mm] top-[173mm] text-[8pt]">귀하</div>
            <div className="absolute left-[20mm] right-[20mm] top-[181.5mm] border-t border-black" />

            <div className="absolute left-[20mm] right-[20mm] top-[229mm] text-[6.8pt] leading-[1.45]">
              <div className="border-y border-black bg-[#b5b5b5] px-[3mm] py-[1.5mm] text-center text-[8pt] font-bold">유의사항</div>
              <ol className="list-decimal space-y-[0.8mm] border-b border-black px-[7mm] py-[2mm]">
                <li>개인정보 수집항목: 성명, 주민등록번호(외국인의 경우 외국인등록번호 및 국적, 외국인등록번호가 없는 경우 생년월일 및 여권번호)</li>
                <li>개인정보 제공 거부에 따른 제한사항: 개인정보 제공 동의를 거부하는 경우에는 취업에 제한을 받을 수 있습니다.</li>
                <li>개인정보의 수집ㆍ이용 목적: 수집된 개인정보는 성범죄 경력 조회 요청, 아동학대관련범죄 전력 조회 요청 등을 위하여 사용됩니다.</li>
                <li>동의자가 2명 이상일 경우에는 뒤쪽에 일괄하여 작성할 수 있습니다.</li>
              </ol>
            </div>
            <div className="absolute bottom-[8mm] right-[20mm] text-[6.8pt]">210㎜×297㎜[백상지(80g/㎡) 또는 중질지(80g/㎡)]</div>
          </section>
        )}

        {includeAdminConsent && (
          <section className="official-page relative h-[297mm] w-[210mm] bg-white text-black shadow-xl" style={{ fontFamily: '"Batang", "Times New Roman", serif' }}>
            <div className="absolute left-[15mm] top-[19mm] whitespace-nowrap text-[8pt] font-bold">「행정정보 공동이용 지침」 [별지 제8호 서식]</div>
            <div className="absolute left-[15mm] right-[26mm] top-[27mm] h-[240mm] border border-black" />
            <h2 className="absolute left-0 right-0 top-[31mm] text-center text-[17pt] font-bold tracking-[0.16em]">행정정보 공동이용 사전동의서</h2>

            <div className="absolute left-[19mm] right-[30mm] top-[45mm] text-[9pt] leading-[1.7]">
              <div className="absolute left-0 right-0 top-0"><strong>1. 이용기관 명칭 :</strong> <span className="font-sans font-semibold">{schoolName}</span></div>
              <div className="absolute left-0 right-0 top-[13mm]"><strong>2. 이용사무(이용목적) :</strong> <span className="font-bold text-blue-700">결격사유 유무 조회, 범죄경력 유무 조회</span></div>
              <div className="absolute left-0 right-0 top-[26mm] font-bold">3. 공동이용 행정정보(구비서류)</div>

              <table className="absolute left-0 right-0 top-[35mm] w-full table-fixed border-collapse text-center text-[8.2pt] leading-none">
                <tbody>
                  <tr className="h-[7mm]"><th className="w-[13%] border border-black">연번</th><th className="w-[37%] border border-black">행정정보명</th><th className="w-[13%] border border-black">연번</th><th className="w-[37%] border border-black">행정정보명</th></tr>
                  <tr className="h-[8mm]"><td className="border border-black">1</td><td className="border border-black">결격사유 유무 조회</td><td className="border border-black">2</td><td className="border border-black">범죄경력 유무 조회</td></tr>
                  <tr className="h-[8mm]"><td className="border border-black" /><td className="border border-black" /><td className="border border-black" /><td className="border border-black" /></tr>
                  <tr className="h-[8mm]"><td className="border border-black" /><td className="border border-black" /><td className="border border-black" /><td className="border border-black" /></tr>
                  <tr className="h-[8mm]"><td className="border border-black" /><td className="border border-black" /><td className="border border-black" /><td className="border border-black" /></tr>
                </tbody>
              </table>

              <p className="absolute left-0 right-0 top-[89mm] pl-[3mm] text-[8pt] leading-[1.65]">※ 이용기관은 본인이 동의한 위 공동이용 행정정보를 확인하기 위해「개인정보 보호법」시행령 제19조에 따라 주민등록번호, 여권번호, 운전면허의 면허번호 또는 외국인등록번호가 포함된 행정정보를 처리할 수 있습니다. 이용기관이 요청하는 경우 기재하여 주십시오.(필요시 기재사항)</p>
              <div className="absolute left-0 right-0 top-[116mm] text-center text-[8.5pt]">( {checkedBox(identityType === "resident")} 주민등록&nbsp;&nbsp;{checkedBox(identityType === "passport")} 여권&nbsp;&nbsp;{checkedBox(identityType === "foreign")} 외국인등록&nbsp;&nbsp;{checkedBox(identityType === "driver")} 운전면허 ) 번호 : <span className="font-sans font-semibold">{identityNumberForDocument}</span></div>

              <div className="absolute left-0 right-0 top-[135mm] font-bold">4. 정보주체(본인) 동의사항</div>
              <p className="absolute left-0 right-0 top-[145mm] pl-[3mm] text-[8.2pt] leading-[1.65]">○ 본인은 위 사무의 처리를 위하여 「전자정부법」 제36조에 따른 행정정보 공동이용을 통해 이용기관의 업무처리담당자가 전자적으로 본인의 구비서류(공동이용 행정정보)를 확인하는 것에 동의합니다.</p>
              <p className="absolute left-0 right-0 top-[164mm] pl-[3mm] text-[8pt] leading-[1.65]">※ 만일, 본인이 위 행정정보 이용에 대해 동의를 하지 아니할 경우에도 불이익은 없습니다. 다만, 동의하지 아니한 경우에는 본인이 해당 구비서류를 제출하여야 합니다.</p>
            </div>

            <div className="absolute right-[31mm] top-[230mm] text-[8.5pt]">{dateParts.year || "202 "}년&nbsp;&nbsp;&nbsp;{dateParts.month}월&nbsp;&nbsp;&nbsp;{dateParts.day}일</div>
            <div className="absolute left-[43mm] top-[241mm] h-[12mm] text-[8.5pt]">
              <span className="absolute left-0 top-[3mm] whitespace-nowrap">대상자&nbsp;&nbsp;&nbsp;본인</span>
              <span className="absolute left-[49mm] top-[3mm] whitespace-nowrap">성&nbsp;&nbsp;&nbsp;&nbsp;명 :</span>
              <strong className="absolute left-[72mm] top-[3mm] whitespace-nowrap font-sans">{name}</strong>
              <DocumentSignature dataUrl={signatureForDocument} className="absolute left-[92mm] top-0" />
            </div>
            <div className="absolute left-[92mm] top-[251mm] text-[8.5pt]">
              <span className="inline-block w-[23mm]">생년월일 :</span><strong className="font-sans">{birthDate}</strong>
            </div>
            <div className="absolute left-[92mm] top-[259mm] text-[8.5pt]">
              <span className="inline-block w-[23mm]">전화번호 :</span><strong className="font-sans">{phone}</strong>
            </div>
            <div className="absolute left-[15mm] top-[271mm] text-[7pt] text-blue-700">※ 개별 법령에서 필요로 하는 동의와 별개로 행정정보 공동이용 사전동의 필요</div>
          </section>
        )}
      </div>
    </main>
  );
}
