"use client";

import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { ReactNode, useEffect, useState } from "react";

import { auth } from "@/lib/firebase";
import {
  clearTeacherRememberLogin,
  getTeacherSessionPolicy,
  isTeacherRememberLoginEnabled,
} from "@/lib/teacherSession";

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
        clearTeacherRememberLogin();

        if (active) {
          setSessionChecked(true);
        }
        return;
      }

      const signedInAt = getLastSignInAt(currentUser);
      const policy = getTeacherSessionPolicy({
        rememberLogin: isTeacherRememberLoginEnabled(),
        signedInAt,
        now: Date.now(),
      });

      if (policy.kind === "expired") {
        if (active) {
          setSessionChecked(false);
        }

        clearTeacherRememberLogin();
        void signOut(auth).finally(() => {
          if (active) {
            setSessionChecked(true);
          }
        });
        return;
      }

      if (policy.kind === "session") {
        expiryTimer = setTimeout(() => {
          clearTeacherRememberLogin();
          void signOut(auth);
        }, policy.remainingMs);
      }

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
