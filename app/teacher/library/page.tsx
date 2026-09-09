"use client";

import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";

import { auth } from "@/lib/firebase";

type DriveStatus = {
  configured: boolean;
  connected: boolean;
  folderConfigured: boolean;
  scope?: string;
};

type LibraryBook = {
  id: string;
  driveFileId: string;
  title: string;
  originalName: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
  webViewLink: string;
  createdBy: string;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

type PickerTokenPayload = {
  accessToken: string;
  apiKey: string;
  appId: string;
  folderId: string;
};

declare global {
  interface Window {
    gapi?: any;
    google?: any;
  }
}

let pickerLoaderPromise: Promise<void> | null = null;

const loadGooglePicker = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("브라우저에서만 사용할 수 있습니다."));
  }

  if (window.google?.picker && window.gapi) {
    return Promise.resolve();
  }

  if (pickerLoaderPromise) {
    return pickerLoaderPromise;
  }

  pickerLoaderPromise = new Promise<void>((resolve, reject) => {
    const initializePicker = () => {
      if (!window.gapi) {
        reject(new Error("Google API 로더를 불러오지 못했습니다."));
        return;
      }

      window.gapi.load("picker", {
        callback: () => resolve(),
        onerror: () => reject(new Error("Google Picker를 불러오지 못했습니다.")),
      });
    };

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-sunlab-google-picker="true"]'
    );

    if (existing) {
      if (window.gapi) {
        initializePicker();
      } else {
        existing.addEventListener("load", initializePicker, { once: true });
        existing.addEventListener(
          "error",
          () => reject(new Error("Google API 스크립트를 불러오지 못했습니다.")),
          { once: true }
        );
      }
      return;
    }

    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    script.defer = true;
    script.dataset.sunlabGooglePicker = "true";
    script.onload = initializePicker;
    script.onerror = () =>
      reject(new Error("Google API 스크립트를 불러오지 못했습니다."));
    document.head.appendChild(script);
  });

  return pickerLoaderPromise;
};

const formatBytes = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "용량 확인 전";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  if (value < 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function TeacherLibraryPage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [pickerOpening, setPickerOpening] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecking(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleDrive = params.get("googleDrive");

    if (googleDrive === "connected") {
      setNotice("Google Drive 연결이 완료되었습니다. 이제 PDF를 선택할 수 있어요.");
    } else if (googleDrive === "cancelled") {
      setErrorMessage("Google Drive 연결이 취소되었습니다.");
    } else if (googleDrive === "error") {
      setErrorMessage("Google Drive 연결 중 오류가 발생했습니다.");
    }
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
        const error = new Error(data?.error || "요청 처리에 실패했습니다.") as Error & {
          code?: string;
        };
        error.code = data?.code;
        throw error;
      }

      return data;
    },
    [getToken]
  );

  const refreshLibrary = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setErrorMessage("");

    try {
      const [statusData, booksData] = await Promise.all([
        requestJson("/api/teacher/google-drive/status"),
        requestJson("/api/teacher/library/books"),
      ]);
      setStatus(statusData as DriveStatus);
      setBooks(Array.isArray(booksData?.books) ? booksData.books : []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "도서관 정보를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, [requestJson, user]);

  useEffect(() => {
    void refreshLibrary();
  }, [refreshLibrary]);

  const connectDrive = async () => {
    setConnecting(true);
    setErrorMessage("");

    try {
      const data = await requestJson("/api/teacher/google-drive/connect", {
        method: "POST",
      });
      const authorizationUrl = String(data?.authorizationUrl || "").trim();
      if (!authorizationUrl) {
        throw new Error("Google Drive 연결 주소를 받지 못했습니다.");
      }
      window.location.assign(authorizationUrl);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Google Drive 연결에 실패했습니다."
      );
      setConnecting(false);
    }
  };

  const registerPickedFile = useCallback(
    async (fileId: string) => {
      const data = await requestJson("/api/teacher/library/books", {
        method: "POST",
        body: JSON.stringify({ fileId }),
      });

      const book = data?.book as LibraryBook | undefined;
      if (book) {
        setBooks((current) => [
          book,
          ...current.filter((item) => item.id !== book.id),
        ]);
        setNotice(`「${book.title}」 등록이 완료되었습니다.`);
      }
    },
    [requestJson]
  );

  const openPicker = async () => {
    setPickerOpening(true);
    setErrorMessage("");
    setNotice("");

    try {
      const pickerConfig = (await requestJson(
        "/api/teacher/google-drive/picker-token"
      )) as PickerTokenPayload;

      await loadGooglePicker();

      const pickerApi = window.google?.picker;
      if (!pickerApi) {
        throw new Error("Google Picker가 준비되지 않았습니다.");
      }

      const view = new pickerApi.DocsView(pickerApi.ViewId.DOCS);
      view.setMimeTypes("application/pdf");
      view.setMode(pickerApi.DocsViewMode.LIST);
      if (pickerConfig.folderId) {
        view.setParent(pickerConfig.folderId);
      }

      const picker = new pickerApi.PickerBuilder()
        .addView(view)
        .enableFeature(pickerApi.Feature.NAV_HIDDEN)
        .setDeveloperKey(pickerConfig.apiKey)
        .setAppId(pickerConfig.appId)
        .setOAuthToken(pickerConfig.accessToken)
        .setLocale("ko")
        .setTitle("SUNLAB_LIBRARY에서 PDF 선택")
        .setOrigin(window.location.origin)
        .setCallback(async (data: any) => {
          if (data?.action !== pickerApi.Action.PICKED) return;

          const documents = data?.[pickerApi.Response.DOCUMENTS];
          const firstDocument = Array.isArray(documents) ? documents[0] : null;
          const fileId = String(firstDocument?.[pickerApi.Document.ID] || "").trim();

          if (!fileId) {
            setErrorMessage("선택한 파일 ID를 확인하지 못했습니다.");
            return;
          }

          try {
            await registerPickedFile(fileId);
          } catch (error) {
            setErrorMessage(
              error instanceof Error
                ? error.message
                : "선택한 PDF를 등록하지 못했습니다."
            );
          }
        })
        .build();

      picker.setVisible(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Google Picker를 열지 못했습니다."
      );
    } finally {
      setPickerOpening(false);
    }
  };

  const registeredSize = useMemo(
    () => books.reduce((sum, book) => sum + Number(book.size || 0), 0),
    [books]
  );

  if (authChecking) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 p-6 text-sm font-bold text-slate-500">
        교사 로그인 상태를 확인하고 있어요.
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 p-6">
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-6 text-center shadow-sm">
          <div className="text-4xl">📚</div>
          <h1 className="mt-3 text-xl font-black text-slate-900">선랩 도서관</h1>
          <p className="mt-2 text-sm text-slate-500">교사 로그인 후 이용할 수 있습니다.</p>
          <Link
            href="/teacher"
            className="mt-5 inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white"
          >
            교사 로그인으로 이동
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#f5f7fb] p-3 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-5 shadow-sm">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">
              SUN LAB DIGITAL LIBRARY
            </div>
            <h1 className="mt-1 text-2xl font-black text-slate-900">📚 선랩 도서관 관리</h1>
            <p className="mt-1 text-sm text-slate-500">
              원본 PDF는 Google Drive에 두고 선랩에는 책 정보만 등록합니다.
            </p>
          </div>
          <Link
            href="/teacher"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600"
          >
            ← 관리소
          </Link>
        </div>

        {(notice || errorMessage) && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
              errorMessage
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {errorMessage || notice}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">Google Drive 연결</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  SUNLAB_LIBRARY에서 PDF를 선택하려면 선랩에 Drive 접근 권한을 먼저 연결합니다.
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-black ${
                  status?.connected
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {status?.connected ? "연결됨" : "연결 필요"}
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {!status?.connected ? (
                <button
                  type="button"
                  onClick={connectDrive}
                  disabled={connecting || loading}
                  className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
                >
                  {connecting ? "연결 중..." : "Google Drive 연결"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openPicker}
                  disabled={pickerOpening || loading}
                  className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
                >
                  {pickerOpening ? "Picker 준비 중..." : "＋ Google Drive에서 PDF 추가"}
                </button>
              )}

              <button
                type="button"
                onClick={() => void refreshLibrary()}
                disabled={loading}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 disabled:opacity-50"
              >
                {loading ? "확인 중..." : "새로고침"}
              </button>
            </div>

            {!status?.configured && !loading && (
              <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-700">
                Google Drive 환경변수 설정을 확인해 주세요.
              </p>
            )}
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">현재 등록 현황</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-bold text-slate-500">등록 책</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{books.length}권</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-bold text-slate-500">원본 합계</div>
                <div className="mt-1 text-lg font-black text-slate-900">
                  {formatBytes(registeredSize)}
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">
              PDF 원본은 GitHub 저장소에 복사하지 않습니다. 선랩에는 Drive 파일 ID와 책 정보만 기록합니다.
            </p>
          </section>
        </div>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">등록된 책</h2>
              <p className="mt-1 text-sm text-slate-500">1차 단계에서는 PDF 선택·등록까지 검증합니다.</p>
            </div>
          </div>

          {loading && books.length === 0 ? (
            <div className="py-12 text-center text-sm font-bold text-slate-400">불러오는 중...</div>
          ) : books.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
              <div className="text-4xl">📖</div>
              <p className="mt-3 text-sm font-black text-slate-700">아직 등록된 책이 없습니다.</p>
              <p className="mt-1 text-xs text-slate-500">Drive 연결 후 테스트 PDF 한 권부터 추가해 주세요.</p>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {books.map((book) => (
                <article
                  key={book.id}
                  className="rounded-3xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex gap-3">
                    <div className="flex h-14 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">
                      📕
                    </div>
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-sm font-black leading-5 text-slate-900">
                        {book.title}
                      </h3>
                      <p className="mt-1 truncate text-xs text-slate-500">{book.originalName}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">
                    <span className="rounded-full bg-white px-2.5 py-1">PDF</span>
                    <span className="rounded-full bg-white px-2.5 py-1">{formatBytes(book.size)}</span>
                    {book.createdAt && (
                      <span className="rounded-full bg-white px-2.5 py-1">
                        {formatDate(book.createdAt)} 등록
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-800">
          <strong>다음 단계:</strong> PDF 등록이 정상 작동하는 것을 확인한 뒤 학생용 책장과 페이지 넘김 뷰어를 붙입니다. 브라우저에서 스크린샷 자체를 완전히 막을 수는 없으므로, 학생 뷰어는 다운로드·인쇄 UI 제거와 원본 Drive 링크 비노출을 기본으로 설계합니다.
        </section>
      </div>
    </div>
  );
}
