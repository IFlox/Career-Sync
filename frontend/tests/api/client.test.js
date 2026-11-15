import test from 'node:test';
import assert from 'node:assert/strict';

import { apiClient } from '../../src/api/client.js';

function installSessionStorage() {
  const store = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

test('getAnalyticsOverview calls the admin overview endpoint with admin headers', async (t) => {
  installSessionStorage();
  apiClient.setAdminToken('test-admin-token');

  const requested = [];
  globalThis.fetch = async (url, options) => {
    requested.push({ url, options });
    return {
      ok: true,
      json: async () => ({
        cohort_size: 3,
        batch_missing_skills: [{ skill: 'Docker', missing_percentage: 67 }],
      }),
    };
  };

  t.after(() => {
    apiClient.setAdminToken(null);
    delete globalThis.fetch;
    delete globalThis.sessionStorage;
  });

  const result = await apiClient.getAnalyticsOverview();

  assert.equal(requested.length, 1);
  assert.equal(requested[0].url, '/api/v1/admin/analytics/overview');
  assert.equal(requested[0].options.method, undefined);
  assert.equal(requested[0].options.headers.Authorization, 'Bearer test-admin-token');
  assert.equal(requested[0].options.headers['x-admin-token'], 'test-admin-token');
  assert.deepEqual(result.batch_missing_skills, [
    { skill: 'Docker', missing_percentage: 67 },
  ]);
});

test('getAnalyticsOverview surfaces the server error detail', async (t) => {
  installSessionStorage();

  globalThis.fetch = async () => ({
    ok: false,
    json: async () => ({
      detail: 'Live job listings are unavailable right now. Please retry.',
    }),
  });

  t.after(() => {
    delete globalThis.fetch;
    delete globalThis.sessionStorage;
  });

  await assert.rejects(
    () => apiClient.getAnalyticsOverview(),
    /Live job listings are unavailable right now/
  );
});

test('getAnalyticsOverview falls back to a client error when the body is not JSON', async (t) => {
  installSessionStorage();

  globalThis.fetch = async () => ({
    ok: false,
    json: async () => {
      throw new Error('no json body');
    },
  });

  t.after(() => {
    delete globalThis.fetch;
    delete globalThis.sessionStorage;
  });

  await assert.rejects(
    () => apiClient.getAnalyticsOverview(),
    /Failed to load cohort analytics overview/
  );
});
