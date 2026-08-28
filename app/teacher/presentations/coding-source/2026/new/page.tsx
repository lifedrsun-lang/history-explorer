"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";
import { getCurriculumItem } from "../data";

const SOURCE_CATALOG_KEY = "hello-maple-2026";
const MATERIAL_TYPES = ["교사용 지도안", "학생용 교재", "수업 PPT", "학생용 링크"] as const;
type MaterialType = (typeof MATERIAL_TYPES)[number];

type MaterialDraft = {
  resourceType: MaterialType;
  resourceTitle: string;
  lessonLabel: string;
  resourceUrl: string;
};

const EMPTY_DRAFT: MaterialDraft = {
  resourceType: "수업 PPT",
  resourceTitle: "",
  lessonLabel: "",
  resourceUrl: "",
};

function isMaterialType(value: unknown): value is MaterialType {
  return MATERIAL_TYPES.includes(String(value) as MaterialType);
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export default function HelloMaple2026MaterialEditorPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [moduleId, setModuleId] = useState("");
  const [editId, setEditId] = useState("");
  const [draft, setDraft] = useState<MaterialDraft>(EMPTY_DRAFT);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const module = useMemo(() => getCurriculumItem(moduleId), [moduleId]);
  const isValid = Boolean(module && isValidHttpUrl(draft.resourceUrl));

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/teacher");
        return;
      }

      setAuthorized(true);
      setCurrentUser(user);

      const params = new URLSearchParams(window.location.search);
      const requestedEditId = String(params.get("id") || "").trim();
      const requestedModuleId = String(params.get("moduleId") || "").trim();
      const requestedType = params.get("type");

      if (requestedEditId) {
        try {
          const snapshot = await getDoc(doc(db, "presentations", requestedEditId));
          if (!snapshot.exists()) {
            setLoadError("수정할 자료를 찾지 못했습니다.");
          } else {
            const data = snapshot.data();
            if (data?.sourceCatalog !== SOURCE_CATALOG_KEY) {
              setLoadError("헬로메이플 2026 원본자료가 아닙니다.");
            } else {
              const storedModuleId = String(data?.sourceModuleId || "");
              if (!getCurriculumItem(storedModuleId)) {
                setLoadError("연결된 2026 커리큘럼을 찾지 못했습니다.");
              } else {
                setEditId(requestedEditId);
                setModuleId(storedModuleId);
                setDraft({
                  resourceType: isMaterialType(data?.resourceType)
                    ? data.resourceType
                    : "수업 PPT",
                  resourceTitle: String(data?.resourceTitle || ""),
                  lessonLabel: String(data?.lessonLabel || ""),
                  resourceUrl: String(data?.resourceUrl || ""),
                });
              }
            }
          }
        } catch (error) {
          console.error("HelloMaple material load failed:", error);
          setLoadError("자료 정보를 불러오지 못했습니다.");
        }
      } else if (!getCurriculumItem(requestedModuleId)) {
        setLoadError("연결할 2026 커리큘럼을 찾지 못했습니다.");
      } else {
        setModuleId(requestedModuleId);
        if (isMaterialType(requestedType)) {
          setDraft((current) => ({ ...current, resourceType: requestedType }));
        }
      }

      setAuthChecking(false);
    });

    return unsubscribe;
  }, [router]);

  const updateDraft = <K extends keyof MaterialDraft>(field: K, value: MaterialDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setSaveError("");
  };

  const handleSubmit = async () => {
    if (!isValid || !module || !currentUser || isSaving) return;

    setIsSaving(true);
    setSaveError("");

    const payload = {
      schemaVersion: 7,
      category: "coding",
      sourceCatalog: SOURCE_CATALOG_KEY,
      sourceModuleId: module.id,
      sourceModuleTitle: module.title,
      resourceType: draft.resourceType,
      resourceTitle: draft.resourceTitle.trim(),
      lessonLabel: draft.lessonLabel.trim(),
      resourceUrl: draft.resourceUrl.trim(),
      updatedBy: currentUser.uid,
      updatedAt: serverTimestamp(),
      pptUrl: "",
      cardName: "",
      cardKey: "",
      bookNumber: "",
      lessonNumber: "",
      lessonTitle: "",
    };

    try {
      if (editId) {
        await updateDoc(doc(db, "presentations", editId), payload);
      } else {
        await addDoc(collection(db, "presentations"), {
          ...payload,
          createdBy: currentUser.uid,
          createdAt: serverTimestamp(),
        });
      }

      router.push(`/teacher/presentations/coding-source/2026#${module.id}`);
    } catch (error) {
      console.error("HelloMaple material save failed:", error);
      setSaveError("자료 링크 저장에 실패했습니다. 입력한 링크를 확인해 주세요.");
    } finally {
      setIsSaving(false);
    }
  };

  if (authChecking) {
    return (
      <main className="flex min-h-[70dvh] items-center justify-center bg-[#f5f7fb] p-4">
        <div className="rounded-3xl bg-white px-6 py-5 text-sm font-black text-slate-600 shadow-md">
          교사 로그인을 확인하는 중입니다...
        </div>
      </main>
    );
  }

  if (!authorized) return null;

  return (
    <main className="min-h-[100dvh] bg-[#f5f7fb] p-3 text-slate-800 md:p-5">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl bg-white p-5 shadow-md md:p-6">
          <Link
            href={module ? `/teacher/presentations/coding-source/2026#${module.id}` : "/teacher/presentations/coding-source/2026"}
            className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-100"
          >
            ← 2026 자료실
          </Link>

          <p className="mt-5 text-xs font-black text-emerald-600">🍁 헬로메이플 2026</p>
          <h1 className="mt-1 text-2xl font-black">{editId ? "연결 자료 수정" : "자료 링크 추가"}</h1>

          {module ? (
            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <div className="text-xs font-black text-emerald-600">연결할 커리큘럼</div>
              <div className="mt-1 text-base font-black text-slate-800">
                {module.number === null ? module.title : `${module.number}. ${module.title}`}
              </div>
              <div className="mt-1 text-xs font-bold text-slate-500">{module.hours}</div>
            </div>
          ) : null}

          {loadError ? (
            <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-600">
              {loadError}
            </div>
          ) : null}

          {!loadError && module ? (
            <div className="mt-5 grid gap-4">
              <label className="text-sm font-black text-slate-700">
                자료 종류
                <select
                  value={draft.resourceType}
                  onChange={(event) => updateDraft("resourceType", event.target.value as MaterialType)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                >
                  {MATERIAL_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-black text-slate-700">
                자료이름 (선택)
                <input
                  type="text"
                  value={draft.resourceTitle}
                  maxLength={120}
                  placeholder="예: 1-2차시 수업 PPT"
                  onChange={(event) => updateDraft("resourceTitle", event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                />
                <span className="mt-1.5 block text-xs font-bold text-slate-400">
                  비워두면 자료 종류를 기준으로 자동 표시됩니다.
                </span>
              </label>

              <label className="text-sm font-black text-slate-700">
                차시·구분 (선택)
                <input
                  type="text"
                  value={draft.lessonLabel}
                  maxLength={80}
                  placeholder="예: 1-2차시 / 3~4학년"
                  onChange={(event) => updateDraft("lessonLabel", event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                />
              </label>

              <label className="text-sm font-black text-slate-700">
                자료 링크
                <input
                  type="url"
                  value={draft.resourceUrl}
                  placeholder="https://1drv.ms/..."
                  onChange={(event) => updateDraft("resourceUrl", event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                />
              </label>

              {saveError ? (
                <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-600">
                  {saveError}
                </div>
              ) : null}

              <button
                type="button"
                disabled={!isValid || isSaving}
                onClick={handleSubmit}
                className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition enabled:hover:bg-emerald-700 disabled:opacity-40"
              >
                {isSaving ? "저장 중..." : editId ? "수정 저장" : "자료 링크 저장"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
