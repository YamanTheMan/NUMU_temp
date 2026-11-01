import test from 'node:test';
import assert from 'node:assert/strict';
import { stocks, lessons, units } from '../src/data.js';
import { formatPrice, formatPercent, getUnitStatus, isChallengeUnlocked, validatePicks, sectorMix, simulateSession, playRound, nextLockTime, marketPhase, levelFor, learningXp, filterStocks, validateLeagueName } from '../src/model.js';

test('prices follow QSE tick sizes', () => {
  assert.equal(formatPrice(2.364), '2.364');
  assert.equal(formatPrice(18.2), '18.20');
  assert.equal(formatPercent(1.24), '+1.24%');
  assert.equal(formatPercent(-0.42), '−0.42%');
});

test('every lesson has cards, a quiz with valid answers and belongs to a unit', () => {
  for (const l of lessons) {
    assert.ok(l.cards.length >= 3 && l.quiz.length >= 2, l.id);
    for (const q of l.quiz) assert.ok(q.answer >= 0 && q.answer < q.options.length, l.id);
    assert.ok(units.find(u => u.id === l.unit).lessons.includes(l.id), l.id);
  }
});

test('units unlock in order and ranked challenges open after Start here', () => {
  assert.deepEqual(getUnitStatus([]).map(u => u.unlocked), [true, false, false, false]);
  assert.equal(isChallengeUnlocked(['what-is-a-share', 'meet-qse']), false);
  assert.equal(isChallengeUnlocked(units[0].lessons), true);
  assert.equal(getUnitStatus(units[0].lessons)[1].unlocked, true);
});

test('picks must be three different listed stocks', () => {
  assert.equal(validatePicks(['QNBK', 'IQCD', 'ORDS']).valid, true);
  assert.equal(validatePicks(['QNBK']).error, 'Choose 2 more stocks.');
  assert.equal(validatePicks(['QNBK', 'QNBK', 'ORDS']).valid, false);
  assert.equal(validatePicks(['QNBK', 'FAKE', 'ORDS']).valid, false);
});

test('sector mix rewards spreading across sectors', () => {
  assert.equal(sectorMix(['QNBK', 'IQCD', 'ORDS']).diversified, true);
  assert.equal(sectorMix(['QNBK', 'QIBK', 'CBQK']).diversified, false);
});

test('sessions are deterministic and stay within the 10% daily limit', () => {
  assert.deepEqual(simulateSession(4), simulateSession(4));
  for (let r = 1; r < 30; r++) for (const v of Object.values(simulateSession(r))) assert.ok(Math.abs(v) < 10);
  const res = playRound(1, ['QNBK', 'IQCD', 'ORDS']);
  assert.equal(res.fieldSize, 21);
  assert.ok(res.rank >= 1 && res.rank <= 21 && res.points >= 10);
  assert.equal(playRound(1, ['QNBK', 'IQCD', 'ORDS'], { ranked: false }).points, 0);
});

test('picks lock at 9:30 AM Qatar time on the next trading day', () => {
  assert.equal(nextLockTime(new Date('2026-10-26T08:46:00Z')).toISOString(), '2026-10-27T06:30:00.000Z');
  assert.equal(nextLockTime(new Date('2026-10-29T08:46:00Z')).toISOString(), '2026-11-01T06:30:00.000Z');
  assert.equal(marketPhase(new Date('2026-10-26T08:46:00Z')), 'open');
  assert.equal(marketPhase(new Date('2026-10-30T08:46:00Z')), 'closed');
});

test('levels, XP, search and league names', () => {
  assert.equal(levelFor(0).name, 'Newcomer');
  assert.equal(levelFor(130).name, 'Analyst');
  assert.equal(learningXp(['risk', 'costs'], ['risk']), 50);
  assert.deepEqual(filterStocks(stocks, { query: 'qnb' }).map(s => s.ticker), ['QNBK']);
  assert.equal(filterStocks(stocks, { sector: 'banks' }).length, 5);
  assert.equal(validateLeagueName('  Office   League ').name, 'Office League');
  assert.equal(validateLeagueName('ab').valid, false);
});
