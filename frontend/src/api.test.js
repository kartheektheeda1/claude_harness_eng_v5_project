import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('api', () => {
  it('sends synthetic customer credentials and parses a successful response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'SETTLED' })
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(api('/api/claims')).resolves.toEqual({ status: 'SETTLED' });
    expect(fetchMock).toHaveBeenCalledWith('/api/claims', expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Basic ' + btoa('customer:customer123')
      })
    }));
  });

  it('surfaces the API error message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Not your claim' })
    }));

    await expect(api('/api/claims/synthetic-other')).rejects.toThrow('Not your claim');
  });
});