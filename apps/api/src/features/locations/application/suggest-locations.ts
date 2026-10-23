import { z } from 'zod';

/** The provider is only asked once the query is worth a lookup (bug phase 04 §3.2). */
export const ADDRESS_MIN_QUERY = 4;

/**
 * A slow provider must never hold the field: the list is optional. Photon
 * regularly answers in about two seconds, so a 2 s cap dropped every reply.
 */
const TIMEOUT_MS = 5000;

/** The form stores one line inside its 300-character limit. */
const MAX_LABEL = 300;
const MAX_LIMIT = 8;

/**
 * Photon, Mapbox, and Geoapify answer with GeoJSON features; Nominatim answers
 * with a flat array. Reading both means swapping the provider is a variable
 * change, not a code change. Anything else answers an empty list.
 */
const geoJsonReply = z.object({
  features: z.array(
    z.object({
      place_name: z.string().optional(),
      properties: z
        .object({
          name: z.string().optional(),
          street: z.string().optional(),
          city: z.string().optional(),
          district: z.string().optional(),
          state: z.string().optional(),
          postcode: z.string().optional(),
          country: z.string().optional(),
          formatted: z.string().optional(),
          full_address: z.string().optional(),
        })
        .optional(),
    }),
  ),
});

const flatReply = z.array(z.object({ display_name: z.string().optional() }));

type SuggestEnvironment = {
  LOCATION_SUGGEST_URL?: string | undefined;
  LOCATION_SUGGEST_KEY?: string | undefined;
};

/** One readable line, trimmed, inside the form's limit. */
function oneLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_LABEL);
}

/** Joins the parts of an address, dropping repeats and blanks. */
function compose(parts: readonly (string | undefined)[]): string {
  const kept: string[] = [];
  for (const part of parts) {
    const value = part?.trim();
    if (!value) continue;
    if (kept.some((entry) => entry.toLowerCase() === value.toLowerCase())) continue;
    kept.push(value);
  }
  return kept.join(', ');
}

function geoJsonLabel(feature: z.infer<typeof geoJsonReply>['features'][number]): string {
  const properties = feature.properties;
  if (feature.place_name) return feature.place_name;
  if (properties?.full_address) return properties.full_address;
  if (properties?.formatted) return properties.formatted;

  return compose([
    properties?.name ?? properties?.street,
    properties?.city ?? properties?.district,
    properties?.postcode,
    properties?.state,
    properties?.country,
  ]);
}

/** Every label the provider offered, one line each, deduplicated, capped. */
export function addressLabels(reply: unknown, limit = MAX_LIMIT): string[] {
  const geojson = geoJsonReply.safeParse(reply);
  const labels = geojson.success
    ? geojson.data.features.map(geoJsonLabel)
    : (flatReply.safeParse(reply).data ?? []).map((entry) => entry.display_name ?? '');

  const seen = new Set<string>();
  const kept: string[] = [];
  for (const raw of labels) {
    const label = oneLine(raw);
    if (!label) continue;

    const key = label.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    kept.push(label);
    if (kept.length === limit) break;
  }

  return kept;
}

/** The provider URL for this query; `{q}` and `{key}` are placeholders. */
function endpoint(
  template: string,
  key: string | undefined,
  query: string,
): { url: string; usedKeyInUrl: boolean } {
  const encoded = encodeURIComponent(query);
  const usedKeyInUrl = template.includes('{key}');

  let url = template.replace('{q}', encoded).replace('{key}', encodeURIComponent(key ?? ''));
  if (!template.includes('{q}')) {
    url = `${url}${url.includes('?') ? '&' : '?'}q=${encoded}`;
  }

  return { url, usedKeyInUrl };
}

/**
 * Address suggestions for the location field (bug phase 04 §3.2). The provider
 * is called server-side, so no key reaches the browser and the desktop CSP is
 * unchanged. Every failure — unset, slow, refused, unreadable — answers an empty
 * list, because the field is free text first and the list is a convenience.
 */
export async function suggestAddresses(
  env: SuggestEnvironment,
  query: string,
  limit = MAX_LIMIT,
): Promise<string[]> {
  const template = env.LOCATION_SUGGEST_URL?.trim();
  const term = query.trim();
  if (!template || term.length < ADDRESS_MIN_QUERY) return [];

  const { url, usedKeyInUrl } = endpoint(template, env.LOCATION_SUGGEST_KEY, term);
  const headers: Record<string, string> = { accept: 'application/json' };
  if (env.LOCATION_SUGGEST_KEY && !usedKeyInUrl) {
    headers.authorization = `Bearer ${env.LOCATION_SUGGEST_KEY}`;
  }

  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) return [];

    return addressLabels(await response.json(), Math.min(limit, MAX_LIMIT));
  } catch {
    return [];
  }
}
