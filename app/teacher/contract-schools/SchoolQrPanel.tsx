"use client";

import { useEffect, useState } from "react";
import SharedSchoolQrPanel from "@/app/components/SchoolQrPanel";
import { auth } from "@/lib/firebase";

type Props = {
  school: { slug: string; displayName: string };
};

type SharedAccountValues = {
  id: string;
  password: string;
};

export default function SchoolQrPanel({ school }: Props) {
  const hasSharedAccount = school.slug === "dongguro";
  const [sharedAccountValues, setSharedAccountValues] = useState<SharedAccountValues | null>(null);

  useEffect(() => {
    if (!hasSharedAccount) return;

    let active = true;

    const loadSharedAccount = async () => {
      const user = auth.currentUser;
      if (!user) throw new Error("teacher_auth_required");

      const token = await user.getIdToken();
      const readValue = async (field: "id" | "password") => {
        const search = new URLSearchParams({ school: school.slug, field });
        const response = await fetch(`/api/teacher/shared-account?${search}`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = (await response.json().catch(() => ({}))) as {
          value?: string;
        };
        if (!response.ok || !payload.value) {
          throw new Error("shared_account_unavailable");
        }
        return payload.value;
      };

      const [id, password] = await Promise.all([
        readValue("id"),
        readValue("password"),
      ]);

      if (active) setSharedAccountValues({ id, password });
    };

    void loadSharedAccount().catch(() => {
      if (active) setSharedAccountValues(null);
    });

    return () => {
      active = false;
    };
  }, [hasSharedAccount, school.slug]);

  const copySharedAccount = async (field: "id" | "password") => {
    const value = sharedAccountValues?.[field];
    if (!value) {
      throw new Error("shared_account_unavailable");
    }
    await navigator.clipboard.writeText(value);
  };

  return (
    <SharedSchoolQrPanel
      school={school}
      sharedAccountAvailable={hasSharedAccount}
      sharedAccountValues={sharedAccountValues}
      onCopySharedAccount={hasSharedAccount && sharedAccountValues ? copySharedAccount : undefined}
    />
  );
}

