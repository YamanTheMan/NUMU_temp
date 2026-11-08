import { getCollectibleBadges } from './badge-collection.js';
import {
  renderHomeAgentSummary,
  renderPinnedAgents
} from "./pinned-agents.js";
import { stocks, lessons, units, defaultLeagues, joinableLeagues, rules } from './data.js';
import { cleanCompleted, isChallengeUnlocked, playRound, validatePicks, earnedBadges, qatarDateKey, nextLockTime, formatCountdown, makeInviteCode, validateLeagueName, filterStocks, gradeQuiz } from './model.js';
import { sanitizeEngagement, getProgress, getQatarGreeting, validateAuth, nameFromEmail } from './engagement.js';
import { icon, logo } from './icons.js';
import { esc, initials, renderHome, renderLearn, renderPlayer, renderMarkets, renderStock, stockRows, renderCompete, renderReasonForm, renderLeaderboard } from './views.js';
import { renderLogin, renderNotifications, renderProfile } from './engagement-views.js';
import { renderAgents, agentReply } from './agents.js';
import {
  renderQseMarket,
  renderQseRows
} from "./qse-market.js";
import {
  getPortfolio,
  getStocks,
  buyStock,
  sellStock,
  askMusaid,
  getPinnedAgents,
  pinStock,
  unpinStock,
  chatWithStockAgent,
  researchStock
} from "./api.js";
import { renderHomeMarket } from "./home-market.js";
import { renderGamifiedHome } from "./home-dashboard.js";

import { renderPortfolio } from "./portfolio.js";

const STORAGE_KEY = 'namaa-orange-v1';
const PROFILE_KEY = 'namaa-engagement-v1';
const SESSION_KEY = 'namaa-session-v2';

const routes = [
  'home',
  'learn',
  'markets',
  'portfolio',
  'compete',
  'leaderboard',
  'agents'
];

const nav = [
  ['home', 'Home', 'home'],
  ['learn', 'Learn', 'book'],
  ['markets', 'Markets', 'chart'],
  ['portfolio', 'Portfolio', 'chart'],
  ['compete', 'Compete', 'target'],
  ['leaderboard', 'Leaderboard', 'trophy'],
  ['agents', 'Agents', 'sparkles']
];

const freshChallenge = (round, completed) => ({ round, mode: isChallengeUnlocked(completed) ? 'ranked' : 'practice', picks: [], reasons: {}, status: 'open', result: null, reviewed: false });
const defaultState = () => ({ completedLessons: [], perfectLessons: [], activityDays: [], events: [], history: [], leagues: structuredClone(defaultLeagues), challenge: freshChallenge(1, []) });

let state = loadState();
let wallet = null;
let walletError = "";

let pinnedAgents = [];
let pinnedAgentsLoading = false;
let pinnedAgentsError = "";

let selectedPinnedSymbol = null;
let pinnedChats = {};

let marketStocks = [];
let marketError = "";
let marketLoading = false;

let stockResearch = {};
let researchLoading = {};
let researchErrors = {};


async function generateStockResearch(symbol) {
  if (researchLoading[symbol]) return;

  researchLoading[symbol] = true;
  researchErrors[symbol] = "";
  render();

  try {
    const result = await researchStock(symbol);

    stockResearch[symbol] = {
      report: result.report,
      updatedAt: new Date().toISOString()
    };

  } catch (error) {
    researchErrors[symbol] = error.message;
    console.error("Research failed:", symbol, error);

  } finally {
    researchLoading[symbol] = false;
    render();
  }
}


async function loadPinnedAgents() {
  pinnedAgentsLoading = true;
  pinnedAgentsError = "";

  try {
    const result = await getPinnedAgents();
    pinnedAgents = result.agents || [];

    if (
      !pinnedAgents.some(
        agent => agent.symbol === selectedPinnedSymbol
      )
    ) {
      selectedPinnedSymbol = pinnedAgents[0]?.symbol || null;
    }

  } catch (error) {
    pinnedAgentsError = error.message;
    console.error("Unable to load agents:", error);

  } finally {
    pinnedAgentsLoading = false;
  }

  if (
    session === "app" &&
    ["home", "portfolio", "agents"].includes(route())
  ) {
    render();
  }
}



async function loadMarketStocks() {
  marketLoading = true;
  marketError = "";

  try {
    const result = await getStocks();

    marketStocks = Array.isArray(result)
      ? result
      : Array.isArray(result?.stocks)
        ? result.stocks
        : [];

    console.log("QSE stocks loaded:", marketStocks.length);

  } catch (error) {
    marketStocks = [];
    marketError = error.message;
    console.error("Unable to load QSE stocks:", error);

  } finally {
    marketLoading = false;
  }

  if (
    ["home", "markets"].includes(route()) &&
    session === "app"
  ) {
    render();
  }
}

async function loadWallet() {
  try {
    walletError = "";
    wallet = await getPortfolio();
  } catch (error) {
    walletError = error.message;
  }

  if (route() === "portfolio" && session === "app") {
    render();
  }
}
let engagement = load(PROFILE_KEY, sanitizeEngagement);
const REMEMBER_KEY = 'numu-remember-v1';
let session = (() => { try { return sessionStorage.getItem(SESSION_KEY) === 'app' || localStorage.getItem(REMEMBER_KEY) === 'yes' ? 'app' : 'login'; } catch { return 'login'; } })();
let auth = { mode: 'login', errors: {}, values: {}, notice: '', showPassword: false };
const ui = { sector: 'all', query: '', sort: 'name', pickSector: 'all', pickQuery: '', pickSort: 'name', scope: 'everyone', period: 'week', agent: 'tutor', chats: {} };
let player = null, modalTrigger = null, toastTimer;
const root = document.querySelector('#app');
const overlay = document.querySelector('#overlay-root');

function load(key, clean) { try { return clean(JSON.parse(localStorage.getItem(key))); } catch { return clean(null); } }
function loadState() {
  const base = defaultState();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== 'object') return base;
    const s = { ...base, ...saved };
    s.completedLessons = cleanCompleted(s.completedLessons);
    s.perfectLessons = cleanCompleted(s.perfectLessons);
    for (const k of ['activityDays', 'events', 'history', 'leagues']) if (!Array.isArray(s[k])) s[k] = base[k];
    if (!s.challenge || !Array.isArray(s.challenge.picks)) s.challenge = base.challenge;
    return s;
  } catch { return base; }
}
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); localStorage.setItem(PROFILE_KEY, JSON.stringify(engagement)); }
  catch { toast('Browser storage is off, so progress lasts for this visit only.'); }
}
function route() { const r = location.hash.slice(1); return routes.includes(r) ? r : 'home'; }
const progress = () => getProgress(state);
const you = p => ({ name: engagement.name, xp: p.xp, lessons: p.completedCount, week: p.week, season: p.season });
function markActive() { const d = qatarDateKey(); if (!state.activityDays.includes(d)) state.activityDays.push(d); }
function award(type, label, points) { if (points > 0) state.events.push({ type, label, points, at: new Date().toISOString() }); }

/* ---------- Render ---------- */
function render() {
  if (session !== 'app') { document.title = 'Welcome to NUMU'; root.innerHTML = renderLogin(engagement, auth); return; }
  const r = route(), p = progress();
  document.title = `${nav.find(n => n[0] === r)[1]} · NUMU`;
  const page = r === 'home' ? renderGamifiedHome(state, p, {
        name: engagement.name,
        greeting: getQatarGreeting(),
        you: you(p)
      }) +
      renderHomeAgentSummary(
        pinnedAgents,
        pinnedAgentsLoading,
        pinnedAgentsError,
        stockResearch,
        researchLoading,
        researchErrors
      )
    : r === 'learn' ? renderLearn(state, p)
    : r === 'markets' ? renderQseMarket(marketStocks, ui, marketLoading, marketError, stocks)
    : r === 'portfolio' ? renderPortfolio(wallet, walletError, pinnedAgents)
    : r === 'compete' ? renderCompete(state, p, ui)
    : r === 'agents'
      ? renderAgents(state, ui) +
        renderPinnedAgents(
          pinnedAgents,
          selectedPinnedSymbol,
          pinnedChats,
          pinnedAgentsLoading,
          pinnedAgentsError
        )
    : renderLeaderboard(state, p, ui, you(p));
  const links = mobile => nav.map(([id, label, ic]) => `<a href="#${id}" class="nav-link ${r === id ? 'is-active' : ''}" ${r === id ? 'aria-current="page"' : ''}>${icon(ic, mobile ? 22 : 20)}<span>${label}</span>${id === 'compete' && !p.challengeUnlocked && !mobile ? icon('lock', 14) : ''}</a>`).join('');
  root.innerHTML = `<div class="shell">
    <aside class="sidebar"><a class="brand" href="#home" aria-label="NUMU home">${logo()}<span class="wordmark">NUMU</span><span class="brand-ar" lang="ar">نمو</span></a>
      <nav class="side-nav" aria-label="Main">${links(false)}</nav>
      <div class="side-bottom"><button class="level-card" data-action="profile"><span class="avatar">${esc(initials(engagement.name))}</span><span><strong>${esc(engagement.name)}</strong><small>Level ${p.level.number}, ${esc(p.level.name)}</small></span></button>
      <div class="points-card"><span>Season points</span><strong>${p.season.toLocaleString('en-US')}</strong></div>
      <p class="side-note">${icon('globe', 14)} Qatar Stock Exchange</p></div></aside>
    <div class="main-col"><header class="topbar"><a class="mobile-brand" href="#home">${logo()}<span class="wordmark">NUMU</span></a>
      <div class="top-actions"><span class="streak" title="Day streak">${icon('flame', 18)} ${p.streak}</span><button class="icon-btn" data-action="notifications" aria-label="Notifications">${icon('bell', 20)}</button><button class="avatar" data-action="profile" aria-label="Your profile">${esc(initials(engagement.name))}</button></div></header>
      <main id="main" tabindex="-1" class="page page-${r}">${page}</main>
      <footer class="foot">NUMU is a learning demo. Sample prices, fictional players, no real trading.</footer></div>
    <nav class="bottom-nav" aria-label="Main">${links(true)}</nav></div>`;
}

/* ---------- Modals ---------- */
function openModal(title, html, cls = '') {
  if (!overlay.innerHTML) modalTrigger = document.activeElement;
  overlay.innerHTML = `<div class="backdrop"><section class="modal ${cls}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal-head"><h2 id="modal-title">${esc(title)}</h2><button class="icon-btn" data-action="close-modal" aria-label="Close">${icon('close', 20)}</button></header><div class="modal-body">${html}</div></section></div>`;
  document.body.classList.add('modal-open'); root.inert = true;
  (overlay.querySelector('.modal-body button:not([disabled]), .modal-body input') || overlay.querySelector('button'))?.focus();
}
function closeModal() {
  overlay.innerHTML = ''; player = null; document.body.classList.remove('modal-open'); root.inert = false;
  if (modalTrigger?.isConnected) modalTrigger.focus(); else document.querySelector('#main')?.focus({ preventScroll: true });
}
function openLesson(id) {
  const l = lessons.find(x => x.id === id);
  if (!l) return;
  player = { lessonId: id, step: 0, answers: [], checked: [], alreadyDone: state.completedLessons.includes(id), unlockedNow: false };
  openModal(l.title, `<div id="player">${renderPlayer(player, state, false)}</div>`, 'player-modal');
}
function drawPlayer() {
  const el = overlay.querySelector('#player');
  if (!el) return;
  el.innerHTML = renderPlayer(player, state, player.unlockedNow);
  el.querySelector('.option:not([disabled]), .player-actions .btn-primary, .player-actions button')?.focus();
}
function finishLesson() {
  const l = lessons.find(x => x.id === player.lessonId);
  const { perfect } = gradeQuiz(l.quiz, player.answers);
  const before = isChallengeUnlocked(state.completedLessons);
  if (!state.completedLessons.includes(l.id)) { state.completedLessons.push(l.id); award('lesson', l.title, rules.lessonXp); }
  if (perfect && !state.perfectLessons.includes(l.id)) { state.perfectLessons.push(l.id); award('lesson', `${l.title} (perfect)`, rules.perfectBonus); }
  markActive();
  player.unlockedNow = !before && isChallengeUnlocked(state.completedLessons);
  if (player.unlockedNow && state.challenge.status === 'open') state.challenge.mode = 'ranked';
  persist(); render();
}

/* ---------- Toast ---------- */
function toast(msg) {
  const el = document.querySelector('#toast');
  clearTimeout(toastTimer);
  el.innerHTML = `${icon('check', 16)}<span>${esc(msg)}</span>`; el.classList.add('visible');
  toastTimer = setTimeout(() => el.classList.remove('visible'), 2800);
}

/* ---------- Login ---------- */
// Reads the visible auth form. The password is only used for validation and is never stored.
function readAuthForm() {
  const f = document.querySelector('#login-form, #signup-form');
  if (!f) return {};
  const d = new FormData(f);
  return { name: String(d.get('name') ?? ''), email: String(d.get('email') ?? ''), password: String(d.get('password') ?? ''), agree: d.get('agree') === 'on', remember: d.get('remember') === 'on' };
}

/* ---------- Agents ---------- */


async function askAgent(text) {
  const msg = String(text || '').trim();
  if (!msg) return;

  const id = ui.agent;
  const chat = (ui.chats[id] ||= []);

  // Get previous conversation BEFORE adding the new question
  const history = chat
    .filter(m => !m.typing && typeof m.text === 'string')
    .slice(-10)
    .map(m => ({
      role: m.from === 'you' ? 'user' : 'assistant',
      content: m.text
    }));

  const pending = { from: 'agent', typing: true };

  chat.push(
    { from: 'you', text: msg },
    pending
  );

  drawChat();

  try {
    if (id === 'tutor') {
      // Real OpenAI-powered Musa'id
      const language = /[\u0600-\u06FF]/.test(msg)
        ? 'ar'
        : 'en';

      // Send the question AND previous conversation
      const response = await askMusaid(
        msg,
        language,
        history
      );
      Object.assign(pending, {
        typing: false,
        text: response.answer
      });

    } else {
      // Other agents still use demo responses
      const reply = agentReply(id, msg, state);

      Object.assign(pending, {
        typing: false,
        ...reply
      });
    }

  } catch (error) {
    Object.assign(pending, {
      typing: false,
      text: "Musa'id is temporarily unavailable. Please try again."
    });

    console.error('Agent request failed:', error);
  }

  drawChat();
}

function drawChat() {
  if (route() !== 'agents') return;
  render();
  const log = document.querySelector('#chat-log'); if (log) log.scrollTop = log.scrollHeight;
  document.querySelector('#agent-text')?.focus({ preventScroll: true });
}

/* ---------- Actions ---------- */
function togglePick(t) {
  const ch = state.challenge;
  if (ch.status !== 'open') return;
  if (ch.picks.includes(t)) { ch.picks = ch.picks.filter(x => x !== t); delete ch.reasons[t]; }
  else if (ch.picks.length >= 3) { toast('You have three picks. Remove one to swap.'); return; }
  else ch.picks.push(t);
  persist();
}
function refreshAfterPick(t, fromModal) {
  const focusSel = `[data-action="toggle-pick"][data-id="${t}"]`;
  render();
  if (fromModal) { const st = stocks.find(s => s.ticker === t); openModal(st.name, renderStock(st, state), 'stock-modal'); }
  else document.querySelector(focusSel)?.focus({ preventScroll: true });
}

document.addEventListener('click', async e => {
  if (e.target.classList.contains('backdrop')) { closeModal(); return; }
  const b = e.target.closest('[data-action]');
  if (!b) return;
  const { action: a, id } = b.dataset;
  const ch = state.challenge;
  if (a === 'close-modal') closeModal();
  else if (a === 'goto') { closeModal(); location.hash = id; }
  else if (a === 'open-lesson') openLesson(id);
  else if (a === 'player-next') { player.step += 1; const l = lessons.find(x => x.id === player.lessonId); if (player.step === l.cards.length + l.quiz.length) finishLesson(); drawPlayer(); }
  else if (a === 'player-back') { player.step = Math.max(0, player.step - 1); drawPlayer(); }
  else if (a === 'choose') { const l = lessons.find(x => x.id === player.lessonId); player.answers[player.step - l.cards.length] = Number(b.dataset.index); drawPlayer(); }
  else if (a === 'check-answer') { const l = lessons.find(x => x.id === player.lessonId); player.checked[player.step - l.cards.length] = true; drawPlayer(); }
  else if (a === 'pin-agent') {
    const symbol = id.trim().toUpperCase();

    // Prevent repeated clicks while the request runs.
    b.disabled = true;

    try {
      const isPinned = pinnedAgents.some(
        agent => agent.symbol === symbol
      );

      if (isPinned) {
        await unpinStock(symbol);
        toast(`${symbol} agent unpinned.`);
      } else {
        await pinStock(symbol);
        toast(`${symbol} AI agent pinned!`);
      }

      const result = await getPinnedAgents();
      pinnedAgents = result.agents;

      render();

    } catch (error) {
      b.disabled = false;
      toast(error.message);
    }

    return;
  }
  else if (a === 'stock') { state.viewedCompanies = [...new Set([...(state.viewedCompanies || []), id])]; persist(); const st = stocks.find(s => s.ticker === id); openModal(st.name, renderStock(st, state), 'stock-modal'); }
  else if (a === 'qse-stock') {
    const stock = marketStocks.find(s => s.symbol === id);

    if (!stock) {
      toast('Stock not found.');
      return;
    }
    state.viewedCompanies = [...new Set([...(state.viewedCompanies || []), stock.symbol])];
    persist();

    const price = Number(stock.price).toFixed(3);

    openModal(stock.company, `
      <div class="stock-details">

        <div class="stock-detail-top">
          <span class="ticker-mark">
            ${esc(stock.symbol)}
          </span>

          <div>
            <p class="muted">${esc(stock.symbol)}</p>
            <p class="big-price">QAR ${price}</p>
          </div>
        </div>

        <p class="fine">
          Snapshot price only. No real trading.
        </p>

        <form id="portfolio-trade-form">
          <input
            type="hidden"
            name="symbol"
            value="${esc(stock.symbol)}"
          >

          <label for="trade-quantity">
            Number of shares
          </label>

          <input
            id="trade-quantity"
            type="number"
            name="quantity"
            min="1"
            step="1"
            value="1"
            required
          >

          <div class="page-actions" style="margin-top:20px">
            <button
              class="btn btn-primary"
              type="submit"
              name="side"
              value="buy"
            >
              Buy shares
            </button>

            <button
              class="btn btn-ghost"
              type="submit"
              name="side"
              value="sell"
            >
              Sell shares
            </button>
          </div>
        </form>

      </div>
    `, 'stock-modal');
  }

  else if (a === 'toggle-pick') { togglePick(id); refreshAfterPick(id, b.dataset.from === 'modal'); }
  else if (a === 'market-sector') { ui.sector = id; render(); document.querySelector(`[data-action="market-sector"][data-id="${id}"]`)?.focus(); }
  else if (a === 'pick-sector') { ui.pickSector = id; render(); document.querySelector(`[data-action="pick-sector"][data-id="${id}"]`)?.focus(); }
  else if (a === 'review-picks') { const v = validatePicks(ch.picks); if (!v.valid) { toast(v.error); return; } openModal('Why these three?', renderReasonForm(state), 'reason-modal'); }
  else if (a === 'edit-picks') { ch.status = 'open'; persist(); render(); }
  else if (a === "generate-stock-research") {
    await generateStockResearch(id);
  }
  else if (a === 'play-round') {
    const ranked = ch.mode === 'ranked';
    ch.result = playRound(ch.round, ch.picks, { ranked });
    ch.status = 'results';
    award('challenge', `Round ${ch.round}`, ch.result.points);
    const { field, changes, ...summary } = ch.result;
    state.history.push({ ...summary, mode: ch.mode, picks: [...ch.picks], reviewed: false, at: new Date().toISOString() });
    markActive(); persist(); render(); window.scrollTo(0, 0);
    toast(ranked ? `Round played. +${ch.result.points} points.` : 'Practice round played.');
  }
  else if (a === 'review-round') {
    ch.reviewed = true;
    const h = state.history.findLast(x => x.round === ch.round); if (h) h.reviewed = true;
    if (ch.mode === 'ranked') award('review', `Reviewed round ${ch.round}`, rules.reviewBonus);
    persist(); render(); toast(ch.mode === 'ranked' ? `Reviewed. +${rules.reviewBonus} points.` : 'Reviewed.');
  }
  else if (a === 'next-round') { state.challenge = freshChallenge(ch.round + 1, state.completedLessons); persist(); render(); window.scrollTo(0, 0); }
  else if (a === 'agent-select') { ui.agent = id; render(); document.querySelector(`[data-action="agent-select"][data-id="${id}"]`)?.focus(); }
  else if (a === 'agent-prompt') askAgent(id);
  else if (a === 'agent-clear') { ui.chats[ui.agent] = []; render(); }
  else if (a === 'open-agent') { ui.agent = id; if (overlay.innerHTML) closeModal(); location.hash = 'agents'; render(); if (b.dataset.prompt) askAgent(b.dataset.prompt); }
  else if (a === 'board-scope') { ui.scope = id; render(); }
  else if (a === 'board-period') { ui.period = id; render(); }
  else if (a === 'copy-code') { navigator.clipboard?.writeText(id).then(() => toast(`Copied ${id}`), () => toast(`Code: ${id}`)); }
  else if (a === 'create-league') openModal('Create a league', `<form id="league-form"><label for="league-name">League name</label><input id="league-name" name="name" maxlength="32" placeholder="e.g. Office League" autocomplete="off"><p class="form-error" id="league-error" role="alert"></p><button class="btn btn-primary wide" type="submit">Create league</button></form><p class="fine">You’ll get a code to share with friends.</p>`);
  else if (a === 'join-league') openModal('Join a league', `<form id="join-form"><label for="join-code">Invite code</label><input id="join-code" name="code" maxlength="6" placeholder="DOHA24" autocomplete="off" style="text-transform:uppercase"><p class="form-error" id="join-error" role="alert"></p><button class="btn btn-primary wide" type="submit">Join league</button></form><p class="fine">Demo tip: try DOHA24.</p>`);
  else if (a === 'profile') openModal('Your profile', renderProfile(engagement, progress(), getCollectibleBadges(state)), 'profile-modal');
  else if (a === 'notifications') openModal('Notifications', renderNotifications(engagement));
  else if (a === 'toggle-digest') { const k = b.dataset.kind === 'morning' ? 'morningEnabled' : 'eveningEnabled'; engagement[k] = !engagement[k]; persist(); b.setAttribute('aria-checked', String(engagement[k])); }
  else if (a === 'demo-unlock') { for (const id2 of units[0].lessons) if (!state.completedLessons.includes(id2)) { state.completedLessons.push(id2); award('lesson', id2, rules.lessonXp); } markActive(); if (ch.status === 'open') ch.mode = 'ranked'; persist(); closeModal(); render(); toast('Start here finished. Ranked rounds are open.'); }
  else if (a === 'demo-reset') { state = defaultState(); persist(); closeModal(); location.hash = 'home'; render(); toast('Demo reset.'); }
  else if (a === 'demo-logout') { try { sessionStorage.setItem(SESSION_KEY, 'login'); localStorage.removeItem(REMEMBER_KEY); } catch {} session = 'login'; auth = { mode: 'login', errors: {}, values: {}, notice: '', showPassword: false }; closeModal(); render(); }
  else if (a === 'auth-mode') { auth = { mode: id, errors: {}, values: {}, notice: '', showPassword: false }; render(); document.querySelector('#auth-name, #auth-email')?.focus(); }
  else if (a === 'toggle-password') { auth.showPassword = !auth.showPassword; const input = document.querySelector('#auth-password'); if (input) input.type = auth.showPassword ? 'text' : 'password'; b.textContent = auth.showPassword ? 'Hide' : 'Show'; b.setAttribute('aria-pressed', String(auth.showPassword)); }
  else if (a === 'forgot-password') { const { password, ...v } = readAuthForm(); auth.values = v; auth.errors = {}; auth.notice = v.email ? `In the live app we'd email a reset link to ${v.email}.` : 'Enter your email first, then tap Forgot password.'; render(); }
  else if (a === 'open-pinned-agent') {
    selectedPinnedSymbol = id;
    location.hash = 'agents';
    render();

    // Scroll to the pinned agent section
    document.querySelector('#pinned-chat-form')
      ?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
  }

  else if (a === 'select-pinned-agent') {
    selectedPinnedSymbol = id;
    render();
  }

});


document.addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, data = new FormData(f);

  // NEW: Virtual portfolio buying and selling
  if (f.id === 'portfolio-trade-form') {
    const symbol = String(data.get('symbol') || '')
      .trim()
      .toUpperCase();

    const quantity = Number(data.get('quantity'));
    const side = e.submitter?.value;

    if (!symbol) {
      toast('Enter a stock symbol.');
      return;
    }

    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      toast('Enter a valid number of shares.');
      return;
    }

    if (!['buy', 'sell'].includes(side)) {
      toast('Choose Buy or Sell.');
      return;
    }

    try {
      const result = side === 'buy'
        ? await buyStock(symbol, quantity)
        : await sellStock(symbol, quantity);

      wallet = result.portfolio;
      walletError = '';
      state.simulatedTradeCount = (state.simulatedTradeCount || 0) + 1;
      persist();

      if (overlay.innerHTML) {
        closeModal();
      }

      render();

      toast(
        `${side === 'buy' ? 'Bought' : 'Sold'} ` +
        `${quantity} shares of ${symbol}`
      );
    } catch (error) {
      toast(error.message);
    }

    return;
  }

  if (f.id === "pinned-chat-form") {
    const symbol = String(data.get("symbol") || "")
      .trim()
      .toUpperCase();

    const question = String(data.get("text") || "").trim();

    if (!question) return;

    const chat = (pinnedChats[symbol] ||= []);

    // Previous messages only, not the current question
    const history = chat
      .filter(m => !m.typing && m.text)
      .slice(-10)
      .map(m => ({
        role: m.from === "you" ? "user" : "assistant",
        content: m.text
      }));

    const pending = { from: "agent", typing: true };

    chat.push(
      { from: "you", text: question },
      pending
    );

    selectedPinnedSymbol = symbol;
    render();

    try {
      const language = /[\u0600-\u06FF]/.test(question)
        ? "ar"
        : "en";

      const response = await chatWithStockAgent(
        symbol,
        question,
        language,
        history
      );

      Object.assign(pending, {
        typing: false,
        text: response.answer
      });

    } catch (error) {
      Object.assign(pending, {
        typing: false,
        text: `Unable to get a response: ${error.message}`
      });
    }

    if (route() === "agents") {
      render();
      const log = document.querySelector("#pinned-chat-log");
      if (log) log.scrollTop = log.scrollHeight;
    }

    return;
  }


  // EXISTING: Login and signup
  if (f.id === 'login-form' || f.id === 'signup-form') {
    const mode = f.id === 'login-form' ? 'login' : 'signup';
    const v = readAuthForm();
    const check = validateAuth(mode, v);

    if (!check.valid) {
      const { password, ...safe } = v;
      auth = { ...auth, mode, values: safe, errors: check.errors, notice: '' };
      render();

      const pw = document.querySelector('#auth-password');
      if (pw && password) pw.value = password;

      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    const email = v.email.trim().toLowerCase();
    const sameUser = engagement.email === email &&
      engagement.name !== 'Demo investor';

    const name = mode === 'signup'
      ? v.name
      : sameUser
        ? engagement.name
        : (nameFromEmail(email) || 'Investor');

    engagement = sanitizeEngagement({
      ...engagement,
      name,
      email
    });

    session = 'app';

    try {
      sessionStorage.setItem(SESSION_KEY, 'app');

      if (v.remember) {
        localStorage.setItem(REMEMBER_KEY, 'yes');
      }
    } catch {}

    auth = {
      mode: 'login',
      errors: {},
      values: {},
      notice: '',
      showPassword: false
    };

    persist();

    if (!location.hash) location.hash = 'home';

    render();
    loadPinnedAgents();
    if (route() === "home") {
      loadMarketStocks();
    }
    document.querySelector('#main')?.focus();

    toast(
      mode === 'signup'
        ? `Welcome to NUMU, ${engagement.name}.`
        : `Welcome back, ${engagement.name}.`
    );

  } else if (f.id === 'reason-form') {
    const ch = state.challenge;
    const missing = ch.picks.filter(t => !data.get(t));

    if (missing.length) {
      f.querySelector('#reason-error').textContent =
        `Choose a reason for ${missing.join(', ')}.`;
      return;
    }

    ch.picks.forEach(t => {
      ch.reasons[t] = data.get(t);
    });

    ch.status = 'locked';
    markActive();
    persist();
    closeModal();
    render();
    window.scrollTo(0, 0);
    toast('Picks locked in.');

  } else if (f.id === 'agent-form') {
    askAgent(data.get('text'));

  } else if (f.id === 'league-form') {
    const v = validateLeagueName(data.get('name'));

    if (!v.valid) {
      f.querySelector('#league-error').textContent = v.error;
      return;
    }

    const code = makeInviteCode();

    state.leagues.push({
      id: `l-${code}`,
      name: v.name,
      code,
      members: [],
      owner: 'you'
    });

    ui.scope = `l-${code}`;
    persist();
    closeModal();
    render();
    toast(`League created. Share code ${code}.`);

  } else if (f.id === 'join-form') {
    const code = String(data.get('code') || '')
      .trim()
      .toUpperCase();

    const found = joinableLeagues.find(l => l.code === code);

    if (state.leagues.some(l => l.code === code)) {
      f.querySelector('#join-error').textContent =
        'You’re already in that league.';
      return;
    }

    if (!found) {
      f.querySelector('#join-error').textContent =
        'No league uses that code. Check it with the friend who shared it.';
      return;
    }

    state.leagues.push(structuredClone(found));
    ui.scope = found.id;
    persist();
    closeModal();
    render();
    toast(`Joined ${found.name}.`);
  }
});

document.addEventListener('input', e => {
  if (e.target.id === 'market-search') {
    ui.query = e.target.value;

    const list = document.querySelector('#market-list');

    if (list) {
      list.innerHTML = renderQseRows(
        marketStocks,
        ui,
        stocks
      );
    }
  }
});

document.addEventListener('change', e => {
  if (e.target.id === 'market-sort') { ui.sort = e.target.value; render(); document.querySelector('#market-sort')?.focus(); }
  if (e.target.id === 'pick-sort') { ui.pickSort = e.target.value; render(); document.querySelector('#pick-sort')?.focus(); }
});
document.addEventListener('keydown', e => {
  if (!overlay.innerHTML) return;
  if (e.key === 'Escape') { closeModal(); return; }
  if (e.key === 'Tab') {
    const f = [...overlay.querySelectorAll('button:not([disabled]), a[href], input, select')];
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
    else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
  }
});
window.addEventListener('hashchange', () => {
  if (overlay.innerHTML) closeModal();

  render();

  if (route() === "portfolio" && session === "app") {
    loadWallet();
    loadPinnedAgents();
  }

  if (
    session === "app" &&
    ["home", "markets"].includes(route())
  ) {
    loadMarketStocks();
  }

  if (
    session === "app" &&
    ["home", "agents"].includes(route())
  ) {
    loadPinnedAgents();
  }

  window.scrollTo(0, 0);
});
setInterval(() => { const lock = nextLockTime(); document.querySelectorAll('[data-countdown]').forEach(el => { el.textContent = formatCountdown(lock - new Date()); }); }, 30000);
render();
if (route() === "portfolio" && session === "app") {
  loadWallet();
  loadPinnedAgents();
}
if (
  session === "app" &&
  ["home", "markets"].includes(route())
) {
  loadMarketStocks();
}

if (
  session === "app" &&
  ["home", "agents"].includes(route())
) {
  loadPinnedAgents();
}
