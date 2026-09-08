"use client";

import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { ReactNode, useEffect, useState } from "react";

import { auth } from "@/lib/firebase";

const TEACHER_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const TEACHER_SESSION_RESET_CUTOFF_MS = Date.parse(
  "2026-09-08T17:07:00+09:00"
);

function getLastSignInAt(user: User) {
  const value = user.metadata.lastSignInTime;

  if (!value) {
    return Number.NaN;
  }

  return Date.parse(value);
}

export default function TeacherSessionBoundary({
  children,
}: {
  children: ReactNode;
}) {
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let active = true;
    let expiryTimer: ReturnType<typeof setTimeout> | null = null;

    const clearExpiryTimer = () => {
      if (expiryTimer) {
        clearTimeout(expiryTimer);
        expiryTimer = null;
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      clearExpiryTimer();

      if (!currentUser) {
        if (active) {
          setSessionChecked(true);
        }
        return;
      }

      const signedInAt = getLastSignInAt(currentUser);
      const now = Date.now();
      const sessionAge = now - signedInAt;
      const isInvalidTimestamp = !Number.isFinite(signedInAt);
      const isPreResetSession = signedInAt < TEACHER_SESSION_RESET_CUTOFF_MS;
      const isExpired =
        sessionAge < 0 || sessionAge >= TEACHER_SESSION_MAX_AGE_MS;

      if (isInvalidTimestamp || isPreResetSession || isExpired) {
        if (active) {
          setSessionChecked(false);
        }

        void signOut(auth).finally(() => {
          if (active) {
            setSessionChecked(true);
          }
        });
        return;
      }

      const remainingMs = TEACHER_SESSION_MAX_AGE_MS - sessionAge;

      expiryTimer = setTimeout(() => {
        void signOut(auth);
      }, remainingMs);

      if (active) {
        setSessionChecked(true);
      }
    });

    return () => {
      active = false;
      clearExpiryTimer();
      unsubscribe();
    };
  }, []);

  if (!sessionChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center text-sm font-bold text-slate-500">
        로그인 상태를 확인하고 있어요.
      </div>
    );
  }

  return children;
}
