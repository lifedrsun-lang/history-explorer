export const VOTE_IMAGE_ROUTE = "/api/vote/image";
export const VOTE_IMAGE_MAX_BYTES = 4_000_000;
export const VOTE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Only immutable vote JPEGs may be served. Never accept another bucket path.
export function isVoteImagePath(value: unknown): value is string {
  return typeof value === "string" && /^sunlab-vote\/(production|preview|local)\/[123]\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$/.test(value);
}
export function voteImageUrl(path: string) {
  if (!isVoteImagePath(path)) throw new Error("invalid_vote_image_path");
  return VOTE_IMAGE_ROUTE + "?path=" + encodeURIComponent(path);
}
export function voteImagePathFromUrl(value: string): string | null {
  if (!value.startsWith(VOTE_IMAGE_ROUTE + "?")) return null;
  try {
    const url = new URL(value, "https://vote-image.invalid");
    const path = url.searchParams.get("path");
    if (url.origin !== "https://vote-image.invalid" || url.pathname !== VOTE_IMAGE_ROUTE || url.hash ||
        [...url.searchParams.keys()].length !== 1 || !isVoteImagePath(path)) return null;
    return path;
  } catch { return null; }
}
