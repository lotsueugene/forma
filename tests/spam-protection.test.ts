import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseSpamSettings,
  getDefaultSpamSettings,
  honeypotTriggered,
  countLinks,
  isOriginAllowed,
  normalizeDomain,
  cleanSpamFields,
} from '../src/lib/spam-settings';
import { createFormChallenge, verifyFormChallenge } from '../src/lib/form-challenge';
import { checkSpam } from '../src/lib/spam-protection';

test('default spam settings enable honeypot, rate limit, and link filter', () => {
  const defaults = getDefaultSpamSettings();
  assert.equal(defaults.honeypot.enabled, true);
  assert.equal(defaults.rateLimit.enabled, true);
  assert.equal(defaults.contentFilter.enabled, true);
  assert.equal(defaults.requireChallenge, false);
  assert.equal(defaults.blockHeadless, true);
  assert.deepEqual(defaults.allowedDomains, []);
});

test('parseSpamSettings fills defaults for partial spam objects', () => {
  const parsed = parseSpamSettings(JSON.stringify({
    spam: { requireChallenge: true, honeypot: { enabled: false } },
  }));
  assert.equal(parsed.requireChallenge, true);
  assert.equal(parsed.honeypot?.enabled, false);
  assert.equal(parsed.honeypot?.fieldName, '_gotcha');
  assert.equal(parsed.contentFilter?.enabled, true);
  assert.equal(parsed.blockHeadless, true);
});

test('honeypot only trips on dedicated trap fields, not a real website field', () => {
  assert.equal(honeypotTriggered({ _gotcha: 'http://spam.test' }, '_gotcha'), true);
  assert.equal(honeypotTriggered({ _honeypot: 'bot' }, '_gotcha'), true);
  assert.equal(honeypotTriggered({ website: 'https://example.com' }, '_gotcha'), false);
  assert.equal(honeypotTriggered({ _gotcha: '' }, '_gotcha'), false);
  assert.equal(honeypotTriggered({ _gotcha: '  ' }, '_gotcha'), false);
});

test('countLinks counts http(s) and www URLs across nested values', () => {
  assert.equal(countLinks({ message: 'hello' }), 0);
  assert.equal(countLinks({ message: 'see https://a.com and http://b.com' }), 2);
  assert.equal(countLinks({ message: 'www.spam.test please' }), 1);
  assert.equal(countLinks({ a: ['https://one.test'], b: { c: 'https://two.test' } }), 2);
});

test('normalizeDomain strips protocol, www, and path', () => {
  assert.equal(normalizeDomain('https://www.Example.com/path'), 'example.com');
  assert.equal(normalizeDomain('yoursite.com'), 'yoursite.com');
  assert.equal(normalizeDomain('javascript:alert(1)'), null);
  assert.equal(normalizeDomain(''), null);
});

test('origin allowlist matches host and subdomains, rejects missing origin', () => {
  const allowed = ['example.com'];
  assert.equal(isOriginAllowed('https://example.com', null, allowed), true);
  assert.equal(isOriginAllowed('https://www.example.com', null, allowed), true);
  assert.equal(isOriginAllowed('https://app.example.com', null, allowed), true);
  assert.equal(isOriginAllowed('https://evil-example.com', null, allowed), false);
  assert.equal(isOriginAllowed(null, 'https://example.com/form', allowed), true);
  assert.equal(isOriginAllowed(null, null, allowed), false);
  assert.equal(isOriginAllowed(null, null, []), true);
});

test('cleanSpamFields strips trap and token keys', () => {
  const cleaned = cleanSpamFields({
    name: 'Ada',
    _gotcha: 'x',
    _forma_token: 't',
    recaptchaToken: 'r',
  });
  assert.equal(cleaned.name, 'Ada');
  assert.equal('_gotcha' in cleaned, false);
  assert.equal('_forma_token' in cleaned, false);
  assert.equal('recaptchaToken' in cleaned, false);
});

const SECRET = 'test-challenge-secret-value';

test('form challenge accepts tokens after min age and rejects too-fast, expired, and wrong form', () => {
  const issued = 1_000_000;
  const token = createFormChallenge('form_1', { now: issued, secret: SECRET });

  assert.equal(verifyFormChallenge(token, 'form_1', { now: issued + 200, secret: SECRET }).code, 'too_fast');
  assert.equal(verifyFormChallenge(token, 'form_1', { now: issued + 1_000, secret: SECRET }).ok, true);
  assert.equal(verifyFormChallenge(token, 'form_other', { now: issued + 1_000, secret: SECRET }).code, 'mismatch');
  assert.equal(
    verifyFormChallenge(token, 'form_1', { now: issued + 31 * 60 * 1000, secret: SECRET }).code,
    'expired'
  );
  assert.equal(verifyFormChallenge('not-a-token', 'form_1', { secret: SECRET }).ok, false);
});

test('checkSpam drops filled honeypots and URL-stuffed payloads', async () => {
  const settings = getDefaultSpamSettings();

  const honey = await checkSpam({
    formId: 'form_spam',
    ip: null,
    data: { name: 'Bot', _gotcha: 'http://spam.test' },
    settings,
  });
  assert.equal(honey.allowed, false);
  assert.equal(honey.code, 'honeypot');

  const links = await checkSpam({
    formId: 'form_spam',
    ip: null,
    data: {
      message: 'https://a.test https://b.test https://c.test https://d.test https://e.test https://f.test https://g.test https://h.test https://i.test https://j.test https://k.test',
    },
    settings,
    origin: 'https://yoursite.com',
  });
  assert.equal(links.allowed, false);
  assert.equal(links.code, 'content_filter');
});

test('checkSpam blocks headless posts and allows a normal contact-form Origin', async () => {
  const settings = getDefaultSpamSettings();

  const headless = await checkSpam({
    formId: 'form_spam',
    ip: null,
    data: { name: 'Bot', email: 'bot@spam.test' },
    settings,
  });
  assert.equal(headless.allowed, false);
  assert.equal(headless.code, 'headless');

  const fromBrowser = await checkSpam({
    formId: 'form_spam',
    ip: null,
    data: { name: 'Ada', email: 'ada@example.com' },
    settings,
    origin: 'https://yoursite.com',
  });
  assert.equal(fromBrowser.allowed, true);
});

test('checkSpam blocks random-name + dotted-gmail + phone-as-message spam', async () => {
  const result = await checkSpam({
    formId: 'form_spam',
    ip: null,
    data: {
      NAME: 'CToJbXBvxinLenJUX',
      EMAIL: 't.a.mm.yow.ens.4.25.8@gmail.com',
      PHONE: '6514245016',
      SUBJECT: '-',
      MESSAGE: '2818385684',
    },
    settings: getDefaultSpamSettings(),
    origin: 'https://yoursite.com',
  });
  assert.equal(result.allowed, false);
  assert.equal(result.code, 'content_filter');
});

test('checkSpam enforces origin allowlist and required challenge tokens', async () => {
  const settings = {
    ...getDefaultSpamSettings(),
    allowedDomains: ['yoursite.com'],
    requireChallenge: true,
  };

  const blockedOrigin = await checkSpam({
    formId: 'form_spam',
    ip: null,
    data: { name: 'Ada' },
    settings,
    origin: 'https://evil.test',
  });
  assert.equal(blockedOrigin.allowed, false);
  assert.equal(blockedOrigin.code, 'origin');

  const missingToken = await checkSpam({
    formId: 'form_spam',
    ip: null,
    data: { name: 'Ada' },
    settings: { ...getDefaultSpamSettings(), requireChallenge: true },
    origin: 'https://yoursite.com',
  });
  assert.equal(missingToken.allowed, false);
  assert.equal(missingToken.code, 'challenge');
});
