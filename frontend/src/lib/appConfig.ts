import { useEffect, useState } from "react";
import { api } from "./api";

export type AppConfig = { version: string; qa_mode: boolean; email_enabled: boolean };

let cached: Promise<AppConfig> | null = null;

/** Feature flags from /api/config, fetched once per page load. */
export function useAppConfig(): AppConfig | null {
  const [config, setConfig] = useState<AppConfig | null>(null);
  useEffect(() => {
    cached ??= api.get<AppConfig>("/config").then((r) => r.data);
    cached.then(setConfig).catch(() => setConfig(null));
  }, []);
  return config;
}
