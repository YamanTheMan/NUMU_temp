import { stocks, sectors, units, lessons, levels, players, rules, badges } from './data.js';

const tickers = new Set(stocks.map(s => s.ticker));
const lessonIds = new Set(lessons.map(l => l.id));
const QATAR_OFFSET_MS = 3 * 60 * 60 * 1000; // Qatar is UTC+3 all year, no daylight saving.

/* ---------- Formatting ---------- */

/** QSE tick sizes: 3 decimals below QAR 10, 2 decimals at QAR 10 and above. */
export function formatPrice(price) {
  const value = Number(price);
  if (!Number.isFinite(value)) return '0.00';
  return value.toLocaleString('en-US', { minimumFractionDigits: value < 10 ? 3 : 2, maximumFractionDigits: value < 10 ? 3 : 2 });
}

/** Input is percentage points: 1.24 → "+1.24%". Uses a true minus sign for negatives. */
export function formatPercent(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || Math.abs(amount) < 0.005) return '0.00%';
  return `${amount > 0 ? '+' : '−'}${Math.abs(amount).toFixed(2)}%`;
}

export function formatPoints(value) {
  return Number(value || 0).toLocaleString('en-US');
}

/* ---------- Learning progress ---------- */

export function cleanCompleted(ids) {
  return [...new Set((Array.isArray(ids) ? ids : []).filter(id => lessonIds.has(id)))];
}

/** Each unit is open when every lesson in the previous unit is complete. */
export function getUnitStatus(completed = []) {
  const done = new Set(cleanCompleted(completed));
  let previousComplete = true;
  return units.map(unit => {
    const finished = unit.lessons.filter(id => done.has(id)).length;
    const status = { ...unit, finished, total: unit.lessons.length, complete: finished === unit.lessons.length, unlocked: previousComplete };
    previousComplete = status.complete;
    return status;
  });
}

export function isLessonUnlocked(lessonId, completed = []) {
  const lesson = lessons.find(l => l.id === lessonId);
  if (!lesson) return false;
  return getUnitStatus(completed).find(u => u.id === lesson.unit)?.unlocked ?? false;
}

/** Ranked challenges open after the first unit ("Start here"). */
export function isChallengeUnlocked(completed = []) {
  return getUnitStatus(completed)[0].complete;
}

export function nextLesson(completed = []) {
  const done = new Set(cleanCompleted(completed));
  return lessons.find(l => !done.has(l.id) && isLessonUnlocked(l.id, completed)) ?? null;
}

export function learningXp(completed = [], perfect = []) {
  const done = cleanCompleted(completed);
  const flawless = cleanCompleted(perfect).filter(id => done.includes(id));
  return done.length * rules.lessonXp + flawless.length * rules.perfectBonus;
}

export function levelFor(xp) {
  const value = Math.max(0, Number(xp) || 0);
  let index = 0;
  levels.forEach((level, i) => { if (value >= level.min) index = i; });
  const current = levels[index], next = levels[index + 1] ?? null;
  const progress = next ? Math.round(((value - current.min) / (next.min - current.min)) * 100) : 100;
  return { number: index + 1, name: current.name, min: current.min, next, progress };
}

/** Grade a lesson quiz. answers is an array of chosen option indexes. */
export function gradeQuiz(quiz, answers = []) {
  const correct = quiz.filter((q, i) => answers[i] === q.answer).length;
  return { correct, total: quiz.length, perfect: correct === quiz.length };
}

/* ---------- Markets ---------- */

export function sectorOf(ticker) {
  const stock = stocks.find(s => s.ticker === ticker);
  return sectors.find(s => s.id === stock?.sector) ?? null;
}

/** sector: 'all' or a sector id. sort: 'name' | 'gainers' | 'losers' | 'active'. */
export function filterStocks(list, { query = '', sector = 'all', sort = 'name' } = {}) {
  const search = String(query).trim().toLowerCase();
  const filtered = list.filter(stock => {
    const sectorName = sectors.find(s => s.id === stock.sector)?.name ?? '';
    const haystack = `${stock.ticker} ${stock.name} ${sectorName}`.toLowerCase();
    return (sector === 'all' || stock.sector === sector) && (!search || haystack.includes(search));
  });
  const sorters = {
    name: (a, b) => a.name.localeCompare(b.name),
    gainers: (a, b) => b.change - a.change,
    losers: (a, b) => a.change - b.change,
    active: (a, b) => b.volume - a.volume,
  };
  return filtered.sort(sorters[sort] ?? sorters.name);
}

/* ---------- Challenge ---------- */

export function validatePicks(picks) {
  if (!Array.isArray(picks)) return { valid: false, error: 'Choose three stocks.' };
  const unique = [...new Set(picks)];
  if (unique.length !== picks.length) return { valid: false, error: 'Each pick must be a different stock.' };
  if (picks.some(t => !tickers.has(t))) return { valid: false, error: 'One of your picks isn’t a listed stock in this challenge.' };
  if (picks.length > 3) return { valid: false, error: 'Choose only three stocks.' };
  if (picks.length < 3) { const left = 3 - picks.length; return { valid: false, error: `Choose ${left} more ${left === 1 ? 'stock' : 'stocks'}.` }; }
  return { valid: true, error: '' };
}

/** Number of different sectors among the picks, plus a plain-language note. */
export function sectorMix(picks = []) {
  const ids = picks.map(t => stocks.find(s => s.ticker === t)?.sector).filter(Boolean);
  const counts = ids.reduce((map, id) => map.set(id, (map.get(id) || 0) + 1), new Map());
  const [topId, topCount] = [...counts].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
  const top = sectors.find(s => s.id === topId);
  let note = '';
  if (picks.length >= 2 && topCount === picks.length) note = `All your picks are ${top.short.toLowerCase()}. One bad day for the sector hits every pick.`;
  else if (topCount >= 2) note = `Two picks are ${top.short.toLowerCase()}. They’ll likely move together.`;
  else if (picks.length === 3) note = 'Three sectors, three different sets of drivers. Nicely spread.';
  return { sectors: counts.size, diversified: picks.length === 3 && counts.size === 3, note };
}

/** Small deterministic PRNG so a round always plays out the same way. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round2 = n => Math.round(n * 100) / 100;

/**
 * Simulate one session's percent changes. Each sector gets a shared move and each stock
 * adds its own, so same-sector picks tend to move together. Changes respect the ±10% limit.
 */
export function simulateSession(round) {
  const rng = seededRandom(Number(round) * 9973 + 17);
  const sectorMove = Object.fromEntries(sectors.map(s => [s.id, (rng() - 0.5) * 3.2]));
  return Object.fromEntries(stocks.map(stock => {
    const own = (rng() - 0.5) * 4.4;
    return [stock.ticker, round2(Math.max(-9.9, Math.min(9.9, sectorMove[stock.sector] + own)))];
  }));
}

export function scorePicks(picks, changes) {
  if (!picks.length) return 0;
  return round2(picks.reduce((sum, t) => sum + (changes[t] ?? 0), 0) / picks.length);
}

/** Fictional players' picks for a round, seeded so they're stable. */
export function fieldPicks(round) {
  return players.map((player, index) => {
    const rng = seededRandom(Number(round) * 131 + index * 7919 + 3);
    const pool = stocks.map(s => s.ticker);
    const picks = [];
    while (picks.length < 3) picks.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    return { id: player.id, picks };
  });
}

export function placementPoints(percentile) {
  return rules.placement.find(tier => percentile <= tier.upTo) ?? { points: rules.entryPoints, label: 'Entered' };
}

/** Play out a round for the player and the fictional field. */
export function playRound(round, picks, { ranked = true } = {}) {
  const changes = simulateSession(round);
  const myReturn = scorePicks(picks, changes);
  const field = fieldPicks(round).map(entry => ({ ...entry, return: scorePicks(entry.picks, changes) }));
  const rank = 1 + field.filter(entry => entry.return > myReturn).length;
  const fieldSize = field.length + 1;
  const percentile = rank / fieldSize;
  const placement = placementPoints(percentile);
  const { diversified } = sectorMix(picks);
  const points = ranked ? Math.max(placement.points, rules.entryPoints) + (diversified ? rules.diversifiedBonus : 0) : 0;
  return { round, changes, myReturn, rank, fieldSize, percentile, placement: placement.label, points, diversified, field };
}

/** Plain-language lessons from a finished round. Each item links to a lesson. */
export function roundLessons(picks, reasonsByTicker, result) {
  const notes = [];
  const mix = sectorMix(picks);
  if (!mix.diversified) {
    notes.push({ lessonId: 'diversify', title: 'Your picks shared drivers', body: `${mix.note} Spreading across three sectors also earns a +${rules.diversifiedBonus} bonus.` });
  }
  const sorted = [...picks].sort((a, b) => result.changes[b] - result.changes[a]);
  const best = sorted[0], worst = sorted.at(-1);
  const sectorAverage = id => {
    const members = stocks.filter(s => s.sector === id);
    return round2(members.reduce((sum, s) => sum + result.changes[s.ticker], 0) / members.length);
  };
  const worstSector = sectorOf(worst);
  if (result.changes[worst] < 0 && worstSector) {
    const avg = sectorAverage(worstSector.id);
    notes.push({ lessonId: worstSector.lessonId, title: `${worst} fell ${formatPercent(result.changes[worst])}`, body: avg < 0 ? `${worstSector.short} as a whole averaged ${formatPercent(avg)}, so this was mostly a sector move, not just this company.` : `${worstSector.short} averaged ${formatPercent(avg)}, so this one lagged its own sector. Company-specific news can matter as much as the sector.` });
  }
  if (reasonsByTicker[best] === 'hunch' || reasonsByTicker[worst] === 'hunch') {
    notes.push({ lessonId: 'skill-vs-luck', title: 'A hunch played a part', body: 'Hunches can win or lose on any single day. Next round, try backing each pick with a reason you can check afterwards.' });
  }
  if (notes.length < 2) {
    notes.push({ lessonId: 'skill-vs-luck', title: `One round is mostly noise`, body: `You ${result.myReturn >= 0 ? 'finished up' : 'finished down'} ${formatPercent(result.myReturn)}. Judge your reasoning over several rounds, not one result.` });
  }
  return notes.slice(0, 3);
}

/* ---------- Points, streaks, badges ---------- */

export function seasonPoints(events = []) {
  return events.reduce((sum, e) => sum + (Number(e.points) || 0), 0);
}

export function weeklyPoints(events = [], now = new Date()) {
  const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  return events.filter(e => new Date(e.at).getTime() >= weekAgo).reduce((sum, e) => sum + (Number(e.points) || 0), 0);
}

/** Qatar calendar date as YYYY-MM-DD. */
export function qatarDateKey(date = new Date()) {
  return new Date(date.getTime() + QATAR_OFFSET_MS).toISOString().slice(0, 10);
}

/** Consecutive Qatar days with activity, ending today or yesterday. */
export function streakDays(activityDays = [], now = new Date()) {
  const days = new Set(activityDays);
  const step = 24 * 60 * 60 * 1000;
  let cursor = now.getTime();
  if (!days.has(qatarDateKey(new Date(cursor)))) cursor -= step;
  let count = 0;
  while (days.has(qatarDateKey(new Date(cursor)))) { count += 1; cursor -= step; }
  return count;
}

export function earnedBadges(state = {}) {
  const completed = cleanCompleted(state.completedLessons);
  const unitsStatus = getUnitStatus(completed);
  const history = Array.isArray(state.history) ? state.history : [];
  const ranked = history.filter(h => h.mode === 'ranked');
  const earned = new Set();
  if (completed.length) earned.add('first-step');
  if (unitsStatus[0].complete) earned.add('market-ready');
  if (ranked.length || (state.challenge?.mode === 'ranked' && ['locked', 'results'].includes(state.challenge?.status))) earned.add('in-the-game');
  if (history.some(h => h.diversified) || (state.challenge?.picks?.length === 3 && sectorMix(state.challenge.picks).diversified && state.challenge.status !== 'open')) earned.add('spread-out');
  if (ranked.some(h => h.percentile <= 0.25)) earned.add('top-quarter');
  if (history.some(h => h.reviewed)) earned.add('reflective');
  if (unitsStatus[1].complete) earned.add('risk-aware');
  if (unitsStatus[2].complete) earned.add('analyst');
  if (completed.length === lessons.length) earned.add('graduate');
  return badges.map(b => ({ ...b, earned: earned.has(b.id) }));
}

/* ---------- Qatar market clock ---------- */

/** The next time picks lock: 9:30 AM Qatar time on the next trading day (Sunday to Thursday). */
export function nextLockTime(now = new Date()) {
  const local = new Date(now.getTime() + QATAR_OFFSET_MS);
  for (let add = 0; add < 8; add += 1) {
    const day = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + add, 9, 30));
    const weekday = day.getUTCDay();
    if (weekday === 5 || weekday === 6) continue;
    if (day.getTime() > local.getTime()) return new Date(day.getTime() - QATAR_OFFSET_MS);
  }
  return null;
}

/** 'pre-open' | 'open' | 'closing' | 'closed', using the QSE session times. */
export function marketPhase(now = new Date()) {
  const local = new Date(now.getTime() + QATAR_OFFSET_MS);
  const weekday = local.getUTCDay();
  if (weekday === 5 || weekday === 6) return 'closed';
  const minutes = local.getUTCHours() * 60 + local.getUTCMinutes();
  if (minutes >= 9 * 60 && minutes < 9 * 60 + 30) return 'pre-open';
  if (minutes >= 9 * 60 + 30 && minutes < 13 * 60) return 'open';
  if (minutes >= 13 * 60 && minutes < 13 * 60 + 15) return 'closing';
  return 'closed';
}

export function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(total / 1440), hours = Math.floor((total % 1440) / 60), minutes = total % 60;
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatQatarTime(date) {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Qatar', weekday: 'long', hour: 'numeric', minute: '2-digit' }).format(date);
}

/* ---------- Leaderboard ---------- */

/** Build a ranked table. you: { name, xp, challenge, week, lessons }. */
export function buildLeaderboard({ you, memberIds = null, period = 'season' }) {
  const pool = players.filter(p => !memberIds || memberIds.includes(p.id)).map(p => ({ ...p, points: period === 'week' ? p.week : p.xp + p.challenge, isYou: false }));
  pool.push({ id: 'you', name: you.name, xp: you.xp, lessons: you.lessons, points: period === 'week' ? you.week : you.season, isYou: true });
  pool.sort((a, b) => b.points - a.points || b.xp - a.xp || (a.isYou ? -1 : 1));
  return pool.map((row, i) => ({ ...row, rank: i + 1, level: levelFor(row.xp) }));
}

/** Simple 6-character invite code, avoiding look-alike characters. */
export function makeInviteCode(rng = Math.random) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => alphabet[Math.floor(rng() * alphabet.length)]).join('');
}

export function validateLeagueName(name) {
  const clean = String(name ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length < 3) return { valid: false, error: 'Use at least 3 characters for the league name.', name: clean };
  if (clean.length > 32) return { valid: false, error: 'Keep the league name to 32 characters or fewer.', name: clean };
  return { valid: true, error: '', name: clean };
}

/** Map a numeric series into a padded SVG viewBox. Flat series are centred. */
export function buildChartPath(values, { width = 800, height = 240, padding = 0 } = {}) {
  if (!Array.isArray(values) || !values.length || values.some(v => !Number.isFinite(v))) return '';
  if (![width, height, padding].every(Number.isFinite) || width <= 0 || height <= 0 || padding < 0) return '';
  const inset = Math.min(padding, width / 2, height / 2);
  const min = Math.min(...values), max = Math.max(...values);
  return values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : inset + (index / (values.length - 1)) * (width - inset * 2);
    const y = max === min ? height / 2 : height - inset - ((value - min) / (max - min)) * (height - inset * 2);
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
}
