import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (
    pathname === "/teacher/presentations" &&
    searchParams.get("category") === "coding"
  ) {
    const referer = request.headers.get("referer") || "";
    const target = request.nextUrl.clone();

    if (referer.includes("/teacher/presentations/coding-source")) {
      target.pathname = "/teacher/presentations";
      target.search = "";
      return NextResponse.redirect(target);
    }

    target.pathname = "/teacher/presentations/coding-source";
    target.search = "";
    return NextResponse.redirect(target);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/teacher/presentations",
};
