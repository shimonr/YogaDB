import { API_BASE_URL } from "./config";

/** Browser URL for a stored photo (served by FastAPI from disk). */
export function photoFileUrl(photoId: number): string {
  const base = API_BASE_URL.replace(/\/$/, "");
  return `${base}/photos/${photoId}/file`;
}
