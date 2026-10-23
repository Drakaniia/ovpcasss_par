import { afterEach, describe, expect, it, vi } from 'vitest';

import { addressLabels, suggestAddresses } from './suggest-locations';

const PHOTON = {
  features: [
    {
      properties: {
        name: 'Malaybalay City',
        city: 'Malaybalay City',
        state: 'Bukidnon',
        country: 'Philippines',
      },
    },
    {
      properties: {
        name: 'Casisang',
        city: 'Malaybalay City',
        state: 'Bukidnon',
        country: 'Philippines',
      },
    },
  ],
};

const NOMINATIM = [
  { display_name: 'Casisang, Malaybalay City, Bukidnon, Philippines' },
  { display_name: 'casisang, malaybalay city, bukidnon, philippines' },
];

function stubFetch(reply: unknown, ok = true): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async () => ({
    ok,
    json: async () => reply,
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('addressLabels', () => {
  it('reads a GeoJSON feature list, dropping the repeated city name', () => {
    expect(addressLabels(PHOTON)).toEqual([
      'Malaybalay City, Bukidnon, Philippines',
      'Casisang, Malaybalay City, Bukidnon, Philippines',
    ]);
  });

  it('reads a flat provider list and folds case duplicates', () => {
    expect(addressLabels(NOMINATIM)).toEqual(['Casisang, Malaybalay City, Bukidnon, Philippines']);
  });

  it('keeps one line and the form limit', () => {
    const label = addressLabels([{ display_name: `${'a '.repeat(200)}\n\nBukidnon` }])[0];

    expect(label).not.toContain('\n');
    expect(label).not.toContain('  ');
    expect(label?.length).toBeLessThanOrEqual(300);
  });

  it('answers nothing for a reply it cannot read', () => {
    expect(addressLabels({ error: 'rate limited' })).toEqual([]);
    expect(addressLabels(null)).toEqual([]);
  });
});

describe('suggestAddresses', () => {
  const url = 'https://photon.test/api/?q={q}&limit=6';

  it('does nothing without a configured provider', async () => {
    const fetchMock = stubFetch(PHOTON);

    expect(await suggestAddresses({}, 'malaybalay')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does nothing for a query shorter than four characters', async () => {
    const fetchMock = stubFetch(PHOTON);

    expect(await suggestAddresses({ LOCATION_SUGGEST_URL: url }, 'mal')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('calls the provider server-side with the encoded query', async () => {
    const fetchMock = stubFetch(PHOTON);

    const labels = await suggestAddresses({ LOCATION_SUGGEST_URL: url }, 'Casisang, Malaybalay');

    expect(fetchMock).toHaveBeenCalledOnce();
    const [called, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(called).toBe('https://photon.test/api/?q=Casisang%2C%20Malaybalay&limit=6');
    expect(init.headers).toEqual({ accept: 'application/json' });
    expect(labels[0]).toBe('Malaybalay City, Bukidnon, Philippines');
  });

  it('puts the key in the template when it asks for it, never in the URL otherwise', async () => {
    const fetchMock = stubFetch(PHOTON);
    const templated = 'https://mapbox.test/?q={q}&access_token={key}';

    await suggestAddresses(
      { LOCATION_SUGGEST_URL: templated, LOCATION_SUGGEST_KEY: 'secret' },
      'casisang',
    );
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://mapbox.test/?q=casisang&access_token=secret',
    );

    await suggestAddresses(
      { LOCATION_SUGGEST_URL: url, LOCATION_SUGGEST_KEY: 'secret' },
      'casisang',
    );
    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(init.headers).toMatchObject({ authorization: 'Bearer secret' });
  });

  it('appends the query when the template has no placeholder', async () => {
    const fetchMock = stubFetch(PHOTON);

    await suggestAddresses({ LOCATION_SUGGEST_URL: 'https://photon.test/api/' }, 'casisang');

    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://photon.test/api/?q=casisang');
  });

  it('answers an empty list when the provider refuses or cannot be read', async () => {
    stubFetch({ error: 'forbidden' }, false);
    expect(await suggestAddresses({ LOCATION_SUGGEST_URL: url }, 'casisang')).toEqual([]);

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );
    expect(await suggestAddresses({ LOCATION_SUGGEST_URL: url }, 'casisang')).toEqual([]);
  });
});
