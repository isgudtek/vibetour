import fs from "fs";
import path from "path";
import { ConciergeResponse } from "../types";

export type CachedResponse = {
  tags: ConciergeResponse["tags"];
  rationaleReport: string;
  venues: ConciergeResponse["venues"];
  itinerary: ConciergeResponse["itinerary"];
  logs: string[];
  mode: "live" | "mock";
  cachedAt?: number;
};

// Persistent on-disk location inside src/data/preset_cache.json
const CACHE_FILE_PATH = path.join(process.cwd(), "src", "data", "preset_cache.json");

// In-memory cache kept in sync with disk for 0ms reads
const memoryCache = new Map<string, CachedResponse>();
let isDiskLoaded = false;

function ensureDiskLoaded(): void {
  if (isDiskLoaded) return;
  isDiskLoaded = true;
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const raw = fs.readFileSync(CACHE_FILE_PATH, "utf-8");
      const json = JSON.parse(raw) as Record<string, CachedResponse>;
      if (json && typeof json === "object") {
        for (const [k, v] of Object.entries(json)) {
          if (v && v.venues && Array.isArray(v.venues)) {
            memoryCache.set(k.toLowerCase().trim(), v);
          }
        }
      }
    }
  } catch (err) {
    console.warn("[diskCache] Failed to load preset cache from disk:", err);
  }
}

function persistToDisk(): void {
  try {
    const dir = path.dirname(CACHE_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const obj: Record<string, CachedResponse> = {};
    for (const [k, v] of memoryCache.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(obj, null, 2), "utf-8");
  } catch (err) {
    console.warn("[diskCache] Failed to save preset cache to disk:", err);
  }
}

export function getPresetFromDisk(key: string): CachedResponse | null {
  ensureDiskLoaded();
  const normalized = key.toLowerCase().trim();
  return memoryCache.get(normalized) || null;
}

export function setPresetToDisk(key: string, data: CachedResponse): void {
  ensureDiskLoaded();
  const normalized = key.toLowerCase().trim();
  const entry: CachedResponse = {
    ...data,
    cachedAt: data.cachedAt || Date.now(),
  };
  memoryCache.set(normalized, entry);
  persistToDisk();
}

export function deletePresetFromDisk(key: string): boolean {
  ensureDiskLoaded();
  const normalized = key.toLowerCase().trim();
  const existed = memoryCache.delete(normalized);
  if (existed) {
    persistToDisk();
  }
  return existed;
}

export function clearPresetDiskCache(): number {
  ensureDiskLoaded();
  const count = memoryCache.size;
  memoryCache.clear();
  persistToDisk();
  return count;
}

export function getCachedPresetKeys(): string[] {
  ensureDiskLoaded();
  return Array.from(memoryCache.keys());
}
