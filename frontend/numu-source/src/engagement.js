import { lessons } from './data.js';
import { cleanCompleted, learningXp, levelFor, nextLesson, isChallengeUnlocked, getUnitStatus, seasonPoints, weeklyPoints, streakDays } from './model.js';

const qatarHour = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Qatar', hour: '2-digit', hourCycle: 'h23' });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Validate the login or sign-up form. Demo only: nothing is sent anywhere and passwords are never stored.
 * mode: 'login' | 'signup'. Returns { valid, errors } with one message per field.
 */
export function validateAuth(mode, { name = '', email = '', password = '', agree = false } = {}) {
  const errors = {};
  const cleanEmail = String(email).trim();
  if (mode === 'signup' && String(name).trim().length < 2) errors.name = 'Enter your name.';
  if (!cleanEmail) errors.email = 'Enter your email address.';
  else if (!EMAIL_RE.test(cleanEmail)) errors.email = 'Enter an email like name@example.com.';
  if (!password) errors.password = 'Enter your password.';
  else if (String(password).length < 8) errors.password = 'Use at least 8 characters.';
  else if (mode === 'signup' && !/\d/.test(password)) errors.password = 'Include at least one number.';
  if (mode === 'signup' && !agree) errors.agree = 'Tick the box to continue.';
  return { valid: Object.keys(errors).length === 0, errors };
}

/** "noora.ahmed@mail.com" → "Noora". Used when someone logs in without a saved name. */
export function nameFromEmail(email) {
  const first = String(email).split('@')[0].split(/[._\-+\d]/).find(Boolean) || '';
  return first ? first[0].toUpperCase() + first.slice(1).toLowerCase() : '';
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

/** Read the local demo profile defensively; names still need normal output escaping. */
export function sanitizeEngagement(value) {
  const saved = asRecord(value);
  const cleanedName = typeof saved.name === 'string'
    ? saved.name
      .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
      .replace(/[‎‏‪-‮⁦-⁩]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    : '';
  const email = typeof saved.email === 'string' ? saved.email.trim().toLowerCase().slice(0, 120) : '';
  return {
    name: [...cleanedName].slice(0, 40).join('').trim() || 'Demo investor',
    email: EMAIL_RE.test(email) ? email : '',
    morningEnabled: typeof saved.morningEnabled === 'boolean' ? saved.morningEnabled : true,
    eveningEnabled: typeof saved.eveningEnabled === 'boolean' ? saved.eveningEnabled : true,
  };
}

/** One summary of learning and competing, used by Home, the sidebar and the profile. */
export function getProgress(value = {}, now = new Date()) {
  const saved = asRecord(value);
  const completed = cleanCompleted(saved.completedLessons);
  const perfect = cleanCompleted(saved.perfectLessons);
  const events = Array.isArray(saved.events) ? saved.events.filter(e => e && Number.isFinite(Number(e.points)) && !Number.isNaN(new Date(e.at).getTime())) : [];
  const xp = learningXp(completed, perfect);
  return {
    completedCount: completed.length,
    totalLessons: lessons.length,
    completionPercent: lessons.length ? Math.round((completed.length / lessons.length) * 100) : 0,
    nextLesson: nextLesson(completed),
    units: getUnitStatus(completed),
    challengeUnlocked: isChallengeUnlocked(completed),
    xp,
    level: levelFor(xp),
    season: seasonPoints(events),
    week: weeklyPoints(events, now),
    streak: streakDays(Array.isArray(saved.activityDays) ? saved.activityDays : [], now),
  };
}

/** Return a Qatar-local greeting, independently of the browser's time zone. */
export function getQatarGreeting(date = new Date()) {
  const hour = Number(qatarHour.formatToParts(date).find(({ type }) => type === 'hour').value);
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  return 'Good evening';
}
