"use client";

import { Suspense, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import PersonalStudyLibrary from "./PersonalStudyLibrary";

function PresentationsLayoutContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isPersonalStudyRoot =
    pathname === "/teacher/presentations" && searchParams.get("category") === "personal_study";

  return isPersonalStudyRoot ? <PersonalStudyLibrary /> : children;
}

export default function PresentationsLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={children}>
      <PresentationsLayoutContent>{children}</PresentationsLayoutContent>
    </Suspense>
  );
}
