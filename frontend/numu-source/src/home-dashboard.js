import { lessons, rules } from './data.js';
import { buildLeaderboard, qatarDateKey } from './model.js';
import { getCollectibleBadges, renderCollectibleBadge } from './badge-collection.js';
import { icon } from './icons.js';
import { esc, initials } from './views.js';

// NUMU dashboard: all progress comes from the existing app state.
export function renderGamifiedHome(state, progress, ctx) {
  const today = qatarDateKey();
  const challenge = state.challenge || {};
  const completed = new Set(state.completedLessons || []);
  const learnedToday = (state.events || []).some(e => e.type === 'lesson' && e.at && qatarDateKey(new Date(e.at)) === today);
  const picked = ['locked', 'results'].includes(challenge.status);
  const reviewed = !!challenge.reviewed;
  const completedCount = [learnedToday, picked, reviewed].filter(Boolean).length;
  const unit = progress.units.find(u => u.unlocked && !u.complete) || progress.units.at(-1);
  const earned = getCollectibleBadges(state);
  const league = (state.leagues || [])[0];
  const board = league ? buildLeaderboard({ you: ctx.you, memberIds: league.members, period: 'week' }).slice(0, 5) : [];
  const nextXp = progress.level.next?.min;
  const currentMin = progress.level.min;
  const levelProgress = Math.max(0, Math.min(100, progress.level.progress));
  const streak = progress.streak;
  const nextStreak = streak < 7 ? 7 : streak < 14 ? 14 : Math.ceil((streak + 1) / 7) * 7;
  const streakProgress = Math.round((streak / nextStreak) * 100);
  const previewBadges = [
    earned.find(b => b.earned),
    earned.find(b => !b.earned),
    earned.filter(b => !b.earned)[1]
  ].filter(Boolean);
  const path = unit?.lessons || [];
  const challengeStatus = challenge.status === 'results' ? 'Results available' : picked ? 'Picks submitted' : 'Choose your 3 stocks';

  const stages = [
    {
      title: 'Learn', iconName: 'book', done: learnedToday,
      description: 'Build your knowledge with a short lesson.',
      detail: `+${rules.lessonXp} XP`,
      action: progress.nextLesson
        ? `<button class="gh-action" data-action="open-lesson" data-id="${esc(progress.nextLesson.id)}">${learnedToday ? 'Keep learning' : 'Start lesson'} ${icon('arrow-right', 16)}</button>`
        : `<a class="gh-action" href="#learn">Browse lessons ${icon('arrow-right', 16)}</a>`
    },
    {
      title: 'Pick 3 stocks', iconName: 'chart', done: picked,
      description: 'Build a practice portfolio and explain your choices.',
      detail: 'Earn challenge points',
      action: `<a class="gh-action" href="#compete">${picked ? 'See your picks' : 'Play challenge'} ${icon('arrow-right', 16)}</a>`
    },
    {
      title: 'Review', iconName: 'search', done: reviewed,
      description: 'Look back at the results and what you learned.',
      detail: `+${rules.reviewBonus} ranked points`,
      action: challenge.status === 'results'
        ? `<a class="gh-action" href="#compete">${reviewed ? 'See review' : 'Review round'} ${icon('arrow-right', 16)}</a>`
        : `<span class="gh-action gh-action-disabled" aria-disabled="true">Available after results ${icon('lock', 15)}</span>`
    }
  ];

  return `
  <div class="gh-dashboard">
    <section class="gh-hero" aria-labelledby="gh-title">
      <div class="gh-hero-top">
        <div><p class="gh-greeting">${esc(ctx.greeting)}, ${esc(ctx.name)} 👋</p>
          <h1 id="gh-title">Today's <em>learning journey</em></h1>
          <p>A daily path to grow your Qatar market knowledge.</p>
        </div>
        <div class="gh-route-count"><strong>${completedCount} of 3 done</strong>
          <div class="gh-route-dots" aria-label="${completedCount} of three steps complete">${stages.map(s => `<span class="${s.done ? 'complete' : ''}">${s.done ? icon('check', 13) : ''}</span>`).join('')}</div>
        </div>
      </div>
      <div class="gh-journey-grid">
        <div class="gh-stages">${stages.map((step, i) => `
          <article class="gh-stage ${step.done ? 'gh-stage-done' : ''}">
            <div class="gh-step-num">${step.done ? icon('check', 16) : i + 1}</div>
            <span class="gh-stage-icon">${icon(step.iconName, 27)}</span>
            <h2>${step.title}</h2><p>${step.description}</p>
            <small>${step.done ? '✓ Completed' : step.detail}</small>
            ${step.action}
          </article>`).join('')}</div>
        <aside class="gh-bonus"><div class="gh-gift">${icon('award', 26)}</div>
          <h3>Daily completion bonus</h3>
          <p>Complete all three activities to build a strong learning habit.</p>
          <span class="gh-bonus-pill">Bonus rewards coming soon</span>
        </aside>
      </div>
    </section>

    <div class="gh-progress-row">
      <section class="gh-panel gh-level" aria-label="Your level progress">
        <span class="gh-level-emblem">${icon('trend', 28)}</span>
        <div class="gh-level-body"><div class="gh-panel-line"><h2>Your progress</h2><span class="gh-tag">Level ${progress.level.number}</span></div>
          <div class="gh-progress-track"><span style="width:${levelProgress}%"></span></div>
          <p>${progress.xp.toLocaleString('en-US')} learning XP${nextXp ? ` / ${nextXp.toLocaleString('en-US')} XP to next level` : ' · Maximum level reached'}</p>
        </div>
      </section>
      <section class="gh-panel gh-streak" aria-label="Learning streak">
        <span class="gh-flame">🔥</span><div class="gh-streak-body"><h2>Streak</h2>
          <strong>${streak} ${streak === 1 ? 'day' : 'days'}</strong>
          <p>${nextStreak - streak} more ${nextStreak - streak === 1 ? 'day' : 'days'} to your ${nextStreak}-day milestone</p></div>
        <div class="gh-streak-progress"><div class="gh-progress-track"><span style="width:${streakProgress}%"></span></div><small>${streak} / ${nextStreak} days</small></div>
      </section>
    </div>

    <div class="gh-lower-grid">
      <section class="gh-panel gh-learning">
        <div class="gh-panel-line"><h2>Your path: ${esc(unit?.title || 'Start here')}</h2><a href="#learn">Full path</a></div>
        <p class="gh-sub">${esc(unit?.summary || 'Choose a lesson to begin.')}</p>
        <div class="gh-lesson-list">${path.map(id => {
          const lesson = lessons.find(l => l.id === id);
          if (!lesson) return '';
          const done = completed.has(id);
          return `<button class="gh-lesson" data-action="open-lesson" data-id="${esc(id)}"><span class="gh-lesson-check ${done ? 'done' : ''}">${done ? icon('check', 14) : ''}</span><span class="gh-lesson-name">${esc(lesson.title)}</span><small>${done ? 'Done' : `${lesson.minutes} min`}</small><span class="gh-xp">+${rules.lessonXp} XP</span></button>`;
        }).join('')}</div>
        <div class="gh-reward-strip">${icon('award', 22)}<span>${esc(unit?.reward || 'Complete lessons to unlock new rewards.')}</span></div>
      </section>

      <section class="gh-panel gh-league">
        <div class="gh-panel-line"><h2>${esc(league?.name || 'Weekly league')} · This week</h2><a href="#leaderboard">Leaderboard</a></div>
        ${board.length ? `<div class="gh-podium">${[board[1], board[0], board[2]].filter(Boolean).map(row => `
          <div class="gh-podium-item ${row.rank === 1 ? 'first' : ''}"><div class="gh-place">${row.rank === 1 ? '👑' : row.rank}</div><span class="gh-avatar">${esc(initials(row.name))}</span><strong>${row.isYou ? 'You' : esc(row.name)}</strong><small>${row.points} pts</small></div>`).join('')}</div>
          <div class="gh-remaining">${board.filter(r => r.rank > 3).map(row => `<div><span>${row.rank}</span><span class="gh-avatar gh-avatar-small">${esc(initials(row.name))}</span><span class="gh-remaining-name">${row.isYou ? 'You' : esc(row.name)}</span><strong>${row.points} pts</strong></div>`).join('')}</div>`
          : `<p class="gh-sub">Join a league to see the weekly competition.</p>`}
        <p class="gh-note">Challenge scores are simulated and for learning only.</p>
      </section>

      <div class="gh-right-stack">
        <section class="gh-panel gh-badges">
          <div class="gh-panel-line"><h2>Your badges</h2><button data-action="profile">View all</button></div>
          <div class="gh-badge-list">${previewBadges.map(b => `
            ${renderCollectibleBadge(b, true)}`).join('')}</div>
          <p class="gh-note">${earned.filter(b => b.earned).length} of ${earned.length} badges earned</p>
        </section>
        <a class="gh-panel gh-upcoming" href="#compete"><span class="gh-upcoming-icon">${icon('target', 23)}</span>
          <span><strong>Upcoming challenge</strong><small>${challengeStatus}. Practice your reasoning in Pick 3.</small></span>${icon('chevron-right', 20)}</a>
      </div>
    </div>
  </div>`;
}
