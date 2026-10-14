import { API_BASE_URL } from "./config";

/** Browser URL for a stored photo. Pass `width` to get a resized copy (much smaller downloads). */
export function photoFileUrl(photoId: number, width?: number): string {
  const base = API_BASE_URL.replace(/\/$/, "");
  return `${base}/photos/${photoId}/file${width ? `?w=${width}` : ""}`;
}
