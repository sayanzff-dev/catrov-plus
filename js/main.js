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
    Instagram: '<svg class="outline" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle class="dot" cx="17.5" cy="6.5" r="1.2"/></svg>',
    TikTok: '<svg viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/></svg>',
    YouTube: '<svg viewBox="0 0 24 24"><path fill-rule="evenodd" d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.3 5 12 5 12 5s-6.3 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2C2 8.76 2 12 2 12s0 3.24.4 4.8a2.5 2.5 0 0 0 1.76 1.77C5.7 19 12 19 12 19s6.3 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77C22 15.24 22 12 22 12s0-3.24-.4-4.8zM10 15V9l5.2 3z"/></svg>',
    Kick: '<svg viewBox="0 0 24 24"><path d="M3 3h5.2v6h2.2l3.6-6H20l-5.4 8L20.5 21h-6.2l-3.9-6.6H8.2V21H3z"/></svg>'
  };
  function renderSocials() {
    $('#socialRow').append(...S.socials.map(s => {
      const a = h('a', { class: 'social-icon', href: s.href, target: '_blank', rel: 'noopener', 'aria-label': s.name });
      if (svgIcons[s.name]) a.innerHTML = svgIcons[s.name];
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
      const tail = $('.hero-tail'); startY = tail.offsetTop + tail.offsetHeight; endY = H - 150;
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
  /* =========================================================
     WEBGL — realistic space background and the planet
     ========================================================= */
  const GLSL_NOISE = `
    float hash3(vec3 p){ p=fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
    float noise3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
      return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),
                 mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z); }
  `;
  const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  const HEAD = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';

  function makeGL(canvas, frag, opts) {
    const gl = canvas.getContext('webgl', Object.assign({ antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' }, opts || {}));
    if (!gl) return null;
    const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; } return s; };
    const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, HEAD + frag);
    if (!vs || !fs) return null;
    const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {}; const u = n => U[n] || (U[n] = gl.getUniformLocation(pr, n));
    return { gl, u, draw() { gl.drawArrays(gl.TRIANGLES, 0, 3); } };
  }

  const SPACE_FRAG = `
    uniform vec2 uRes; uniform float uTime; uniform float uScroll; uniform vec2 uMouse;
    float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
    float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
      return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
    float fbm2(vec2 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ s+=a*n2(p); p=p*2.03+vec2(7.1,3.7); a*=.5; } return s; }

    vec3 starLayer(vec2 uv, float scale, float seed, float dens, float bright){
      vec2 g=uv*scale, id=floor(g), f=fract(g)-.5;
      float pr=h21(id+seed);
      if(pr<dens) return vec3(0.);
      vec2 off=(vec2(h21(id+seed+1.3),h21(id+seed+2.7))-.5)*.72;
      float d=length(f-off);
      float inten=pow(h21(id+seed+5.1),5.0)*bright+.08*bright;
      float size=.012+.03*h21(id+seed+3.3);
      float core=smoothstep(size,0.,d);
      float halo=.00055/(d*d+.0007);
      float tw=.75+.25*sin(uTime*(1.2+3.*h21(id+seed+9.))+h21(id+seed)*6.28);
      vec3 tint=mix(vec3(1.,.72,.55),vec3(.65,.78,1.),h21(id+seed+4.2));
      tint=mix(tint,vec3(1.),.45);
      float spike=0.;
      if(inten>.55){ vec2 q=f-off; spike=(smoothstep(.012,0.,abs(q.x))*smoothstep(.2,0.,abs(q.y))+smoothstep(.012,0.,abs(q.y))*smoothstep(.2,0.,abs(q.x)))*.5; }
      return tint*(core*1.3+halo*.6+spike)*inten*tw;
    }

    void main(){
      vec2 uv=gl_FragCoord.xy/uRes.xy; float asp=uRes.x/uRes.y;
      vec2 p=(uv-.5)*vec2(asp,1.);
      vec2 par=vec2(uMouse.x,uMouse.y-uScroll*.00012);
      vec2 q=p+par*.05;
      float ca=cos(.55), sa=sin(.55);
      vec2 r=vec2(q.x*ca-q.y*sa, q.x*sa+q.y*ca);
      float band=exp(-pow(r.y/.42,2.0));
      float drift=uTime*.004;
      float f1=fbm2(q*2.3+vec2(4.,2.)+drift);
      float f2=fbm2(q*5.5-vec2(1.,7.)-drift*1.5);
      float lane=smoothstep(.42,.72,fbm2(q*3.8+vec2(9.,1.)));
      vec3 neb=mix(vec3(.55,.05,.08),vec3(.22,.06,.38),smoothstep(.3,.75,f1));
      neb=mix(neb,vec3(.95,.38,.2),smoothstep(.55,.9,f2)*.45);
      float dens=band*(.25+1.1*f2)*(1.-.72*lane);
      vec3 col=neb*dens*.34;
      float b2=exp(-pow(length(q-vec2(.55,-.28))/.55,2.0));
      col+=vec3(.5,.07,.1)*b2*fbm2(q*4.+vec2(2.,5.)+drift)*.22;
      float b3=exp(-pow(length(q-vec2(-.6,.32))/.6,2.0));
      col+=vec3(.08,.12,.32)*b3*fbm2(q*3.+vec2(8.,3.))*.22;
      float dust=band*(.4+f2)*.9;
      vec2 s1=uv*vec2(asp,1.);
      col+=starLayer(s1+par*.01+vec2(0.,uScroll*0.000015),46.,1.,.80,1.15)*(.6+dust);
      col+=starLayer(s1+par*.02+vec2(0.,uScroll*0.00003),24.,11.,.86,1.2);
      col+=starLayer(s1+par*.035+vec2(0.,uScroll*0.00006),11.,23.,.90,1.35);
      col+=starLayer(s1+par*.06+vec2(0.,uScroll*0.0001),5.5,37.,.94,1.5);
      float st=uTime/9.5; float sid=floor(st); float ft=fract(st);
      if(ft<.1){ float tt=ft/.1;
        vec2 s0=vec2(.15+.8*h21(vec2(sid,1.)),.55+.4*h21(vec2(sid,2.)))*vec2(asp,1.);
        vec2 dir=normalize(vec2(-1.,-.5)); vec2 head=s0+dir*tt*.55; vec2 tail=head-dir*.16;
        vec2 pa=s1-tail, ba=head-tail; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);
        float d=length(pa-ba*h); col+=vec3(1.,.9,.85)*smoothstep(.0025,0.,d)*h*(1.-tt)*1.4; }
      col+=vec3(.006,.004,.011);
      col=1.-exp(-col*1.25);
      gl_FragColor=vec4(col,1.);
    }`;

  function startSpaceGL() {
    const cv = $('#bg'); const ctx = makeGL(cv, SPACE_FRAG, { alpha: false, premultipliedAlpha: false });
    if (!ctx) return false;
    const { gl, u } = ctx; let mx = 0, my = 0, sy = 0, smx = 0, smy = 0, last = 0;
    function size() { const k = Math.min(devicePixelRatio || 1, 1.25); cv.width = Math.round(innerWidth * k); cv.height = Math.round(innerHeight * k); gl.viewport(0, 0, cv.width, cv.height); }
    size(); addEventListener('resize', size);
    addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });
    addEventListener('scroll', () => { sy = scrollY; }, { passive: true });
    function frame(t) {
      if (reduceMotion) t = 4000;
      if (t - last > 30 || reduceMotion) {
        last = t; smx += (mx - smx) * .06; smy += (my - smy) * .06;
        gl.uniform2f(u('uRes'), cv.width, cv.height); gl.uniform1f(u('uTime'), t / 1000);
        gl.uniform1f(u('uScroll'), sy); gl.uniform2f(u('uMouse'), smx, -smy); ctx.draw();
      }
      if (!reduceMotion) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return true;
  }

  const PLANET_FRAG = GLSL_NOISE + `
    uniform vec2 uC; uniform float uR; uniform float uSpin; uniform float uEnter; uniform float uOct; uniform float uTime;
    float fbm3(vec3 p){ float a=.5,s=0.; for(int i=0;i<10;i++){ if(float(i)>=uOct) break; s+=a*noise3(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=.5; } return s; }
    void main(){
      vec2 p=(gl_FragCoord.xy-uC)/uR; float r=length(p);
      vec3 L=normalize(vec3(-.55,.5,.7));
      vec3 col=vec3(0.); float alpha=0.;
      if(r<1.03){
        float z=sqrt(max(0.,1.-r*r)); vec3 n=vec3(p,z);
        float a=uSpin; mat3 ry=mat3(cos(a),0.,-sin(a), 0.,1.,0., sin(a),0.,cos(a));
        float tl=.38; mat3 rx=mat3(1.,0.,0., 0.,cos(tl),sin(tl), 0.,-sin(tl),cos(tl));
        vec3 sp=rx*(ry*n);
        float h=fbm3(sp*2.3+3.1);
        float ridge=1.-abs(2.*noise3(sp*6.5+h*2.2)-1.);
        float zone=smoothstep(.38,.62,fbm3(sp*2.8+9.));
        float crack=smoothstep(.88,.985,ridge)*zone;
        float grain=.7+.6*noise3(sp*(18.+uOct*4.));
        vec3 rock=mix(vec3(.045,.017,.017),vec3(.36,.14,.09),smoothstep(.28,.78,h))*grain;
        float ndl=dot(n,L); float wrap=smoothstep(-.12,.62,ndl);
        vec3 lit=rock*(.035+1.35*wrap);
        float pulse=1.6+.5*sin(uTime*.9+h*22.);
        vec3 lava=vec3(1.,.27,.05)*crack*pulse*(1.-.5*wrap);
        lava+=vec3(1.,.5,.2)*smoothstep(.97,1.,ridge)*zone*.8;
        col=lit+lava;
        float cl=smoothstep(.5,.78,fbm3(sp*3.3+vec3(uTime*.012,0.,0.)+17.));
        vec3 cloud=vec3(.66,.3,.24)*(.05+wrap*1.1);
        col=mix(col,cloud,cl*.5);
        float fres=pow(1.-z,3.0);
        col+=vec3(1.,.3,.12)*fres*(.2+wrap*1.2)*(1.+uEnter*1.5);
        col+=vec3(.9,.25,.1)*uEnter*uEnter*.35;
        float px=2.2/uR; float edge=1.-smoothstep(1.-px,1.,r);
        col*=edge; alpha=edge;
      }
      float d=max(r-1.,0.);
      vec2 dirp=p/(r+1e-5);
      float side=dot(dirp,normalize(L.xy))*.5+.5;
      float glow=exp(-d*8.5)*(.16+.95*side)*(1.+uEnter*2.2);
      vec3 gcol=vec3(1.,.26,.09)*glow;
      float ga=min(1.,glow*.75);
      col=col+gcol*(1.-alpha);
      alpha=alpha+(1.-alpha)*ga;
      gl_FragColor=vec4(col,alpha);
    }`;

  /* =========================================================
     PORTAL — the logo grows as you scroll until you fly through
     it, and the introduction opens up behind it
     ========================================================= */
  function initPortal() {
    const sec = $('#portal'), emb = $('#pEmblem'), disc = $('.disc', emb), txt = $('#pText'),
          rev = $('#pReveal'), logo = $('#pLogo'), content = $('#pContent'), bg = $('#pBg'), pc = $('#planet');
    emb.classList.add('enter'); txt.classList.add('enter');
    if (reduceMotion) { document.body.classList.add('static'); return; }

    const P = makeGL(pc, PLANET_FRAG);
    if (P) { emb.classList.add('gl'); disc.src = 'assets/img/ezzarion-brain-glow.png'; } else pc.remove();

    let cx = 0, cy = 0, R0 = 1, S = 2, range = 1, k = 1, visible = true, p = 0, t = 0, e = 0, scale = 1;
    const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
    const ease = x => x * x * (3 - 2 * x);

    function measure() {
      const keep = emb.style.transform; emb.style.transform = 'none';
      const r = emb.getBoundingClientRect(); emb.style.transform = keep;
      cx = r.left + r.width / 2; cy = r.top + r.height / 2; R0 = r.width * (P ? .39 : .31);
      const far = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy));
      S = (far / R0) * 1.08;
      range = Math.max(1, sec.offsetHeight - innerHeight);
      if (P) {
        k = Math.min(devicePixelRatio || 1, 1.5) * (innerWidth < 700 ? .85 : .9);
        pc.width = Math.round(innerWidth * k); pc.height = Math.round(innerHeight * k); P.gl.viewport(0, 0, pc.width, pc.height);
      }
    }

    function update() {
      p = clamp(-sec.getBoundingClientRect().top / range);
      t = clamp(p / .6); e = ease(t);
      const live = p > 0.001;
      emb.classList.toggle('live', live); txt.classList.toggle('live', live);
      scale = Math.pow(S, e);
      emb.style.transform = live ? `scale(${scale})` : '';
      disc.style.opacity = 1 - clamp((t - .15) / .5);
      txt.style.opacity = live ? 1 - clamp(t / .2) : '';
      txt.style.transform = live ? `translateY(${t * 46}px)` : '';
      pc.style.opacity = 1 - ease(clamp((t - .55) / .45));

      const f = ease(clamp((t - .5) / .5));                    // smooth cross-fade: planet -> introduction
      rev.style.visibility = f > 0 ? 'visible' : 'hidden';
      rev.style.opacity = f; rev.style.clipPath = 'none';
      logo.style.visibility = t >= 1 ? 'hidden' : 'visible';
      bg.style.transform = `scale(${1.3 - .3 * e})`;
      const c = clamp((p - .45) / .18);
      content.style.opacity = c; content.style.transform = `translateY(${(1 - c) * 44}px) scale(${.96 + .04 * c})`;
    }

    function draw(now) {
      if (P && visible && t < 1 && !document.hidden) {
        const { gl, u } = P;
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(u('uC'), cx * k, (innerHeight - cy) * k);
        gl.uniform1f(u('uR'), R0 * scale * k);
        gl.uniform1f(u('uSpin'), now / 1000 * .06 + e * 1.4);
        gl.uniform1f(u('uEnter'), e);
        gl.uniform1f(u('uOct'), Math.min(10, 5 + Math.max(0, Math.log2(scale)) * .75));
        gl.uniform1f(u('uTime'), now / 1000);
        P.draw();
      }
      requestAnimationFrame(draw);
    }

    let tick = false;
    addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(() => { tick = false; update(); }); } }, { passive: true });
    const remeasure = () => { measure(); update(); };
    addEventListener('resize', remeasure); addEventListener('load', remeasure);
    new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(sec);
    measure(); update(); requestAnimationFrame(draw);
    setTimeout(remeasure, 1300);
  }

  function boot() {
    $('#year').textContent = new Date().getFullYear();
    const lists = [['#statFirms', S.partners.length], ['#statVideos', S.videos.length]];
    lists.forEach(([s, n]) => { $(s).dataset.target = n; });
    renderTape(); renderPartners(); renderSocials(); renderVideos(); renderPayouts(); renderCerts(); initLightbox();
    (startSpaceGL() || startBackground()); startHeroChart(); initPortal(); initJourney();
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
