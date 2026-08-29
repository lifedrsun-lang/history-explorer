"use client";

import { useState } from "react";

import ClassroomBoard from "./ClassroomBoard";
import {
  CLASSROOM_MONSTERS,
  GAEBONG_CLASSROOMS,
  type ClassroomMonster,
  type GaebongClassroom,
} from "../data/classroomData";

const shuffleMonsters = () => {
  const items = [...CLASSROOM_MONSTERS];

  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }

  return items;
};

type Props = {
  onChangeSchool: () => void;
};

export default function GaebongClassPortal({ onChangeSchool }: Props) {
  const [selectedClassroom, setSelectedClassroom] =
    useState<GaebongClassroom | null>(null);
  const [monsterOptions, setMonsterOptions] =
    useState<ClassroomMonster[]>(() => shuffleMonsters());
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectClassroom = (classroom: GaebongClassroom) => {
    setSelectedClassroom(classroom);
    setMonsterOptions(shuffleMonsters());
    setIsUnlocked(false);
    setErrorMessage("");
  };

  const resetClassroom = () => {
    setSelectedClassroom(null);
    setMonsterOptions(shuffleMonsters());
    setIsUnlocked(false);
    setErrorMessage("");
  };

  const chooseMonster = (monster: ClassroomMonster) => {
    if (!selectedClassroom) {
      return;
    }

    if (monster.id === selectedClassroom.monsterId) {
      setIsUnlocked(true);
      setErrorMessage("");
      return;
    }

    setErrorMessage("앗! 우리 반 몬스터가 아니에요. 다시 골라볼까요?");
    setMonsterOptions(shuffleMonsters());
  };

  if (selectedClassroom && isUnlocked) {
    return (
      <ClassroomBoard
        classroom={selectedClassroom}
        onBack={resetClassroom}
      />
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-amber-100 via-yellow-50 to-emerald-50 px-3 py-4 text-slate-800">
      <div className="mx-auto max-w-2xl space-y-4">
        <header className="rounded-[30px] border border-amber-100 bg-white/95 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black text-emerald-600">🏫 서울 개봉초</div>
              <h1 className="mt-1 text-2xl font-black text-slate-800">
                6학년 반 수업방
              </h1>
              <p className="mt-1 text-sm font-bold text-slate-500">
                우리 반을 선택하고 수업 공지를 확인하세요.
              </p>
            </div>
            <button
              type="button"
              onClick={onChangeSchool}
              className="shrink-0 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700"
            >
              학교 변경
            </button>
          </div>
        </header>

        {!selectedClassroom ? (
          <section className="rounded-[30px] border border-white/80 bg-white/95 p-4 shadow-sm">
            <div className="mb-3">
              <h2 className="text-xl font-black text-slate-800">👋 우리 반 선택</h2>
              <p className="mt-1 text-xs font-bold text-slate-500">
                반을 누른 뒤 우리 반 비밀번호 몬스터를 골라요.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {GAEBONG_CLASSROOMS.map((classroom) => (
                <button
                  key={classroom.classNumber}
                  type="button"
                  onClick={() => selectClassroom(classroom)}
                  className="rounded-[22px] border border-emerald-100 bg-gradient-to-br from-white to-emerald-50 px-3 py-5 text-center shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100 active:scale-[0.99]"
                >
                  <div className="text-sm font-black text-emerald-500">6학년</div>
                  <div className="mt-1 text-2xl font-black text-slate-800">
                    {classroom.classNumber}반
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-[30px] border border-amber-100 bg-white/95 p-4 shadow-sm">
            <div className="rounded-[26px] border border-dashed border-amber-200 bg-gradient-to-br from-amber-50 via-white to-yellow-50 px-4 py-5 text-center">
              <h2 className="text-2xl font-black text-slate-800">
                개봉초 <span className="text-emerald-600">6학년</span>{" "}
                <span className="text-orange-500">{selectedClassroom.classNumber}반</span>
              </h2>
              <p className="mt-3 text-base font-black text-slate-700">
                우리 반 <span className="text-violet-600">비밀번호 몬스터</span>를 찾아 눌러 보세요
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                그림 아래 이름을 보고 선택해도 돼요.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {monsterOptions.map((monster) => (
                <button
                  key={monster.id}
                  type="button"
                  onClick={() => chooseMonster(monster)}
                  className={`overflow-hidden rounded-[24px] border bg-gradient-to-br p-2 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 ${monster.className}`}
                >
                  <div className="flex h-28 items-center justify-center overflow-hidden rounded-[18px] bg-white sm:h-32">
                    <img
                      src={monster.imageSrc}
                      alt=""
                      aria-hidden="true"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="px-1 pb-1 pt-2 text-sm font-black text-slate-800 sm:text-base">
                    {monster.name}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-3 rounded-2xl bg-violet-50 px-3 py-2 text-center text-[11px] font-bold text-violet-500">
              몬스터 위치는 들어올 때마다 섞여요.
            </div>

            {errorMessage && (
              <div className="mt-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-center text-sm font-black text-rose-600">
                {errorMessage}
              </div>
            )}

            <button
              type="button"
              onClick={resetClassroom}
              className="mt-3 w-full rounded-2xl bg-violet-500 py-3 text-sm font-black text-white shadow-sm transition hover:bg-violet-600"
            >
              반 다시 선택
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
