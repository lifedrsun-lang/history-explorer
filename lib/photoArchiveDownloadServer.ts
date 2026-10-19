import "server-only";
import { ArchiveError } from "@/lib/photoArchive";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function archiveDownloadRemaining(studentKey: string, photoIds: string[]) {
  if (!photoIds.length) return {} as Record<string, number>;
  const result = await getSupabaseServer().from("student_photo_download_counts")
    .select("photo_id,used_count").eq("student_key", studentKey).in("photo_id", photoIds);
  if (result.error) throw new ArchiveError("다운로드 횟수를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.", 503);
  const remaining = Object.fromEntries(photoIds.map(id => [id, 3]));
  for (const row of result.data || []) {
    if (!Number.isInteger(row.used_count) || row.used_count < 1 || row.used_count > 3) throw new ArchiveError("다운로드 기록을 확인해 주세요.", 503);
    remaining[row.photo_id] = 3 - row.used_count;
  }
  return remaining;
}

export async function reserveArchiveDownload(studentKey: string, photoId: string) {
  const result = await getSupabaseServer().rpc("claim_student_photo_download", { p_student_key: studentKey, p_photo_id: photoId });
  if (result.error || !Number.isInteger(result.data) || result.data < 0 || result.data > 3) throw new ArchiveError("다운로드 기록을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.", 503);
  if (result.data === 0) throw new ArchiveError("이 사진은 이미 3회 다운로드했습니다. 더 이상 다운로드할 수 없습니다.", 429);
  return 3 - result.data;
}
