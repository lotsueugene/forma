import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isGibberish,
  isSuspiciousEmail,
  isPhoneOnly,
  scoreSpamContent,
} from '../src/lib/spam-content';

test('detects mixed-case random names and leaves real names alone', () => {
  assert.equal(isGibberish('CToJbXBvxinLenJUX'), true);
  assert.equal(isGibberish('Christopher'), false);
  assert.equal(isGibberish('Jane Smith'), false);
  assert.equal(isGibberish('李伟'), false);
});

test('flags dotted Gmail aliases used by bots', () => {
  assert.equal(isSuspiciousEmail('t.a.mm.yow.ens.4.25.8@gmail.com'), true);
  assert.equal(isSuspiciousEmail('jane.smith@gmail.com'), false);
  assert.equal(isSuspiciousEmail('hello@example.com'), false);
});

test('treats a digits-only message as a phone, not a note', () => {
  assert.equal(isPhoneOnly('2818385684'), true);
  assert.equal(isPhoneOnly('(281) 838-5684'), true);
  assert.equal(isPhoneOnly('Please call me at 2818385684 tomorrow'), false);
});

test('the reported contact-form payload scores as spam', () => {
  const score = scoreSpamContent({
    NAME: 'CToJbXBvxinLenJUX',
    EMAIL: 't.a.mm.yow.ens.4.25.8@gmail.com',
    PHONE: '6514245016',
    SUBJECT: '-',
    MESSAGE: '2818385684',
  });
  assert.ok(score >= 4);
});
