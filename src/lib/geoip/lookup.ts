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

    const json = (await res.json()) as unknown;
    if (!json || typeof json !== "object") {
      setCached(normalized, null);
      return null;
    }

    const data = json as Record<string, unknown>;

    if (typeof data.error === "boolean" && data.error) {
      setCached(normalized, null);
      return null;
    }

    const latitude = typeof data.latitude === "number" ? data.latitude : Number(data.latitude);
    const longitude = typeof data.longitude === "number" ? data.longitude : Number(data.longitude);

    const value: GeoIpLookupResult = {
      ip: normalized,
      city: typeof data.city === "string" ? data.city : undefined,
      region: typeof data.region === "string" ? data.region : undefined,
      country: typeof data.country_name === "string" ? data.country_name : undefined,
      countryCode: typeof data.country_code === "string" ? data.country_code : undefined,
      postal: typeof data.postal === "string" ? data.postal : undefined,
      timezone: typeof data.timezone === "string" ? data.timezone : undefined,
      org: typeof data.org === "string" ? data.org : undefined,
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
