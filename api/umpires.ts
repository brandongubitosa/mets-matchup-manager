// Vercel serverless function: career umpire stats from umpscorecards.com, fetched through
// String's Web Access API (https://portal.usestring.ai/docs) so the key stays on the server.
// Needs STRING_API_KEY set in the Vercel project's environment variables.
//
// The table only changes once a day, so the response is cached on Vercel's CDN for a day:
// String is called about once a day per region, not once per app user.

const STRING_FETCH_URL = 'https://request.usestring.ai/v1/fetch';
const UMPSCORECARDS_URL = 'https://umpscorecards.com/api/umpires/';
const ONE_DAY_SECONDS = 24 * 60 * 60;

interface UmpireRow {
  umpire: string;
  n: number;
  overall_accuracy_wmean: number;
  consistency_wmean: number;
  total_run_impact_mean: number;
}

const json = (body: unknown, status: number, cacheControl: string): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': cacheControl,
      'Access-Control-Allow-Origin': '*',
    },
  });

export async function GET(): Promise<Response> {
  const key = process.env.STRING_API_KEY;
  if (!key) {
    return json({ error: 'STRING_API_KEY is not set' }, 500, 'no-store');
  }

  try {
    // format "json" (String's default) wraps the destination's reply as { statusCode, data, ... }
    const res = await fetch(STRING_FETCH_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: UMPSCORECARDS_URL, format: 'json' }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      return json({ error: `String request failed (${res.status})` }, 502, 'no-store');
    }

    const envelope = await res.json();
    const data = typeof envelope.data === 'string' ? JSON.parse(envelope.data) : envelope.data;
    if (envelope.statusCode !== 200 || !Array.isArray(data?.rows)) {
      return json({ error: `umpscorecards returned ${envelope.statusCode}` }, 502, 'no-store');
    }

    // Only the fields the app reads; drop rows without a name, since the app lowercases it
    const rows: UmpireRow[] = data.rows
      .filter((r: Partial<UmpireRow> | null) => typeof r?.umpire === 'string')
      .map((r: UmpireRow) => ({
        umpire: r.umpire,
        n: r.n,
        overall_accuracy_wmean: r.overall_accuracy_wmean,
        consistency_wmean: r.consistency_wmean,
        total_run_impact_mean: r.total_run_impact_mean,
      }));

    return json(
      { rows },
      200,
      `public, s-maxage=${ONE_DAY_SECONDS}, stale-while-revalidate=${ONE_DAY_SECONDS}`
    );
  } catch {
    return json({ error: 'Could not reach String' }, 502, 'no-store');
  }
}
