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
    <div className="min-h-[100dvh] bg-gradient-to-br from-sky-100 via-amber-50 to-yellow-100 px-3 py-4 text-slate-800">
      <div className="mx-auto max-w-2xl space-y-4">
        <header className="rounded-[28px] border border-white/80 bg-white/95 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black text-sky-600">🏫 서울 개봉초</div>
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
              className="shrink-0 rounded-2xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs font-black text-sky-700"
            >
              학교 변경
            </button>
          </div>
        </header>

        {!selectedClassroom ? (
          <section className="rounded-[28px] border border-white/80 bg-white/90 p-4 shadow-sm">
            <div className="mb-3">
              <h2 className="text-xl font-black text-slate-800">👋 우리 반 선택</h2>
              <p className="mt-1 text-xs font-bold text-slate-500">
                반코드는 따로 입력하지 않아요.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {GAEBONG_CLASSROOMS.map((classroom) => (
                <button
                  key={classroom.classNumber}
                  type="button"
                  onClick={() => selectClassroom(classroom)}
                  className="rounded-[22px] border border-sky-100 bg-sky-50 px-3 py-5 text-center transition hover:border-sky-300 hover:bg-sky-100 active:scale-[0.99]"
                >
                  <div className="text-sm font-black text-sky-500">6학년</div>
                  <div className="mt-1 text-2xl font-black text-slate-800">
                    {classroom.classNumber}반
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-[28px] border border-white/80 bg-white/95 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-black text-sky-700">
                  {selectedClassroom.label}
                </span>
                <h2 className="mt-3 text-xl font-black text-slate-800">
                  🎮 우리 반 비밀번호 몬스터는?
                </h2>
                <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                  선생님이 알려준 몬스터 그림을 골라 주세요. 그림 아래 이름도 함께 볼 수 있어요.
                </p>
              </div>
              <button
                type="button"
                onClick={resetClassroom}
                className="shrink-0 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-500"
              >
                반 다시 선택
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {monsterOptions.map((monster) => (
                <button
                  key={monster.id}
                  type="button"
                  onClick={() => chooseMonster(monster)}
                  className={`rounded-[22px] border bg-gradient-to-br p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 ${monster.className}`}
                >
                  <div
                    className="flex h-20 items-center justify-center rounded-2xl bg-white/80 text-4xl sm:h-24 sm:text-5xl"
                    aria-hidden="true"
                  >
                    {monster.symbol}
                  </div>
                  <div className="mt-2 text-sm font-black text-slate-800">
                    {monster.name}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-center text-[11px] font-bold text-slate-400">
              몬스터 위치는 들어올 때마다 섞여요.
            </div>

            {errorMessage && (
              <div className="mt-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-center text-sm font-black text-rose-600">
                {errorMessage}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
