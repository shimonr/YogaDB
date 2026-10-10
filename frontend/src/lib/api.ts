import axios from "axios";
import { API_BASE_URL } from "./config";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("yogadb_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("yogadb_token");
      localStorage.removeItem("yogadb_user");
      window.location.href = "/auth";
    }
    return Promise.reject(error);
  },
);

/** Fetch every item of a paginated list endpoint; the API caps `limit` at 200 per request. */
export async function fetchAll<T>(path: string, pageSize = 200): Promise<T[]> {
  const items: T[] = [];
  for (let skip = 0; ; skip += pageSize) {
    const { data } = await api.get<T[]>(path, { params: { skip, limit: pageSize } });
    items.push(...data);
    if (data.length < pageSize) return items;
  }
}
