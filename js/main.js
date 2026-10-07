(() => {
  'use strict';
  const S = window.SITE;
  const $ = (s, r = document) => r.querySelector(s);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const GREEN = '#2ee6a0', RED = '#ff3d2e';

  /* tiny DOM helper — text is always set via textContent */
  function h(tag, props = {}, kids = []) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style') el.style.cssText = v;
      else if (v !== false && v != null) el.setAttribute(k, v);
    }
    [].concat(kids).forEach(c => c && el.append(c));
    return el;
  }
  const usd = n => '$' + n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });

  function fitCanvas(c) {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const r = c.getBoundingClientRect();
    c.width = Math.max(1, r.width * dpr); c.height = Math.max(1, r.height * dpr);
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { g, w: r.width, h: r.height };
  }
  function rng(seed) { return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296; }

  /* =========================================================
     INTRO — a trade plays out: entry, price runs, take-profit
     ========================================================= */
  function buildTrade() {
    const N = 46, ENTRY = 11;
    for (let seed = 7; ; seed++) {
      const r = rng(seed), c = [];
      let p = 100;
      for (let i = 0; i < N; i++) {
        const o = p, drift = i < ENTRY ? -0.03 : 0.22;
        p = o + (r() - 0.5) * 2.4 + drift;
        c.push({ o, c: p, h: Math.max(o, p) + r() * 1.1, l: Math.min(o, p) - r() * 1.1 });
      }
      const e = c[ENTRY].c, risk = e * 0.012, tp = e + risk * 3.2, sl = e - risk;
      const hit = c.findIndex((k, i) => i > ENTRY && k.h >= tp);
      const stopped = c.slice(ENTRY + 1, hit).some(k => k.l <= sl);
      if (hit > 0 && hit < N - 4 && !stopped) return { c, ENTRY, e, tp, sl, hit, end: hit + 3 };
    }
  }

  function runIntro(done) {
    const intro = $('#intro'), cv = $('#introCanvas');
    const T = buildTrade();
    let { g, w, h: H } = fitCanvas(cv);
    addEventListener('resize', () => ({ g, w, h: H } = fitCanvas(cv)));
    const all = T.c.slice(0, T.end + 1);
    const lo = Math.min(...all.map(k => k.l), T.sl) - 1, hi = Math.max(...all.map(k => k.h), T.tp) + 1;
    const Y = p => H * 0.16 + (1 - (p - lo) / (hi - lo)) * H * 0.62;
    const DUR = 4300;
    let t0 = performance.now(), finished = false, shownEntry = false, shownTP = false, brandAt = 0;

    function finish() {
      if (finished) return; finished = true;
      intro.classList.add('done');
      document.body.classList.remove('is-loading');
      document.body.classList.add('ready');
      try { sessionStorage.setItem('ezz-intro', '1'); } catch (_) {}
      setTimeout(() => intro.remove(), 1000);
      done();
    }
    $('#introSkip').onclick = finish;
    addEventListener('keydown', e => { if (e.key === 'Escape' || e.key === 'Enter') finish(); });

    function frame(now) {
      if (finished) return;
      const el = now - t0, prog = Math.min(1, el / DUR);
      const pos = prog * (T.end + 1);                 // candles revealed (fractional)
      g.clearRect(0, 0, w, H);

      // grid
      g.strokeStyle = 'rgba(255,61,46,.07)'; g.lineWidth = 1;
      for (let i = 1; i < 8; i++) { const y = H * i / 8; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      for (let i = 1; i < 14; i++) { const x = w * i / 14; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }

      const pad = Math.min(40, w * 0.05), cw = (w - pad * 2) / (T.end + 2), body = Math.max(3, cw * 0.55);
      const X = i => pad + cw * (i + 0.5);

      // entry / SL / TP levels
      if (pos > T.ENTRY + 1) {
        const lvl = (p, col, label, dash) => {
          g.save(); g.strokeStyle = col; g.fillStyle = col; g.setLineDash(dash); g.lineWidth = 1.2; g.globalAlpha = .85;
          g.beginPath(); g.moveTo(X(T.ENTRY), Y(p)); g.lineTo(w - pad, Y(p)); g.stroke();
          g.setLineDash([]); g.font = '600 11px "IBM Plex Mono",monospace'; g.fillText(label, w - pad - g.measureText(label).width, Y(p) - 6); g.restore();
        };
        lvl(T.e, '#f6efe9', 'ENTRY', [4, 5]); lvl(T.sl, RED, 'SL', [2, 5]); lvl(T.tp, GREEN, 'TP', [2, 5]);
        // risk/reward zones
        g.fillStyle = 'rgba(46,230,160,.06)'; g.fillRect(X(T.ENTRY), Y(T.tp), w - pad - X(T.ENTRY), Y(T.e) - Y(T.tp));
        g.fillStyle = 'rgba(255,61,46,.07)'; g.fillRect(X(T.ENTRY), Y(T.e), w - pad - X(T.ENTRY), Y(T.sl) - Y(T.e));
        if (!shownEntry) { shownEntry = true; $('#introTrade').classList.add('show'); }
      }

      // candles
      let last = T.c[0].o;
      for (let i = 0; i < Math.ceil(pos) && i <= T.end; i++) {
        const k = T.c[i], f = Math.min(1, pos - i);
        const close = k.o + (k.c - k.o) * f, up = close >= k.o, col = up ? GREEN : RED;
        const hi2 = Math.max(k.o, close) + (k.h - Math.max(k.o, k.c)) * f, lo2 = Math.min(k.o, close) - (Math.min(k.o, k.c) - k.l) * f;
        g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(X(i), Y(hi2)); g.lineTo(X(i), Y(lo2)); g.stroke();
        g.fillRect(X(i) - body / 2, Math.min(Y(k.o), Y(close)), body, Math.max(1.5, Math.abs(Y(k.o) - Y(close))));
        last = close;
      }
      // live price dot + readout
      const li = Math.min(T.end, Math.ceil(pos) - 1);
      if (li >= 0) {
        g.save(); g.shadowColor = '#fff'; g.shadowBlur = 16; g.fillStyle = '#fff';
        g.beginPath(); g.arc(X(li), Y(last), 3.2, 0, 6.3); g.fill(); g.restore();
        $('#introPrice').textContent = (last * 12.5).toFixed(2);
      }

      // take profit
      if (!shownTP && pos > T.hit + 1) {
        shownTP = true; brandAt = el;
        $('#introTP').classList.add('show');
        intro.animate([{ boxShadow: 'inset 0 0 0 0 rgba(46,230,160,0)' }, { boxShadow: 'inset 0 0 160px 20px rgba(46,230,160,.28)' }, { boxShadow: 'inset 0 0 0 0 rgba(46,230,160,0)' }], { duration: 1100 });
      }
      if (shownTP && el - brandAt > 800) $('#introBrand').classList.add('show');
      if (shownTP && el - brandAt > 3300) return finish();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* =========================================================
     BACKGROUND — drifting stars with mouse parallax
     ========================================================= */
  function startBackground() {
    const cv = $('#bg'); let { g, w, h: H } = fitCanvas(cv);
    addEventListener('resize', () => ({ g, w, h: H } = fitCanvas(cv)));
    const r = rng(42), stars = Array.from({ length: 140 }, () => ({
      x: r(), y: r(), z: .2 + r() * .8, p: r() * 6.3, hot: r() < .18
    }));
    let mx = 0, my = 0, sy = 0;
    addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });
    addEventListener('scroll', () => { sy = scrollY; }, { passive: true });
    (function loop(t) {
      g.clearRect(0, 0, w, H);
      for (const s of stars) {
        const x = ((s.x * w + mx * 40 * s.z) % w + w) % w;
        const y = ((s.y * H - sy * .08 * s.z + t * .004 * s.z + my * 40 * s.z) % H + H) % H;
        g.globalAlpha = (.35 + .65 * Math.abs(Math.sin(t / 1100 + s.p))) * s.z;
        g.fillStyle = s.hot ? '#ff6b5e' : '#fff';
        g.fillRect(x, y, s.z * 2, s.z * 2);
      }
      g.globalAlpha = 1;
      if (!reduceMotion) requestAnimationFrame(loop);
    })(0);
  }

  /* =========================================================
     HERO CHART — endlessly extending line, purely decorative
     ========================================================= */
  function startHeroChart() {
    const cv = $('#heroChart'); let { g, w, h: H } = fitCanvas(cv);
    addEventListener('resize', () => ({ g, w, h: H } = fitCanvas(cv)));
    const r = rng(99), N = 90, pts = [50];
    for (let i = 1; i < N + 1; i++) pts.push(pts[i - 1] + (r() - .46) * 6);
    let off = 0;
    function draw() {
      g.clearRect(0, 0, w, H);
      const vis = pts.slice(-N), mn = Math.min(...vis), mx = Math.max(...vis), sx = (w - 22) / (N - 1);
      const Yp = v => H * .1 + (1 - (v - mn) / (mx - mn || 1)) * H * .75;
      g.strokeStyle = 'rgba(255,61,46,.08)';
      for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(0, H * i / 4); g.lineTo(w, H * i / 4); g.stroke(); }
      const path = () => { g.beginPath(); vis.forEach((v, i) => { const x = (i - off) * sx, y = Yp(v); i ? g.lineTo(x, y) : g.moveTo(x, y); }); };
      const grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, 'rgba(255,61,46,.35)'); grad.addColorStop(1, 'rgba(255,61,46,0)');
      path(); g.lineTo((N - 1 - off) * sx, H); g.lineTo(-off * sx, H); g.closePath(); g.fillStyle = grad; g.fill();
      path(); g.strokeStyle = RED; g.lineWidth = 2; g.shadowColor = RED; g.shadowBlur = 14; g.stroke(); g.shadowBlur = 0;
      const lx = (N - 1 - off) * sx, ly = Yp(vis[N - 1]);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(lx, ly, 4, 0, 6.3); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.arc(lx, ly, 4 + (performance.now() / 60 % 14), 0, 6.3); g.stroke();
    }
    (function loop() {
      off += .03;
      if (off >= 1) { off -= 1; pts.push(pts[pts.length - 1] + (r() - .46) * 6); pts.shift(); }
      draw();
      if (!reduceMotion) requestAnimationFrame(loop);
    })();
  }

  /* =========================================================
     CONTENT
     ========================================================= */
  function renderTape() {
    const words = ['Discipline', 'Structure', 'Execution', 'Risk first', 'Plan the trade', 'Trade the plan', 'Protect capital', 'Process over outcome'];
    const row = words.map(t => h('span', { text: t })), row2 = words.map(t => h('span', { text: t }));
    $('#tapeTrack').append(...row, ...row2);
  }

  function renderPartners() {
    $('#partnerGrid').append(...S.partners.map((p, i) => h('a', { class: 'card reveal', href: p.href, target: '_blank', rel: 'noopener sponsored', style: `--d:${(i % 2) * .08}s` }, [
      h('div', { class: 'logo-tile' }, h('img', { src: p.logo, alt: p.name + ' logo', loading: 'lazy' })),
      h('div', { class: 'card-body' }, [h('div', { class: 'card-title', text: p.name }), h('div', { class: 'card-sub', text: p.desc })]),
      h('div', { class: 'badge-col' }, [h('span', { class: 'badge', text: p.badge }), p.promo && h('span', { class: 'promo-tag', text: p.promo })])
    ])));
  }

  const svgIcons = {
    X: '<svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    Instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="#f6efe9" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="#f6efe9" stroke="none"/></svg>',
    TikTok: '<svg viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/></svg>'
  };
  function renderSocials() {
    $('#socialRow').append(...S.socials.map(s => {
      const a = h('a', { class: 'social-icon', href: s.href, target: '_blank', rel: 'noopener', 'aria-label': s.name });
      if (svgIcons[s.name]) a.innerHTML = svgIcons[s.name];
      else a.append(h('img', { src: `assets/img/${s.name.toLowerCase()}.png`, alt: s.name }));
      return a;
    }));
  }

  /* ---------- videos ---------- */
  function openLightbox(node, cap) {
    const lb = $('#lightbox'); $('#lbBody').replaceChildren(node); $('#lbCap').textContent = cap || '';
    lb.hidden = false; document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    $('#lightbox').hidden = true; $('#lbBody').replaceChildren(); document.body.style.overflow = '';
  }
  function initLightbox() {
    $('#lightbox').addEventListener('click', e => { if (e.target.id === 'lightbox' || e.target.classList.contains('lb-close')) closeLightbox(); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#lightbox').hidden) closeLightbox(); });
  }

  function renderVideos() {
    const grid = $('#videoGrid'); $('#channelBtn').href = S.channelUrl;
    const vids = S.videos.length ? S.videos : Array.from({ length: 3 }, (_, i) => ({ empty: true, title: i ? 'Video coming soon' : 'Your featured video goes here', tag: 'Upload via config.js' }));
    grid.append(...vids.map((v, i) => {
      const poster = h('div', { class: 'poster' }, [h('img', { src: 'assets/img/ezzarion-brain-mark.png', alt: '' }), h('span', { text: v.tag || 'Video' })]);
      const thumb = h('div', { class: 'thumb' }, v.empty ? h('span', { text: 'VIDEO' }) : [poster, h('span', { class: 'play' })]);
      if (!v.empty) {
        const tryImg = srcs => {                       // first image that loads wins; the poster stays if none do
          const src = srcs.shift(); if (!src) return;
          const im = new Image();
          im.onload = () => { if (im.naturalWidth > 200) { thumb.style.backgroundImage = `url("${src}")`; thumb.classList.add('has'); } else tryImg(srcs); };
          im.onerror = () => tryImg(srcs);
          im.src = src;
        };
        const yt = q => `https://i.ytimg.com/vi/${encodeURIComponent(v.id)}/${q}.jpg`;
        tryImg([v.thumb, i ? null : yt('maxresdefault'), yt('hqdefault')].filter(Boolean));
      }
      const el = h(v.empty ? 'div' : 'button', { class: `video reveal${i ? '' : ' first'}${v.empty ? ' empty' : ''}`, type: v.empty ? false : 'button', style: `--d:${i * .08}s`, 'aria-label': v.empty ? false : 'Play ' + v.title }, [
        thumb, h('div', { class: 'video-info' }, [h('div', { class: 'video-tag', text: v.tag || 'Video' }), h('div', { class: 'video-title', text: v.title })])
      ]);
      if (!v.empty) el.onclick = () => openLightbox(h('iframe', { src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}?autoplay=1&rel=0`, allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen', allowfullscreen: '', title: v.title }), v.title);
      return el;
    }));
  }

  /* ---------- payouts timeline ---------- */
  function renderPayouts() {
    const tl = $('#timeline'), chips = $('#firmChips');
    const list = [...S.payouts].sort((a, b) => b.date.localeCompare(a.date));
    const total = list.reduce((s, p) => s + p.amount, 0);
    const fmtDate = d => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    function draw(filter) {
      tl.querySelectorAll('.tl-item').forEach(n => n.remove());
      const rows = list.length ? list.filter(p => !filter || p.firm === filter)
        : [1, 2, 3].map(() => ({ empty: true }));
      tl.append(...rows.map(p => {
        const img = h('div', { class: 'tl-img' }, p.empty ? h('span', { text: 'PROOF' }) : false);
        if (!p.empty) { img.style.backgroundImage = `url("${p.image}")`; img.onclick = () => openLightbox(h('img', { src: p.image, alt: `${p.firm} payout proof` }), `${p.firm} — ${usd(p.amount)} — ${fmtDate(p.date)}`); }
        const amount = h('div', { class: 'tl-amount', text: p.empty ? '$0,000' : usd(p.amount) });
        return h('div', { class: `tl-item${p.empty ? ' empty' : ''}` }, h('div', { class: 'tl-card' }, [
          img,
          h('div', {}, [
            h('div', { class: 'tl-date', text: p.empty ? 'YYYY · MM · DD' : fmtDate(p.date) }),
            h('div', { class: 'tl-firm', text: p.empty ? 'Prop firm name' : p.firm }),
            amount, p.note && h('div', { class: 'tl-note', text: p.note })
          ])
        ]));
      }));
      observeTimeline();
    }

    const firms = [...new Set(list.map(p => p.firm))];
    if (firms.length > 1) {
      const mk = (label, val) => { const b = h('button', { class: 'chip' + (val ? '' : ' on'), type: 'button', text: label }); b.onclick = () => { chips.querySelectorAll('.chip').forEach(c => c.classList.remove('on')); b.classList.add('on'); draw(val); }; return b; };
      chips.append(mk('All', null), ...firms.map(f => mk(f, f)));
    } else chips.remove();

    $('#payoutTotal').dataset.target = total; $('#payoutTotal').dataset.prefix = '$';
    $('#statPayout').dataset.target = total; $('#statCount').dataset.target = list.length;
    draw(null);
  }

  function renderCerts() {
    const fmt = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
    const grid = $('#certGrid');
    grid.append(...(S.certificates || []).map((c, i) => {
      const img = h('div', { class: 'cert-img' }); img.style.backgroundImage = `url("${c.image}")`;
      const el = h('button', { class: 'cert reveal', type: 'button', style: `--d:${(i % 3) * .08}s`, 'aria-label': `${c.firm} — ${c.title}` }, [
        img, h('div', { class: 'cert-info' }, [h('div', { class: 'cert-firm', text: c.firm }), h('div', { class: 'cert-title', text: c.title }), c.date && h('div', { class: 'cert-date', text: fmt(c.date) })])
      ]);
      el.onclick = () => openLightbox(h('img', { src: c.image, alt: `${c.firm} certificate` }), `${c.firm} — ${c.title}`);
      return el;
    }));
    if (!grid.children.length) { grid.previousElementSibling.remove(); grid.remove(); }
  }

  let tlObs;
  function observeTimeline() {
    tlObs && tlObs.disconnect();
    tlObs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); } }), { rootMargin: '0px 0px -35% 0px' });
    document.querySelectorAll('.tl-item').forEach(n => tlObs.observe(n));
  }
  function updateTimelineFill() {
    const tl = $('#timeline'), r = tl.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (innerHeight * .6 - r.top) / r.height));
    $('#tlFill').style.height = (f * 100) + '%';
  }

  /* =========================================================
     INTERACTIONS
     ========================================================= */
  function countUp(el) {
    const target = +(el.dataset.target ?? el.dataset.count) || 0, pre = el.dataset.prefix || '';
    const dec = target % 1 ? 2 : 0, fmt = v => pre + v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    if (reduceMotion || !target) { el.textContent = fmt(target); return; }
    const t0 = performance.now(), D = 1600;
    (function tick(now) {
      const p = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(dec ? +(target * e).toFixed(2) : Math.round(target * e));
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  function initScrollFx() {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in'); io.unobserve(e.target);
      e.target.querySelectorAll('[data-count]').forEach(countUp);
      if (e.target.matches('[data-count]')) countUp(e.target);
    }), { threshold: .15 });
    const watch = () => document.querySelectorAll('.reveal:not(.in)').forEach(n => io.observe(n));
    watch();
    // counters that aren't inside a .reveal
    const cio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { countUp(e.target); cio.unobserve(e.target); } }), { threshold: .4 });
    document.querySelectorAll('#payoutTotal').forEach(n => cio.observe(n));

    const prog = $('#scrollProgress'), links = [...document.querySelectorAll('.nav-links a')];
    const secs = links.map(a => $(a.getAttribute('href')));
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      prog.style.width = (max > 0 ? scrollY / max * 100 : 0) + '%';
      let cur = -1; secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * .4) cur = i; });
      links.forEach((a, i) => a.classList.toggle('active', i === cur));
      updateTimelineFill();
    };
    addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); onScroll();

    // card spotlight
    document.addEventListener('pointermove', e => {
      const c = e.target.closest && e.target.closest('.card'); if (!c) return;
      const r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }



  /* =========================================================
     JOURNEY LINE — an SVG path down the whole page that draws
     itself as you scroll; a glowing head leads it and
     section nodes light up when reached
     ========================================================= */
  function initJourney() {
    const NS = 'http://www.w3.org/2000/svg', main = $('main');
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'journey'); svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `<defs>
      <linearGradient id="jg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff3d2e"/><stop offset=".55" stop-color="#e10600"/><stop offset="1" stop-color="#2ee6a0"/></linearGradient>
      <filter id="jglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <path class="j-track"/><path class="j-draw"/><g class="j-nodes"></g>
      <g class="j-head"><circle r="14" class="j-halo"/><circle r="5" fill="#fff"/></g>`;
    main.prepend(svg);
    const track = $('.j-track', svg), draw = $('.j-draw', svg), nodesG = $('.j-nodes', svg), head = $('.j-head', svg), grad = $('#jg', svg);
    let L = 1, nodes = [], startY = 0, endY = 1;

    const lengthAtY = y => {                      // path is monotone in y → binary search
      let a = 0, b = L;
      for (let i = 0; i < 14; i++) { const m = (a + b) / 2; draw.getPointAtLength(m).y < y ? a = m : b = m; }
      return (a + b) / 2;
    };

    function build() {
      const W = main.clientWidth, H = main.scrollHeight, mob = W < 700;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
      const cx = W / 2, amp = mob ? W / 2 - 14 : Math.min(W / 2 - 22, 640);
      const hero = $('.hero'); startY = hero.offsetHeight * .86; endY = H - 150;
      const steps = Math.max(4, Math.round((endY - startY) / 560));
      let d = `M${cx} ${startY}`, px = cx, py = startY;
      for (let i = 1; i <= steps; i++) {
        const y = startY + (endY - startY) * i / steps, x = i === steps ? cx : cx + (i % 2 ? -amp : amp), k = (y - py) * .55;
        d += ` C${px} ${py + k} ${x} ${y - k} ${x} ${y}`; px = x; py = y;
      }
      track.setAttribute('d', d); draw.setAttribute('d', d);
      L = draw.getTotalLength(); draw.style.strokeDasharray = L;
      grad.setAttribute('y1', startY); grad.setAttribute('y2', endY);
      nodesG.replaceChildren();
      nodes = [...document.querySelectorAll('.section')].map(sec => {
        const y = Math.min(endY, Math.max(startY, sec.getBoundingClientRect().top + scrollY - main.getBoundingClientRect().top - scrollY + 40));
        const len = lengthAtY(y), pt = draw.getPointAtLength(len);
        const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', pt.x); c.setAttribute('cy', pt.y); c.setAttribute('r', 7); c.setAttribute('class', 'j-node');
        nodesG.append(c); return { c, len };
      });
      update();
    }

    function update() {
      const top = main.getBoundingClientRect().top;              // main's offset in viewport
      const y = Math.max(startY, Math.min(endY, innerHeight * .62 - top));
      const len = y <= startY ? 0 : lengthAtY(y);
      draw.style.strokeDashoffset = L - len;
      const pt = draw.getPointAtLength(Math.max(len, 0.01));
      head.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
      head.style.opacity = len > 1 ? 1 : 0;
      nodes.forEach(n => n.c.classList.toggle('on', len >= n.len - 2));
    }

    let ticking = false;
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; update(); }); } }, { passive: true });
    let rt; const rebuild = () => { clearTimeout(rt); rt = setTimeout(build, 150); };
    addEventListener('resize', rebuild); addEventListener('load', rebuild);
    if ('ResizeObserver' in window) new ResizeObserver(rebuild).observe(main);
    build();
  }

  /* =========================================================
     BOOT
     ========================================================= */
  function initPortrait() {
    const p = $('#portrait'), img = $('.portrait-frame img', p);
    if (reduceMotion) return;
    addEventListener('pointermove', e => {
      const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
      p.style.transform = `perspective(1000px) rotateY(${x * 6}deg) rotateX(${-y * 5}deg)`;
      img.style.objectPosition = `${52 + x * 6}% 50%`;
    }, { passive: true });
  }

  function boot() {
    $('#year').textContent = new Date().getFullYear();
    const lists = [['#statFirms', S.partners.length], ['#statVideos', S.videos.length]];
    lists.forEach(([s, n]) => { $(s).dataset.target = n; });
    renderTape(); renderPartners(); renderSocials(); renderVideos(); renderPayouts(); renderCerts(); initLightbox();
    startBackground(); startHeroChart(); initPortrait(); initJourney();
  }

  let seen = false;
  try { seen = sessionStorage.getItem('ezz-intro') === '1'; } catch (_) {}
  boot();
  if (reduceMotion || seen) {
    $('#intro').remove(); document.body.classList.remove('is-loading'); document.body.classList.add('ready');
    initScrollFx();
  } else {
    runIntro(initScrollFx);
  }
})();
