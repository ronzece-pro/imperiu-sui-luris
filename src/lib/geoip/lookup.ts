export type GeoIpLookupResult = {
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  postal?: string;
  timezone?: string;
  org?: string;
  latitude?: number;
  longitude?: number;
  source: "ipapi.co";
};

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const cache = new Map<string, { at: number; value: GeoIpLookupResult | null }>();

function isPrivateIp(ip: string): boolean {
  const v = ip.trim();
  if (!v) return true;
  if (v === "::1" || v === "127.0.0.1" || v === "localhost") return true;
  if (v.startsWith("10.")) return true;
  if (v.startsWith("192.168.")) return true;
  if (v.startsWith("172.")) {
    const second = Number(v.split(".")[1]);
    if (Number.isFinite(second) && second >= 16 && second <= 31) return true;
  }
  if (v.startsWith("fc") || v.startsWith("fd")) return true; // IPv6 ULA (rough)
  return false;
}

function getCached(ip: string): GeoIpLookupResult | null | undefined {
  const hit = cache.get(ip);
  if (!hit) return undefined;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(ip);
    return undefined;
  }
  return hit.value;
}

function setCached(ip: string, value: GeoIpLookupResult | null) {
  cache.set(ip, { at: Date.now(), value });
  if (cache.size > 2000) {
    // naive prune: drop oldest ~25%
    const entries = [...cache.entries()].sort((a, b) => a[1].at - b[1].at);
    const drop = Math.floor(entries.length * 0.25);
    for (let i = 0; i < drop; i++) cache.delete(entries[i]![0]);
  }
}

export async function lookupGeoIp(ip: string, timeoutMs = 900): Promise<GeoIpLookupResult | null> {
  const normalized = ip.trim();
  if (!normalized || isPrivateIp(normalized)) return null;

  const cached = getCached(normalized);
  if (cached !== undefined) return cached;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // No API key required (free-tier/rate-limited). Uses HTTPS.
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(normalized)}/json/`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      setCached(normalized, null);
      return null;
    }

    const json = (await res.json()) as any;
    if (!json || typeof json !== "object") {
      setCached(normalized, null);
      return null;
    }

    if (typeof json.error === "boolean" && json.error) {
      setCached(normalized, null);
      return null;
    }

    const latitude = typeof json.latitude === "number" ? json.latitude : Number(json.latitude);
    const longitude = typeof json.longitude === "number" ? json.longitude : Number(json.longitude);

    const value: GeoIpLookupResult = {
      ip: normalized,
      city: typeof json.city === "string" ? json.city : undefined,
      region: typeof json.region === "string" ? json.region : undefined,
      country: typeof json.country_name === "string" ? json.country_name : undefined,
      countryCode: typeof json.country_code === "string" ? json.country_code : undefined,
      postal: typeof json.postal === "string" ? json.postal : undefined,
      timezone: typeof json.timezone === "string" ? json.timezone : undefined,
      org: typeof json.org === "string" ? json.org : undefined,
      latitude: Number.isFinite(latitude) ? latitude : undefined,
      longitude: Number.isFinite(longitude) ? longitude : undefined,
      source: "ipapi.co",
    };

    setCached(normalized, value);
    return value;
  } catch {
    setCached(normalized, null);
    return null;
  } finally {
    clearTimeout(t);
  }
}
