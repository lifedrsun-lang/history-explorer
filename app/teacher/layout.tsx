import type { ReactNode } from "react";

import TeacherFeePanel from "./components/TeacherFeePanel";

export default function TeacherLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      {children}
      <TeacherFeePanel />
    </>
  );
}
