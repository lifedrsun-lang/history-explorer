"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";

import SchoolDocumentsPanel from "@/app/teacher/contract-schools/SchoolDocumentsPanel";
import { auth } from "@/lib/firebase";
import type { SchoolDocumentSchool } from "@/lib/schoolDocumentSchools";

export default function AfterSchoolDocumentsPanel({
  school,
}: {
  school: SchoolDocumentSchool;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(
    () =>
      onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setChecking(false);
      }),
    []
  );

  if (checking) {
    return (
      <div className="rounded-[28px] bg-white p-6 text-center text-sm font-bold text-slate-400 shadow-lg">
        필수서류 정보를 불러오는 중이에요.
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-[28px] bg-white p-6 text-center text-sm font-bold text-rose-600 shadow-lg">
        교사 로그인이 필요합니다.
      </div>
    );
  }

  return <SchoolDocumentsPanel school={school} user={user} />;
}
