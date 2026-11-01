import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeEngagement, getProgress, getQatarGreeting, validateAuth, nameFromEmail } from '../src/engagement.js';

test('malformed stored profiles recover to defaults', () => {
  const defaults = { name: 'Demo investor', email: '', morningEnabled: true, eveningEnabled: true };
  for (const v of [undefined, null, 42, [], { name: ' \n ' }]) assert.deepEqual(sanitizeEngagement(v), defaults);
  assert.equal(sanitizeEngagement({ name: '  يمان\n Ahmad‮ ' }).name, 'يمان Ahmad');
});

test('progress summarises learning and points', () => {
  const p = getProgress({ completedLessons: ['what-is-a-share', 'meet-qse', 'read-a-quote', 'nope'], perfectLessons: ['meet-qse'], events: [{ points: 20, at: new Date().toISOString() }, { points: 'x', at: 'bad' }] });
  assert.equal(p.completedCount, 3);
  assert.equal(p.xp, 70);
  assert.equal(p.challengeUnlocked, true);
  assert.equal(p.nextLesson.id, 'risk');
  assert.equal(p.season, 20);
  const empty = getProgress(null);
  assert.equal(empty.completedCount, 0);
  assert.equal(empty.nextLesson.id, 'what-is-a-share');
});

test('Qatar greetings switch at 05:00, 12:00 and 18:00 local time', () => {
  assert.equal(getQatarGreeting(new Date('2026-09-29T02:00:00Z')), 'Good morning');
  assert.equal(getQatarGreeting(new Date('2026-09-29T09:00:00Z')), 'Good afternoon');
  assert.equal(getQatarGreeting(new Date('2026-09-29T15:00:00Z')), 'Good evening');
});

test('login and sign-up validation gives one clear message per field', () => {
  assert.equal(validateAuth('login', { email: 'yaman@numu.qa', password: 'password1' }).valid, true);
  assert.equal(validateAuth('login', { email: 'nope', password: 'password1' }).errors.email, 'Enter an email like name@example.com.');
  assert.equal(validateAuth('login', { email: 'a@b.qa', password: 'short' }).errors.password, 'Use at least 8 characters.');
  const signup = validateAuth('signup', { name: 'Y', email: 'a@b.qa', password: 'longpassword', agree: false });
  assert.deepEqual(Object.keys(signup.errors).sort(), ['agree', 'name', 'password']);
  assert.equal(validateAuth('signup', { name: 'Yaman', email: 'a@b.qa', password: 'longpass1', agree: true }).valid, true);
});

test('emails are cleaned and names can come from an email', () => {
  assert.equal(sanitizeEngagement({ email: '  Yaman@NUMU.qa ' }).email, 'yaman@numu.qa');
  assert.equal(sanitizeEngagement({ email: 'not an email' }).email, '');
  assert.equal(nameFromEmail('noora.ahmed@mail.com'), 'Noora');
  assert.equal(nameFromEmail('@x.com'), '');
});
