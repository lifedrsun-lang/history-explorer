import { ArchiveError } from "@/lib/photoArchive";
import { archiveOrigin, archiveTeacher, archiveRoster, listTeacherAlbums, saveArchiveAlbum, ownedArchive, archivePhotos, prepareArchiveUpload, finishArchiveUpload, editArchivePhoto, archiveImage, archiveJson, archiveError } from "@/lib/photoArchiveServer";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: Request) {
  try {
    const uid = await archiveTeacher(request), url = new URL(request.url);
    const albumId = url.searchParams.get("albumId");
    if (albumId) { const album = await ownedArchive(albumId, uid); return archiveJson({ album, photos: await archivePhotos(album.id) }); }
    return archiveJson({ albums: await listTeacherAlbums(uid), roster: await archiveRoster(), studentAccessReady: process.env.PHOTO_ARCHIVE_ACCESS_REVIEWED === "true" });
  } catch (error) { return archiveError(error); }
}
export async function POST(request: Request) {
  try {
    archiveOrigin(request);
    const uid = await archiveTeacher(request), body = await request.json();
    switch (body.action) {
      case "save": return archiveJson({ album: await saveArchiveAlbum(uid, body.album) });
      case "prepare": return archiveJson(await prepareArchiveUpload(body.albumId, uid, body));
      case "complete": return archiveJson({ photo: await finishArchiveUpload(body.albumId, uid, body.photoId) });
      case "editPhoto": await editArchivePhoto(uid, body); return archiveJson({ ok: true });
      case "image": return await archiveImage(body, uid);
      default: throw new ArchiveError("지원하지 않는 요청입니다.");
    }
  } catch (error) { return archiveError(error); }
}
