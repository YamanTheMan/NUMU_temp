import { stocks, sectors, units, lessons, reasons, rules, terms, marketSnapshot, players } from './data.js';
import { formatPrice, formatPercent, formatPoints, filterStocks, sectorMix, sectorOf, isLessonUnlocked, roundLessons, buildLeaderboard, formatCountdown, formatQatarTime, nextLockTime, qatarDateKey } from './model.js';
import { icon } from './icons.js';

export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const initials = name => String(name).split(/[ -]/).filter(Boolean).slice(0, 2).map(s => [...s][0]).join('').toUpperCase();
const sectorById = id => sectors.find(s => s.id === id);
const stockBy = t => stocks.find(s => s.ticker === t);

export function tickerMark(stock) {
  return `<span class="ticker-mark" style="--sector:${sectorById(stock.sector).color}" aria-hidden="true">${stock.ticker}</span>`;
}
export function changePill(value) {
  return `<span class="change ${value > 0 ? 'up' : value < 0 ? 'down' : 'flat'}">${formatPercent(value)}</span>`;
}
function heading(title, sub, actions = '') {
  return `<header class="page-head"><div><h1>${title}</h1>${sub ? `<p class="lede">${sub}</p>` : ''}</div>${actions ? `<div class="page-actions">${actions}</div>` : ''}</header>`;
}
function lockInfo(now = new Date()) {
  const lock = nextLockTime(now);
  return { when: formatQatarTime(lock), left: formatCountdown(lock - now), at: lock.getTime() };
}

/* ---------------- Home ---------------- */
export function renderHome(s, p, ctx) {
  const today = qatarDateKey();
  const learnedToday = (s.events || []).some(e => e.type === 'lesson' && qatarDateKey(new Date(e.at)) === today);
  const ch = s.challenge;
  const picked = ['locked', 'results'].includes(ch.status);
  const lock = lockInfo();
  const next = p.nextLesson;
  const steps = [
    { done: learnedToday, title: 'Learn', body: next ? esc(next.title) : 'Every lesson done. Revisit any time.', meta: next ? `${next.minutes} min, +${rules.lessonXp} XP` : '', action: next ? `<button class="btn btn-ink" data-action="open-lesson" data-id="${next.id}">${learnedToday ? 'Keep learning' : 'Start lesson'}</button>` : `<a class="btn btn-ink" href="#learn">Open the path</a>` },
    { done: picked, title: 'Pick 3 stocks', body: picked ? 'Your picks are in.' : p.challengeUnlocked ? 'Ranked round is open.' : 'Practice round. Ranked unlocks after Start here.', meta: picked ? '' : `Locks <span data-countdown>${lock.left}</span>`, action: `<a class="btn btn-ink" href="#compete">${picked ? 'See picks' : 'Pick your 3'}</a>` },
    { done: !!ch.reviewed, title: 'Review', body: ch.status === 'results' ? `You placed #${ch.result.rank} of ${ch.result.fieldSize}.` : 'See what the round taught you.', meta: ch.status === 'results' ? formatPercent(ch.result.myReturn) : 'After the close', action: ch.status === 'results' && !ch.reviewed ? `<a class="btn btn-ink" href="#compete">Review round</a>` : '' },
  ];
  const doneCount = steps.filter(x => x.done).length;
  const unit = p.units.find(u => u.unlocked && !u.complete) || p.units.at(-1);
  const league = s.leagues[0];
  const board = league ? buildLeaderboard({ you: ctx.you, memberIds: league.members, period: 'week' }).slice(0, 5) : [];
  const term = terms[Math.floor(Date.now() / 86400000) % terms.length];
  return `
  <section class="route" aria-labelledby="route-title">
    <div class="route-top"><div><p class="route-kicker">${ctx.greeting}, ${esc(ctx.name)}</p><h1 id="route-title">Today’s route</h1></div><span class="route-count">${doneCount} of 3 done</span></div>
    <div class="route-track" aria-hidden="true"><span style="width:${doneCount / 3 * 100}%"></span></div>
    <ol class="route-steps">${steps.map((st, i) => `<li class="${st.done ? 'is-done' : ''}"><span class="step-dot">${st.done ? icon('check', 16) : i + 1}</span><h2>${st.title}</h2><p>${st.body}</p>${st.meta ? `<small>${st.meta}</small>` : ''}${st.action}</li>`).join('')}</ol>
  </section>
  <div class="home-grid">
    <section class="panel">
      <div class="panel-head"><h2>Your path: ${esc(unit.title)}</h2><a class="link" href="#learn">Full path</a></div>
      <p class="muted">${esc(unit.summary)}</p>
      <ul class="mini-path">${unit.lessons.map(id => { const l = lessons.find(x => x.id === id); const done = s.completedLessons.includes(id); return `<li class="${done ? 'is-done' : ''}"><button data-action="open-lesson" data-id="${id}"><span class="node">${done ? icon('check', 14) : ''}</span><span>${esc(l.title)}</span><small>${l.minutes} min</small></button></li>`; }).join('')}</ul>
      <p class="reward">${icon(unit.rewardIcon, 16)} ${esc(unit.reward)}</p>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>${league ? esc(league.name) : 'Friends'} this week</h2><a class="link" href="#leaderboard">Leaderboard</a></div>
      ${league ? `<ol class="mini-board">${board.map(r => `<li class="${r.isYou ? 'is-you' : ''}"><span class="rank">${r.rank}</span><span class="avatar sm">${esc(initials(r.name))}</span><span class="who">${r.isYou ? 'You' : esc(r.name)}</span><strong>${formatPoints(r.points)}</strong></li>`).join('')}</ol>` : `<p class="muted">Create a league to compete with friends.</p>`}
    </section>
    <section class="panel term">
      <h2>Word of the day</h2>
      <p class="term-word">${esc(term.term)}</p><p>${esc(term.meaning)}</p>
      <button class="link" data-action="open-lesson" data-id="${term.lessonId}">Learn it properly</button>
    </section>
  </div>`;
}

/* ---------------- Learn ---------------- */
export function renderLearn(s, p) {
  const done = new Set(s.completedLessons);
  return `${heading('Learn the Qatar market', 'Short lessons with a quick check at the end. Finish Start here to unlock ranked challenges.', `<a class="btn btn-ghost" href="#tutor">${icon('video', 16)} Live lesson with Claire</a><div class="xp-chip">${icon('star', 16)} ${p.xp} XP, ${esc(p.level.name)}</div>`)}
  <div class="overall"><div class="bar"><span style="width:${p.completionPercent}%"></span></div><span>${p.completedCount} of ${p.totalLessons} lessons</span></div>
  <div class="units">${p.units.map((u, ui) => `
    <section class="unit ${u.unlocked ? '' : 'is-locked'} ${u.complete ? 'is-complete' : ''}" aria-labelledby="unit-${u.id}">
      <header class="unit-head"><span class="unit-no">Unit ${ui + 1}</span><h2 id="unit-${u.id}">${esc(u.title)}</h2><p>${esc(u.summary)}</p>
        <p class="unit-reward">${icon(u.unlocked ? u.rewardIcon : 'lock', 16)} ${u.unlocked ? esc(u.reward) : `Finish ${esc(units[ui - 1].title)} to open`}</p></header>
      <ol class="path">${u.lessons.map(id => { const l = lessons.find(x => x.id === id); const isDone = done.has(id); const open = isLessonUnlocked(id, s.completedLessons); const current = p.nextLesson?.id === id;
        return `<li class="${isDone ? 'is-done' : ''} ${current ? 'is-current' : ''}"><button ${open ? `data-action="open-lesson" data-id="${id}"` : 'disabled'}><span class="node">${isDone ? icon('check', 16) : open ? '' : icon('lock', 14)}</span><span class="path-text"><strong>${esc(l.title)}</strong><small>${esc(l.summary)}</small></span><span class="path-meta">${isDone ? (s.perfectLessons.includes(id) ? 'Perfect' : 'Done') : `${l.minutes} min`}</span></button></li>`; }).join('')}</ol>
    </section>`).join('')}</div>`;
}

/* ---------------- Lesson player (modal body) ---------------- */
export function renderPlayer(player, s, unlockedNow) {
  const l = lessons.find(x => x.id === player.lessonId);
  const total = l.cards.length + l.quiz.length;
  const step = player.step;
  const segs = `<div class="segs" aria-hidden="true">${Array.from({ length: total }, (_, i) => `<span class="${i < step ? 'done' : i === step ? 'now' : ''}"></span>`).join('')}</div>`;
  if (step >= total) {
    const correct = l.quiz.filter((q, i) => player.answers[i] === q.answer).length;
    const perfect = correct === l.quiz.length;
    return `<div class="player-done">${unlockedNow ? `<div class="unlock-art" aria-hidden="true">${icon('unlock', 44)}</div><h3>Ranked challenges are open</h3><p>You finished Start here. Your picks now count on the leaderboard.</p>` : `<div class="done-art" aria-hidden="true">${icon('check', 40)}</div><h3>Lesson complete</h3>`}
      <p class="score-line">${correct} of ${l.quiz.length} correct. +${rules.lessonXp}${perfect ? ` +${rules.perfectBonus} perfect` : ''} XP${player.alreadyDone ? ' (already earned)' : ''}</p>
      <div class="takeaway"><strong>Takeaway</strong><p>${esc(l.takeaway)}</p></div>
      <div class="player-actions">${unlockedNow || s.completedLessons.length >= 3 ? `<button class="btn btn-primary" data-action="goto" data-id="compete">Go to the challenge</button>` : ''}${nextAfter(l.id, s) ? `<button class="btn ${unlockedNow ? 'btn-ghost' : 'btn-primary'}" data-action="open-lesson" data-id="${nextAfter(l.id, s).id}">Next lesson</button>` : ''}<button class="btn btn-ghost" data-action="tutor-topic" data-id="${l.id}">${icon('video', 16)} Go over it with Claire</button><button class="btn btn-ghost" data-action="close-modal">Close</button></div></div>`;
  }
  if (step < l.cards.length) {
    const c = l.cards[step];
    return `${segs}<article class="card-step"><span class="step-label">${step + 1} of ${l.cards.length}</span><h3>${esc(c.heading)}</h3><p>${esc(c.body)}</p>
      ${c.example ? `<div class="example">${icon('lightbulb', 18)}<p><strong>In Qatar:</strong> ${esc(c.example)}</p></div>` : ''}
      ${c.term ? `<div class="term-box"><strong>${esc(c.term[0])}</strong><span>${esc(c.term[1])}</span></div>` : ''}</article>
      <div class="player-actions">${step > 0 ? `<button class="btn btn-ghost" data-action="player-back">Back</button>` : ''}<button class="btn btn-primary" data-action="player-next">${step === l.cards.length - 1 ? 'Start the quick check' : 'Next'}</button></div>`;
  }
  const qi = step - l.cards.length, q = l.quiz[qi];
  const chosen = player.answers[qi], checked = player.checked[qi];
  return `${segs}<fieldset class="quiz"><legend><span class="step-label">Quick check ${qi + 1} of ${l.quiz.length}</span>${esc(q.q)}</legend>
    ${q.options.map((o, oi) => `<button class="option ${chosen === oi ? 'is-chosen' : ''} ${checked && oi === q.answer ? 'is-right' : ''} ${checked && chosen === oi && oi !== q.answer ? 'is-wrong' : ''}" data-action="choose" data-index="${oi}" ${checked ? 'disabled' : ''} aria-pressed="${chosen === oi}">${esc(o)}</button>`).join('')}</fieldset>
    ${checked ? `<div class="feedback ${chosen === q.answer ? 'right' : 'wrong'}" role="status"><strong>${chosen === q.answer ? 'Correct.' : 'Not quite.'}</strong> ${esc(q.explain)}</div>` : ''}
    <div class="player-actions">${checked ? `<button class="btn btn-primary" data-action="player-next">${qi === l.quiz.length - 1 ? 'Finish lesson' : 'Next question'}</button>` : `<button class="btn btn-primary" data-action="check-answer" ${chosen == null ? 'disabled' : ''}>Check answer</button>`}</div>`;
}
function nextAfter(id, s) {
  const i = lessons.findIndex(l => l.id === id);
  const n = lessons.slice(i + 1).find(l => !s.completedLessons.includes(l.id) && isLessonUnlocked(l.id, s.completedLessons));
  return n || null;
}

/* ---------------- Markets ---------------- */
export function renderMarkets(s, ui) {
  const list = filterStocks(stocks, { query: ui.query, sector: ui.sector, sort: ui.sort });
  const sector = sectorById(ui.sector);
  const canPick = s.challenge.status === 'open';
  return `${heading('Markets', 'Get to know the companies listed on the Qatar Stock Exchange.', `<span class="tag">${icon('info', 14)} Sample prices, not live</span>`)}
  <div class="toolbar">${sectorChips(ui.sector, 'market-sector')}
    <div class="tool-right"><label class="search">${icon('search', 16)}<input id="market-search" type="search" placeholder="Search name or ticker" value="${esc(ui.query)}" aria-label="Search companies"></label>
    <select id="market-sort" aria-label="Sort">${[['name', 'A to Z'], ['gainers', 'Biggest gainers'], ['losers', 'Biggest losers'], ['active', 'Most active']].map(([v, l]) => `<option value="${v}" ${ui.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
  ${sector ? `<div class="explainer">${icon('lightbulb', 20)}<div><strong>How ${esc(sector.short.toLowerCase())} work</strong><p>${esc(sector.explainer)}</p><button class="link" data-action="open-lesson" data-id="${sector.lessonId}">Related lesson</button></div></div>` : ''}
  <div id="market-list">${stockRows(list, s, canPick)}</div>`;
}
export function sectorChips(active, action) {
  return `<div class="chips" role="group" aria-label="Filter by sector"><button class="chip ${active === 'all' ? 'is-on' : ''}" data-action="${action}" data-id="all" aria-pressed="${active === 'all'}">All</button>${sectors.map(x => `<button class="chip ${active === x.id ? 'is-on' : ''}" data-action="${action}" data-id="${x.id}" aria-pressed="${active === x.id}"><i style="background:${x.color}"></i>${x.short}</button>`).join('')}</div>`;
}
export function stockRows(list, s, canPick) {
  if (!list.length) return `<div class="empty">${icon('search', 26)}<p>No companies match that search. Try a ticker like QNBK or clear the filter.</p></div>`;
  return `<ul class="stock-list">${list.map(st => { const on = s.challenge.picks.includes(st.ticker); return `<li class="stock-row ${on ? 'is-picked' : ''}">
    <button class="stock-main" data-action="stock" data-id="${st.ticker}">${tickerMark(st)}<span class="stock-name"><strong>${esc(st.name)}</strong><small>${st.ticker}, ${esc(sectorById(st.sector).short)}</small></span></button>
    <span class="stock-price">QAR ${formatPrice(st.price)}</span>${changePill(st.change)}
    ${canPick ? `<button class="pick-btn ${on ? 'is-on' : ''}" data-action="toggle-pick" data-id="${st.ticker}" aria-pressed="${on}" aria-label="${on ? 'Remove' : 'Pick'} ${esc(st.name)}">${icon(on ? 'check' : 'plus', 16)}<span>${on ? 'Picked' : 'Pick'}</span></button>` : ''}</li>`; }).join('')}</ul>`;
}
export function renderStock(st, s) {
  const sec = sectorById(st.sector), on = s.challenge.picks.includes(st.ticker);
  return `<div class="stock-detail-top">${tickerMark(st)}<div><p class="muted">${esc(sec.name)}</p><p class="big-price">QAR ${formatPrice(st.price)} ${changePill(st.change)}</p></div></div>
  <dl class="facts"><div><dt>What it does</dt><dd>${esc(st.about)}</dd></div><div><dt>How it makes money</dt><dd>${esc(st.earns)}</dd></div><div><dt>What tends to move it</dt><dd>${esc(st.watch)}</dd></div></dl>
  <div class="metrics"><div><span>P/E ratio</span><strong>${st.pe.toFixed(1)}</strong><small>Riyals paid per riyal of yearly profit</small><button class="link" data-action="open-lesson" data-id="pe-ratio">What’s P/E?</button></div><div><span>Dividend yield</span><strong>${st.yield.toFixed(1)}%</strong><small>Yearly dividend ÷ price</small><button class="link" data-action="open-lesson" data-id="dividends">What’s yield?</button></div><div><span>Volume</span><strong>${st.volume.toFixed(1)}M</strong><small>Shares traded this session</small></div></div>
  <p class="fine">Sample figures for learning. Not live QSE data and not investment advice.</p>
  <button class="link coach-link" data-action="open-agent" data-id="research" data-prompt="Brief me on ${st.ticker}">${icon('sparkles', 15)} Ask Company research about ${st.ticker}</button>
  ${s.challenge.status === 'open' ? `<div class="player-actions"><button class="btn ${on ? 'btn-ghost' : 'btn-primary'}" data-action="toggle-pick" data-id="${st.ticker}" data-from="modal">${on ? 'Remove from my picks' : 'Add to my picks'}</button></div>` : ''}`;
}

/* ---------------- Compete ---------------- */
export function renderCompete(s, p, ui) {
  const ch = s.challenge, lock = lockInfo();
  const practice = ch.mode === 'practice';
  const unitStart = p.units[0];
  const gate = !p.challengeUnlocked ? `<section class="gate"><div class="gate-icon">${icon('lock', 26)}</div><div><h2>Ranked rounds unlock after Start here</h2><p>${unitStart.finished} of ${unitStart.total} lessons done. Until then, play practice rounds. They don’t count on the leaderboard.</p><div class="bar light"><span style="width:${unitStart.finished / unitStart.total * 100}%"></span></div></div>${p.nextLesson ? `<button class="btn btn-primary" data-action="open-lesson" data-id="${p.nextLesson.id}">Continue Start here</button>` : ''}</section>` : '';
  const how = `<ol class="how"><li><strong>Pick 3 stocks</strong><span>before 9:30 AM, when trading opens</span></li><li><strong>Say why</strong><span>a reason for each pick</span></li><li><strong>Score at the close</strong><span>average % change of your picks</span></li></ol>`;
  let body = '';
  if (ch.status === 'open') {
    const list = filterStocks(stocks, { query: ui.pickQuery, sector: ui.pickSector, sort: ui.pickSort });
    const mix = sectorMix(ch.picks);
    body = `<div class="pick-layout"><div><div class="toolbar">${sectorChips(ui.pickSector, 'pick-sector')}<div class="tool-right"><select id="pick-sort" aria-label="Sort">${[['name', 'A to Z'], ['gainers', 'Gainers'], ['losers', 'Losers'], ['active', 'Most active']].map(([v, l]) => `<option value="${v}" ${ui.pickSort === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>${stockRows(list, s, true)}</div>
    <aside class="tray" aria-label="Your picks"><h2>Your picks <span>${ch.picks.length} of 3</span></h2>
      <ol class="slots">${[0, 1, 2].map(i => { const t = ch.picks[i], st = t && stockBy(t); return st ? `<li>${tickerMark(st)}<span><strong>${esc(st.name)}</strong><small>${esc(sectorById(st.sector).short)}</small></span><button class="icon-btn" data-action="toggle-pick" data-id="${t}" aria-label="Remove ${esc(st.name)}">${icon('close', 16)}</button></li>` : `<li class="empty-slot">Pick ${i + 1}</li>`; }).join('')}</ol>
      ${mix.note ? `<p class="mix ${mix.diversified ? 'good' : ''}">${icon(mix.diversified ? 'check' : 'layers', 16)} ${esc(mix.note)}${mix.diversified ? ` +${rules.diversifiedBonus} bonus.` : ''}</p>` : ''}
      <button class="btn btn-primary wide" data-action="review-picks" ${ch.picks.length === 3 ? '' : 'disabled'}>Lock in picks</button>
      ${ch.picks.length ? `<button class="link coach-link" data-action="open-agent" data-id="coach" data-prompt="Review my picks">${icon('sparkles', 15)} Ask the Pick coach</button>` : ''}
      <p class="fine">Locks <span data-countdown>${lock.left}</span> (${lock.when})</p></aside></div>`;
  } else if (ch.status === 'locked') {
    body = `<section class="panel locked"><div class="panel-head"><h2>Your picks are in</h2><span class="tag">${practice ? 'Practice' : 'Ranked'} round ${ch.round}</span></div>
      <ul class="pick-cards">${ch.picks.map(t => { const st = stockBy(t); return `<li>${tickerMark(st)}<strong>${esc(st.name)}</strong><span>${esc(reasons.find(r => r.id === ch.reasons[t])?.label || '')}</span></li>`; }).join('')}</ul>
      <p class="muted">The session opens ${lock.when}, in <span data-countdown>${lock.left}</span>. Results come after the closing auction.</p>
      <div class="player-actions"><button class="btn btn-ghost" data-action="edit-picks">Change picks</button><button class="btn btn-primary" data-action="play-round">${icon('play', 16)} Play out the session (demo)</button></div></section>`;
  } else {
    const r = ch.result;
    const notes = roundLessons(ch.picks, ch.reasons, r);
    body = `<section class="result"><div class="result-hero"><div><p>Your return</p><strong class="${r.myReturn >= 0 ? 'up' : 'down'}">${formatPercent(r.myReturn)}</strong></div><div><p>Rank</p><strong>#${r.rank}<small> of ${r.fieldSize}</small></strong></div><div><p>${practice ? 'Practice, no points' : r.placement}</p><strong>+${r.points}<small> pts</small></strong></div></div>
      <ul class="pick-cards">${ch.picks.map(t => { const st = stockBy(t); return `<li>${tickerMark(st)}<strong>${esc(st.name)}</strong>${changePill(r.changes[t])}<span>${esc(reasons.find(x => x.id === ch.reasons[t])?.label || '')}</span></li>`; }).join('')}</ul>
      <h2 class="sub">What this round teaches</h2>
      <ul class="lessons-learned">${notes.map(n => `<li>${icon('lightbulb', 18)}<div><strong>${esc(n.title)}</strong><p>${esc(n.body)}</p><button class="link" data-action="open-lesson" data-id="${n.lessonId}">Open lesson</button></div></li>`).join('')}</ul>
      <div class="player-actions">${ch.reviewed ? `<span class="tag good">${icon('check', 14)} Reviewed</span>` : `<button class="btn btn-ghost" data-action="review-round">Mark as reviewed${practice ? '' : ` (+${rules.reviewBonus})`}</button>`}<button class="btn btn-primary" data-action="next-round">Start next round</button></div></section>`;
  }
  const hist = s.history.slice().reverse().slice(0, 6);
  return `${heading(`Daily challenge${practice ? ': practice' : ''}`, `Round ${ch.round}. Pick three QSE stocks and see how your reasoning holds up.`, `<span class="tag strong">${icon('clock', 14)} Locks in <span data-countdown>${lock.left}</span></span>`)}
  ${gate}${how}${body}
  ${hist.length ? `<section class="panel"><h2>Past rounds</h2><table class="table"><thead><tr><th>Round</th><th>Picks</th><th>Return</th><th>Rank</th><th>Points</th></tr></thead><tbody>${hist.map(h => `<tr><td>${h.round}${h.mode === 'practice' ? ' (practice)' : ''}</td><td>${h.picks.join(', ')}</td><td>${changePill(h.myReturn)}</td><td>#${h.rank}</td><td>+${h.points}</td></tr>`).join('')}</tbody></table></section>` : ''}`;
}
export function renderReasonForm(s) {
  return `<form id="reason-form"><p class="muted">Saying why makes the result something you can learn from.</p>${s.challenge.picks.map(t => { const st = stockBy(t); return `<fieldset class="reason-set"><legend>${tickerMark(st)} ${esc(st.name)}</legend><div class="reason-opts">${reasons.map(r => `<label class="reason"><input type="radio" name="${t}" value="${r.id}" ${s.challenge.reasons[t] === r.id ? 'checked' : ''}><span>${esc(r.label)}</span></label>`).join('')}</div></fieldset>`; }).join('')}<p class="form-error" id="reason-error" role="alert"></p><button class="btn btn-primary wide" type="submit">Lock in picks</button></form>`;
}

/* ---------------- Leaderboard ---------------- */
export function renderLeaderboard(s, p, ui, you) {
  const league = s.leagues.find(l => l.id === ui.scope);
  const rows = buildLeaderboard({ you, memberIds: league ? league.members : null, period: ui.period });
  const last = s.challenge.result || s.history.at(-1) || null;
  const lastFor = id => { if (!last) return null; if (id === 'you') return last.myReturn; return last.field?.find(f => f.id === id)?.return ?? null; };
  const podium = rows.slice(0, 3);
  return `${heading('Leaderboard', 'Points come from lessons and challenges, so learning moves you up too.', `<button class="btn btn-ghost" data-action="join-league">Join with a code</button><button class="btn btn-primary" data-action="create-league">${icon('plus', 16)} Create a league</button>`)}
  <div class="toolbar"><div class="chips" role="group" aria-label="Who to show"><button class="chip ${!league ? 'is-on' : ''}" data-action="board-scope" data-id="everyone">${icon('globe', 14)} Everyone</button>${s.leagues.map(l => `<button class="chip ${ui.scope === l.id ? 'is-on' : ''}" data-action="board-scope" data-id="${esc(l.id)}">${icon('users', 14)} ${esc(l.name)}</button>`).join('')}</div>
  <div class="seg" role="group" aria-label="Period"><button class="${ui.period === 'week' ? 'is-on' : ''}" data-action="board-period" data-id="week">This week</button><button class="${ui.period === 'season' ? 'is-on' : ''}" data-action="board-period" data-id="season">Season</button></div></div>
  ${league ? `<div class="invite">${icon('users', 18)}<span>${league.members.length + 1} members. Invite code <strong>${esc(league.code)}</strong></span><button class="btn btn-ghost sm" data-action="copy-code" data-id="${esc(league.code)}">${icon('copy', 14)} Copy code</button></div>` : ''}
  <ol class="podium">${[1, 0, 2].map(i => podium[i]).filter(Boolean).map(r => `<li class="place-${r.rank} ${r.isYou ? 'is-you' : ''}"><span class="avatar lg">${esc(initials(r.name))}</span><strong>${r.isYou ? 'You' : esc(r.name)}</strong><span>${formatPoints(r.points)} pts</span><div class="block">${r.rank}</div></li>`).join('')}</ol>
  <table class="table board"><thead><tr><th>#</th><th>Player</th><th>Level</th><th>Lessons</th><th>Last round</th><th>Points</th></tr></thead><tbody>${rows.map(r => { const lr = lastFor(r.id); return `<tr class="${r.isYou ? 'is-you' : ''}"><td>${r.rank}</td><td><span class="who"><span class="avatar sm">${esc(initials(r.name))}</span>${r.isYou ? `${esc(r.name)} (you)` : esc(r.name)}</span></td><td>${esc(r.level.name)}</td><td>${r.lessons}/12</td><td>${lr == null ? '<span class="muted">None</span>' : changePill(lr)}</td><td><strong>${formatPoints(r.points)}</strong></td></tr>`; }).join('')}</tbody></table>
  <section class="panel how-points"><h2>How points work</h2><ul><li><strong>+${rules.lessonXp}</strong> per lesson, <strong>+${rules.perfectBonus}</strong> for a perfect quick check</li><li><strong>+${rules.entryPoints} to +100</strong> per ranked round, based on your placement</li><li><strong>+${rules.diversifiedBonus}</strong> for picks across three sectors</li><li><strong>+${rules.reviewBonus}</strong> for reviewing what a round taught you</li></ul></section>`;
}
