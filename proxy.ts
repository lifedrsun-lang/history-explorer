import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (
    pathname === "/teacher/presentations" &&
    searchParams.get("category") === "coding"
  ) {
    const referer = request.headers.get("referer") || "";

    // Keep the existing "코딩 PPT로" back link usable from the source catalog.
    if (referer.includes("/teacher/presentations/coding-source")) {
      return NextResponse.next();
    }

    const target = request.nextUrl.clone();
    target.pathname = "/teacher/presentations/coding-source";
    target.search = "";
    return NextResponse.redirect(target);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/teacher/presentations",
};
