import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { getContractSchool } from "@/lib/contractSchoolsServer";
import { deleteSchoolQr, getSchoolQr, saveSchoolQr, SCHOOL_QR_MAX_BYTES } from "@/lib/schoolQrServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
type Context = { params: Promise<{ slug: string }> };

async function target(request: Request, context: Context, mutation = false) {
  const teacher = await verifyTeacherRequest(request);
  const { slug } = await context.params;
  if (mutation) {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) throw new Error("invalid_origin");
  }
  if (!await getContractSchool(slug, { includeUnpublished: true })) throw new Error("school_not_found");
  return { slug, uid: teacher.uid };
}

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const auth = message === "teacher_auth_required" || message.includes("auth/");
  const status = auth ? 401 : message === "school_not_found" ? 404 : message === "invalid_origin" ? 403 : message.startsWith("invalid_") ? 400 : 503;
  const text = auth ? "교사 로그인이 필요해요." : message === "invalid_qr_url" ? "접속 주소는 http:// 또는 https://로 입력해 주세요." : message === "invalid_qr_image" ? "3MB 이하의 JPG·PNG·WEBP QR 이미지를 선택해 주세요. 이미지가 너무 크거나 복잡하면 QR 부분만 잘라 올려 주세요." : message === "school_not_found" ? "학교를 찾지 못했어요." : message === "invalid_origin" ? "허용되지 않은 요청이에요." : "QR을 처리하지 못했어요. 다시 시도해 주세요.";
  return Response.json({ error: text }, { status, headers });
}

export async function GET(request: Request, context: Context) {
  try { const { slug } = await target(request, context); return Response.json({ qr: await getSchoolQr(slug, true) }, { headers }); }
  catch (error) { return failure(error); }
}

export async function POST(request: Request, context: Context) {
  try {
    const { slug, uid } = await target(request, context, true);
    if (Number(request.headers.get("content-length")) > SCHOOL_QR_MAX_BYTES + 12000) throw new Error("invalid_qr_image");
    const form = await request.formData();
    const file = form.get("image");
    if (!(file instanceof File) || !file.size || file.size > SCHOOL_QR_MAX_BYTES) throw new Error("invalid_qr_image");
    const qr = await saveSchoolQr(slug, { bytes: Buffer.from(await file.arrayBuffer()), encodedUrl: String(form.get("encodedUrl") || ""), uid });
    return Response.json({ qr }, { headers });
  } catch (error) { return failure(error); }
}

export async function DELETE(request: Request, context: Context) {
  try { const { slug, uid } = await target(request, context, true); await deleteSchoolQr(slug, uid); return Response.json({ qr: null }, { headers }); }
  catch (error) { return failure(error); }
}
