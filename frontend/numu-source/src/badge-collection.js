import { getUnitStatus, streakDays } from './model.js';

// All achievement definitions are centralized here.
// Unlocks only use real tracked user state; no placeholder achievements are awarded.
const CATALOG = [
  ['first-step','First Step','Complete your first lesson.'],
  ['qse-basics','QSE Basics','Complete the Qatar Stock Exchange starter path.'],
  ['market-explorer','Market Explorer','Open and explore five different QSE companies.'],
  ['first-trade','First Trade','Complete your first simulated buy or sell.'],
  ['pick-3-challenger','Pick 3 Challenger','Complete your first Pick 3 challenge.'],
  ['research-rookie','Research Rookie','Pin a company agent and read its research report.'],
  ['portfolio-builder','Portfolio Builder','Hold shares in three different companies.'],
  ['quiz-ace','Quiz Ace','Earn 100% on a lesson quiz.'],
  ['seven-day-streak','7 Day Streak','Learn on seven consecutive days.'],
  ['leaderboard-climber','Leaderboard Climber','Reach the weekly leaderboard top 10.'],
];

export function getCollectibleBadges(state = {}) {
  const lessons = state.completedLessons || [];
  const units = getUnitStatus(lessons);
  const viewed = new Set(state.viewedCompanies || []);
  const history = state.history || [];
  const streak = streakDays(state.activityDays || []);
  const perfect = state.perfectLessons || [];
  const checks = {
    'first-step': lessons.length >= 1,
    'qse-basics': !!units[0]?.complete,
    'market-explorer': viewed.size >= 5,
    'first-trade': (state.simulatedTradeCount || 0) >= 1,
    'pick-3-challenger': history.length >= 1,
    // These three require activity hooks to be connected to the agent, portfolio and league UI.
    'research-rookie': !!state.readFirstPinnedReport,
    'portfolio-builder': (state.portfolioCompanyCount || 0) >= 3,
    'quiz-ace': perfect.length >= 1,
    'seven-day-streak': streak >= 7,
    'leaderboard-climber': !!state.reachedWeeklyTopTen,
  };
  return CATALOG.map(([id,name,description]) => ({
    id, name, description, earned: !!checks[id], image: `/src/badges/${id}.png`
  }));
}

export function renderCollectibleBadge(badge, compact = false) {
  const safeName = badge.name.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  const safeDescription = badge.description.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  return `<div class="numu-achievement ${badge.earned ? 'is-earned' : 'is-locked'} ${compact ? 'compact' : ''}" title="${safeDescription}">
    <div class="numu-achievement-art"><img src="${badge.image}" alt="" loading="lazy"></div>
    <strong>${safeName}</strong>
    ${compact ? '' : `<p>${safeDescription}</p>`}
    <small>${badge.earned ? '✓ Earned' : '🔒 Locked'}</small>
  </div>`;
}
