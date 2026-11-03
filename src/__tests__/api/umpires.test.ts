import { GET } from '../../../api/umpires';

const row = {
  umpire: 'Pat Hoberg',
  n: 400,
  overall_accuracy_wmean: 95.1,
  consistency_wmean: 96.0,
  total_run_impact_mean: 0.9,
  extra_field: 'dropped',
};

const stringReply = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

describe('api/umpires', () => {
  const originalFetch = global.fetch;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    process.env.STRING_API_KEY = 'test-key';
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
    delete process.env.STRING_API_KEY;
  });

  it('fetches umpscorecards through String and caches for a day', async () => {
    mockFetch.mockResolvedValueOnce(stringReply({ statusCode: 200, data: { rows: [row] } }));

    const res = await GET();

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://request.usestring.ai/v1/fetch');
    expect(init.headers.Authorization).toBe('Bearer test-key');
    expect(JSON.parse(init.body).url).toBe('https://umpscorecards.com/api/umpires/');
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=86400');
    const { extra_field, ...expected } = row;
    expect(await res.json()).toEqual({ rows: [expected] });
  });

  it('parses a body String returns as text', async () => {
    mockFetch.mockResolvedValueOnce(
      stringReply({ statusCode: 200, data: JSON.stringify({ rows: [row] }) })
    );

    const res = await GET();

    expect(res.status).toBe(200);
    expect((await res.json()).rows[0].umpire).toBe('Pat Hoberg');
  });

  it('drops rows without an umpire name', async () => {
    mockFetch.mockResolvedValueOnce(
      stringReply({ statusCode: 200, data: { rows: [{ n: 3 }, null, row] } })
    );

    const res = await GET();

    const { rows } = await res.json();
    expect(rows).toHaveLength(1);
    expect(rows[0].umpire).toBe('Pat Hoberg');
  });

  it('does not cache a failed String request', async () => {
    mockFetch.mockResolvedValueOnce(stringReply({ error: 'Invalid API key' }, 401));

    const res = await GET();

    expect(res.status).toBe(502);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('fails without calling String when the key is missing', async () => {
    delete process.env.STRING_API_KEY;

    const res = await GET();

    expect(res.status).toBe(500);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
