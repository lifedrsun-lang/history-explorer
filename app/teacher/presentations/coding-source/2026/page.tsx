"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, orderBy, query, Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";
import {
  ADVANCED_2026,
  BASIC_2026,
  REFERENCE_2026,
  type CurriculumItem,
} from "./data";

const SOURCE_CATALOG_KEY = "hello-maple-2026";
const MATERIAL_TYPES = ["교사용 지도안", "학생용 교재", "수업 PPT", "학생용 링크"] as const;
type MaterialType = (typeof MATERIAL_TYPES)[number];
type ProgramTab = "basic" | "advanced";

type LinkedMaterial = {
  id: string;
  moduleId: string;
  moduleTitle: string;
  resourceType: MaterialType;
  resourceTitle: string;
  lessonLabel: string;
  resourceUrl: string;
  createdAt: number;
};

function isMaterialType(value: unknown): value is MaterialType {
  return MATERIAL_TYPES.includes(String(value) as MaterialType);
}

export default function HelloMaple2026Page() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [tab, setTab] = useState<ProgramTab>("basic");
  const [materials, setMaterials] = useState<LinkedMaterial[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/teacher");
        return;
      }

      setAuthorized(true);
      setAuthChecking(false);
      setLoadingMaterials(true);
      setLoadError("");

      try {
        const snapshot = await getDocs(
          query(collection(db, "presentations"), orderBy("createdAt", "desc"))
        );
        const nextMaterials = snapshot.docs
          .map((docItem) => {
            const data = docItem.data();
            if (data?.sourceCatalog !== SOURCE_CATALOG_KEY) return null;
            if (!data?.resourceUrl || !data?.sourceModuleId) return null;

            const resourceType = isMaterialType(data?.resourceType)
              ? data.resourceType
              : "수업 PPT";

            return {
              id: docItem.id,
              moduleId: String(data.sourceModuleId),
              moduleTitle: String(data.sourceModuleTitle || ""),
              resourceType,
              resourceTitle: String(data.resourceTitle || "").trim(),
              lessonLabel: String(data.lessonLabel || "").trim(),
              resourceUrl: String(data.resourceUrl),
              createdAt:
                data?.createdAt instanceof Timestamp ? data.createdAt.toMillis() : 0,
            } satisfies LinkedMaterial;
          })
          .filter((item): item is LinkedMaterial => Boolean(item));

        setMaterials(nextMaterials);
      } catch (error) {
        console.error("HelloMaple 2026 materials load failed:", error);
        setLoadError("연결한 자료 링크를 불러오지 못했습니다.");
      } finally {
        setLoadingMaterials(false);
      }
    });

    return unsubscribe;
  }, [router]);

  const materialsByModule = useMemo(() => {
    const map = new Map<string, LinkedMaterial[]>();
    for (const material of materials) {
      const list = map.get(material.moduleId) ?? [];
      list.push(material);
      map.set(material.moduleId, list);
    }
    return map;
  }, [materials]);

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

  const activeItems = tab === "basic" ? BASIC_2026 : ADVANCED_2026;

  return (
    <main className="min-h-[100dvh] bg-[#f5f7fb] p-3 text-slate-800 md:p-5">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl bg-white p-5 shadow-md md:p-6">
          <p className="text-sm font-black text-emerald-600">🍁 헬로메이플 · 2026</p>
          <h1 className="mt-1 text-2xl font-black md:text-3xl">2026 원본 콘텐츠 자료실</h1>
          <p className="mt-2 max-w-4xl text-sm font-bold leading-6 text-slate-500">
            학교와 공유하는 제안서의 번호를 공식 번호로 사용합니다. 상세자료의 내부 번호가 다를 경우에는
            제목과 내용을 기준으로 기본 1~8, 심화 1~13에 연결했습니다.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Summary label="기본 프로그램" value="8개" />
            <Summary label="심화 프로그램" value="13개" />
            <Summary label="자료 관리" value="원본 1곳에서 재사용" />
          </div>
        </header>

        <section className="mt-4 rounded-3xl bg-white p-4 shadow-md md:p-5">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5 sm:max-w-md">
            <button
              type="button"
              onClick={() => setTab("basic")}
              className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                tab === "basic" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"
              }`}
            >
              기본 프로그램 · 1~8
            </button>
            <button
              type="button"
              onClick={() => setTab("advanced")}
              className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                tab === "advanced" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"
              }`}
            >
              심화 프로그램 · 1~13
            </button>
          </div>

          {tab === "basic" ? (
            <p className="mt-3 text-xs font-bold leading-5 text-slate-400">
              학교가 “기본 2, 4, 5”처럼 번호를 선택하면 이 공식 번호 기준으로 수업자료를 준비합니다.
            </p>
          ) : (
            <p className="mt-3 text-xs font-bold leading-5 text-slate-400">
              심화 1~5는 기초 학습 모듈, 심화 6~13은 주제 학습 모듈입니다.
            </p>
          )}

          {loadingMaterials ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-500">
              연결 자료를 불러오는 중입니다...
            </div>
          ) : null}
          {loadError ? (
            <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-4 text-sm font-black text-red-600">
              {loadError}
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {activeItems.map((item) => (
              <CurriculumCard
                key={item.id}
                item={item}
                materials={materialsByModule.get(item.id) ?? []}
              />
            ))}
          </div>

          {tab === "advanced" ? (
            <div className="mt-7 border-t border-slate-100 pt-6">
              <div className="mb-3">
                <h2 className="text-lg font-black text-slate-800">별도 참고 모듈</h2>
                <p className="mt-1 text-xs font-bold leading-5 text-slate-400">
                  상세자료에는 있으나 학교 제안서의 공식 심화 1~13과 동일한 제목이 없어 번호를 부여하지 않았습니다.
                </p>
              </div>
              <div className="grid gap-3 xl:grid-cols-2">
                {REFERENCE_2026.map((item) => (
                  <CurriculumCard
                    key={item.id}
                    item={item}
                    materials={materialsByModule.get(item.id) ?? []}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function CurriculumCard({ item, materials }: { item: CurriculumItem; materials: LinkedMaterial[] }) {
  const linkedCount = materials.length;

  return (
    <details id={item.id} className="group rounded-2xl border border-slate-200 bg-slate-50 shadow-sm open:bg-white">
      <summary className="cursor-pointer list-none p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 min-w-11 items-center justify-center rounded-2xl bg-emerald-100 px-2 text-sm font-black text-emerald-700">
            {item.number === null ? "참고" : item.number}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {item.group ? <Badge>{item.group}</Badge> : null}
              {item.audience ? <Badge>{item.audience}</Badge> : null}
              <Badge>{item.hours}</Badge>
              {linkedCount > 0 ? <Badge accent>연결 자료 {linkedCount}개</Badge> : null}
            </div>
            <h2 className="mt-2 text-base font-black leading-6 text-slate-800">
              {item.number === null ? item.title : `${item.number}. ${item.title}`}
            </h2>
            {item.proposalSummary ? (
              <p className="mt-1 text-xs font-bold leading-5 text-slate-500">{item.proposalSummary}</p>
            ) : null}
          </div>
          <span className="mt-1 text-sm font-black text-slate-400 transition group-open:rotate-180">⌄</span>
        </div>
      </summary>

      <div className="border-t border-slate-100 px-4 pb-4 pt-4">
        {item.description ? (
          <div className="rounded-xl bg-emerald-50 px-3 py-3 text-xs font-bold leading-5 text-emerald-900">
            {item.description}
          </div>
        ) : null}

        {item.details.length > 0 ? (
          <div className="mt-3">
            <p className="text-xs font-black text-slate-400">세부 차시 / 콘텐츠</p>
            <div className="mt-2 space-y-2">
              {item.details.map((detail, index) => (
                <div key={`${detail.lesson}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-white px-2 py-1 text-[10px] font-black text-emerald-700 shadow-sm">
                      {detail.lesson}
                    </span>
                    {detail.content ? <span className="text-xs font-black text-slate-700">{detail.content}</span> : null}
                  </div>
                  <p className="mt-1.5 text-xs font-bold leading-5 text-slate-500">{detail.description}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {item.variants?.length ? (
          <div className="mt-3 space-y-3">
            {item.variants.map((variant) => (
              <div key={variant.title} className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-black text-slate-800">{variant.title}</h3>
                  <Badge>{variant.audience}</Badge>
                </div>
                <div className="mt-2 space-y-2">
                  {variant.details.map((detail, index) => (
                    <div key={`${variant.title}-${detail.lesson}-${index}`} className="rounded-xl bg-white px-3 py-2.5">
                      <div className="text-[11px] font-black text-emerald-700">
                        {detail.lesson} · {detail.content}
                      </div>
                      <p className="mt-1 text-xs font-bold leading-5 text-slate-500">{detail.description}</p>
                    </div>
                  ))}
                </div>
                {variant.referenceFiles?.length ? (
                  <ReferenceFiles files={variant.referenceFiles} />
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {item.referenceFiles?.length ? <ReferenceFiles files={item.referenceFiles} /> : null}

        {item.status ? (
          <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-xs font-black leading-5 text-amber-700">
            {item.status}
          </div>
        ) : null}

        {item.note ? (
          <p className="mt-3 text-[11px] font-bold leading-5 text-slate-400">※ {item.note}</p>
        ) : null}

        <MaterialArea item={item} materials={materials} />
      </div>
    </details>
  );
}

function MaterialArea({ item, materials }: { item: CurriculumItem; materials: LinkedMaterial[] }) {
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-black text-slate-700">Sun Lab 연결 자료</p>
          <p className="mt-0.5 text-[11px] font-bold text-slate-400">
            파일을 내려받은 뒤 OneDrive 등 외부 링크를 연결하면 다른 학교에서도 같은 원본을 바로 열 수 있습니다.
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {MATERIAL_TYPES.map((type) => {
          const typeMaterials = materials.filter((material) => material.resourceType === type);
          const addHref =
            `/teacher/presentations/coding-source/2026/new?moduleId=${encodeURIComponent(item.id)}` +
            `&type=${encodeURIComponent(type)}`;

          return (
            <div key={type} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-slate-700">{type}</span>
                <Link
                  href={addHref}
                  className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-black text-white hover:bg-emerald-700"
                >
                  + 추가
                </Link>
              </div>

              {typeMaterials.length > 0 ? (
                <div className="mt-2 space-y-1.5">
                  {typeMaterials.map((material, index) => (
                    <div key={material.id} className="rounded-lg bg-white p-2 shadow-sm">
                      <a
                        href={material.resourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block break-words text-xs font-black text-emerald-700 hover:underline"
                      >
                        {material.resourceTitle || `${type} ${index + 1}`} ↗
                      </a>
                      {material.lessonLabel ? (
                        <p className="mt-0.5 text-[10px] font-bold text-slate-400">{material.lessonLabel}</p>
                      ) : null}
                      <Link
                        href={`/teacher/presentations/coding-source/2026/new?id=${material.id}`}
                        className="mt-1 inline-flex text-[10px] font-black text-slate-400 hover:text-slate-700"
                      >
                        수정
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-[10px] font-bold text-slate-300">아직 연결된 링크 없음</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReferenceFiles({ files }: { files: string[] }) {
  return (
    <details className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <summary className="cursor-pointer text-xs font-black text-slate-600">
        원본표에 기재된 자료명 {files.length}개
      </summary>
      <div className="mt-2 space-y-1.5">
        {files.map((file) => (
          <p key={file} className="break-words text-[11px] font-bold leading-5 text-slate-500">
            {file}
          </p>
        ))}
      </div>
    </details>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
      <p className="text-xs font-black text-emerald-600">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-800">{value}</p>
    </div>
  );
}

function Badge({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-black ${
        accent ? "bg-emerald-600 text-white" : "bg-white text-slate-500"
      }`}
    >
      {children}
    </span>
  );
}
