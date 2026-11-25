import { createHash, timingSafeEqual } from "node:crypto";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: object, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

// School-level convenience gate only; it does not replace student authentication.
export async function POST(request: Request) {
  const expected = process.env.DEUNGHYEON_STUDENT_ENTRY_CODE?.trim();
  if (!expected) return json({ error: "unconfigured" }, 503);
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!code || code.length > 128) return json({ valid: false });
  try {
    const ip = (request.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
    const id = createHash("sha256").update("deunghyeon:" + ip).digest("hex");
    const ref = getFirebaseAdmin().db.collection("school_entry_code_limits").doc(id);
    const now = Date.now(), duration = 15 * 60_000;
    const allowed = await ref.firestore.runTransaction(async tx => {
      const data = (await tx.get(ref)).data();
      const start = Number(data?.start || 0);
      const count = now - start < duration ? Number(data?.count || 0) : 0;
      if (count >= 30) return false;
      tx.set(ref, { start: count ? start : now, count: count + 1, expiresAt: new Date(now + duration) });
      return true;
    });
    if (!allowed) return json({ error: "rate_limited" }, 429);
    const digest = (s: string) => createHash("sha256").update(s).digest();
    return json({ valid: timingSafeEqual(digest(code), digest(expected)) });
  } catch {
    return json({ error: "unavailable" }, 503);
  }
}
