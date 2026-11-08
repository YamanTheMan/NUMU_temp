import { renderCollectibleBadge } from './badge-collection.js';
import { icon, logo } from './icons.js';
import { esc, initials } from './views.js';
import { formatPoints } from './model.js';

const brand = () => `<span class="brand">${logo()}</span>`;

const fieldError = (errors, key) => errors[key] ? `<p class="field-error" id="err-${key}">${icon('info', 14)} ${esc(errors[key])}</p>` : '';
const invalid = (errors, key) => errors[key] ? `aria-invalid="true" aria-describedby="err-${key}"` : '';

/** auth: { mode: 'login' | 'signup', errors, values, notice, showPassword } */
export function renderLogin(engagement, auth = {}) {
  const mode = auth.mode === 'signup' ? 'signup' : 'login';
  const errors = auth.errors || {}, v = auth.values || {};
  const email = v.email ?? engagement.email ?? '';
  const pwType = auth.showPassword ? 'text' : 'password';
  const password = `<div class="field"><div class="label-row"><label for="auth-password">Password</label>${mode === 'login' ? '<button type="button" class="text-btn" data-action="forgot-password">Forgot password?</button>' : ''}</div>
    <div class="pw-wrap"><input id="auth-password" name="password" type="${pwType}" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" placeholder="${mode === 'login' ? 'Your password' : 'At least 8 characters, with a number'}" ${invalid(errors, 'password')}><button type="button" class="pw-toggle" data-action="toggle-password" aria-pressed="${!!auth.showPassword}">${auth.showPassword ? 'Hide' : 'Show'}</button></div>${fieldError(errors, 'password')}</div>`;
  const form = mode === 'login'
    ? `<form id="login-form" novalidate>
        <div class="field"><label for="auth-email">Email</label><input id="auth-email" name="email" type="email" autocomplete="email" placeholder="name@example.com" value="${esc(email)}" ${invalid(errors, 'email')}>${fieldError(errors, 'email')}</div>
        ${password}
        <label class="check"><input type="checkbox" name="remember" ${v.remember ? 'checked' : ''}><span>Keep me logged in on this device</span></label>
        ${auth.notice ? `<p class="auth-notice" role="status">${icon('check', 15)} ${esc(auth.notice)}</p>` : ''}
        <button class="btn btn-primary wide" type="submit">Log in</button>
        <p class="switch-line">New to NUMU? <button type="button" class="text-btn" data-action="auth-mode" data-id="signup">Create an account</button></p>
      </form>`
    : `<form id="signup-form" novalidate>
        <div class="field"><label for="auth-name">Full name</label><input id="auth-name" name="name" type="text" autocomplete="name" placeholder="Your name" maxlength="40" value="${esc(v.name ?? '')}" ${invalid(errors, 'name')}>${fieldError(errors, 'name')}</div>
        <div class="field"><label for="auth-email">Email</label><input id="auth-email" name="email" type="email" autocomplete="email" placeholder="name@example.com" value="${esc(v.email ?? '')}" ${invalid(errors, 'email')}>${fieldError(errors, 'email')}</div>
        ${password}
        <label class="check"><input type="checkbox" name="agree" ${v.agree ? 'checked' : ''} ${invalid(errors, 'agree')}><span>I understand NUMU is for learning. It uses sample prices and never trades real money.</span></label>${fieldError(errors, 'agree')}
        <button class="btn btn-primary wide" type="submit">Create account</button>
        <p class="switch-line">Already have an account? <button type="button" class="text-btn" data-action="auth-mode" data-id="login">Log in</button></p>
      </form>`;
  return `<div class="entry"><header class="entry-top">${brand()}<span class="tag">Demo, Qatar</span></header>
  <main id="main" class="entry-main" tabindex="-1">
    <section class="entry-story"><p class="entry-tagline">Where knowledge grows wealth</p><h1>Learn the Qatar market. Then play it with your friends.</h1>
      <p>Short lessons on how the QSE works, then a daily challenge: pick three Qatari stocks, say why, and climb the leaderboard.</p>
      <ol class="entry-steps"><li><span>1</span><div><strong>Learn</strong><small>4-minute lessons with a quick check</small></div></li><li><span>2</span><div><strong>Pick 3</strong><small>Choose QSE stocks before 9:30 AM</small></div></li><li><span>3</span><div><strong>Review</strong><small>See what the result teaches you</small></div></li><li><span>4</span><div><strong>Ask an agent</strong><small>AI chatbot, company research and a pick coach</small></div></li></ol></section>
    <section class="entry-card" aria-labelledby="auth-title">
      <div class="auth-tabs" role="group" aria-label="Log in or sign up"><button type="button" class="${mode === 'login' ? 'is-on' : ''}" data-action="auth-mode" data-id="login" aria-pressed="${mode === 'login'}">Log in</button><button type="button" class="${mode === 'signup' ? 'is-on' : ''}" data-action="auth-mode" data-id="signup" aria-pressed="${mode === 'signup'}">Create account</button></div>
      <h2 id="auth-title">${mode === 'login' ? 'Welcome back' : 'Start learning for free'}</h2>
      ${form}
      <p class="fine">${icon('shield', 14)} Demo login: any email and an 8+ character password work. Nothing leaves this browser and passwords are never saved.</p>
    </section>
  </main></div>`;
}

export function renderNotifications(engagement) {
  const opts = [
    { id: 'morning', on: engagement.morningEnabled, icon: 'sun', title: 'Morning nudge, 8:00 AM', body: 'Today’s lesson and a reminder that picks lock at 9:30.' },
    { id: 'evening', on: engagement.eveningEnabled, icon: 'moon', title: 'Evening recap, 8:00 PM', body: 'Your round result and where you stand in your league.' },
  ];
  return `<div class="notif">${opts.map(o => `<div class="notif-row">${icon(o.icon, 22)}<div><strong>${o.title}</strong><p>${o.body}</p></div><button class="switch" role="switch" aria-checked="${o.on}" aria-label="${o.title}" data-action="toggle-digest" data-kind="${o.id}"><span></span></button></div>`).join('')}<p class="fine">Preferences are saved in this browser. The demo doesn’t send real notifications.</p></div>`;
}

export function renderProfile(engagement, p, badgeList) {
  return `<div class="profile"><div class="profile-top"><span class="avatar lg">${esc(initials(engagement.name))}</span><div><h3>${esc(engagement.name)}</h3><p class="muted">${engagement.email ? `${esc(engagement.email)}<br>` : ''}Level ${p.level.number}: ${esc(p.level.name)}</p></div></div>
  <div class="level-bar"><div class="bar"><span style="width:${p.level.progress}%"></span></div><small>${p.xp} XP${p.level.next ? `, ${p.level.next.min - p.xp} to ${esc(p.level.next.name)}` : ', top level'}</small></div>
  <div class="profile-stats"><div><strong>${p.completedCount}/${p.totalLessons}</strong><span>Lessons</span></div><div><strong>${p.streak}</strong><span>Day streak</span></div><div><strong>${formatPoints(p.season)}</strong><span>Season points</span></div></div>
  <h4>Badges · ${badgeList.filter(b => b.earned).length} / ${badgeList.length}</h4><ul class="numu-badge-gallery">${badgeList.map(b => `<li>${renderCollectibleBadge(b)}</li>`).join('')}</ul>
  <div class="profile-actions"><button class="btn btn-ghost" data-action="notifications">${icon('bell', 16)} Notifications</button><button class="btn btn-ghost" data-action="demo-unlock">${icon('unlock', 16)} Demo: finish Start here</button><button class="btn btn-ghost" data-action="demo-reset">${icon('refresh', 16)} Reset demo</button><button class="btn btn-ghost" data-action="demo-logout">${icon('log-out', 16)} Log out</button></div></div>`;
}
