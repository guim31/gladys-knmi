import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildUrl, fetchWeather, parseBody, WeerliveError } from '../src/weerlive.js';
import { API_KEY, createFakeWeerlive, document, fixture } from './helpers/world.js';

test('the request names the key and the place, on the v2 endpoint', () => {
  const url = new URL(buildUrl('abc', "'s-Hertogenbosch"));
  assert.equal(url.origin + url.pathname, 'https://weerlive.nl/api/weerlive_api_v2.php');
  assert.equal(url.searchParams.get('key'), 'abc');
  assert.equal(url.searchParams.get('locatie'), "'s-Hertogenbosch");
});

test('the refusal sentences of the API become typed errors', () => {
  assert.throws(() => parseBody(fixture('invalid-api-key.txt')), { code: 'invalid_key' });
  assert.throws(() => parseBody(fixture('rate-limit.txt')), { code: 'rate_limit' });
  assert.throws(() => parseBody('<html>oops</html>'), { code: 'decode' });
});

test('a bare "_" value (seen in real answers) is read as null, not as a broken answer', () => {
  const doc = parseBody(fixture('invalid.json'));
  assert.equal(doc.liveweer[0].luchtd, null);
  assert.equal(doc.liveweer[0].ldmmhg, null);
  assert.equal(doc.liveweer[0].plaats, 'Zwolle');
  assert.equal(doc.uur_verw.length, 24);
});

test('a real answer is returned as it is', async () => {
  const weerlive = createFakeWeerlive({ Amsterdam: document('amsterdam') });
  const doc = await fetchWeather({ apiKey: API_KEY, location: 'Amsterdam', fetch: weerlive.fetch });
  assert.equal(doc.liveweer[0].plaats, 'Amsterdam');
  assert.deepEqual(weerlive.calls, [{ location: 'Amsterdam', key: API_KEY, host: 'weerlive.nl' }]);
});

test('transport failures never carry the URL, hence never the key', async () => {
  const cases = [
    [503, 'http'],
    [Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } }), 'network'],
    [Object.assign(new Error('timed out'), { name: 'TimeoutError' }), 'timeout'],
    [{ api: [] }, 'decode'],
  ];
  for (const [answer, code] of cases) {
    const weerlive = createFakeWeerlive({ '*': answer });
    await assert.rejects(
      fetchWeather({ apiKey: API_KEY, location: 'Utrecht', fetch: weerlive.fetch }),
      (err) => {
        assert.ok(err instanceof WeerliveError);
        assert.equal(err.code, code);
        assert.ok(!err.message.includes(API_KEY), err.message);
        assert.ok(!err.message.includes('weerlive_api_v2'), err.message);
        return true;
      },
    );
  }
});
