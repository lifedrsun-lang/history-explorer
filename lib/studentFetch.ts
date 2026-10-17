"use client";
import { auth } from "./firebase";

export async function studentFetch(student: { teacherPreview?: unknown }, url: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (student.teacherPreview === true) {
    const user = auth.currentUser;
    if (!user) throw new Error("교사 로그인을 다시 확인해 주세요.");
    headers.set("Authorization", `Bearer ${await user.getIdToken()}`);
    headers.set("x-sunlab-preview", "1");
  }
  return fetch(url, { ...init, headers, cache: "no-store" });
}
