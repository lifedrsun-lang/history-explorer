import { ArchiveError, studentAlbum } from "@/lib/photoArchive";
import { archiveDownloadRemaining } from "@/lib/photoArchiveDownloadServer";
import { saveArchiveConsent } from "@/lib/photoArchiveConsentServer";
import { limitStudentAttempt } from "@/lib/studentSessionServer";
import { archiveOrigin, archiveStudent, listStudentAlbums, readableArchive, archivePhotos, archiveImage, archiveDownload, archiveJson, archiveError } from "@/lib/photoArchiveServer";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    archiveOrigin(request);
    const body = await request.json();
    if (body.action === "download") return await archiveDownload(request, body);
    if (body.action === "image") return await archiveImage(body, undefined, request);
    const student = await archiveStudent(request, body);
    if (body.action === "list") return archiveJson({ albums: await listStudentAlbums(student), serverNow: Date.now() });
    if (body.action === "consent") {
      const album = await readableArchive(body.albumId, student, false);
      await limitStudentAttempt(request, "photo-consent", student.key, 30);
      return archiveJson({ consent: await saveArchiveConsent(album, student.key, body) });
    }
    if (body.action === "detail") {
      const album = await readableArchive(body.albumId, student);
      const photos = await archivePhotos(album.id);
      return archiveJson({ album: studentAlbum(album), photos, downloadRemaining: await archiveDownloadRemaining(student.key, photos.map(photo => photo.id)), serverNow: Date.now() });
    }
    throw new ArchiveError("지원하지 않는 요청입니다.");
  } catch (error) { return archiveError(error); }
}
