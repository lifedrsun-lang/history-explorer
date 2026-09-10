import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { getValidGoogleDriveAccessToken } from "@/lib/googleDriveLibraryServer";
import {
  getSunLabStudentSession,
  readCookieValue,
  SUNLAB_STUDENT_SESSION_COOKIE,
} from "@/lib/sunLabStudentSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const normalize = (value: unknown) => String(value || "").trim();

const privateHeaders = () => ({
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ readerId: string }> }
) {
  try {
    const sessionId = readCookieValue(request, SUNLAB_STUDENT_SESSION_COOKIE);
    const session = await getSunLabStudentSession(sessionId);

    if (!session || !session.permissions.includes("library")) {
      return Response.json(
        { error: "SUN LAB 도서관 로그인이 필요합니다." },
        { status: 401, headers: privateHeaders() }
      );
    }

    const { readerId } = await params;
    const normalizedReaderId = normalize(readerId);

    if (!normalizedReaderId) {
      return Response.json(
        { error: "책 정보를 확인하지 못했습니다." },
        { status: 400, headers: privateHeaders() }
      );
    }

    const { db } = getFirebaseAdmin();
    const snapshot = await db
      .collection("sunlab_library_books")
      .where("readerId", "==", normalizedReaderId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return Response.json(
        { error: "책을 찾을 수 없습니다." },
        { status: 404, headers: privateHeaders() }
      );
    }

    const book = snapshot.docs[0].data();
    if (book?.isActive === false) {
      return Response.json(
        { error: "현재 읽을 수 없는 책입니다." },
        { status: 404, headers: privateHeaders() }
      );
    }

    const driveFileId = normalize(book?.driveFileId);
    const teacherUid = normalize(book?.createdBy);

    if (!driveFileId || !teacherUid) {
      return Response.json(
        { error: "책 연결 정보를 확인하지 못했습니다." },
        { status: 503, headers: privateHeaders() }
      );
    }

    const accessToken = await getValidGoogleDriveAccessToken(teacherUid);
    const driveHeaders: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };
    const range = request.headers.get("range");
    if (range) driveHeaders.Range = range;

    const driveResponse = await fetch(
      `${DRIVE_API_BASE}/files/${encodeURIComponent(driveFileId)}?alt=media&supportsAllDrives=true`,
      {
        cache: "no-store",
        headers: driveHeaders,
      }
    );

    if (!driveResponse.ok && driveResponse.status !== 206) {
      console.error("Failed to stream Sun Lab PDF", driveResponse.status);
      return Response.json(
        { error: "책 파일을 불러오지 못했습니다." },
        { status: 502, headers: privateHeaders() }
      );
    }

    const headers = new Headers(privateHeaders());
    headers.set("Content-Type", "application/pdf");
    headers.set("Content-Disposition", 'inline; filename="sunlab-book.pdf"');

    for (const headerName of ["content-length", "content-range", "accept-ranges"]) {
      const value = driveResponse.headers.get(headerName);
      if (value) headers.set(headerName, value);
    }

    return new Response(driveResponse.body, {
      status: driveResponse.status,
      headers,
    });
  } catch (error) {
    console.error("Failed to load Sun Lab PDF content", error);
    return Response.json(
      { error: "책을 불러오지 못했습니다." },
      { status: 500, headers: privateHeaders() }
    );
  }
}
