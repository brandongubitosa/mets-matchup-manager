import { withCacheAndDedupe, __clearApiCacheForTests } from '../../services/apiCache';

describe('apiCache', () => {
  beforeEach(() => {
    __clearApiCacheForTests();
  });

  it('dedupes concurrent requests with the same key', async () => {
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      await new Promise((r) => {
        const t = setTimeout(r, 5);
        t.unref?.();
      });
      return calls;
    };

    const [a, b] = await Promise.all([
      withCacheAndDedupe('k1', 1000, fetcher),
      withCacheAndDedupe('k1', 1000, fetcher),
    ]);

    expect(a).toBe(b);
    expect(calls).toBe(1);
  });

  it('returns cached value within TTL', async () => {
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      return 'ok';
    };

    await withCacheAndDedupe('k2', 5000, fetcher);
    const second = await withCacheAndDedupe('k2', 5000, fetcher);

    expect(second).toBe('ok');
    expect(calls).toBe(1);
  });

  it('skips cache when shouldCache returns false', async () => {
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      return { success: false as const };
    };

    await withCacheAndDedupe('k3', 5000, fetcher, (r) => r.success);
    await withCacheAndDedupe('k3', 5000, fetcher, (r) => r.success);

    expect(calls).toBe(2);
  });
});
