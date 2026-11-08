import { icon } from './icons.js';
import { esc } from './views.js';
import { lessons } from './data.js';

/**
 * Live avatar tutor (LiveAvatar by HeyGen). Separate from Musa'id, the text chatbot.
 * t: { status: 'idle' | 'loading' | 'live' | 'ended' | 'error' | 'off', url, error, language, topic, info }
 */
export function renderTutor(t) {
  const name = t.info?.tutor_name || 'Claire';
  const minutes = Math.max(1, Math.round((t.info?.max_seconds || 180) / 60));
  const topic = lessons.find(l => l.id === t.topic);
  const live = t.status === 'live' && t.url;
  const busy = t.status === 'loading';
  const off = t.status === 'off';

  const poster = `<div class="tutor-poster">
      ${t.info?.preview_url ? `<img src="${esc(t.info.preview_url)}" alt="${esc(name)}, NUMU's AI tutor">` : `<div class="tutor-poster-icon">${icon('video', 48)}</div>`}
      <div class="tutor-poster-note">${
        off ? `${icon('info', 16)} The live tutor isn't available right now.`
        : busy ? `${icon('clock', 16)} Connecting you to ${esc(name)}…`
        : t.status === 'ended' ? `${icon('check', 16)} Lesson time is up. Start another one any time.`
        : t.status === 'error' ? `${icon('info', 16)} ${esc(t.error || 'Something went wrong. Try again.')}`
        : `${icon('play', 16)} Press Start to begin a ${minutes}-minute live lesson.`
      }</div>
    </div>`;

  const stage = live
    ? `<iframe class="tutor-frame" src="${esc(t.url)}" title="Live lesson with ${esc(name)}" allow="microphone; camera; autoplay; clipboard-write; fullscreen"></iframe>`
    : poster;

  const langBtn = (id, label) => `<button type="button" class="seg-btn ${t.language === id ? 'is-on' : ''}" data-action="tutor-lang" data-id="${id}" aria-pressed="${t.language === id}" ${live || busy ? 'disabled' : ''}>${label}</button>`;

  return `<div id="tutor-root">
  <header class="page-head"><div><h1>Live lesson with ${esc(name)}</h1>
    <p class="lede">${esc(name)} is NUMU's AI video tutor. She teaches a short lesson out loud and answers your questions by voice, in English or Arabic. For quick typed questions, use Musa'id on the Agents page.</p></div>
    <div class="page-actions"><span class="tag">${icon('video', 15)} Live video tutor</span></div></header>

  <div class="tutor-layout">
    <section class="tutor-stage" aria-label="Tutor video">${stage}</section>

    <aside class="tutor-panel">
      <div class="tutor-step"><span class="tutor-no">1</span><div><strong>Language</strong>
        <div class="seg" role="group" aria-label="Lesson language">${langBtn('en', 'English')}${langBtn('ar', '<span lang="ar">العربية</span>')}</div></div></div>

      <div class="tutor-step"><span class="tutor-no">2</span><div><label for="tutor-topic"><strong>Topic</strong></label>
        <select id="tutor-topic" class="tutor-select" data-tutor-topic ${live || busy ? 'disabled' : ''}>
          <option value="">Let ${esc(name)} choose</option>
          ${lessons.map(l => `<option value="${esc(l.id)}" ${t.topic === l.id ? 'selected' : ''}>${esc(l.title)}</option>`).join('')}
        </select>
        <p class="tutor-hint">${topic ? `When she says hi, say: <em>“Teach me about ${esc(topic.title)}.”</em>` : `She'll suggest a topic, or just ask her anything about investing in Qatar.`}</p></div></div>

      <div class="tutor-step"><span class="tutor-no">3</span><div><strong>${live ? 'You’re live' : 'Start'}</strong>
        ${live
          ? `<p class="tutor-hint">Allow your microphone, then press <em>Chat now</em> in the video and talk.</p><button class="btn btn-ghost wide" data-action="tutor-end">${icon('close', 16)} End lesson</button>`
          : `<button class="btn btn-primary wide" data-action="tutor-start" ${off || busy ? 'disabled' : ''}>${icon('play', 16)} ${busy ? 'Starting…' : 'Start live lesson'}</button>`}
      </div></div>

      <p class="fine">${icon('shield', 14)} Up to ${minutes} minutes per lesson. ${esc(name)} explains, never advises. Educational only, not investment advice.</p>
    </aside>
  </div>
</div>`;
}
