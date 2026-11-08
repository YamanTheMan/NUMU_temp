import { icon } from './icons.js';
import { esc } from './views.js';
import { lessons } from './data.js';
import { getAvatarStatus, startLiveLesson, askChartTutor } from './api.js';
import { createChartStage } from './tutor-chart.js';

/**
 * Live lesson with Claire (LiveAvatar by HeyGen, voiced by ElevenLabs).
 * Separate from Musa'id, the text chatbot.
 *
 * Claire's own AI stays quiet. Our server writes what she says, step by step,
 * and every step carries the chart moves to play while she says it. The page
 * starts each chart move when LiveAvatar reports that Claire started speaking
 * that step, so the chart and her voice stay in sync.
 *
 * The page lives in one DOM node that survives app re-renders, so a live video
 * session is never reloaded (or paid for twice).
 */

const COPY = {
  en: {
    placeholder: 'Ask about a Qatari stock, like “How is QNB doing?”',
    chips: ['How is QNB doing?', 'Show me Ooredoo', 'Compare the banks', 'Why do prices swing?'],
    after: name => [`Compare ${name} with the market`, `Show ${name} over five years`, 'Why did it move like that?', 'How is Industries Qatar doing?'],
    fillers: ['Good question. Let me pull that up.', 'Sure, let me show you.', 'Okay, give me a second to draw it.'],
    you: 'You', claire: 'Claire',
    teach: title => `Teach me “${title}” using a real chart.`,
    thinking: name => (name ? `Pulling up ${name}` : 'Preparing your lesson'),
    error: 'I couldn’t prepare that one. Try asking again.',
  },
  ar: {
    placeholder: 'اسأل عن سهم قطري، مثل: «كيف أداء بنك قطر الوطني؟»',
    chips: ['كيف أداء بنك قطر الوطني؟', 'أرني سهم أوريدو', 'قارن بين البنوك', 'لماذا تتقلب الأسعار؟'],
    after: name => [`قارن ${name} بالسوق`, `أرني ${name} خلال خمس سنوات`, 'لماذا تحرك بهذا الشكل؟', 'كيف أداء صناعات قطر؟'],
    fillers: ['سؤال جميل، دعني أعرض لك ذلك.', 'حسناً، لحظة أجهّز لك الرسم.', 'ممتاز، دعني أوضّح لك.'],
    you: 'أنت', claire: 'كلير',
    teach: title => `علّمني درس «${title}» باستخدام رسم بياني حقيقي.`,
    thinking: name => (name ? `جارٍ عرض ${name}` : 'جارٍ تجهيز الدرس'),
    error: 'لم أستطع تجهيز ذلك. حاول مرة أخرى.',
  },
};

// A chart that suits each lesson when the learner picks a topic.
const TOPIC_TICKER = { risk: 'QAMC', diversify: 'QNBK', compounding: 'QIBK', dividends: 'QEWS', 'how-companies-earn': 'ORDS', 'skill-vs-luck': 'QAMC', 'pe-ratio': 'QNBK' };
const CLAIRE_PREVIEW = 'https://static.liveavatar.com/avatars/thumbnails/7b259367428f49138bdaa716565c3636/emotion-curated-20261004/24211c5e-1374-45de-a625-89b992e9c002-612-a433220bf8a0344b.jpg';
const WORDS_PER_SEC = { en: 2.55, ar: 2.05 };
const wait = ms => new Promise(r => setTimeout(r, ms));
const pick = list => list[Math.floor(Math.random() * list.length)];

let node = null;
let chart = null;
const st = {
  lang: 'en', topic: '', status: 'idle', error: '', info: null, infoLoading: false,
  session: null, sdk: null, endsAt: 0, clock: null, run: 0, ticker: null, tickerName: '', history: [],
  speech: null, greetingSeen: false, listening: false, recognizer: null,
};

/* ------------------------------------------------------------------ mount */

export function renderTutor() {
  return '<div id="tutor-slot"></div>';
}

/** Put the persistent tutor page into the freshly rendered slot. */
export function attachTutor(slot) {
  if (!slot) return;
  if (!node) build();
  slot.replaceWith(node);
  chart.resize();
  loadInfo();
}

/** Leaving the page ends a live session, so credits are not wasted. */
export function leaveTutor() {
  stopRun();
  if (st.session || st.status === 'connecting') endLive('idle');
  stopListening();
}

/** Open the tutor on a lesson (from the Learn page). */
export function setTutorTopic(id) {
  st.topic = id || '';
  if (node) node.querySelector('.tt-topic').value = st.topic;
}

function build() {
  node = document.createElement('div');
  node.id = 'tutor-root';
  node.className = 'tt';
  node.innerHTML = `
  <header class="page-head"><div><h1>Live lesson with Claire</h1>
    <p class="lede">Ask about any Qatari company and Claire walks you through its real chart, out loud, in English or Arabic.</p></div>
    <div class="page-actions"><span class="tag">${icon('video', 15)} Live video tutor</span></div></header>
  <div class="tt-grid">
    <section class="tt-left" aria-label="Claire, the video tutor">
      <div class="tt-video" data-status="idle">
        <img class="tt-poster" alt="Claire, NUMU's AI tutor" hidden>
        <video class="tt-feed" playsinline autoplay></video>
        <div class="tt-badge"><i></i><span class="tt-badge-text">CLAIRE</span><b class="tt-clock">3:00</b></div>
        <div class="tt-status"><span class="tt-spinner"></span><span>Connecting you to Claire…</span></div>
        <div class="tt-note"></div>
        <div class="tt-caption" aria-live="polite"></div>
      </div>
      <div class="tt-controls">
        <div class="tt-setup">
          <div class="seg" role="group" aria-label="Lesson language">
            <button type="button" class="is-on" data-tt-lang="en" aria-pressed="true">English</button>
            <button type="button" data-tt-lang="ar" aria-pressed="false" lang="ar">العربية</button>
          </div>
          <select class="tt-topic" aria-label="Lesson topic">
            <option value="">Any topic</option>
            ${lessons.map(l => `<option value="${esc(l.id)}">${esc(l.title)}</option>`).join('')}
          </select>
          <button type="button" class="btn btn-primary tt-start">${icon('play', 16)} Start lesson</button>
        </div>
        <form class="tt-ask" autocomplete="off">
          <button type="button" class="tt-mic" aria-label="Ask by voice" title="Ask by voice"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button>
          <input class="tt-input" name="q" maxlength="300" aria-label="Ask Claire a question">
          <button type="submit" class="tt-send" aria-label="Ask">${icon('arrow-right', 18)}</button>
        </form>
        <div class="tt-chips"></div>
        <p class="fine">${icon('shield', 14)} <span class="tt-fine">Claire explains, never advises. Educational only, not investment advice.</span></p>
      </div>
    </section>
    <section class="tt-right" aria-label="Lesson chart"><div class="tt-stage"></div></section>
  </div>`;

  chart = createChartStage(node.querySelector('.tt-stage'), { lang: st.lang });
  const $ = s => node.querySelector(s);
  st.recognizerOk = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  $('.tt-mic').hidden = !st.recognizerOk;

  node.addEventListener('click', e => {
    const lang = e.target.closest('[data-tt-lang]');
    if (lang && !lang.disabled) return setLang(lang.dataset.ttLang);
    if (e.target.closest('.tt-start')) return st.session ? endLive('idle') : startLive();
    if (e.target.closest('.tt-mic')) return st.listening ? stopListening() : startListening();
    const chip = e.target.closest('[data-tt-q]');
    if (chip) return ask(chip.dataset.ttQ, { ticker: chip.dataset.ttTicker || undefined });
  });
  $('.tt-ask').addEventListener('submit', e => {
    e.preventDefault();
    const input = $('.tt-input');
    const q = input.value.trim();
    if (!q) return input.focus();
    input.value = '';
    ask(q);
  });
  $('.tt-topic').addEventListener('change', e => {
    st.topic = e.target.value;
    if (st.topic && (st.status === 'live' || st.status === 'idle' || st.status === 'off' || st.status === 'ended')) teachTopic();
  });
  window.addEventListener('pagehide', () => { if (st.session) st.session.stop().catch(() => {}); });
  setLang('en', true);
  paint();
}

/* ------------------------------------------------------------------ status + paint */

async function loadInfo() {
  if (st.info || st.infoLoading) return;
  st.infoLoading = true;
  try {
    st.info = await getAvatarStatus();
    if (!st.info?.enabled && st.status === 'idle') st.status = 'off';
  } catch {
    st.info = { enabled: false };
    if (st.status === 'idle') st.status = 'off';
  }
  st.infoLoading = false;
  paint();
}

function paint() {
  if (!node) return;
  const $ = s => node.querySelector(s);
  const video = $('.tt-video');
  video.dataset.status = st.status;
  const poster = $('.tt-poster');
  const preview = st.info?.preview_url || CLAIRE_PREVIEW;
  if (poster.getAttribute('src') !== preview) { poster.src = preview; poster.hidden = false; }
  const minutes = Math.max(1, Math.round((st.info?.max_seconds || 180) / 60));
  const live = st.status === 'live', busy = st.status === 'connecting';
  $('.tt-badge-text').textContent = live ? 'LIVE' : busy ? 'CONNECTING' : 'CLAIRE';
  const note = {
    idle: `${icon('play', 16)} Press Start for a ${minutes}-minute live lesson, or ask below for a captions-only preview.`,
    off: `${icon('info', 16)} The live video isn't available right now. Ask below for a captions-only preview.`,
    ended: `${icon('check', 16)} Lesson time is up. Start another one any time.`,
    error: `${icon('info', 16)} ${esc(st.error || 'Something went wrong. Try again.')}`,
  }[st.status] || '';
  $('.tt-note').innerHTML = note;
  $('.tt-note').hidden = !note;
  const start = $('.tt-start');
  start.disabled = busy || (st.status === 'off');
  start.classList.toggle('tt-end', live);
  start.innerHTML = live ? `${icon('close', 16)} End lesson` : busy ? 'Starting…' : `${icon('play', 16)} Start lesson`;
  node.querySelectorAll('[data-tt-lang]').forEach(b => { b.disabled = live || busy; });
}

function setLang(lang, quiet = false) {
  st.lang = lang === 'ar' ? 'ar' : 'en';
  const $ = s => node.querySelector(s);
  node.querySelectorAll('[data-tt-lang]').forEach(b => {
    const on = b.dataset.ttLang === st.lang;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', String(on));
  });
  const input = $('.tt-input');
  input.placeholder = COPY[st.lang].placeholder;
  input.dir = st.lang === 'ar' ? 'rtl' : 'ltr';
  chart.setLang(st.lang);
  node.querySelectorAll('.tc-empty-title, .tc-empty-body').forEach(el => { el.dir = st.lang === 'ar' ? 'rtl' : 'ltr'; });
  setChips(COPY[st.lang].chips.map(q => ({ q })));
  if (!quiet) stopRun();
}

function setChips(list) {
  const box = node.querySelector('.tt-chips');
  box.dir = st.lang === 'ar' ? 'rtl' : 'ltr';
  box.innerHTML = list.map(c => `<button type="button" class="tt-chip" data-tt-q="${esc(c.q)}" ${c.ticker ? `data-tt-ticker="${esc(c.ticker)}"` : ''}>${esc(c.q)}</button>`).join('');
}

/* ------------------------------------------------------------------ captions */

let captionTimer = null;
function caption(text, { who = 'claire', seconds = 0 } = {}) {
  const video = node.querySelector('.tt-video');
  const box = node.querySelector('.tt-caption');
  clearInterval(captionTimer);
  clearTimeout(box._hide);
  const rtl = /[؀-ۿ]/.test(text);
  box.dir = rtl ? 'rtl' : 'ltr';
  const words = text.split(/\s+/).filter(Boolean);
  box.innerHTML = `<span class="who ${who === 'you' ? 'you' : ''}">${esc(COPY[st.lang][who])}</span>` +
    words.map(w => `<span class="w${seconds ? '' : ' on'}">${esc(w)}</span>`).join(' ');
  video.classList.add('has-caption');
  if (seconds) {
    const spans = box.querySelectorAll('.w');
    const start = performance.now();
    const total = seconds * 1000;
    captionTimer = setInterval(() => {
      const k = Math.ceil(((performance.now() - start) / total) * spans.length);
      spans.forEach((s, i) => s.classList.toggle('on', i < k));
      if (k >= spans.length) clearInterval(captionTimer);
    }, 70);
  }
}
function captionDone(hideAfter = 2600) {
  const box = node.querySelector('.tt-caption');
  clearInterval(captionTimer);
  box.querySelectorAll('.w').forEach(s => s.classList.add('on'));
  clearTimeout(box._hide);
  box._hide = setTimeout(() => node.querySelector('.tt-video').classList.remove('has-caption'), hideAfter);
}

const speakSeconds = text => Math.max(1.6, text.split(/\s+/).length / WORDS_PER_SEC[/[؀-ۿ]/.test(text) ? 'ar' : 'en']);

/* ------------------------------------------------------------------ speech (avatar or preview) */

/**
 * Speak one line. With a live session Claire says it (repeat = exact words);
 * onStart fires when LiveAvatar reports she started, and the promise resolves
 * when she finishes. Without a session it plays as captions only.
 */
function say(text, run, onStart = () => {}) {
  const seconds = speakSeconds(text);
  if (!st.session || st.status !== 'live') {
    onStart(seconds);
    return wait(seconds * 1000 + 250);
  }
  return new Promise(resolve => {
    const item = { text, run, started: false, resolve, onStart: () => onStart(seconds) };
    const finish = () => { if (st.speech === item) st.speech = null; clearTimeout(item.t1); clearTimeout(item.t2); resolve(); };
    item.finish = finish;
    st.speech = item;
    try { st.session.repeat(text); } catch { finish(); return; }
    // If the start event never arrives, carry on so the chart never freezes.
    item.t1 = setTimeout(() => { if (!item.started) { item.started = true; item.onStart(); } }, 4000);
    item.t2 = setTimeout(finish, (seconds * 1.9 + 8) * 1000);
  });
}

function onSpeakStarted() {
  const item = st.speech;
  if (item && !item.started) { item.started = true; item.onStart(); return; }
  if (!item && !st.greetingSeen && st.greeting) {
    // Claire's opening line, spoken by LiveAvatar itself.
    st.greetingSeen = true;
    caption(st.greeting, { seconds: speakSeconds(st.greeting) });
  }
}

function onSpeakEnded() {
  const item = st.speech;
  if (item && item.started) { captionDone(); item.finish(); return; }
  if (!item) { captionDone(); st.greetingDone?.(); }
}

/* ------------------------------------------------------------------ lessons */

function stopRun() {
  st.run++;
  if (st.speech) { st.speech.finish(); st.speech = null; }
  if (st.session && st.status === 'live') { try { st.session.interrupt(); } catch { /* not connected */ } }
  if (chart) chart.clear();
}

function teachTopic() {
  const lesson = lessons.find(l => l.id === st.topic);
  if (!lesson) return;
  ask(COPY[st.lang].teach(lesson.title), { topic: lesson.title, ticker: TOPIC_TICKER[lesson.id] });
}

async function ask(question, { ticker, topic } = {}) {
  question = String(question || '').trim();
  if (!question) return;
  stopListening();
  const run = ++st.run;
  if (st.speech) { st.speech.finish(); st.speech = null; }
  if (st.session && st.status === 'live') { try { st.session.interrupt(); } catch { /* ignore */ } }
  const T = COPY[st.lang];
  caption(question, { who: 'you' });

  const request = askChartTutor({
    question, language: st.lang, ticker, topic,
    context_ticker: st.ticker || undefined,
    history: st.history.slice(-6),
  });
  request.catch(() => {});
  let filler = null;
  if (st.session && st.status === 'live') {
    const line = pick(T.fillers);
    filler = say(line, run, s => caption(line, { seconds: s }));
  }
  if (chart.state === 'live' || chart.state === 'leaving') await chart.clear();
  if (run !== st.run) return;
  chart.thinking(T.thinking(''));

  let lesson;
  try { lesson = await request; } catch (error) {
    if (run !== st.run) return;
    chart.clear();
    caption(`${T.error}${error?.message ? ` (${error.message})` : ''}`);
    captionDone(5000);
    return;
  }
  if (run !== st.run) return;
  if (filler) await filler;
  if (run !== st.run) return;

  if (lesson.chart) chart.load(lesson.chart); else chart.clear();
  st.ticker = lesson.ticker;
  st.tickerName = lesson.chart?.name || st.tickerName;

  const steps = lesson.steps || [];
  for (let i = 0; i < steps.length; i++) {
    if (run !== st.run) return;
    const step = steps[i];
    await say(step.say, run, seconds => {
      if (run !== st.run) return;
      if (lesson.chart) { chart.setStep(i + 1, steps.length, step.tag); chart.play(step.actions); }
      caption(step.say, { seconds });
    });
    if (run !== st.run) return;
    captionDone(6000);
    if (!st.session) await wait(200);
  }
  st.history.push({ role: 'user', content: question.slice(0, 600) }, { role: 'assistant', content: steps.map(s => s.say).join(' ').slice(0, 1100) });
  st.history = st.history.slice(-8);
  await wait(1700);
  if (run !== st.run) return;
  chart.clear();
  if (lesson.chart) setChips(COPY[st.lang].after(lesson.chart.name).map((q, k) => ({ q, ticker: k < 3 ? lesson.ticker : undefined })));
}

/* ------------------------------------------------------------------ live session */

async function startLive() {
  if (st.status === 'connecting' || st.session) return;
  stopRun();
  st.status = 'connecting'; st.error = '';
  paint();
  try {
    const token = await startLiveLesson(st.lang);
    st.sdk = st.sdk || await import('./liveavatar-sdk.js');
    const { LiveAvatarSession, SessionEvent, AgentEventsEnum } = st.sdk;
    const session = new LiveAvatarSession(token.session_token, { voiceChat: { defaultMuted: true }, autoKeepAlive: true });
    st.session = session;
    st.greeting = token.greeting;
    st.greetingSeen = false;
    const video = node.querySelector('.tt-feed');
    session.on(SessionEvent.SESSION_STREAM_READY, () => {
      session.attach(video);
      video.play?.().catch(() => {});
      st.status = 'live';
      startClock(token.max_seconds || 180);
      paint();
      afterReady(session);
    });
    session.on(SessionEvent.SESSION_DISCONNECTED, () => { if (st.session === session) endLive('ended'); });
    session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, onSpeakStarted);
    session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, onSpeakEnded);
    await session.start();
  } catch (error) {
    st.session = null;
    st.status = 'error';
    st.error = error?.message || 'Could not start the live lesson.';
    paint();
  }
}

async function afterReady(session) {
  const run = st.run;
  // Wait for Claire's own greeting (up to 3s to start, 15s to finish).
  const greeted = await Promise.race([
    new Promise(r => { st.greetingDone = () => r(true); }),
    wait(3000).then(() => (st.greetingSeen ? new Promise(r => { st.greetingDone = () => r(true); setTimeout(() => r(true), 12000); }) : false)),
  ]);
  st.greetingDone = null;
  if (st.session !== session || run !== st.run) return;
  if (!greeted && !st.greetingSeen) {
    st.greetingSeen = true;
    await say(st.greeting, run, s => caption(st.greeting, { seconds: s }));
    captionDone();
  }
  if (st.session === session && run === st.run && st.topic) teachTopic();
}

function startClock(seconds) {
  st.endsAt = Date.now() + seconds * 1000;
  clearInterval(st.clock);
  const tick = () => {
    const left = Math.max(0, Math.round((st.endsAt - Date.now()) / 1000));
    const el = node.querySelector('.tt-clock');
    if (el) el.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    if (left <= 0) endLive('ended');
  };
  tick();
  st.clock = setInterval(tick, 1000);
}

function endLive(status = 'idle') {
  const session = st.session;
  st.session = null;
  clearInterval(st.clock);
  if (st.speech) { st.speech.finish(); st.speech = null; }
  if (session) session.stop().catch(() => {});
  const video = node?.querySelector('.tt-feed');
  if (video) { video.pause?.(); video.srcObject = null; }
  st.status = status === 'idle' && st.info && !st.info.enabled ? 'off' : status;
  st.run++;
  chart?.clear();
  paint();
}

/* ------------------------------------------------------------------ voice input (browser speech recognition) */

function startListening() {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Rec) return;
  if (st.speech || (st.session && st.status === 'live')) { stopRun(); }
  const rec = new Rec();
  rec.lang = st.lang === 'ar' ? 'ar-QA' : 'en-US';
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  const input = node.querySelector('.tt-input');
  let finalText = '';
  rec.onresult = e => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      else interim += e.results[i][0].transcript;
    }
    input.value = (finalText + interim).trim();
  };
  rec.onend = () => {
    st.listening = false;
    node.querySelector('.tt-mic').classList.remove('is-on');
    const q = (finalText || input.value).trim();
    if (q) { input.value = ''; ask(q); }
  };
  rec.onerror = () => { st.listening = false; node.querySelector('.tt-mic').classList.remove('is-on'); };
  st.recognizer = rec;
  st.listening = true;
  node.querySelector('.tt-mic').classList.add('is-on');
  try { rec.start(); } catch { st.listening = false; node.querySelector('.tt-mic').classList.remove('is-on'); }
}

function stopListening() {
  if (st.recognizer && st.listening) { try { st.recognizer.stop(); } catch { /* already stopped */ } }
  st.listening = false;
  node?.querySelector('.tt-mic')?.classList.remove('is-on');
}
