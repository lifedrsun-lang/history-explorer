"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import type { RecentMaterial } from "@/lib/presentations/recentMaterials";

async function requestHistory(user: User, cardKey?: string): Promise<RecentMaterial[]> {
  const response = await fetch("/api/teacher/recent-materials", {
    method: cardKey ? "POST" : "GET", cache: "no-store",
    headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
    ...(cardKey ? { body: JSON.stringify({ cardKey }) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "최근 사용 자료를 불러오지 못했습니다.");
  return data.materials;
}

export default function useRecentMaterials() {
  const [materials, setMaterials] = useState<RecentMaterial[]>([]);
  const [error, setError] = useState("");
  const userRef = useRef<User | null>(null);
  const generation = useRef(0);
  const pendingWrites = useRef(0);
  const writeQueue = useRef<Promise<void>>(Promise.resolve());
  const refresh = useCallback(async () => {
    const user = userRef.current;
    if (!user || pendingWrites.current > 0) return;
    const version = ++generation.current;
    try {
      const next = await requestHistory(user);
      if (version !== generation.current || userRef.current !== user) return;
      setMaterials(next); setError("");
    } catch (cause) {
      if (version !== generation.current || userRef.current !== user) return;
      setError(cause instanceof Error ? cause.message : "최근 사용 자료를 불러오지 못했습니다.");
    }
  }, []);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      userRef.current = user;
      generation.current += 1;
      setMaterials([]); setError("");
      if (user) void refresh();
    });
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    const interval = window.setInterval(onVisible, 30_000);
    return () => {
      unsubscribe(); userRef.current = null; generation.current += 1;
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(interval);
    };
  }, [refresh]);
  const recordOpen = useCallback((cardKey: string) => {
    const user = userRef.current;
    if (!user) return;
    generation.current += 1; // Ignore an older GET while an opening is being saved.
    pendingWrites.current += 1;
    // Save clicks sequentially so slow token/network responses cannot reverse their order.
    writeQueue.current = writeQueue.current.then(async () => {
      if (userRef.current !== user) return;
      try {
        const next = await requestHistory(user, cardKey);
        if (userRef.current !== user) return;
        setMaterials(next); setError("");
      } catch (cause) {
        if (userRef.current !== user) return;
        setError(cause instanceof Error ? cause.message : "최근 사용 기록을 저장하지 못했습니다.");
      }
    }).finally(() => {
      pendingWrites.current -= 1;
      if (pendingWrites.current === 0 && userRef.current !== user) void refresh();
    });
  }, [refresh]);
  return { recentKeys: materials.map((material) => material.cardKey), recordOpen, error };
}
