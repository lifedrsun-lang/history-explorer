import "server-only";
import { ArchiveError } from "@/lib/photoArchive";

// MYBOX's shared-folder web endpoints, verified against its own current web client.
// No Naver account cookies, API keys or private-account endpoints are used.
const api = "https://api.mybox.naver.com";
const maxBytes = 10 * 1024 * 1024;
export type MyboxItem = { key: string; name: string; size: number; modified: number };
type Folder = { resourceKey: string; resourceName: string; resourceType: string; hasPassword: boolean; blockDownload: boolean };
type Listing = { totalCount: number; list: { resourceKey: string; subPath: string; resourceType: string; fileType: string; resourceSize: number; updateDate: number; isPasswordLocked: boolean; isUploaded: boolean; virus: unknown }[] };
const fail = () => new ArchiveError("MYBOX 공유 폴더를 읽지 못했습니다. 링크·공유 기간·다운로드 허용 여부를 확인해 주세요.", 502);

export function myboxLink(value: unknown) {
  let url: URL;
  try { url = new URL(String(value)); } catch { throw new ArchiveError("MYBOX 공유 링크를 입력해 주세요."); }
  if (url.protocol !== "https:" || url.port || url.username || url.password || url.hash || String(value).length > 1000) throw new ArchiveError("올바른 MYBOX 공유 링크를 입력해 주세요.");
  if (url.hostname === "naver.me" && /^\/[A-Za-z0-9]{6,20}$/.test(url.pathname) && !url.search) return url;
  if (url.hostname === "mybox.naver.com" && url.pathname === "/share/list" && /^[A-Za-z0-9_-]{16,200}$/.test(url.searchParams.get("shareKey") || "") && [...url.searchParams.keys()].length === 1) return url;
  throw new ArchiveError("naver.me 또는 MYBOX 폴더 공유 링크만 사용할 수 있습니다.");
}

async function bounded(response: Response, limit: number) {
  if (!response.ok || Number(response.headers.get("content-length")) > limit || !response.body) { await response.body?.cancel(); throw fail(); }
  const reader = response.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > limit) throw fail(); chunks.push(part.value); } }
  catch { await reader.cancel(); throw fail(); }
  return Buffer.concat(chunks, size);
}

async function remote(url: URL, cookie = "") {
  try {
    return await fetch(url, { cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(12_000), headers: { Referer: "https://mybox.naver.com/", Origin: "https://mybox.naver.com", ...(cookie ? { Cookie: cookie } : {}) } });
  } catch { throw fail(); }
}

export async function readMyboxFolder(value: unknown) {
  let url = myboxLink(value);
  if (url.hostname === "naver.me") {
    // Validate every redirect before fetching it; never follow redirects to arbitrary hosts.
    let resolved = false;
    for (let i = 0; i < 3; i++) {
      const response = await remote(url), location = response.headers.get("location");
      await response.body?.cancel();
      if (![301, 302, 303, 307, 308].includes(response.status) || !location) throw fail();
      url = myboxLink(new URL(location, url).href);
      if (url.hostname === "mybox.naver.com") { resolved = true; break; }
    }
    if (!resolved) throw fail();
  }
  const shareKey = url.searchParams.get("shareKey")!;
  let cookie = "";
  async function json<T>(path: string, params: Record<string, string>): Promise<T> {
    const endpoint = new URL(path, api); endpoint.search = new URLSearchParams(params).toString();
    const response = await remote(endpoint, cookie);
    // Only share-session cookies from this fixed API host are carried to the fixed download host.
    const cookies = response.headers.getSetCookie().map(v => v.split(";", 1)[0]).filter(v => /^[A-Za-z0-9_-]+=[^\r\n;]*$/.test(v));
    if (cookies.length) cookie = cookies.join("; ");
    const bytes = await bounded(response, 2 * 1024 * 1024);
    try { const body = JSON.parse(bytes.toString("utf8")); if (String(body.code) !== "0" || !body.result) throw fail(); return body.result as T; } catch { throw fail(); }
  }
  const folder = await json<Folder>("/service/v2/link/property", { shareKey });
  if (folder.resourceType !== "folder" || typeof folder.resourceKey !== "string" || folder.hasPassword !== false || folder.blockDownload !== false) throw new ArchiveError("암호가 없고 다운로드가 허용된 MYBOX 폴더 공유 링크가 필요합니다.");
  const items: MyboxItem[] = [], seen = new Set<string>(); let total = 0, skipped = 0;
  for (let start = 0; start < 500; start += 100) {
    const page = await json<Listing>("/service/link/folder/list", { shareKey, resourceKey: folder.resourceKey, startNum: String(start), pagingRow: "100", sort: "NAME", order: "ASC" });
    if (!Number.isInteger(page.totalCount) || page.totalCount < 0 || !Array.isArray(page.list)) throw fail();
    total = page.totalCount;
    if (total > 500) throw new ArchiveError("한 번에 500개까지 확인할 수 있습니다. MYBOX 폴더를 나눠 주세요.");
    for (const file of page.list) {
      if (file.resourceType !== "file" || file.fileType !== "image" || !/\.(jpe?g|png|webp)$/i.test(file.subPath || "") || !Number.isSafeInteger(file.resourceSize) || file.resourceSize < 1 || file.resourceSize > maxBytes || file.isPasswordLocked || file.isUploaded !== true || file.virus || typeof file.resourceKey !== "string" || !/^[A-Za-z0-9_-]{1,500}$/.test(file.resourceKey) || !Number.isSafeInteger(file.updateDate)) { skipped++; continue; }
      if (!seen.has(file.resourceKey)) { seen.add(file.resourceKey); items.push({ key: file.resourceKey, name: file.subPath.split("/").pop()!.slice(0, 250), size: file.resourceSize, modified: file.updateDate }); }
    }
    if (start + page.list.length >= total) break;
    if (page.list.length !== 100) throw fail();
  }
  return { link: url.href, title: String(folder.resourceName || "MYBOX 사진").slice(0, 200), items, skipped, cookie };
}

export async function myboxOriginal(value: unknown, key: unknown) {
  const folder = await readMyboxFolder(value);
  const item = folder.items.find(i => i.key === key);
  if (!item) throw new ArchiveError("이 공유 폴더에서 가져올 수 없는 사진입니다.", 404);
  const url = new URL("https://fs.mybox.naver.com/file/download.api");
  url.search = new URLSearchParams({ resourceKey: item.key, linkAction: "true", svcType: "MYBOX-WEB" }).toString();
  const bytes = await bounded(await remote(url, folder.cookie), maxBytes);
  if (bytes.length !== item.size) throw new ArchiveError("MYBOX 사진이 변경되었습니다. 목록을 다시 확인해 주세요.", 409);
  return { item, bytes };
}
