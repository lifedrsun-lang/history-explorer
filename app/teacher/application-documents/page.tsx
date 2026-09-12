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
  return { year, month: month.replace(/^0/, ""), day: day.replace(/^0/, "") };
};

const checkboxMark = (checked: boolean) => (checked ? "☑" : "□");

export default function TeacherApplicationDocumentsPage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
  const [policeStation, setPoliceStation] = useState("");
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
      if (!response.ok) {
        throw new Error(data?.error || "요청 처리에 실패했습니다.");
      }
      return data;
    },
    [getToken]
  );

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const paintSignature = useCallback(
    (dataUrl: string | null) => {
      clearCanvas();
      if (!dataUrl) {
        setSignatureHasInk(false);
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext("2d");
      if (!context) return;
      const image = new Image();
      image.onload = () => {
        const padding = 14;
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
      setErrorMessage("");
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
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "기본정보를 불러오지 못했습니다.");
        }
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
    const point = pointFromEvent(event);
    const previous = lastPointRef.current;
    if (!canvas || !point || !previous) return;

    const context = canvas.getContext("2d");
    if (!context) return;
    context.strokeStyle = "#111827";
    context.lineWidth = 4;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(previous.x, previous.y);
    context.lineTo(point.x, point.y);
    context.stroke();
    lastPointRef.current = point;
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
    setNotice("서명을 지웠습니다. 저장 버튼을 누르면 등록된 서명도 삭제됩니다.");
  };

  const saveProfile = async () => {
    setSaving(true);
    setNotice("");
    setErrorMessage("");
    try {
      const canvas = canvasRef.current;
      const nextSignature =
        signatureHasInk && canvas ? canvas.toDataURL("image/png") : null;
      const data = await requestJson("/api/teacher/application-documents/profile", {
        method: "PUT",
        body: JSON.stringify({
          name,
          phone,
          birthDate,
          signatureDataUrl: nextSignature,
        }),
      });
      setSignatureDataUrl(data?.profile?.signatureDataUrl || null);
      setNotice("기본정보와 서명을 저장했습니다.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const validateForPrint = () => {
    if (!includeCrimeConsent && !includeAdminConsent) return "출력할 서류를 하나 이상 선택해 주세요.";
    if (!schoolName.trim()) return "학교명을 입력해 주세요.";
    if (!documentDate) return "작성일을 입력해 주세요.";
    if (!name.trim()) return "성명을 입력해 주세요.";
    if (!phone.trim()) return "전화번호를 입력해 주세요.";
    if (!signatureHasInk) return "등록 서명을 작성하거나 불러와 주세요.";
    if (includeCrimeConsent && !residentNumber.trim()) {
      return "성범죄·아동학대 전력 조회 동의서용 주민등록번호를 입력해 주세요.";
    }
    if (includeAdminConsent && !birthDate) {
      return "행정정보 공동이용 사전동의서용 생년월일을 입력해 주세요.";
    }
    return "";
  };

  const printDocuments = () => {
    const validationError = validateForPrint();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    const canvas = canvasRef.current;
    if (canvas && signatureHasInk) {
      setSignatureDataUrl(canvas.toDataURL("image/png"));
    }
    setErrorMessage("");
    window.setTimeout(() => window.print(), 60);
  };

  const dateParts = splitDate(documentDate);
  const signatureForDocument = (() => {
    const canvas = canvasRef.current;
    if (canvas && signatureHasInk) return canvas.toDataURL("image/png");
    return signatureDataUrl;
  })();

  if (authChecking || loading) {
    return (
      <main className="min-h-[100dvh] bg-[#f5f7fb] p-5">
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center font-bold text-slate-500 shadow-lg">
          제출서류 정보를 불러오는 중입니다.
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-[100dvh] bg-[#f5f7fb] p-5">
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-lg">
          <h1 className="text-2xl font-black text-slate-900">교사 로그인이 필요합니다.</h1>
          <Link href="/teacher" className="mt-5 inline-block rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white">
            ← 교사용 홈
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#f5f7fb] p-3 sm:p-6">
      <style jsx global>{`
        @page { size: A4; margin: 10mm; }
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-root { display: block !important; margin: 0 !important; }
          .document-page {
            width: 190mm !important;
            min-height: 277mm !important;
            margin: 0 auto !important;
            padding: 8mm !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            page-break-after: always;
            color: #111 !important;
            background: white !important;
          }
          .document-page:last-child { page-break-after: auto; }
        }
      `}</style>

      <div className="no-print mx-auto max-w-6xl">
        <section className="rounded-[28px] bg-white p-5 shadow-xl sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs font-black tracking-[0.18em] text-slate-400">TEACHER DOCUMENTS</div>
              <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-4xl">📄 학교 필수서류 만들기</h1>
              <p className="mt-2 max-w-3xl text-sm font-bold leading-relaxed text-slate-500">
                학교명과 개인정보를 입력하고 등록 서명을 적용해 온라인 제출용 문서를 만듭니다. 주민등록번호와 신분확인번호는 저장하지 않습니다.
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/teacher/manage/operations" className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
                ← 일정 · 운영
              </Link>
            </div>
          </div>
        </section>

        {(notice || errorMessage) && (
          <div className={`mt-4 rounded-2xl px-4 py-3 text-sm font-black ${errorMessage ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
            {errorMessage || notice}
          </div>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <section className="rounded-[28px] bg-white p-5 shadow-lg sm:p-7">
            <h2 className="text-xl font-black text-slate-900">1. 내 기본정보 · 서명</h2>
            <p className="mt-1 text-xs font-bold text-slate-500">여기에 저장한 정보는 다음 학교 서류 작성 때 다시 불러옵니다.</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-black text-slate-700">
                성명
                <input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-slate-500" placeholder="성명" />
              </label>
              <label className="text-sm font-black text-slate-700">
                전화번호
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-slate-500" placeholder="010-0000-0000" />
              </label>
              <label className="text-sm font-black text-slate-700 sm:col-span-2">
                생년월일
                <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-slate-500" />
              </label>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-700">등록 서명</div>
                  <div className="mt-1 text-xs font-bold text-slate-400">마우스나 터치로 서명하세요.</div>
                </div>
                <button type="button" onClick={resetSignature} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">지우기</button>
              </div>
              <canvas
                ref={canvasRef}
                width={760}
                height={220}
                onPointerDown={beginDrawing}
                onPointerMove={draw}
                onPointerUp={endDrawing}
                onPointerCancel={endDrawing}
                className="mt-3 h-40 w-full touch-none rounded-2xl border-2 border-dashed border-slate-300 bg-white"
              />
            </div>

            <button type="button" onClick={saveProfile} disabled={saving} className="mt-5 w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white disabled:opacity-50">
              {saving ? "저장 중..." : "기본정보 · 서명 저장"}
            </button>
          </section>

          <section className="rounded-[28px] bg-white p-5 shadow-lg sm:p-7">
            <h2 className="text-xl font-black text-slate-900">2. 이번 학교 정보</h2>
            <p className="mt-1 text-xs font-bold text-slate-500">아래 민감정보는 이번 문서에만 사용하고 서버에 저장하지 않습니다.</p>

            <div className="mt-5 grid gap-4">
              <label className="text-sm font-black text-slate-700">
                학교명
                <input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-slate-500" placeholder="예: 서울신상도초등학교" />
              </label>
              <label className="text-sm font-black text-slate-700">
                작성일
                <input type="date" value={documentDate} onChange={(e) => setDocumentDate(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-slate-500" />
              </label>
              <label className="text-sm font-black text-slate-700">
                주민등록번호 · 첫 번째 동의서용
                <input value={residentNumber} onChange={(e) => setResidentNumber(e.target.value)} autoComplete="off" className="mt-2 w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 font-bold outline-none focus:border-rose-400" placeholder="문서 작성할 때만 입력" />
              </label>
              <label className="text-sm font-black text-slate-700">
                관할 경찰서명 · 선택
                <input value={policeStation} onChange={(e) => setPoliceStation(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-slate-500" placeholder="비워두면 ‘경찰서장 귀하’로 출력" />
              </label>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-black text-slate-700">행정정보 공동이용 신분확인 번호 · 필요 시</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr]">
                  <select value={identityType} onChange={(e) => setIdentityType(e.target.value as IdentityType)} className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold">
                    <option value="resident">주민등록</option>
                    <option value="passport">여권</option>
                    <option value="foreign">외국인등록</option>
                    <option value="driver">운전면허</option>
                  </select>
                  <input value={identityNumber} onChange={(e) => setIdentityNumber(e.target.value)} autoComplete="off" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold" placeholder="필요한 경우에만 입력" />
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="mt-4 rounded-[28px] bg-white p-5 shadow-lg sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">3. 출력할 서류 선택</h2>
              <div className="mt-3 flex flex-col gap-3 text-sm font-black text-slate-700 sm:flex-row sm:gap-6">
                <label className="flex items-center gap-2"><input type="checkbox" checked={includeCrimeConsent} onChange={(e) => setIncludeCrimeConsent(e.target.checked)} className="h-5 w-5" />성범죄 경력 및 아동학대관련범죄 전력 조회 동의서</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={includeAdminConsent} onChange={(e) => setIncludeAdminConsent(e.target.checked)} className="h-5 w-5" />행정정보 공동이용 사전동의서</label>
              </div>
            </div>
            <button type="button" onClick={printDocuments} className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg hover:bg-blue-700">
              PDF로 저장 · 인쇄
            </button>
          </div>
        </section>

        <div className="mt-5 text-center text-xs font-bold text-slate-400">아래 미리보기는 실제 출력 내용을 보여줍니다.</div>
      </div>

      <div className="print-root mx-auto mt-4 max-w-[210mm] space-y-4">
        {includeCrimeConsent && (
          <section className="document-page rounded-lg border border-slate-200 bg-white p-8 font-serif text-[12px] leading-relaxed shadow-lg sm:p-12">
            <div className="text-right text-[10px]">■ 아동복지법 시행규칙 [별지 제12호의5서식] &lt;개정 2019. 6. 12.&gt;</div>
            <h2 className="mt-8 text-center text-[22px] font-bold">성범죄 경력 및 아동학대관련범죄 전력 조회 동의서</h2>

            <table className="mt-8 w-full border-collapse text-[12px]">
              <tbody>
                <tr><th rowSpan={3} className="w-[16%] border border-black p-3">대상자</th><th className="w-[32%] border border-black p-3 text-left">성명(외국인의 경우 영문명)</th><td className="border border-black p-3 text-center font-sans font-bold">{name}</td></tr>
                <tr><th className="border border-black p-3 text-left">주민등록번호<br />(외국인의 경우 외국인등록번호/국적)</th><td className="border border-black p-3 text-center font-sans font-bold">{residentNumber}</td></tr>
                <tr><th className="border border-black p-3 text-left">연락처(휴대전화 등)</th><td className="border border-black p-3 text-center font-sans font-bold">{phone}</td></tr>
              </tbody>
            </table>

            <p className="mt-8 indent-4 text-justify text-[13px] leading-8">
              본인은 <strong>{schoolName || "____________"}</strong>의 취업(예정)자 또는 노무 제공(예정)자로서 「아동ㆍ청소년의 성보호에 관한 법률」 제56조 및 같은 법 시행령 제25조에 따른 성범죄 경력 조회와 「아동복지법」 제29조의3 및 같은 법 시행령 제26조의5에 따른 아동학대관련범죄 전력 조회에 동의합니다.
            </p>

            <div className="mt-10 text-center text-[13px]">{dateParts.year || "202 "}년&nbsp;&nbsp;&nbsp;{dateParts.month}월&nbsp;&nbsp;&nbsp;{dateParts.day}일</div>
            <div className="mt-8 flex items-center justify-center gap-6 text-[13px]">
              <span>동의자</span>
              <span className="font-sans font-bold">{name}</span>
              <span className="inline-flex min-h-14 min-w-40 items-center justify-center border-b border-slate-400">
                {signatureForDocument && <img src={signatureForDocument} alt="등록 서명" className="max-h-14 max-w-40 object-contain" />}
              </span>
            </div>
            <div className="mt-10 text-right text-[14px] font-bold">{policeStation ? `${policeStation}경찰서장` : "경찰서장"} 귀하</div>

            <div className="mt-10 border border-black">
              <div className="border-b border-black bg-slate-100 px-3 py-2 font-bold">유의사항</div>
              <ol className="list-decimal space-y-2 px-8 py-3 text-[10px] leading-5">
                <li>개인정보 수집항목: 성명, 주민등록번호(외국인의 경우 외국인등록번호 및 국적, 외국인등록번호가 없는 경우 생년월일 및 여권번호)</li>
                <li>개인정보 제공 거부에 따른 제한사항: 개인정보 제공 동의를 거부하는 경우에는 취업에 제한을 받을 수 있습니다.</li>
                <li>개인정보의 수집ㆍ이용 목적: 수집된 개인정보는 성범죄 경력 조회 요청, 아동학대관련범죄 전력 조회 요청 등을 위하여 사용됩니다.</li>
                <li>동의자가 2명 이상일 경우에는 뒤쪽에 일괄하여 작성할 수 있습니다.</li>
              </ol>
            </div>
            <div className="mt-2 text-right text-[9px]">210㎜×297㎜[백상지(80g/㎡) 또는 중질지(80g/㎡)]</div>
          </section>
        )}

        {includeAdminConsent && (
          <section className="document-page rounded-lg border border-slate-200 bg-white p-8 font-serif text-[12px] leading-relaxed shadow-lg sm:p-12">
            <div className="text-[10px]">「행정정보 공동이용 지침」 [별지 제8호 서식]</div>
            <h2 className="mt-10 text-center text-[24px] font-bold">행정정보 공동이용 사전동의서</h2>

            <div className="mt-10 space-y-6 text-[13px] leading-7">
              <p><strong>1. 이용기관 명칭 :</strong> <span className="font-sans font-bold">{schoolName}</span></p>
              <p><strong>2. 이용사무(이용목적) :</strong> 결격사유 유무 조회, 범죄경력 유무 조회</p>
              <div>
                <p className="font-bold">3. 공동이용 행정정보(구비서류)</p>
                <table className="mt-3 w-full border-collapse text-center text-[12px]">
                  <tbody>
                    <tr><th className="border border-black p-2">연번</th><th className="border border-black p-2">행정정보명</th><th className="border border-black p-2">연번</th><th className="border border-black p-2">행정정보명</th></tr>
                    <tr><td className="border border-black p-3">1</td><td className="border border-black p-3">결격사유 유무 조회</td><td className="border border-black p-3">2</td><td className="border border-black p-3">범죄경력 유무 조회</td></tr>
                  </tbody>
                </table>
                <p className="mt-3 text-[10px] leading-5">※ 이용기관은 본인이 동의한 위 공동이용 행정정보를 확인하기 위해「개인정보 보호법」시행령 제19조에 따라 주민등록번호, 여권번호, 운전면허의 면허번호 또는 외국인등록번호가 포함된 행정정보를 처리할 수 있습니다. 이용기관이 요청하는 경우 기재하여 주십시오.(필요시 기재사항)</p>
                <div className="mt-3 text-center font-sans text-[12px]">
                  ( {checkboxMark(identityType === "resident")} 주민등록&nbsp;&nbsp;{checkboxMark(identityType === "passport")} 여권&nbsp;&nbsp;{checkboxMark(identityType === "foreign")} 외국인등록&nbsp;&nbsp;{checkboxMark(identityType === "driver")} 운전면허 ) 번호 : <strong>{identityNumber}</strong>
                </div>
              </div>

              <div>
                <p className="font-bold">4. 정보주체(본인) 동의사항</p>
                <p className="mt-3 indent-4">○ 본인은 위 사무의 처리를 위하여 「전자정부법」제36조에 따른 행정정보 공동이용을 통해 이용기관의 업무처리담당자가 전자적으로 본인의 구비서류(공동이용 행정정보)를 확인하는 것에 동의합니다.</p>
                <p className="mt-2 text-[11px]">※ 만일, 본인이 위 행정정보 이용에 대해 동의를 하지 아니할 경우에도 불이익은 없습니다. 다만, 동의하지 아니한 경우에는 본인이 해당 구비서류를 제출하여야 합니다.</p>
              </div>
            </div>

            <div className="mt-12 text-right text-[13px]">{dateParts.year || "202 "}년&nbsp;&nbsp;&nbsp;{dateParts.month}월&nbsp;&nbsp;&nbsp;{dateParts.day}일</div>
            <div className="mt-8 ml-auto w-[70%] space-y-4 text-[13px]">
              <div className="flex items-center gap-4"><span className="w-28">대상자 본인 성명 :</span><strong className="font-sans">{name}</strong><span className="ml-auto inline-flex min-h-12 min-w-36 items-center justify-center border-b border-slate-400">{signatureForDocument && <img src={signatureForDocument} alt="등록 서명" className="max-h-12 max-w-36 object-contain" />}</span><span>(서명 또는 인)</span></div>
              <div>생년월일 : <strong className="font-sans">{birthDate}</strong></div>
              <div>전화번호 : <strong className="font-sans">{phone}</strong></div>
            </div>
            <p className="mt-16 text-[10px]">※ 개별 법령에서 필요로 하는 동의와 별개로 행정정보 공동이용 사전동의 필요</p>
          </section>
        )}
      </div>
    </main>
  );
}
