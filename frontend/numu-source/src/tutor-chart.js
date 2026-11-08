/**
 * NUMU chart stage: the live chart Claire talks over.
 *
 * Canvas draws the market (glowing line, candles, volume, trend, practice paths)
 * and a camera that zooms and glides. DOM layers draw the text (callouts, tiles,
 * the step chip and the lesson log), so Arabic and English both render cleanly.
 *
 * The server sends exact actions for every spoken step (see chart_lesson.py):
 *   show, zoom, zoom_out, move, marker, trend, volume, range, swings, compare, drivers
 */

const C = {
  bg: '#04100c', teal: '#2ef5c0', tealSoft: 'rgba(46,245,192,', red: '#ff5277', redSoft: 'rgba(255,82,119,',
  gold: '#ffc861', goldSoft: 'rgba(255,200,97,', violet: '#a78bfa', sky: '#5cc8ff', ink: 'rgba(214,255,240,',
};
const SERIES_COLORS = [C.teal, C.violet, C.gold, '#ff8a5c'];
const MONO = 'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace';
const MONTHS = { en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'] };
const TEXT = {
  en: { emptyTitle: 'Charts appear here', emptyBody: 'Ask Claire about a Qatari stock. She draws it, zooms in and explains every move.',
    thinking: 'Pulling up the chart', step: 'STEP', log: 'Lesson log', daily: 'daily candles', weekly: 'weekly closes',
    zoom: 'zoom', paths: 'practice paths', now: 'now', notForecast: 'NOT A FORECAST', source: 'Source: StockAnalysis.com' },
  ar: { emptyTitle: 'هنا تظهر الرسوم البيانية', emptyBody: 'اسأل كلير عن أي سهم قطري. سترسمه وتقرّب الصورة وتشرح كل حركة.',
    thinking: 'جارٍ تجهيز الرسم البياني', step: 'خطوة', log: 'سجل الدرس', daily: 'شمعة يومية', weekly: 'إغلاق أسبوعي',
    zoom: 'تقريب', paths: 'مسار تدريبي', now: 'الآن', notForecast: 'ليس توقعاً', source: 'المصدر: StockAnalysis.com' },
};

const ease = {
  io: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: t => 1 - Math.pow(1 - t, 3),
  outQuint: t => 1 - Math.pow(1 - t, 5),
  back: t => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const wait = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
// Keep numbers like "−19.8%" in reading order inside Arabic text.
const bidi = s => (/[\u0600-\u06FF]/.test(s) ? esc(s).replace(/([+\u2212-]?\d[\d.,]*(?:%|\u00d7)?)/g, '<bdi dir="ltr">$1</bdi>') : esc(s));
const fmt = v => (Math.abs(v) >= 1 ? v.toFixed(2) : v.toFixed(3));

const DRIVER_ICONS = {
  rate: '<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
  loan: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h3"/>',
  gov: '<path d="M3 10 12 4l9 6M5 10v8m4-8v8m6-8v8m4-8v8M3 20h18"/>',
  gas: '<path d="M12 21c4 0 7-2.7 7-6.6 0-3.6-2.6-5.8-4-8.4-.6 2-1.6 3-3 3.6C12.6 6.4 11 4.2 8.6 3c.4 3-1.8 5.2-3 7.4A7 7 0 0 0 5 14.4C5 18.3 8 21 12 21Z"/>',
  factory: '<path d="M3 21V9l6 4V9l6 4V5h6v16Z"/><path d="M7 17h2m4 0h2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18"/>',
  signal: '<path d="M4 20v-3m5 3v-7m5 7V9m5 11V4"/>',
  coins: '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v4c0 1.7 2.7 3 6 3s6-1.3 6-3V7M9 14v3c0 1.7 2.7 3 6 3s6-1.3 6-3v-4c0-1.6-2.4-2.9-5.5-3"/>',
  ship: '<path d="M3 17c2 2 4 2 6 0 2 2 4 2 6 0 2 2 4 2 6 0M5 14l-1-4h16l-1 4M8 10V6h8v4M12 3v3"/>',
  doc: '<path d="M7 3h7l5 5v13H7Z"/><path d="M14 3v5h5M10 13h6m-6 4h6"/>',
  home: '<path d="m3 11 9-7 9 7v9H3Z"/><path d="M10 20v-5h4v5"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/><path d="M3 4h2l2.5 11h11L21 8H7"/>',
  fuel: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M6 9h6M14 11h2a2 2 0 0 1 2 2v4a1.5 1.5 0 0 0 3 0V8l-3-3"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>',
};

export function createChartStage(root, { lang = 'en' } = {}) {
  return new ChartStage(root, lang);
}

class ChartStage {
  constructor(container, lang) {
    this.root = document.createElement('div');
    container.appendChild(this.root);
    this.lang = lang;
    this.tweens = new Set();
    this.callouts = new Set();
    this.particles = [];
    this.t0 = performance.now();
    this.state = 'empty';
    this.sc = this.blankScene();
    this.ambient = { a: 1, sweep: 0, fast: 0 };
    this.display = { price: 0, target: 0 };
    this.build();
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.root);
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  blankScene() {
    return {
      key: null, alpha: 0, reveal: 0, revealing: false, candle: 0, vol: 0, volI: -1, volA: 0,
      cam: { x0: 0, x1: 1, y0: 0, y1: 1 }, focus: { i: 0, a: 0 }, scan: { p: 1 },
      moves: [], markers: [], trend: null, band: null, fan: null, cmp: null, cmpA: 0, mainA: 1,
    };
  }

  /* ---------------------------------------------------------------- DOM */
  build() {
    const T = TEXT[this.lang];
    this.root.classList.add('tc');
    this.root.dataset.state = 'empty';
    this.root.innerHTML = `
      <canvas class="tc-canvas" aria-hidden="true"></canvas>
      <div class="tc-head">
        <div class="tc-id"><span class="tc-logo"><img alt="" hidden><b></b></span>
          <div class="tc-id-text"><strong class="tc-name" dir="auto"></strong><span class="tc-meta" dir="auto"></span></div></div>
        <div class="tc-quote"><div class="tc-price-row"><b class="tc-price">0.00</b><span class="tc-cur">QAR</span></div>
          <div class="tc-quote-sub"><span class="tc-chg"></span><span class="tc-when" dir="auto"></span></div></div>
      </div>
      <div class="tc-bar">
        <div class="tc-bar-left"><div class="tc-ranges"><span data-r="6M">6M</span><span data-r="5Y">5Y</span></div><span class="tc-src">${esc(T.source)}</span></div>
        <div class="tc-step"><i></i><span class="tc-step-n"></span><span class="tc-step-t" dir="auto"></span></div>
      </div>
      <div class="tc-layer" aria-live="polite"></div>
      <div class="tc-drivers" dir="auto"></div>
      <div class="tc-foot">
        <div class="tc-tiles"></div>
        <div class="tc-log"><div class="tc-log-head"><i></i>${esc(T.log)}</div><div class="tc-log-lines"></div></div>
      </div>
      <div class="tc-empty">
        <div class="tc-empty-mark"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 5-6"/></svg></div>
        <strong class="tc-empty-title" dir="auto">${esc(T.emptyTitle)}</strong>
        <p class="tc-empty-body" dir="auto">${esc(T.emptyBody)}</p>
        <div class="tc-think" dir="auto"><span class="tc-think-text"></span><span class="tc-dots"><i></i><i></i><i></i></span></div>
      </div>`;
    const q = s => this.root.querySelector(s);
    this.el = {
      canvas: q('.tc-canvas'), head: q('.tc-head'), bar: q('.tc-bar'), layer: q('.tc-layer'), drivers: q('.tc-drivers'),
      foot: q('.tc-foot'), tiles: q('.tc-tiles'), log: q('.tc-log-lines'), name: q('.tc-name'), meta: q('.tc-meta'),
      logoImg: q('.tc-logo img'), logoTxt: q('.tc-logo b'), price: q('.tc-price'), chg: q('.tc-chg'), when: q('.tc-when'),
      stepN: q('.tc-step-n'), stepT: q('.tc-step-t'), think: q('.tc-think-text'), ranges: q('.tc-ranges'),
    };
    this.ctx = this.el.canvas.getContext('2d');
  }

  setLang(lang) {
    if (lang === this.lang) return;
    this.lang = lang;
    const T = TEXT[lang];
    this.root.querySelector('.tc-empty-title').textContent = T.emptyTitle;
    this.root.querySelector('.tc-empty-body').textContent = T.emptyBody;
    this.root.querySelector('.tc-log-head').lastChild.textContent = T.log;
  }

  resize() {
    const r = this.root.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = r.width; this.H = r.height; this.dpr = dpr;
    this.el.canvas.width = Math.round(r.width * dpr);
    this.el.canvas.height = Math.round(r.height * dpr);
    this.el.canvas.style.width = `${r.width}px`;
    this.el.canvas.style.height = `${r.height}px`;
    const top = this.el.bar.offsetTop + this.el.bar.offsetHeight + 40;
    const bottom = this.el.foot.offsetTop - 30;
    const narrow = r.width < 520;
    this.plot = { l: narrow ? 12 : 20, t: top, r: r.width - (narrow ? 58 : 76), b: Math.max(top + 120, bottom) };
    this.plot.w = this.plot.r - this.plot.l;
    this.plot.h = this.plot.b - this.plot.t;
  }

  /* ---------------------------------------------------------------- tweens */
  tween(obj, props, dur = 800, fn = ease.io, delay = 0) {
    for (const tw of this.tweens) if (tw.obj === obj) for (const k in props) delete tw.to[k];
    return new Promise(resolve => {
      const from = {};
      for (const k in props) from[k] = obj[k];
      this.tweens.add({ obj, from, to: { ...props }, dur, fn, start: performance.now() + delay, resolve });
    });
  }

  stepTweens(now) {
    for (const tw of this.tweens) {
      if (now < tw.start) continue;
      const p = clamp((now - tw.start) / tw.dur, 0, 1);
      const e = tw.fn(p);
      for (const k in tw.to) tw.obj[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * e;
      if (p >= 1) { this.tweens.delete(tw); tw.resolve(); }
    }
  }

  /* ---------------------------------------------------------------- data */
  load(pack) {
    this.pack = pack;
    this.R = {};
    for (const [key, r] of Object.entries(pack.ranges)) {
      this.R[key] = { key, kind: r.kind, dates: r.dates, c: r.c, o: r.o || null, h: r.h || r.c, l: r.l || r.c, v: r.v || null, n: r.c.length };
    }
    const e = this.el;
    e.name.textContent = pack.name;
    e.meta.textContent = `QSE: ${pack.ticker} · ${pack.sector}`;
    e.logoTxt.textContent = pack.ticker.slice(0, 2);
    e.logoImg.hidden = true;
    e.logoImg.onload = () => { e.logoImg.hidden = false; e.logoTxt.hidden = true; };
    e.logoImg.onerror = () => { e.logoImg.hidden = true; e.logoTxt.hidden = false; };
    e.logoTxt.hidden = false;
    e.logoImg.src = `/src/logos/${pack.ticker}.svg`;
    e.tiles.innerHTML = (pack.tiles || []).map(t => `
      <div class="tc-tile" data-k="${esc(t.key)}"><span dir="auto">${esc(t.label)}</span>
        <b class="${t.tone ? `is-${t.tone}` : ''}" data-v="${esc(t.value)}">${esc(t.value)}</b>${t.note ? `<small dir="auto">${esc(t.note)}</small>` : ''}</div>`).join('');
    e.log.innerHTML = '';
    this.resize();
    this.sc = this.blankScene();
    this.clearCallouts();
    this.hideDrivers();
    this.display.price = 0;
  }

  get S() { return this.R?.[this.sc.key]; }

  valueAt(i) {
    const s = this.S; if (!s) return 0;
    const a = clamp(Math.floor(i), 0, s.n - 1), b = clamp(Math.ceil(i), 0, s.n - 1);
    return lerp(s.c[a], s.c[b], i - Math.floor(i));
  }

  X(i) { const c = this.sc.cam; return this.plot.l + ((i - c.x0) / (c.x1 - c.x0)) * this.plot.w; }
  Y(v) { const c = this.sc.cam; return this.plot.b - ((v - c.y0) / (c.y1 - c.y0)) * this.plot.h; }

  fitY(x0, x1, extra = []) {
    const s = this.S;
    let lo = Infinity, hi = -Infinity;
    for (let i = clamp(Math.floor(x0), 0, s.n - 1); i <= clamp(Math.ceil(x1), 0, s.n - 1); i++) {
      lo = Math.min(lo, s.l[i]); hi = Math.max(hi, s.h[i]);
    }
    for (const v of extra) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    const span = Math.max(hi - lo, hi * 0.01);
    return { y0: lo - span * 0.24, y1: hi + span * 0.14 };
  }

  fullCam() {
    const s = this.S;
    const f = this.sc.fan;
    if (f && f.a > 0.05) {
      // Close-up on the last two months plus the month of practice paths.
      const x0 = Math.max(-0.6, s.n - 1 - 48);
      return { x0, x1: s.n - 1 + f.days + 1.2, ...this.fitY(x0, s.n - 1, [...f.p05, ...f.p95]) };
    }
    return { x0: -0.6, x1: s.n - 1 + Math.max(1, s.n * 0.035), ...this.fitY(0, s.n - 1) };
  }

  /* ---------------------------------------------------------------- public API */
  thinking(label) {
    this.setState('thinking');
    this.el.think.textContent = label || TEXT[this.lang].thinking;
    this.tween(this.ambient, { fast: 1 }, 500);
  }

  setStep(i, n, tag) {
    this.el.stepN.textContent = `${TEXT[this.lang].step} ${i}/${n}`;
    this.el.stepT.textContent = tag || '';
    const chip = this.root.querySelector('.tc-step');
    chip.classList.remove('is-pop'); void chip.offsetWidth; chip.classList.add('is-pop');
  }

  /** Run one spoken step's chart actions. */
  async play(actions = []) {
    if (!this.pack || !actions.length) return; // "none": keep what is on screen
    const types = actions.map(a => a.type);
    this.endStepExtras(types);
    for (const action of actions) {
      if (!this.sc.key && action.type !== 'show') await this.show(action.range || '6M', true);
      else if (action.range && action.range !== this.sc.key && action.type !== 'show') await this.show(action.range, true);
      const fn = this[`do_${action.type}`];
      if (fn) {
        const run = fn.call(this, action);
        // Let a zoom settle a little before the highlight that follows it.
        if (action.type === 'zoom' || action.type === 'show') await Promise.race([run, wait(action.type === 'show' ? 650 : 700)]);
      }
    }
  }

  /** Fade the chart away and return to the empty stage. */
  async clear() {
    if (this.state === 'thinking') { this.setState('empty'); this.tween(this.ambient, { fast: 0 }, 600); return; }
    if (this.state === 'empty' || this.state === 'leaving') return this.leaving;
    this.leaving = this.fadeAway();
    return this.leaving;
  }

  async fadeAway() {
    this.setState('leaving');
    this.clearCallouts();
    this.hideDrivers();
    const sc = this.sc;
    const c = sc.cam, mid = (c.x0 + c.x1) / 2, half = (c.x1 - c.x0) / 2;
    await Promise.all([
      this.tween(sc, { alpha: 0, candle: 0, volA: 0, cmpA: 0 }, 900, ease.io),
      this.tween(sc.focus, { a: 0 }, 500),
      this.tween(c, { x0: mid - half * 1.25, x1: mid + half * 1.25 }, 1000, ease.io),
      ...(sc.fan ? [this.tween(sc.fan, { a: 0 }, 600)] : []),
    ]);
    this.sc = this.blankScene();
    this.setState('empty');
    this.tween(this.ambient, { a: 1, fast: 0 }, 900);
  }

  reset() { this.clearCallouts(); this.hideDrivers(); this.sc = this.blankScene(); this.setState('empty'); this.ambient.a = 1; }

  destroy() { cancelAnimationFrame(this.raf); this.ro.disconnect(); this.clearCallouts(); }

  setState(state) { this.state = state; this.root.dataset.state = state; }

  log(text) {
    const line = document.createElement('div');
    line.className = 'tc-log-line';
    line.dir = 'auto';
    line.textContent = `› ${text}`;
    this.el.log.prepend(line);
    while (this.el.log.children.length > 3) this.el.log.lastChild.remove();
  }

  pulseTile(key) {
    const tile = this.el.tiles.querySelector(`[data-k="${key}"]`);
    if (!tile) return;
    tile.classList.remove('is-hot'); void tile.offsetWidth; tile.classList.add('is-hot');
  }

  countTiles() {
    this.el.tiles.querySelectorAll('b[data-v]').forEach((b, k) => {
      const target = b.dataset.v;
      const nums = target.match(/\d+(\.\d+)?/g) || [];
      const start = performance.now() + k * 120;
      const tick = now => {
        const p = clamp((now - start) / 900, 0, 1), e = ease.out(p);
        let i = 0;
        b.textContent = target.replace(/\d+(\.\d+)?/g, m => {
          const d = (m.split('.')[1] || '').length;
          return (parseFloat(nums[i++]) * e).toFixed(d);
        });
        if (p < 1) requestAnimationFrame(tick); else b.textContent = target;
      };
      requestAnimationFrame(tick);
    });
  }

  /* ---------------------------------------------------------------- actions */
  async show(range, quiet = false) {
    const first = !this.sc.key;
    const sc = this.sc;
    if (!first && sc.key === range) { if (!quiet) await this.do_zoom_out(); return; }
    if (!first) {
      this.clearCallouts();
      await Promise.all([this.tween(sc, { alpha: 0, candle: 0, volA: 0 }, 380), this.tween(sc.focus, { a: 0 }, 300)]);
    }
    sc.key = range;
    sc.moves = []; sc.markers = []; sc.trend = null; sc.band = null; sc.fan = null;
    Object.assign(sc.cam, this.fullCam());
    sc.reveal = 0; sc.alpha = 1; sc.revealing = true;
    sc.focus.i = 0; sc.focus.a = 1;
    this.el.ranges.querySelectorAll('span').forEach(s => s.classList.toggle('is-on', s.dataset.r === range));
    if (first) {
      this.setState('live');
      this.tween(this.ambient, { a: 0, fast: 0 }, 600);
      this.countTiles();
    }
    const s = this.S;
    this.log(`${this.pack.ticker} · ${s.n} ${range === '6M' ? TEXT[this.lang].daily : TEXT[this.lang].weekly}`);
    this.scan();
    await this.tween(sc, { reveal: 1 }, first ? 1900 : 1500, ease.io);
    sc.revealing = false;
    sc.focus.i = s.n - 1;
  }

  do_show(a) { return this.show(a.range); }

  scan() { this.sc.scan.p = 0; this.tween(this.sc.scan, { p: 1 }, 900, ease.io); }

  async do_zoom(a) {
    const sc = this.sc;
    const target = { x0: a.i0 - 0.6, x1: a.i1 + 0.6, ...this.fitY(a.i0, a.i1) };
    this.log(`${TEXT[this.lang].zoom} ${this.dateLabel(a.i0)} → ${this.dateLabel(a.i1)}`);
    this.scan();
    await this.tween(sc.cam, target, 1150, ease.io);
  }

  async do_zoom_out() {
    const sc = this.sc;
    await Promise.all([this.tween(sc.cam, this.fullCam(), 1100, ease.io), this.tween(sc.focus, { i: this.S.n - 1, a: 1 }, 1100, ease.io)]);
  }

  async do_move(a) {
    const sc = this.sc;
    const m = { i0: a.i0, i1: a.i1, tone: a.tone, p: 0, a: 1 };
    sc.moves.push(m);
    if (a.i0 === 0 && a.i1 === this.S.n - 1) this.pulseTile('change');
    await this.tween(sc.focus, { i: a.i0, a: 1 }, 420, ease.io);
    const v0 = this.valueAt(a.i0), v1 = this.valueAt(a.i1);
    this.addCallout({ label: a.label, sub: a.sub, tone: a.tone, delay: 250,
      at: () => [(this.X(m.i0) + this.X(m.i1)) / 2, Math.min(this.Y(Math.max(v0, v1)), this.Y(this.peakBetween(m.i0, m.i1))) - 16] });
    this.log(a.sub ? `${a.label} · ${a.sub}` : a.label);
    await Promise.all([this.tween(m, { p: 1 }, 1500, ease.io), this.tween(sc.focus, { i: a.i1 }, 1500, ease.io)]);
    this.burst(this.X(a.i1), this.Y(v1), a.tone);
  }

  peakBetween(i0, i1) {
    const s = this.S; let hi = -Infinity;
    for (let i = Math.max(0, Math.floor(i0)); i <= Math.min(s.n - 1, Math.ceil(i1)); i++) hi = Math.max(hi, s.h[i]);
    return hi;
  }

  async do_marker(a) {
    const sc = this.sc;
    const tone = a.tone || (a.kind === 'low' ? 'down' : a.kind === 'high' ? 'up' : 'gold');
    await this.tween(sc.focus, { i: a.i, a: 1 }, 1000, ease.io);
    const mk = { i: a.i, tone, a: 0, born: performance.now() };
    sc.markers.push(mk);
    this.tween(mk, { a: 1 }, 300);
    const v = this.valueAt(a.i);
    const below = a.kind === 'low';
    this.addCallout({ label: a.label, sub: a.sub, tone, below, at: () => [this.X(mk.i), this.Y(v) + (below ? 22 : -22)] });
    this.burst(this.X(a.i), this.Y(v), tone);
    this.log(a.sub ? `${a.label} · ${a.sub}` : a.label);
  }

  async do_volume(a) {
    const sc = this.sc;
    sc.volI = a.i;
    this.pulseTile('volume');
    sc.vol = 0;
    await this.tween(sc, { volA: 1, vol: 1 }, 1100, ease.out);
    await this.tween(sc.focus, { i: a.i, a: 1 }, 900, ease.io);
    this.addCallout({ label: a.label, sub: a.sub, tone: 'gold', at: () => [this.X(a.i), this.volTop(a.i) - 14] });
    this.log(a.sub ? `${a.label} · ${a.sub}` : a.label);
  }

  async do_trend(a) {
    const sc = this.sc;
    const tr = { a: a.a, b: a.b, tone: a.tone, p: 0, al: 1 };
    sc.trend = tr;
    const n = this.S.n;
    this.addCallout({ label: a.label, tone: a.tone, delay: 1200, at: () => [this.X(n - 1) - 30, this.Y(Math.exp(tr.a + tr.b * (n - 1))) - 18] });
    this.log(a.label);
    await this.tween(tr, { p: 1 }, 1600, ease.io);
  }

  async do_range(a) {
    const sc = this.sc;
    const s = this.S;
    sc.band = { lo: s.c[a.lo], hi: s.c[a.hi], ilo: a.lo, ihi: a.hi, a: 0 };
    this.pulseTile('range');
    await this.tween(sc.band, { a: 1 }, 700);
    this.addCallout({ label: a.label, tone: 'teal', at: () => [this.plot.l + this.plot.w * 0.3, this.Y(sc.band.hi) - 12] });
    this.log(a.label);
    await this.tween(sc.focus, { i: a.hi, a: 1 }, 800, ease.io);
    await wait(300);
    await this.tween(sc.focus, { i: a.lo }, 1000, ease.io);
  }

  async do_swings(a) {
    const sc = this.sc;
    if (sc.key !== '6M') await this.show('6M', true);
    const s = this.S;
    const paths = this.pack.swings.paths;
    const days = this.pack.swings.days;
    const med = [], p10 = [], p90 = [], p05 = [], p95 = [];
    for (let k = 0; k <= days; k++) {
      const col = paths.map(p => p[k]).sort((x, y) => x - y);
      const q = f => col[Math.min(col.length - 1, Math.floor(col.length * f))];
      med.push(q(0.5)); p10.push(q(0.1)); p90.push(q(0.9)); p05.push(q(0.04)); p95.push(q(0.96));
    }
    sc.fan = { paths, days, med, p10, p90, p05, p95, p: 0, a: 1, labelA: 0 };
    this.pulseTile('swings');
    await Promise.all([this.tween(sc.cam, this.fullCam(), 1100, ease.io), this.tween(sc.focus, { i: s.n - 1, a: 1 }, 900, ease.io)]);
    this.log(`${paths.length} ${TEXT[this.lang].paths} × ${days}d · ${a.label}`);
    const zoneX = () => (this.X(s.n - 1) + this.plot.r) / 2;
    this.addCallout({ label: a.label, sub: a.sub, tone: 'warn', at: () => [zoneX(), this.plot.t + 34] });
    await this.tween(sc.fan, { p: 1 }, 2400, ease.io);
    this.tween(sc.fan, { labelA: 1 }, 500);
  }

  async do_compare(a) {
    const sc = this.sc;
    const group = this.pack.compare?.[a.group];
    if (!group) return;
    if (sc.key !== '6M') {
      await this.tween(sc, { mainA: 0 }, 300);
      sc.key = '6M'; sc.moves = []; sc.markers = []; sc.trend = null; sc.band = null; sc.fan = null;
      Object.assign(sc.cam, this.fullCam());
      sc.reveal = 1; sc.revealing = false;
      this.el.ranges.querySelectorAll('span').forEach(s => s.classList.toggle('is-on', s.dataset.r === '6M'));
    }
    const all = group.series.flatMap(s => s.values);
    const lo = Math.min(0, ...all), hi = Math.max(0, ...all), span = Math.max(hi - lo, 2);
    sc.cmp = { title: group.title, series: group.series.map((s, k) => ({ ...s, p: 0, color: s.ticker === 'AVG' ? '#ffffff' : SERIES_COLORS[k % 4] })),
      y0: lo - span * 0.14, y1: hi + span * 0.16 };
    this.clearCallouts();
    await Promise.all([this.tween(sc, { mainA: 0.12, cmpA: 1 }, 600), this.tween(sc.focus, { a: 0 }, 400), this.tween(sc.cam, this.fullCam(), 800)]);
    this.addCallout({ label: group.title, tone: 'teal', fixed: true, at: () => [this.plot.l + 8, this.plot.t + 6] });
    this.log(`${group.series.length} × 0% → ${group.title}`);
    const n = this.S.n;
    sc.cmp.series.forEach((s, k) => {
      this.tween(s, { p: 1 }, 1700, ease.io, k * 260).then(() => {
        if (sc.cmp?.series !== undefined && this.sc === sc) {
          const v = s.values[n - 1];
          s.labelEl = this.addCallout({ label: `${s.label} ${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}%`, tone: k === 0 ? 'teal' : 'plain', color: s.color, side: true,
            at: () => [this.X(n - 1) + 6, this.cmpY(v) + (s.nudge || 0)] });
          this.spreadLabels();
        }
      });
    });
    await wait(1700 + sc.cmp.series.length * 260);
  }

  spreadLabels() {
    const cmp = this.sc.cmp; if (!cmp) return;
    const n = this.S.n;
    const items = cmp.series.filter(s => s.labelEl).map(s => ({ s, y: this.cmpY(s.values[n - 1]) })).sort((a, b) => a.y - b.y);
    let last = -Infinity;
    for (const it of items) { const y = Math.max(it.y, last + 24); it.s.nudge = y - it.y; last = y; }
  }

  cmpY(v) { const c = this.sc.cmp; return this.plot.b - ((v - c.y0) / (c.y1 - c.y0)) * this.plot.h; }

  do_drivers(a) {
    const box = this.el.drivers;
    box.dir = this.lang === 'ar' ? 'rtl' : 'ltr';
    box.classList.toggle('is-ar', this.lang === 'ar');
    box.innerHTML = `<div class="tc-drivers-title" dir="auto">${esc(a.title)}</div>` + a.items.map((it, k) => `
      <div class="tc-driver" style="--d:${k * 160 + 150}ms"><span class="tc-driver-icon"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${DRIVER_ICONS[it.icon] || DRIVER_ICONS.globe}</svg></span><span dir="auto">${esc(it.label)}</span></div>`).join('');
    box.classList.remove('is-in'); void box.offsetWidth; box.classList.add('is-in');
    this.log(`${a.title}: ${a.items.map(i => i.label).join(', ')}`);
    return wait(600);
  }

  hideDrivers() { this.el.drivers.classList.remove('is-in'); }

  /** Fade out what the previous step added, unless this step continues it. */
  endStepExtras(types) {
    const sc = this.sc;
    this.clearCallouts();
    if (!types.includes('drivers')) this.hideDrivers();
    for (const m of sc.moves) this.tween(m, { a: 0 }, 450).then(() => { sc.moves = sc.moves.filter(x => x !== m); });
    for (const mk of sc.markers) this.tween(mk, { a: 0 }, 450).then(() => { sc.markers = sc.markers.filter(x => x !== mk); });
    if (sc.trend) { const tr = sc.trend; this.tween(tr, { al: 0 }, 450).then(() => { if (sc.trend === tr) sc.trend = null; }); }
    if (sc.band) { const b = sc.band; this.tween(b, { a: 0 }, 450).then(() => { if (sc.band === b) sc.band = null; }); }
    if (sc.volA > 0 && !types.includes('volume')) this.tween(sc, { volA: 0 }, 500);
    if (sc.fan && !types.includes('swings')) {
      const f = sc.fan;
      this.tween(f, { a: 0, labelA: 0 }, 500).then(() => { if (sc.fan === f) { sc.fan = null; if (sc.key) this.tween(sc.cam, this.fullCam(), 900); } });
    }
    if (sc.cmp && !types.includes('compare')) {
      const cmp = sc.cmp;
      this.tween(sc, { cmpA: 0, mainA: 1 }, 600).then(() => { if (sc.cmp === cmp) sc.cmp = null; });
      this.tween(sc.focus, { a: 1 }, 600);
    }
  }

  /* ---------------------------------------------------------------- callouts */
  addCallout({ label, sub, tone = 'teal', at, delay = 0, below = false, side = false, fixed = false, color }) {
    const el = document.createElement('div');
    el.className = `tc-callout tone-${tone}${below ? ' is-below' : ''}${side ? ' is-side' : ''}${fixed ? ' is-fixed' : ''}${/[\u0600-\u06FF]/.test(label + (sub || '')) ? ' is-ar' : ''}`;
    if (color) el.style.setProperty('--c', color);
    el.innerHTML = `<b dir="auto">${bidi(label)}</b>${sub ? `<small dir="auto">${bidi(sub)}</small>` : ''}`;
    this.el.layer.appendChild(el);
    const co = { el, at, below, side, fixed, w: 0, h: 0 };
    this.callouts.add(co);
    setTimeout(() => el.classList.add('is-in'), 30 + delay);
    return co;
  }

  clearCallouts() {
    for (const co of this.callouts) {
      co.el.classList.remove('is-in');
      co.el.classList.add('is-out');
      setTimeout(() => co.el.remove(), 350);
    }
    this.callouts.clear();
  }

  placeCallouts() {
    for (const co of this.callouts) {
      if (!co.w) { co.w = co.el.offsetWidth; co.h = co.el.offsetHeight; }
      let [x, y] = co.at();
      if (co.fixed) { co.el.style.transform = `translate(${x}px, ${y}px)`; continue; }
      if (co.side) {
        x = Math.min(x, this.W - co.w - 4);
        y = clamp(y - co.h / 2, this.plot.t, this.plot.b - co.h);
      } else {
        x = clamp(x - co.w / 2, 6, this.W - co.w - 6);
        y = co.below ? clamp(y, this.plot.t, this.plot.b - co.h) : clamp(y - co.h, this.plot.t - 6, this.plot.b - co.h);
      }
      co.el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    }
  }

  /* ---------------------------------------------------------------- particles */
  burst(x, y, tone) {
    const col = tone === 'down' ? [255, 82, 119] : tone === 'gold' ? [255, 200, 97] : [46, 245, 192];
    for (let k = 0; k < 26; k++) {
      const ang = Math.random() * Math.PI * 2, sp = 0.6 + Math.random() * 2.4;
      this.particles.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 0.4, life: 1, col, r: 0.8 + Math.random() * 1.6 });
    }
  }

  /* ---------------------------------------------------------------- render */
  loop(now) {
    this.raf = requestAnimationFrame(this.loop);
    if (!this.W) { this.resize(); if (!this.W) return; }
    this.stepTweens(now);
    const t = (now - this.t0) / 1000;
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawBackground(ctx, t);
    if (this.ambient.a > 0.01) this.drawAmbient(ctx, t);
    if (this.S && this.sc.alpha > 0.005) this.drawScene(ctx, t);
    this.drawParticles(ctx);
    this.placeCallouts();
    this.updateQuote();
  }

  drawBackground(ctx, t) {
    const { W, H } = this;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W * 0.62, H * 0.58, 10, W * 0.62, H * 0.58, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(24,120,94,0.30)');
    g.addColorStop(0.45, 'rgba(10,48,38,0.18)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(120,255,214,0.035)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = (this.plot.l % 40) + 0.5; x < W; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = 0.5; y < H; y += 40) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
  }

  drawAmbient(ctx, t) {
    const a = this.ambient.a, P = this.plot;
    const speed = lerp(0.18, 0.9, this.ambient.fast);
    ctx.save();
    ctx.globalAlpha = a;
    // a calm "ghost" market line
    ctx.beginPath();
    for (let k = 0; k <= 120; k++) {
      const x = P.l + (k / 120) * P.w;
      const u = k / 18 + t * 0.35;
      const y = P.t + P.h * 0.62 + Math.sin(u) * P.h * 0.07 + Math.sin(u * 2.3 + 1.3) * P.h * 0.04 + Math.sin(u * 0.7) * P.h * 0.06 - (k / 120) * P.h * 0.1;
      k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = 'rgba(46,245,192,0.16)';
    ctx.lineWidth = 2;
    ctx.shadowColor = C.teal; ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.shadowBlur = 0;
    // sweeping beam
    const sx = P.l + (((t * speed) % 1.25) / 1.25) * (P.w + 80) - 40;
    this.drawBeam(ctx, sx, 0.55 * a);
    ctx.restore();
  }

  drawBeam(ctx, x, a, label) {
    const P = this.plot, w = 28;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, 'rgba(46,245,192,0)');
    g.addColorStop(0.18, `rgba(46,245,192,${0.20 * a})`);
    g.addColorStop(0.5, `rgba(46,245,192,${0.05 * a})`);
    g.addColorStop(0.82, `rgba(46,245,192,${0.20 * a})`);
    g.addColorStop(1, 'rgba(46,245,192,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - w / 2, P.t - 8, w, P.h + 8);
    const v = ctx.createLinearGradient(0, P.t, 0, P.b);
    v.addColorStop(0, `rgba(150,255,226,${0.85 * a})`);
    v.addColorStop(0.5, `rgba(46,245,192,${0.35 * a})`);
    v.addColorStop(1, 'rgba(46,245,192,0)');
    ctx.strokeStyle = v;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - w / 2 + 0.5, P.t - 8); ctx.lineTo(x - w / 2 + 0.5, P.b);
    ctx.moveTo(x + w / 2 - 0.5, P.t - 8); ctx.lineTo(x + w / 2 - 0.5, P.b);
    ctx.stroke();
    ctx.restore();
    if (label && a > 0.2) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, a);
      ctx.font = `600 10.5px ${MONO}`;
      const tw = ctx.measureText(label).width + 14;
      this.roundRect(ctx, x - tw / 2, P.t - 26, tw, 18, 4);
      ctx.fillStyle = 'rgba(4,20,16,0.92)'; ctx.fill();
      ctx.strokeStyle = 'rgba(46,245,192,0.75)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#cffff0'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, x, P.t - 17);
      ctx.restore();
    }
  }

  drawScene(ctx, t) {
    const sc = this.sc, s = this.S, P = this.plot;
    const A = sc.alpha;
    const span = sc.cam.x1 - sc.cam.x0;
    const targetCandle = s.kind === 'ohlc' && span < 78 && !sc.revealing ? 1 : 0;
    sc.candle += (targetCandle - sc.candle) * 0.08;
    const headIdx = sc.reveal * (s.n - 1);
    if (sc.revealing) sc.focus.i = headIdx;

    this.drawAxes(ctx, A * (1 - sc.cmpA));

    ctx.save();
    ctx.beginPath(); ctx.rect(P.l - 2, P.t - 30, P.w + 4, P.h + 32); ctx.clip();

    if (sc.band) this.drawBand(ctx, A);
    if (sc.volA > 0.01 && s.v) this.drawVolume(ctx, A * sc.volA * sc.mainA);

    const mainA = A * sc.mainA;
    const i0 = clamp(Math.floor(sc.cam.x0) - 1, 0, s.n - 1);
    const iEnd = Math.min(headIdx, Math.ceil(sc.cam.x1) + 1, s.n - 1);
    if (iEnd > i0) {
      this.drawArea(ctx, i0, iEnd, mainA * (1 - sc.candle * 0.55));
      this.drawLine(ctx, i0, iEnd, mainA * (1 - sc.candle * 0.6), C.teal, 2.2, 16);
    }
    if (sc.candle > 0.02) this.drawCandles(ctx, mainA * sc.candle, i0, Math.floor(iEnd));
    for (const m of sc.moves) this.drawMove(ctx, m, A * m.a * sc.mainA);
    if (sc.trend) this.drawTrend(ctx, sc.trend, A * sc.trend.al);
    if (sc.fan) this.drawFan(ctx, sc.fan, A * sc.fan.a, t);
    if (sc.cmp && sc.cmpA > 0.01) this.drawCompare(ctx, A * sc.cmpA);
    for (const mk of sc.markers) this.drawMarker(ctx, mk, A * mk.a * sc.mainA, t);
    if (sc.scan.p < 1) {
      const x = P.l + sc.scan.p * P.w;
      const g = ctx.createLinearGradient(x - 90, 0, x, 0);
      g.addColorStop(0, 'rgba(46,245,192,0)'); g.addColorStop(1, `rgba(46,245,192,${0.16 * (1 - sc.scan.p)})`);
      ctx.fillStyle = g; ctx.fillRect(x - 90, P.t, 90, P.h);
    }
    ctx.restore();
    if (sc.cmp && sc.cmpA > 0.01) this.drawCompareAxis(ctx, A * sc.cmpA);

    // beam + orb + axis tags
    const fa = sc.focus.a * A * (1 - sc.cmpA);
    const lastV = s.c[s.n - 1];
    if (sc.cmpA < 0.9 && !sc.revealing) this.axisTag(ctx, this.Y(lastV), fmt(lastV), C.teal, true, A * (1 - sc.cmpA));
    if (fa > 0.01) {
      const fi = clamp(sc.focus.i, 0, s.n - 1);
      const x = this.X(fi), y = this.Y(this.valueAt(fi));
      if (x > P.l - 20 && x < P.r + 20) {
        this.drawBeam(ctx, x, fa * 0.9, this.dateLabel(Math.round(fi)));
        ctx.save();
        ctx.globalAlpha = fa * 0.5;
        ctx.setLineDash([3, 4]);
        ctx.strokeStyle = C.gold; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(P.r, y); ctx.stroke();
        ctx.restore();
        if (Math.abs(this.valueAt(fi) - lastV) / lastV > 0.004 || sc.revealing) this.axisTag(ctx, y, fmt(this.valueAt(fi)), C.gold, false, fa);
        this.drawOrb(ctx, x, y, fa, t);
      }
    }
    if (sc.fan && sc.fan.labelA > 0.01) {
      const n = s.n - 1, f = sc.fan;
      this.axisTag(ctx, this.Y(f.p90[f.days]), fmt(f.p90[f.days]), C.teal, false, A * f.a * f.labelA);
      this.axisTag(ctx, this.Y(f.p10[f.days]), fmt(f.p10[f.days]), C.red, false, A * f.a * f.labelA);
      this.axisTag(ctx, this.Y(f.med[f.days]), fmt(f.med[f.days]), C.gold, false, A * f.a * f.labelA);
      void n;
    }
  }

  dateLabel(i) {
    const s = this.S; if (!s) return '';
    const d = s.dates[clamp(i, 0, s.n - 1)];
    const [y, m, day] = d.split('-').map(Number);
    const mon = MONTHS[this.lang][m - 1];
    return s.key === '5Y' ? `${mon} ${y}` : `${day} ${mon}`;
  }

  drawAxes(ctx, a) {
    if (a < 0.01) return;
    const P = this.plot, sc = this.sc, s = this.S;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `500 10.5px ${MONO}`;
    ctx.textBaseline = 'middle';
    // y ticks
    const step = niceStep((sc.cam.y1 - sc.cam.y0) / 5);
    ctx.strokeStyle = 'rgba(120,255,214,0.07)';
    ctx.fillStyle = 'rgba(200,255,236,0.42)';
    ctx.textAlign = 'left';
    ctx.beginPath();
    for (let v = Math.ceil(sc.cam.y0 / step) * step; v <= sc.cam.y1; v += step) {
      const y = Math.round(this.Y(v)) + 0.5;
      if (y < P.t - 4 || y > P.b) continue;
      ctx.moveTo(P.l, y); ctx.lineTo(P.r, y);
      ctx.fillText(v.toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0), P.r + 12, y);
    }
    ctx.stroke();
    // x labels
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(200,255,236,0.38)';
    const span = sc.cam.x1 - sc.cam.x0;
    let lastX = -999;
    for (let i = Math.max(1, Math.ceil(sc.cam.x0)); i <= Math.min(s.n - 1, Math.floor(sc.cam.x1)); i++) {
      const [y, m, d] = s.dates[i].split('-').map(Number);
      const [py, pm] = s.dates[i - 1].split('-').map(Number);
      let label = null;
      if (s.key === '5Y') {
        if (span > 70) { if (y !== py) label = String(y); }
        else if (m !== pm && (m - 1) % 3 === 0) label = `${MONTHS[this.lang][m - 1]} ${String(y).slice(2)}`;
      } else if (span > 34) { if (m !== pm) label = MONTHS[this.lang][m - 1]; }
      else if (i % 5 === 0) label = `${d} ${MONTHS[this.lang][m - 1]}`;
      if (!label) continue;
      const x = this.X(i);
      if (x - lastX < 46) continue;
      lastX = x;
      ctx.fillText(label, x, P.b + 12);
      ctx.fillRect(x - 0.5, P.b - 3, 1, 3);
    }
    ctx.restore();
  }

  linePath(ctx, i0, i1, f = i => this.valueAt(i)) {
    ctx.beginPath();
    ctx.moveTo(this.X(i0), this.Y(f(i0)));
    for (let i = Math.floor(i0) + 1; i < i1; i++) ctx.lineTo(this.X(i), this.Y(f(i)));
    ctx.lineTo(this.X(i1), this.Y(f(i1)));
  }

  drawLine(ctx, i0, i1, a, color, width, glow, additive = true) {
    if (a < 0.01) return;
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.globalAlpha = a;
    ctx.globalCompositeOperation = additive ? 'lighter' : 'source-over';
    this.linePath(ctx, i0, i1);
    ctx.strokeStyle = color; ctx.lineWidth = width * 3.2; ctx.globalAlpha = a * 0.16;
    ctx.shadowColor = color; ctx.shadowBlur = glow;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = a;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.restore();
  }

  drawArea(ctx, i0, i1, a) {
    if (a < 0.01) return;
    const P = this.plot;
    ctx.save();
    this.linePath(ctx, i0, i1);
    ctx.lineTo(this.X(i1), P.b); ctx.lineTo(this.X(i0), P.b); ctx.closePath();
    const g = ctx.createLinearGradient(0, P.t, 0, P.b);
    g.addColorStop(0, `rgba(46,245,192,${0.20 * a})`);
    g.addColorStop(0.7, `rgba(46,245,192,${0.04 * a})`);
    g.addColorStop(1, 'rgba(46,245,192,0)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }

  drawCandles(ctx, a, i0, i1) {
    const s = this.S;
    const pw = this.plot.w / (this.sc.cam.x1 - this.sc.cam.x0);
    const bw = clamp(pw * 0.6, 1.5, 16);
    ctx.save();
    ctx.globalAlpha = a;
    for (let i = i0; i <= i1; i++) {
      const up = s.c[i] >= s.o[i];
      const col = up ? C.teal : C.red;
      const x = this.X(i);
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, this.Y(s.h[i])); ctx.lineTo(x, this.Y(s.l[i])); ctx.stroke();
      const yt = this.Y(Math.max(s.o[i], s.c[i])), yb = this.Y(Math.min(s.o[i], s.c[i]));
      ctx.shadowColor = col; ctx.shadowBlur = 8;
      ctx.fillRect(x - bw / 2, yt, bw, Math.max(1.2, yb - yt));
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  volTop(i) {
    const s = this.S, P = this.plot;
    const max = Math.max(...s.v);
    return P.b - (s.v[i] / max) * P.h * 0.26 * this.sc.vol;
  }

  drawVolume(ctx, a) {
    const s = this.S, P = this.plot, sc = this.sc;
    const pw = P.w / (sc.cam.x1 - sc.cam.x0);
    const bw = clamp(pw * 0.62, 1, 14);
    ctx.save();
    for (let i = clamp(Math.floor(sc.cam.x0), 0, s.n - 1); i <= clamp(Math.ceil(sc.cam.x1), 0, s.n - 1); i++) {
      const x = this.X(i);
      const grow = clamp(sc.vol * 1.6 - (i / s.n) * 0.6, 0, 1);
      const h = (s.v[i] / Math.max(...s.v)) * P.h * 0.26 * grow;
      const hot = i === sc.volI;
      const up = !s.o || s.c[i] >= s.o[i];
      ctx.globalAlpha = a * (hot ? 1 : 0.42);
      ctx.fillStyle = hot ? C.gold : up ? C.teal : C.red;
      if (hot) { ctx.shadowColor = C.gold; ctx.shadowBlur = 18; }
      ctx.fillRect(x - bw / 2, P.b - h, bw, h);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  drawMove(ctx, m, a) {
    if (a < 0.01) return;
    const P = this.plot;
    const col = m.tone === 'down' ? C.red : C.teal;
    const soft = m.tone === 'down' ? C.redSoft : C.tealSoft;
    const x0 = this.X(m.i0), x1 = this.X(m.i0 + (m.i1 - m.i0) * m.p);
    ctx.save();
    const g = ctx.createLinearGradient(0, P.t, 0, P.b);
    g.addColorStop(0, `${soft}${0.0})`); g.addColorStop(0.5, `${soft}${0.11 * a})`); g.addColorStop(1, `${soft}${0.02 * a})`);
    ctx.fillStyle = g;
    ctx.fillRect(x0, P.t, x1 - x0, P.h);
    ctx.strokeStyle = `${soft}${0.5 * a})`;
    ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(x0, P.t); ctx.lineTo(x0, P.b); ctx.moveTo(x1, P.t); ctx.lineTo(x1, P.b); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    const end = m.i0 + (m.i1 - m.i0) * m.p;
    if (end > m.i0) this.drawLine(ctx, m.i0, end, a, col, 3.2, 22, false);
    // start dot
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x0, this.Y(this.valueAt(m.i0)), 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  drawTrend(ctx, tr, a) {
    if (a < 0.01) return;
    const n = this.S.n;
    const end = (n - 1) * tr.p;
    if (end <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.setLineDash([7, 6]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = C.gold;
    ctx.shadowColor = C.gold; ctx.shadowBlur = 12;
    this.linePath(ctx, 0, end, i => Math.exp(tr.a + tr.b * i));
    ctx.stroke();
    ctx.restore();
  }

  drawBand(ctx, A) {
    const b = this.sc.band, P = this.plot;
    const a = A * b.a;
    if (a < 0.01) return;
    const y0 = this.Y(b.hi), y1 = this.Y(b.lo);
    ctx.save();
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, `rgba(46,245,192,${0.10 * a})`); g.addColorStop(1, `rgba(255,82,119,${0.08 * a})`);
    ctx.fillStyle = g;
    ctx.fillRect(P.l, y0, P.w, y1 - y0);
    ctx.setLineDash([5, 5]); ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(46,245,192,${0.7 * a})`; ctx.beginPath(); ctx.moveTo(P.l, y0); ctx.lineTo(P.r, y0); ctx.stroke();
    ctx.strokeStyle = `rgba(255,82,119,${0.7 * a})`; ctx.beginPath(); ctx.moveTo(P.l, y1); ctx.lineTo(P.r, y1); ctx.stroke();
    ctx.restore();
    this.axisTag(ctx, y0, fmt(b.hi), C.teal, false, a);
    this.axisTag(ctx, y1, fmt(b.lo), C.red, false, a);
  }

  drawFan(ctx, f, a, t) {
    if (a < 0.01) return;
    const s = this.S, P = this.plot, n = s.n - 1;
    const x0 = this.X(n);
    // the "after today" zone
    ctx.save();
    const zg = ctx.createLinearGradient(x0, 0, P.r, 0);
    zg.addColorStop(0, `rgba(255,200,97,${0.07 * a})`); zg.addColorStop(1, `rgba(255,200,97,${0.015 * a})`);
    ctx.fillStyle = zg; ctx.fillRect(x0, P.t, P.r - x0, P.h);
    ctx.strokeStyle = `rgba(255,200,97,${0.35 * a})`;
    ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(x0, P.t); ctx.lineTo(x0, P.b); ctx.stroke();
    ctx.setLineDash([]);
    // envelope
    const reach = f.days * f.p;
    ctx.beginPath();
    for (let k = 0; k <= reach; k++) ctx.lineTo(this.X(n + k), this.Y(f.p90[k]));
    for (let k = Math.floor(reach); k >= 0; k--) ctx.lineTo(this.X(n + k), this.Y(f.p10[k]));
    ctx.closePath();
    ctx.fillStyle = `rgba(46,245,192,${0.06 * a})`;
    ctx.fill();
    // paths
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 1;
    const start = f.paths[0][0];
    f.paths.forEach((p, k) => {
      const local = clamp(f.p * 1.25 - (k / f.paths.length) * 0.25, 0, 1) * f.days;
      if (local <= 0) return;
      const up = p[f.days] >= start;
      ctx.strokeStyle = up ? `rgba(46,245,192,${0.34 * a})` : `rgba(255,82,119,${0.32 * a})`;
      ctx.beginPath();
      ctx.moveTo(x0, this.Y(p[0]));
      for (let j = 1; j <= Math.floor(local); j++) ctx.lineTo(this.X(n + j), this.Y(p[j]));
      const fr = local - Math.floor(local), j = Math.floor(local);
      if (fr > 0 && j < f.days) ctx.lineTo(this.X(n + j + fr), this.Y(lerp(p[j], p[j + 1], fr)));
      ctx.stroke();
      if (local >= f.days - 0.01) { ctx.fillStyle = ctx.strokeStyle; ctx.fillRect(this.X(n + f.days) - 1, this.Y(p[f.days]) - 1, 2, 2); }
    });
    // median
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = C.gold;
    ctx.shadowColor = C.gold; ctx.shadowBlur = 16;
    ctx.beginPath();
    for (let k = 0; k <= reach; k++) ctx.lineTo(this.X(n + k), this.Y(f.med[Math.min(k, f.days)]));
    ctx.stroke();
    ctx.restore();
    void t;
  }

  drawCompareAxis(ctx, a) {
    const cmp = this.sc.cmp, P = this.plot;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `500 10.5px ${MONO}`;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const step = niceStep((cmp.y1 - cmp.y0) / 5);
    ctx.strokeStyle = 'rgba(120,255,214,0.07)'; ctx.fillStyle = 'rgba(200,255,236,0.45)';
    ctx.beginPath();
    for (let v = Math.ceil(cmp.y0 / step) * step; v <= cmp.y1; v += step) {
      const y = Math.round(this.cmpY(v)) + 0.5;
      ctx.moveTo(P.l, y); ctx.lineTo(P.r, y);
      ctx.fillText(`${v > 0 ? '+' : v < 0 ? '\u2212' : ''}${Math.abs(v).toFixed(step < 1 ? 1 : 0)}%`, P.r + 12, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  drawCompare(ctx, a) {
    const cmp = this.sc.cmp, P = this.plot, n = this.S.n;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.moveTo(P.l, this.cmpY(0)); ctx.lineTo(P.r, this.cmpY(0)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'round';
    cmp.series.forEach((s, k) => {
      const end = (n - 1) * s.p;
      if (end <= 0) return;
      const main = k === 0;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = main ? 2.8 : 1.8;
      ctx.globalAlpha = a * (s.ticker === 'AVG' ? 0.7 : main ? 1 : 0.85);
      if (s.ticker === 'AVG') ctx.setLineDash([6, 5]); else ctx.setLineDash([]);
      ctx.shadowColor = s.color; ctx.shadowBlur = main ? 18 : 8;
      ctx.beginPath();
      ctx.moveTo(this.X(0), this.cmpY(s.values[0]));
      for (let i = 1; i <= Math.floor(end); i++) ctx.lineTo(this.X(i), this.cmpY(s.values[i]));
      ctx.stroke();
      const hx = this.X(Math.floor(end)), hy = this.cmpY(s.values[Math.floor(end)]);
      ctx.setLineDash([]); ctx.shadowBlur = 0;
      ctx.fillStyle = s.color;
      ctx.beginPath(); ctx.arc(hx, hy, main ? 4 : 3, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }

  drawMarker(ctx, mk, a, t) {
    if (a < 0.01) return;
    const x = this.X(mk.i), y = this.Y(this.valueAt(mk.i));
    const col = mk.tone === 'down' ? C.red : mk.tone === 'gold' ? C.gold : C.teal;
    const age = (performance.now() - mk.born) / 1000;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = col; ctx.lineWidth = 1.5;
    for (let k = 0; k < 2; k++) {
      const ph = ((age + k * 0.6) % 1.2) / 1.2;
      ctx.globalAlpha = a * (1 - ph) * 0.9;
      ctx.beginPath(); ctx.arc(x, y, 6 + ph * 26, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = a;
    ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.lineTo(x, this.plot.b); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    void t;
  }

  drawOrb(ctx, x, y, a, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 1 + Math.sin(t * 3.2) * 0.08;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 40 * pulse);
    g.addColorStop(0, `rgba(210,255,244,${0.95 * a})`);
    g.addColorStop(0.18, `rgba(46,245,192,${0.55 * a})`);
    g.addColorStop(0.5, `rgba(46,245,192,${0.12 * a})`);
    g.addColorStop(1, 'rgba(46,245,192,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, 40 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.translate(x, y);
    ctx.strokeStyle = `rgba(150,255,228,${0.7 * a})`;
    ctx.lineWidth = 1.2;
    ctx.rotate(-0.42);
    ctx.beginPath(); ctx.ellipse(0, 0, 22, 7.5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.rotate(0.42 + t * 0.9);
    ctx.strokeStyle = `rgba(150,255,228,${0.35 * a})`;
    ctx.beginPath(); ctx.ellipse(0, 0, 13, 13, 0, 0.2, Math.PI * 1.3); ctx.stroke();
    ctx.restore();
    const ph = (t % 1.6) / 1.6;
    ctx.save();
    ctx.strokeStyle = `rgba(46,245,192,${(1 - ph) * 0.55 * a})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, 6 + ph * 30, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (Math.random() < 0.18 * a) {
      this.particles.push({ x, y, vx: (Math.random() - 0.5) * 0.6, vy: -0.3 - Math.random() * 0.6, life: 1, col: [46, 245, 192], r: 0.6 + Math.random() * 1.2 });
    }
  }

  drawParticles(ctx) {
    if (!this.particles.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    this.particles = this.particles.filter(p => (p.life -= 0.018) > 0);
    for (const p of this.particles) {
      p.x += p.vx; p.y += p.vy; p.vx *= 0.97; p.vy *= 0.97;
      ctx.fillStyle = `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${p.life * 0.9})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  axisTag(ctx, y, text, color, filled, a) {
    if (a < 0.02 || y < this.plot.t - 10 || y > this.plot.b + 10) return;
    const x = this.plot.r + 6;
    ctx.save();
    ctx.globalAlpha = Math.min(1, a);
    ctx.font = `700 10.5px ${MONO}`;
    const w = Math.max(48, ctx.measureText(text).width + 14);
    this.roundRect(ctx, x, y - 9, w, 18, 4);
    ctx.fillStyle = filled ? color : 'rgba(4,20,16,0.94)';
    ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = filled ? '#03231a' : color;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + 0.5);
    ctx.restore();
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  updateQuote() {
    const s = this.S;
    if (!s) return;
    const sc = this.sc;
    const fi = clamp(sc.focus.a > 0.3 && sc.cmpA < 0.5 ? sc.focus.i : s.n - 1, 0, s.n - 1);
    const target = this.valueAt(fi);
    const d = this.display;
    d.price = d.price ? lerp(d.price, target, 0.18) : target * 0.0001;
    if (sc.revealing) d.price = target;
    this.el.price.textContent = fmt(d.price);
    const base = s.c[0];
    const ch = ((d.price / base) - 1) * 100;
    this.el.chg.textContent = `${ch >= 0 ? '+' : '−'}${Math.abs(ch).toFixed(1)}%`;
    this.el.chg.className = `tc-chg ${ch >= 0 ? 'is-up' : 'is-down'}`;
    this.el.when.textContent = `${this.dateLabel(Math.round(fi))}${s.key === '5Y' ? '' : ` ${s.dates[Math.round(fi)].slice(0, 4)}`}`;
  }
}

function niceStep(raw) {
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}
