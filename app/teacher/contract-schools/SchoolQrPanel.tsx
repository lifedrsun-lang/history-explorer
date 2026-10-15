"use client";

import SharedSchoolQrPanel from "@/app/components/SchoolQrPanel";
import { auth } from "@/lib/firebase";

type Props = {
  school: { slug: string; displayName: string };
};

export default function SchoolQrPanel({ school }: Props) {
  const hasSharedAccount = school.slug === "dongguro";

  const copySharedAccount = async (field: "id" | "password") => {
    const user = auth.currentUser;
    if (!user) throw new Error("teacher_auth_required");

    const token = await user.getIdToken();
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
    await navigator.clipboard.writeText(payload.value);
  };

  return (
    <SharedSchoolQrPanel
      school={school}
      sharedAccountAvailable={hasSharedAccount}
      onCopySharedAccount={hasSharedAccount ? copySharedAccount : undefined}
    />
  );
}

