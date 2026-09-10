export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PDFJS_VERSION = "3.11.174";
const ALLOWED_ASSETS = new Set(["pdf.min.js", "pdf.worker.min.js"]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ asset: string }> }
) {
  const { asset } = await params;

  if (!ALLOWED_ASSETS.has(asset)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const upstream = await fetch(
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/${asset}`,
      { next: { revalidate: 60 * 60 * 24 * 30 } }
    );

    if (!upstream.ok) {
      return new Response("PDF viewer asset unavailable", { status: 502 });
    }

    const headers = new Headers();
    headers.set("Content-Type", "application/javascript; charset=utf-8");
    headers.set("Cache-Control", "public, max-age=2592000, immutable");
    headers.set("X-Content-Type-Options", "nosniff");

    return new Response(upstream.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Failed to proxy PDF.js asset", error);
    return new Response("PDF viewer asset unavailable", { status: 502 });
  }
}
