import type { ReactNode } from "react";

import ReviewWorkspaceTabs from "./ReviewWorkspaceTabs";

export default function ReviewWorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <ReviewWorkspaceTabs />
      {children}
    </>
  );
}
