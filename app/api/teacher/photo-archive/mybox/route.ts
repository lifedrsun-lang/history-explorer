import { ArchiveError } from "@/lib/photoArchive";
import { archiveOrigin, archiveTeacher, ownedArchive, importArchiveBytes, archiveJson, archiveError } from "@/lib/photoArchiveServer";
import { readMyboxFolder, myboxOriginal } from "@/lib/myboxArchiveServer";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    archiveOrigin(request);
    const uid = await archiveTeacher(request);
    if (Number(request.headers.get("content-length")) > 5000) throw new ArchiveError("요청이 너무 큽니다.");
    const raw = await request.text();
    if (raw.length > 5000) throw new ArchiveError("요청이 너무 큽니다.");
    const body = JSON.parse(raw);
    await ownedArchive(body.albumId, uid);
    if (body.action === "list") {
      const { cookie: _cookie, ...folder } = await readMyboxFolder(body.link);
      void _cookie;
      return archiveJson(folder);
    }
    if (body.action === "import") {
      const { bytes } = await myboxOriginal(body.link, body.key);
      return archiveJson(await importArchiveBytes(body.albumId, uid, bytes));
    }
    throw new ArchiveError("지원하지 않는 요청입니다.");
  } catch (error) { return archiveError(error); }
}
