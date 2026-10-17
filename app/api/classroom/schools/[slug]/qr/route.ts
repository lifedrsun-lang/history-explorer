import { getContractSchool } from "@/lib/contractSchoolsServer";
import { getSchoolQr, getSchoolQrImage } from "@/lib/schoolQrServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" };

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const school = await getContractSchool(slug);
    if (!school) return Response.json({ error: "school_not_found" }, { status: 404, headers });
    if (new URL(request.url).searchParams.get("image") === "1") {
      const image = await getSchoolQrImage(slug);
      if (!image) return new Response(null, { status: 404, headers });
      return new Response(new Uint8Array(image), { headers: { ...headers, "Content-Type": "image/png", "Content-Disposition": 'inline; filename="qr.png"' } });
    }
    return Response.json({ qr: await getSchoolQr(slug) }, { headers });
  } catch {
    // Do not restore a static QR on a failed read: it may have been deleted.
    return Response.json({ error: "qr_unavailable" }, { status: 503, headers });
  }
}
