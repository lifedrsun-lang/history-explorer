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

type Profile = {
  name: string;
  phone: string;
  birthDate: string;
  signatureDataUrl: string | null;
};

type IdentityType = "resident" | "passport" | "foreign" | "driver";

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

export default function TeacherApplicationDocumentsPage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signatureHasInk, setSignatureHasInk] = useState(false);

  const [schoolName, setSchoolName] = useState("");
  const [documentDate, setDocumentDate] = useState(todayText());
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
    const loadProfile = async () => {
      setLoading(true);
      try {
        const data = await requestJson("/api/teacher/application-documents/profile");
        if (cancelled) return;
        const profile = (data?.profile || EMPTY_PROFILE) as Profile;
        setName(profile.name || "");
        setPhone(profile.phone || "");
        setBirthDate(profile.birthDate || "");
        setSignatureDataUrl(profile.signatureDataUrl || null);
        window.requestAnimationFrame(() => paintSignature(profile.signatureDataUrl || null));
      } catch (error) {
        if (!cancelled) setErrorMessage(error instanceof Error ? error.message : "기본정보를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadProfile();
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
    context.strokeStyle = "#111";
    context.lineWidth = 4;
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
      const nextSignature = signatureHasInk && canvas ? canvas.toDataURL("image/png") : null;
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
    if (canvas && signatureHasInk) return canvas.toDataURL("image/png");
    return signatureDataUrl;
  })();

  const dateParts = splitDate(documentDate);

  const printDocuments = () => {
    if (!schoolName.trim()) return setErrorMessage("학교명을 입력해 주세요.");
    if (!name.trim()) return setErrorMessage("성명을 입력해 주세요.");
    if (!phone.trim()) return setErrorMessage("전화번호를 입력해 주세요.");
    if (!signatureHasInk) return setErrorMessage("등록 서명을 작성하거나 불러와 주세요.");
    if (includeCrimeConsent && !residentNumber.trim()) return setErrorMessage("첫 번째 동의서에 사용할 주민등록번호를 입력해 주세요.");
    if (includeAdminConsent && !birthDate) return setErrorMessage("생년월일을 입력해 주세요.");
    if (!includeCrimeConsent && !includeAdminConsent) return setErrorMessage("출력할 서류를 하나 이상 선택해 주세요.");
    setErrorMessage("");
    window.setTimeout(() => window.print(), 80);
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
            <div className="mt-5 flex items-center justify-between"><div><div className="text-sm font-black">등록 서명</div><div className="text-xs font-bold text-slate-400">마우스나 터치로 한 번 등록</div></div><button type="button" onClick={resetSignature} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black">지우기</button></div>
            <canvas ref={canvasRef} width={760} height={220} onPointerDown={beginDrawing} onPointerMove={draw} onPointerUp={endDrawing} onPointerCancel={endDrawing} className="mt-3 h-40 w-full touch-none rounded-2xl border-2 border-dashed border-slate-300 bg-white" />
            <button type="button" onClick={saveProfile} disabled={saving} className="mt-5 w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{saving ? "저장 중..." : "기본정보 · 서명 저장"}</button>
          </section>

          <section className="rounded-[28px] bg-white p-5 shadow-lg sm:p-7">
            <h2 className="text-xl font-black">2. 이번 제출 정보</h2>
            <p className="mt-1 text-xs font-bold text-rose-500">주민등록번호와 신분확인번호는 저장하지 않습니다.</p>
            <div className="mt-5 grid gap-4">
              <label className="text-sm font-black">학교명<input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="예: 서울신상도초등학교" className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold" /></label>
              <label className="text-sm font-black">작성일<input type="date" value={documentDate} onChange={(e) => setDocumentDate(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold" /></label>
              <label className="text-sm font-black">주민등록번호<input value={residentNumber} onChange={(e) => setResidentNumber(e.target.value)} autoComplete="off" className="mt-2 w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 font-bold" /></label>
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-black">행정정보 공동이용 번호 · 필요 시</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-[150px_1fr]">
                  <select value={identityType} onChange={(e) => setIdentityType(e.target.value as IdentityType)} className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold"><option value="resident">주민등록</option><option value="passport">여권</option><option value="foreign">외국인등록</option><option value="driver">운전면허</option></select>
                  <input value={identityNumber} onChange={(e) => setIdentityNumber(e.target.value)} autoComplete="off" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold" />
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
            <button type="button" onClick={printDocuments} className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg">PDF로 저장 · 인쇄</button>
          </div>
        </section>
        <div className="mt-5 text-center text-xs font-bold text-slate-400">아래는 A4 실제 출력 미리보기입니다.</div>
      </div>

      <div className="forms-preview mx-auto mt-4 flex max-w-[210mm] flex-col gap-5">
        {includeCrimeConsent && (
          <section className="official-page relative h-[297mm] w-[210mm] bg-white text-black shadow-xl" style={{ fontFamily: '"Batang", "Times New Roman", serif' }}>
            <div className="absolute left-[22mm] right-[20mm] top-[18mm] text-[7.8pt]">■ 아동복지법 시행규칙 [별지 제12호의5서식] &lt;개정 2019. 6. 12.&gt;</div>
            <h2 className="absolute left-0 right-0 top-[31mm] text-center text-[15.8pt] font-bold tracking-[-0.02em]">성범죄 경력 및 아동학대관련범죄 전력 조회 동의서</h2>

            <div className="absolute left-[22mm] right-[20mm] top-[49mm] h-[48mm] border-y border-black text-[9pt]">
              <div className="absolute bottom-0 left-[16mm] top-0 border-l border-black" />
              <div className="absolute left-[16mm] right-0 top-[16mm] border-t border-black" />
              <div className="absolute left-[16mm] right-0 top-[32mm] border-t border-black" />
              <div className="absolute left-0 top-[19mm] w-[16mm] text-center font-bold">대상자</div>
              <div className="absolute left-[20mm] top-[4.5mm]">성&nbsp;&nbsp;명(외국인의 경우 영문명)</div>
              <div className="absolute right-[4mm] top-[4.5mm] font-sans text-[10pt] font-semibold">{name}</div>
              <div className="absolute left-[20mm] top-[20mm]">주민등록번호(외국인의 경우 외국인등록번호/국적)</div>
              <div className="absolute right-[4mm] top-[20mm] font-sans text-[10pt] font-semibold">{residentNumber}</div>
              <div className="absolute left-[20mm] top-[36mm]">연락처(휴대전화 등)</div>
              <div className="absolute right-[4mm] top-[36mm] font-sans text-[10pt] font-semibold">{phone}</div>
            </div>

            <p className="absolute left-[23mm] right-[21mm] top-[108mm] text-justify text-[9pt] leading-[1.85]">
              본인은 <strong className="font-sans">{schoolName || "________________"}</strong>의 취업(예정)자 또는 노무 제공(예정)자로서 「아동ㆍ청소년의 성보호에 관한 법률」 제56조 및 같은 법 시행령 제25조에 따른 성범죄 경력 조회와 「아동복지법」 제29조의3 및 같은 법 시행령 제26조의5에 따른 아동학대관련범죄 전력 조회에 동의합니다.
            </p>

            <div className="absolute right-[34mm] top-[151mm] text-[9pt]">{dateParts.year || "202 "}년&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{dateParts.month}월&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{dateParts.day}일</div>
            <div className="absolute right-[33mm] top-[165mm] flex items-center gap-[12mm] text-[9pt]"><span>동의자</span><span className="font-sans font-semibold">{name}</span><span className="relative inline-block h-[13mm] w-[32mm] text-right text-[7.8pt] text-slate-500">(서명 또는 인){signatureForDocument && <img src={signatureForDocument} alt="서명" className="absolute inset-0 m-auto max-h-[13mm] max-w-[30mm] object-contain" />}</span></div>
            <div className="absolute left-[38mm] top-[184mm] w-[53mm] border-b border-black" />
            <div className="absolute left-[91mm] top-[179mm] text-[11pt] font-bold">경찰서장</div>
            <div className="absolute left-[120mm] top-[180mm] text-[8pt]">귀하</div>
            <div className="absolute left-[22mm] right-[20mm] top-[191mm] border-t border-black" />

            <div className="absolute left-[22mm] right-[20mm] top-[201mm] border border-black text-[7.2pt] leading-[1.55]">
              <div className="border-b border-black bg-[#eeeeee] px-[3mm] py-[1.5mm] text-[8.5pt] font-bold">유의사항</div>
              <ol className="list-decimal space-y-[1mm] px-[8mm] py-[3mm]">
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
            <div className="absolute left-[23mm] top-[17mm] text-[8pt]">「행정정보 공동이용 지침」</div>
            <div className="absolute left-[23mm] top-[25mm] text-[8pt]">「행정정보 공동이용 지침」 [별지 제8호 서식]</div>
            <h2 className="absolute left-0 right-0 top-[39mm] text-center text-[17pt] font-bold">행정정보 공동이용 사전동의서</h2>

            <div className="absolute left-[24mm] right-[22mm] top-[62mm] text-[10pt] leading-[1.8]">
              <div><strong>1. 이용기관 명칭 :</strong> <span className="font-sans font-semibold">{schoolName}</span></div>
              <div className="mt-[5mm]"><strong>2. 이용사무(이용목적) :</strong> 결격사유 유무 조회, 범죄경력 유무 조회</div>
              <div className="mt-[5mm] font-bold">3. 공동이용 행정정보(구비서류)</div>

              <table className="mt-[3mm] w-full table-fixed border-collapse text-center text-[9pt]">
                <tbody>
                  <tr><th className="w-[13%] border border-black py-[2mm]">연번</th><th className="w-[37%] border border-black py-[2mm]">행정정보명</th><th className="w-[13%] border border-black py-[2mm]">연번</th><th className="w-[37%] border border-black py-[2mm]">행정정보명</th></tr>
                  <tr><td className="border border-black py-[3mm]">1</td><td className="border border-black py-[3mm]">결격사유 유무 조회</td><td className="border border-black py-[3mm]">2</td><td className="border border-black py-[3mm]">범죄경력 유무 조회</td></tr>
                </tbody>
              </table>

              <p className="mt-[5mm] text-[8pt] leading-[1.65]">※ 이용기관은 본인이 동의한 위 공동이용 행정정보를 확인하기 위해「개인정보 보호법」시행령 제19조에 따라 주민등록번호, 여권번호, 운전면허의 면허번호 또는 외국인등록번호가 포함된 행정정보를 처리할 수 있습니다. 이용기관이 요청하는 경우 기재하여 주십시오.(필요시 기재사항)</p>
              <div className="mt-[3mm] text-center text-[9pt]">( {checkedBox(identityType === "resident")} 주민등록&nbsp;&nbsp;{checkedBox(identityType === "passport")} 여권&nbsp;&nbsp;{checkedBox(identityType === "foreign")} 외국인등록&nbsp;&nbsp;{checkedBox(identityType === "driver")} 운전면허 ) 번호 : <span className="font-sans font-semibold">{identityNumber}</span></div>

              <div className="mt-[7mm] font-bold">4. 정보주체(본인) 동의사항</div>
              <p className="mt-[3mm] text-[9pt] leading-[1.8]">○ 본인은 위 사무의 처리를 위하여 「전자정부법」제36조에 따른 행정정보 공동이용을 통해 이용기관의 업무처리담당자가 전자적으로 본인의 구비서류(공동이용 행정정보)를 확인하는 것에 동의합니다.</p>
              <p className="mt-[2mm] text-[8pt] leading-[1.7]">※ 만일, 본인이 위 행정정보 이용에 대해 동의를 하지 아니할 경우에도 불이익은 없습니다. 다만, 동의하지 아니한 경우에는 본인이 해당 구비서류를 제출하여야 합니다.</p>
            </div>

            <div className="absolute right-[32mm] top-[206mm] text-[9pt]">{dateParts.year || "202 "}년&nbsp;&nbsp;&nbsp;{dateParts.month}월&nbsp;&nbsp;&nbsp;{dateParts.day}일</div>
            <div className="absolute left-[65mm] top-[221mm] grid grid-cols-[32mm_40mm_38mm] items-center gap-y-[4mm] text-[9pt]">
              <span>대상자&nbsp;&nbsp;본인&nbsp;&nbsp;성&nbsp;&nbsp;&nbsp;&nbsp;명 :</span><strong className="font-sans">{name}</strong><span className="relative h-[12mm] text-[7.8pt] text-slate-500">(서명 또는 인){signatureForDocument && <img src={signatureForDocument} alt="서명" className="absolute inset-0 m-auto max-h-[12mm] max-w-[30mm] object-contain" />}</span>
              <span className="col-start-1">생년월일 :</span><strong className="font-sans">{birthDate}</strong><span />
              <span className="col-start-1">전화번호 :</span><strong className="font-sans">{phone}</strong><span />
            </div>
            <div className="absolute bottom-[15mm] left-[24mm] right-[22mm] text-[7.3pt]">※ 개별 법령에서 필요로 하는 동의와 별개로 행정정보 공동이용 사전동의 필요</div>
          </section>
        )}
      </div>
    </main>
  );
}
