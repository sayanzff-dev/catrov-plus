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

  /* run fn at most once per frame, however many events fire */
  function onFrame(fn) { let q = false; return (...a) => { if (q) return; q = true; requestAnimationFrame(() => { q = false; fn(...a); }); }; }

  function fitCanvas(c) {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const r = c.getBoundingClientRect();
    c.width = Math.max(1, r.width * dpr); c.height = Math.max(1, r.height * dpr);
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { g, w: r.width, h: r.height };
  }
  function rng(seed) { return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296; }

  /* =========================================================
     INTRO — a trade plays out: entry, price runs, take-profit
     ========================================================= */

  /* =========================================================
     BACKGROUND — drifting stars with mouse parallax
     ========================================================= */
  function startBackground() {
    const cv = $('#bg'); let { g, w, h: H } = fitCanvas(cv);
    addEventListener('resize', onFrame(() => ({ g, w, h: H } = fitCanvas(cv))));
    const r = rng(42), stars = Array.from({ length: 140 }, () => ({
      x: r(), y: r(), z: .2 + r() * .8, p: r() * 6.3, hot: r() < .18
    }));
    let mx = 0, my = 0, sy = 0;
    addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });
    addEventListener('scroll', () => { sy = scrollY; }, { passive: true });
    let lastT = -99;
    function draw(t) {
      g.clearRect(0, 0, w, H);
      for (const s of stars) {
        const x = ((s.x * w + mx * 40 * s.z) % w + w) % w;
        const y = ((s.y * H - sy * .08 * s.z + t * .004 * s.z + my * 40 * s.z) % H + H) % H;
        g.globalAlpha = (.35 + .65 * Math.abs(Math.sin(t / 1100 + s.p))) * s.z;
        g.fillStyle = s.hot ? '#ff6b5e' : '#fff';
        g.fillRect(x, y, s.z * 2, s.z * 2);
      }
      g.globalAlpha = 1;
    }
    (function loop(t) {
      if (reduceMotion) { draw(0); return; }
      if (!document.hidden && t - lastT >= 33) { lastT = t; draw(t); }      // ~30 fps, paused in background tabs
      requestAnimationFrame(loop);
    })(0);
  }

  /* =========================================================
     HERO CHART — endlessly extending line, purely decorative
     ========================================================= */
  function initFollowers() {
    const card = $('.growth'); if (!card) return;
    const rows = Object.entries(S.followers || {}).filter(([, v]) => +v > 0).sort((a, b) => b[1] - a[1]);
    if (!rows.length) { card.remove(); return; }
    const total = rows.reduce((s, [, v]) => s + +v, 0);
    const meta = { instagram: ['Instagram', '#ff5a8a'], x: ['X', '#e9e3dd'], youtube: ['YouTube', '#ff3d2e'], kick: ['Kick', '#53fc18'], tiktok: ['TikTok', '#35d6e8'] };
    const ico = { X: svgIcons.X, Instagram: svgIcons.Instagram, TikTok: svgIcons.TikTok, YouTube: svgIcons.YouTube, Kick: svgIcons.Kick };
    const fmt = new Intl.NumberFormat('en-US');
    const stack = $('#fStack'), list = $('#fList');
    rows.forEach(([key, v], i) => {
      const [name, color] = meta[key] || [key, '#ff3d2e'], pct = v / total * 100;
      stack.append(h('i', { style: `flex:${Math.max(v, total * .004)};--c:${color};transition-delay:${i * .09}s` }));
      const li = h('li', { class: 'f-row', style: `--i:${i};--c:${color};--w:${Math.max(pct, 0.8)}%` }, [
        h('span', { class: 'f-ico' }), h('span', { class: 'f-name', text: name }),
        h('span', { class: 'f-track' }, h('i', { class: 'f-fill' })),
        h('span', { class: 'f-num', 'data-n': v, text: '0' }),
        h('span', { class: 'f-pct', text: (pct < 1 ? '<1' : Math.round(pct)) + '%' })
      ]);
      li.firstChild.innerHTML = ico[name] || '';
      list.append(li);
    });
    $('#gPlat').textContent = `${rows.length} platforms`;
    $('#gTotal').textContent = '0';
    const run = (el, to, T) => {
      if (reduceMotion) { el.textContent = fmt.format(to); return; }
      const t0 = performance.now();
      (function tick(now) { const t = Math.min(1, (now - t0) / T), e = 1 - Math.pow(1 - t, 4); el.textContent = fmt.format(Math.round(to * e)); if (t < 1) requestAnimationFrame(tick); })(t0);
    };
    new IntersectionObserver((es, io) => { if (!es[0].isIntersecting) return; io.disconnect();
      card.classList.add('play'); run($('#gTotal'), total, 2200);
      list.querySelectorAll('.f-num').forEach((n, i) => setTimeout(() => run(n, +n.dataset.n, 1500), 350 + i * 90));
    }, { threshold: .35 }).observe(card);
  }

  /* =========================================================
     CONTENT
     ========================================================= */
  function renderTape() {
    const words = ['5+ years of trading experience', 'Nasdaq futures trader', 'Full-time & independent', 'Content creator', 'From Morocco', 'Started in Forex', 'Now trading stock index futures'];
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
    YouTube: '<svg viewBox="0 0 24 24"><path fill-rule="evenodd" d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.3 5 12 5 12 5s-6.3 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2C2 8.76 2 12 2 12s0 3.24.4 4.8a2.5 2.5 0 0 0 1.76 1.77C5.7 19 12 19 12 19s6.3 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77C22 15.24 22 12 22 12s0-3.24-.4-4.8zM10 15V9l5.2 3z"/></svg>',
    Kick: '<svg viewBox="0 0 24 24"><path d="M3 3h5.2v6h2.2l3.6-6H20l-5.4 8L20.5 21h-6.2l-3.9-6.6H8.2V21H3z"/></svg>',
    TikTok: '<svg viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/></svg>'
  };
  function renderSocials() {
    const fol = S.followers || {}, key = n => n.toLowerCase();
    $('#socialRow').append(...S.socials.map((s, i) => {
      const a = h('a', { class: 'social-card', href: s.href, target: '_blank', rel: 'noopener', 'aria-label': s.name, style: `--i:${i}` });
      const ico = h('span', { class: 'sc-ico' });
      if (svgIcons[s.name]) ico.innerHTML = svgIcons[s.name];
      else ico.append(h('img', { src: `assets/img/${key(s.name)}.png`, alt: '' }));
      const n = fol[key(s.name)];
      a.append(ico, h('b', { text: s.name }), h('span', { class: 'sc-sub', text: n ? new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n) + ' followers' : 'Follow' }), h('i', { class: 'sc-go', text: '↗' }));
      a.addEventListener('pointermove', e => { const r = a.getBoundingClientRect(); a.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%'); a.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%'); });
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
    const vids = S.videos.length ? S.videos : [{ pending: true, title: 'Your video goes here', tag: 'Video' }];
    const medias = [];
    function stopAll(except) { medias.forEach(m => { if (m !== except && m.classList.contains('playing')) { m.querySelector('iframe')?.remove(); m.classList.remove('playing'); [...m.children].forEach(c => c.hidden = false); } }); }
    grid.append(...vids.map((v, i) => {
      const pending = !v.id;
      const media = h('div', { class: 'vmedia' }, [h('div', { class: 'vposter' }, [h('img', { src: 'assets/img/ezzarion-brain-mark.png', alt: '' }), h('span', { text: v.tag || 'Video' })])]);
      medias.push(media);
      const label = 'Play ' + v.title;
      // on the real website the video plays right here in the card; in sandboxed previews that block YouTube embeds it links out instead
      const play = (S.noEmbed || pending)
        ? h('a', { class: 'vplay', href: pending ? S.channelUrl : `https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}`, target: '_blank', rel: 'noopener', 'aria-label': label })
        : h('button', { class: 'vplay', type: 'button', 'aria-label': label });
      if (!S.noEmbed && !pending) play.onclick = () => {
        stopAll(media);
        [...media.children].forEach(c => c.hidden = true);
        media.classList.add('playing');
        media.append(h('iframe', { src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}?autoplay=1&rel=0&modestbranding=1`, allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen', allowfullscreen: '', title: v.title }));
      };
      media.append(play);
      if (!pending) {
        const tryImg = srcs => {                       // first image that loads wins; the poster stays if none do
          const src = srcs.shift(); if (!src) return;
          const im = new Image();
          im.onload = () => { if (im.naturalWidth > 200) { media.style.backgroundImage = `url("${src}")`; media.classList.add('has'); } else tryImg(srcs); };
          im.onerror = () => tryImg(srcs);
          im.src = src;
        };
        const yt = q => `https://i.ytimg.com/vi/${encodeURIComponent(v.id)}/${q}.jpg`;
        tryImg([v.thumb, yt('maxresdefault'), yt('hqdefault')].filter(Boolean));
      }
      return h('article', { class: 'vcard reveal' + (pending ? ' pending' : ''), style: `--d:${i * .1}s` }, [
        media,
        h('div', { class: 'vinfo' }, [
          h('div', { class: 'vkick', text: v.tag || 'Video' }),
          h('h3', { class: 'vtitle' }, [document.createTextNode(v.title), v.badge && h('span', { class: 'vbadge', text: v.badge })]),
          v.desc && h('p', { class: 'vdesc', text: v.desc })
        ])
      ]);
    }));
  }

  /* ---------- payouts timeline ---------- */
  function renderPayouts() {
    const track = $('#timeline'), chips = $('#firmChips'), rail = $('#pwRail'), prog = $('#pwProg');
    const list = [...S.payouts].sort((a, b) => b.date.localeCompare(a.date));
    const total = list.reduce((s, p) => s + p.amount, 0);
    const max = Math.max(...list.map(p => p.amount), 1), best = list.length ? list.reduce((a, b) => b.amount > a.amount ? b : a) : null;
    const fmtDate = d => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    // headline numbers, computed from the list
    const met = [[list.length, 'Payouts'], [best ? usd(best.amount) : '—', 'Biggest'], [list.length ? usd(total / list.length) : '—', 'Average']];
    $('#pwMetrics').append(...met.map(([v, l]) => h('div', { class: 'pw-m' }, [h('b', { text: String(v) }), h('span', { text: l })])));

    let io;
    function draw(filter) {
      track.replaceChildren();
      const rows = list.length ? list.filter(p => !filter || p.firm === filter) : [1, 2, 3].map(() => ({ empty: true }));
      track.append(...rows.map((p, i) => {
        const img = h('div', { class: 'pw-img' }, p.empty ? h('span', { text: 'PROOF' }) : false);
        if (!p.empty) { img.style.backgroundImage = `url("${p.image}")`; img.onclick = () => { if (!rail.dataset.moved) openLightbox(h('img', { src: p.image, alt: `${p.firm} payout proof` }), `${p.firm} · ${usd(p.amount)} · ${fmtDate(p.date)}`); }; }
        return h('article', { class: 'pw-card' + (p.empty ? ' empty' : '') + (!p.empty && p === best ? ' best' : ''), 'data-amt': p.empty ? 0 : p.amount, style: `--d:${i * .1}s;--w:${p.empty ? 0 : Math.round(p.amount / max * 100)}%` }, [
          img,
          h('div', { class: 'pw-body' }, [
            h('div', { class: 'pw-date' }, [h('span', { text: p.empty ? 'YYYY · MM · DD' : fmtDate(p.date) }), h('span', { text: p.empty ? '' : 'Paid' })]),
            h('div', { class: 'pw-firm', text: p.empty ? 'Prop firm name' : p.firm }),
            h('div', { class: 'pw-amt', text: p.empty ? '$0,000' : usd(p.amount) }),
            p.note && h('div', { class: 'pw-note', text: p.note }),
            h('div', { class: 'pw-bar' }, h('i'))
          ])
        ]);
      }));
      io && io.disconnect();
      io = new IntersectionObserver(es => es.forEach(e => {
        if (!e.isIntersecting) return;
        const c = e.target, a = c.querySelector('.pw-amt'), v = +c.dataset.amt;
        c.classList.add('in'); io.unobserve(c);
        if (a && v && !reduceMotion) { const t0 = performance.now() + (parseFloat(c.style.getPropertyValue('--d')) || 0) * 1000 + 250, D = 1300;
          const f = n => { const k = Math.min(1, Math.max(0, (n - t0) / D)); a.textContent = k >= 1 ? usd(v) : usd(v * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); }
      }), { root: null, threshold: .2 });
      track.querySelectorAll('.pw-card').forEach(c => io.observe(c));
      rail.scrollLeft = 0; progress();
    }
    function progress() { const max = rail.scrollWidth - rail.clientWidth; const vis = rail.clientWidth / rail.scrollWidth; prog.style.width = Math.max(vis, .08) * 100 + '%'; prog.style.marginLeft = (max > 0 ? rail.scrollLeft / max * (1 - Math.max(vis, .08)) * 100 : 0) + '%'; }
    rail.addEventListener('scroll', progress, { passive: true }); addEventListener('resize', progress);
    const step = () => (track.firstElementChild?.getBoundingClientRect().width || 300) + 22;
    $('#pwPrev').onclick = () => rail.scrollBy({ left: -step(), behavior: 'smooth' });
    $('#pwNext').onclick = () => rail.scrollBy({ left: step(), behavior: 'smooth' });
    // drag to scroll with a mouse
    let x0 = null, s0 = 0;
    rail.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; x0 = e.clientX; s0 = rail.scrollLeft; delete rail.dataset.moved; });
    addEventListener('pointermove', e => { if (x0 == null) return; const dx = e.clientX - x0; if (Math.abs(dx) > 5) { rail.classList.add('drag'); rail.dataset.moved = 1; } rail.scrollLeft = s0 - dx; });
    addEventListener('pointerup', () => { if (x0 == null) return; x0 = null; rail.classList.remove('drag'); setTimeout(() => delete rail.dataset.moved, 0); });

    const firms = [...new Set(list.map(p => p.firm))];
    if (firms.length > 1) {
      const mk = (label, val) => { const b = h('button', { class: 'chip' + (val ? '' : ' on'), type: 'button', text: label }); b.onclick = () => { chips.querySelectorAll('.chip').forEach(c => c.classList.remove('on')); b.classList.add('on'); draw(val); }; return b; };
      chips.append(mk('All', null), ...firms.map(f => mk(f, f)));
    } else chips.remove();

    $('#payoutTotal').dataset.target = total; $('#payoutTotal').dataset.prefix = '$';
    $('#statPayout').dataset.target = total; $('#statCount').dataset.target = list.length;
    draw(null);
  }

  function railInit(rail, prog, prev, next) {
    const track = rail.firstElementChild;
    const progress = () => { const mx = rail.scrollWidth - rail.clientWidth, vis = Math.max(rail.clientWidth / rail.scrollWidth, .08); prog.style.width = vis * 100 + '%'; prog.style.marginLeft = (mx > 0 ? rail.scrollLeft / mx * (1 - vis) * 100 : 0) + '%'; };
    rail.addEventListener('scroll', progress, { passive: true }); addEventListener('resize', progress); progress();
    const step = () => (track.firstElementChild?.getBoundingClientRect().width || 280) + 22;
    prev.onclick = () => rail.scrollBy({ left: -step(), behavior: 'smooth' });
    next.onclick = () => rail.scrollBy({ left: step(), behavior: 'smooth' });
    let x0 = null, s0 = 0;
    rail.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; x0 = e.clientX; s0 = rail.scrollLeft; delete rail.dataset.moved; });
    addEventListener('pointermove', e => { if (x0 == null) return; const dx = e.clientX - x0; if (Math.abs(dx) > 5) { rail.classList.add('drag'); rail.dataset.moved = 1; } rail.scrollLeft = s0 - dx; });
    addEventListener('pointerup', () => { if (x0 == null) return; x0 = null; rail.classList.remove('drag'); setTimeout(() => delete rail.dataset.moved, 0); });
  }

  function renderCerts() {
    const fmt = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
    const grid = $('#certGrid'), rail = $('#cwRail');
    const list = S.certificates || [];
    if (!list.length) { rail.parentElement.querySelectorAll('.eyebrow.sub,.cw-title,.cw-rail,.pw-ctrl:last-of-type').forEach(n => n.remove()); return; }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .2 });
    grid.append(...list.map((c, i) => {
      const el = h('button', { class: 'cw-card', type: 'button', style: `--d:${i * .12}s`, 'aria-label': `${c.firm}: ${c.title}` }, [
        h('span', { class: 'cw-frame' }, [h('i', { class: 'c1' }), h('i', { class: 'c2' }), h('i', { class: 'c3' }), h('i', { class: 'c4' }),
          h('span', { class: 'cw-mat' }, [h('img', { src: c.image, alt: `${c.firm} certificate`, loading: 'lazy', draggable: 'false' }), h('span', { class: 'cw-shine' })])])
      ]);
      el.onclick = () => { if (!rail.dataset.moved) openLightbox(h('img', { src: c.image, alt: `${c.firm} certificate` }), `${c.firm} · ${c.title}`); };
      io.observe(el); return el;
    }));
    railInit(rail, $('#cwProg'), $('#cwPrev'), $('#cwNext'));
  }

  /* =========================================================
     INTERACTIONS
     ========================================================= */
  function countUp(el) {
    const target = +(el.dataset.target ?? el.dataset.count) || 0, pre = el.dataset.prefix || '';
    const dec = target % 1 ? 2 : 0, compact = el.hasAttribute('data-compact');
    const fmt = v => compact ? pre + new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
                             : pre + v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
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

    const prog = $('#scrollProgress'), links = [...document.querySelectorAll('.pn-list .pn-pill, .pn-mobile a[data-sec]')];
    const secs = links.map(a => $('#' + a.dataset.sec));
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      prog.style.width = (max > 0 ? scrollY / max * 100 : 0) + '%';
      let cur = -1; secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * .4) cur = i; });
      links.forEach((a, i) => a.classList.toggle('active', secs[i] === secs[cur]));
    };
    const onScrollF = onFrame(onScroll);
    addEventListener('scroll', onScrollF, { passive: true }); addEventListener('resize', onScrollF); onScroll();

    // card spotlight
    let spot = null;
    document.addEventListener('pointermove', e => { spot = e; spotF(); }, { passive: true });
    const spotF = onFrame(() => { const e = spot; if (!e) return;
      const c = e.target.closest && e.target.closest('.card, .cm-card'); if (!c) return;
      const r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }




  /* =========================================================
     ACCOUNT SIMULATOR — price with and without the discount code
     ========================================================= */
  function initSimulator() {
    const cfg = S.simulator || {};
    const norm = f => ({ ...f, plans: (f.plans || (f.sizes ? [{ market: f.market || 'CFD', plan: f.plan || 'Challenge', sizes: f.sizes }] : [])).filter(p => p.sizes && p.sizes.length) });
    const firms = (cfg.firms || []).map(norm).filter(f => f.plans.length);
    const sec = $('#simulator'); if (!firms.length) return;
    sec.hidden = false;
    const code = (cfg.code || 'EZZX').toUpperCase(), money = v => '$' + v.toLocaleString('en-US', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
    let fi = 0, mk = '', pi = 0, si = 0, applied = false, shown = 0, raf;
    const tabs = $('#simFirms'), markets = $('#simMarkets'), plans = $('#simPlans'), sizes = $('#simSizes'), input = $('#simCode'), msg = $('#simMsg');
    const partner = f => (S.partners || []).find(p => p.name === f.name) || {};
    const firm = () => firms[fi], mkts = () => [...new Set(firm().plans.map(p => p.market))];
    const curPlans = () => firm().plans.filter(p => p.market === mk);
    const reset = () => { mk = mkts()[0]; pi = 0; si = 0; };
    reset();

    function build() {
      const col = firm().color || '#ff3d2e'; $('#sim').style.setProperty('--acc', col);
      tabs.replaceChildren(...firms.map((f, i) => { const p = partner(f), b = h('button', { class: 'sim-firm-btn', type: 'button', role: 'tab', 'aria-selected': i === fi }, [p.logo && h('img', { src: p.logo, alt: '' }), document.createTextNode(f.name)]); b.onclick = () => { fi = i; reset(); build(); }; return b; }));
      const ms = mkts();
      markets.hidden = ms.length < 2; markets.previousElementSibling.hidden = ms.length < 2;
      markets.replaceChildren(...ms.map(m => { const b = h('button', { type: 'button', role: 'radio', 'aria-checked': m === mk, text: m }); b.onclick = () => { mk = m; pi = 0; si = 0; build(); }; return b; }));
      const ps = curPlans();
      plans.hidden = ps.length < 2; plans.previousElementSibling.hidden = ps.length < 2;
      plans.replaceChildren(...ps.map((p, i) => { const b = h('button', { class: 'sim-plan-btn', type: 'button', role: 'radio', 'aria-checked': i === pi, text: p.plan }); b.onclick = () => { pi = i; si = 0; build(); }; return b; }));
      sizes.replaceChildren(...ps[pi].sizes.map((z, i) => { const b = h('button', { class: 'sim-size-btn' + (z.estimate ? ' est' : ''), type: 'button', role: 'radio', 'aria-checked': i === si, text: z.size }); b.onclick = () => { si = i; build(); }; return b; }));
      update();
    }
    function tween(to) {
      cancelAnimationFrame(raf); const from = shown, t0 = performance.now(), el = $('#simNew');
      if (reduceMotion) { shown = to; el.textContent = money(to); return; }
      (function tick(now) { const t = Math.min(1, (now - t0) / 650), e = 1 - Math.pow(1 - t, 4); shown = from + (to - from) * e; el.textContent = money(Math.round(shown * 100) / 100); if (t < 1) raf = requestAnimationFrame(tick); })(t0);
    }
    function update() {
      const f = firm(), pl = curPlans()[pi], z = pl.sizes[si], base = +pl.base || 0, extra = +pl.code || 0;
      const sale = Math.round(z.price * (1 - base / 100) * 100) / 100;                       // price with the firm's own sale
      const withCode = z.final != null ? z.final : Math.round(sale * (1 - extra / 100) * 100) / 100;
      const final = applied ? withCode : sale;
      $('#simFirmName').textContent = f.name; $('#simSizeName').textContent = `${pl.market} · ${pl.plan} · ${z.size}`;
      $('#simOld').textContent = final < z.price ? money(z.price) : '';
      const save = $('#simSave'); const extraSaved = sale - withCode;
      save.classList.toggle('on', applied && extraSaved > 0); save.textContent = applied && extraSaved > 0 ? `${code} saves you ${money(extraSaved)} (${Math.round(extraSaved / (sale || 1) * 100)}% off)` : '';
      tween(final);
      $('#simEst').hidden = !(z.estimate || (pl.unconfirmed && applied));
      $('#simEst').textContent = pl.unconfirmed && applied ? 'The EZZX price for this plan is not confirmed here. The fee shown is before the code, and the checkout shows your final price.' : 'Estimated price, worked out from this plan\'s discount. Check the checkout for the exact amount.';
      $('#simCta').href = f.href || partner(f).href || '#';
      $('#simFine').textContent = (base ? `Includes the firm's current ${base}% sale. ` : '') + `Estimate only. Check ${f.name}'s checkout and make sure the code ${code} is applied.`;
    }
    $('#simForm').addEventListener('submit', e => {
      e.preventDefault(); const v = input.value.trim().toUpperCase();
      if (v === code) { applied = true; msg.className = 'sim-msg ok'; msg.textContent = `Code ${code} applied.`; }
      else { applied = false; msg.className = 'sim-msg bad'; msg.textContent = v ? 'That code is not valid. Try ' + code + '.' : 'Type the code first.'; }
      update();
    });
    input.addEventListener('input', () => { if (applied && input.value.trim().toUpperCase() !== code) { applied = false; msg.textContent = ''; msg.className = 'sim-msg'; update(); } });
    build();
  }

  /* =========================================================
     BOOT
     ========================================================= */
  /* =========================================================
     PORTAL — the logo grows as you scroll until you fly through
     it, and the introduction opens up behind it
     ========================================================= */

  /* =========================================================
     PILL NAV — rising-circle hover (geometry ported from the PillNav component)
     ========================================================= */
  function initPillNav() {
    const pills = [...document.querySelectorAll('.pn-pill')];
    function layout() {
      pills.forEach(pill => {
        const circle = $('.pn-circle', pill); if (!circle || !pill.offsetWidth) return;
        const { width: w, height: h } = pill.getBoundingClientRect();
        const R = ((w * w) / 4 + h * h) / (2 * h);                    // circle that just covers the pill
        const D = Math.ceil(2 * R) + 2;
        const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
        circle.style.width = circle.style.height = D + 'px';
        circle.style.bottom = -delta + 'px';
        circle.style.transformOrigin = `50% ${D - delta}px`;
        pill.style.setProperty('--pn-ph', h + 'px');
      });
    }
    layout(); addEventListener('resize', layout); addEventListener('load', layout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
    pills.forEach(p => {
      p.addEventListener('pointerenter', () => p.classList.add('hot'));
      p.addEventListener('pointerleave', () => p.classList.remove('hot'));
      p.addEventListener('focus', () => p.classList.add('hot'));
      p.addEventListener('blur', () => p.classList.remove('hot'));
    });
    const burger = $('#pnBurger'), menu = $('#pnMobile');
    const set = open => { burger.setAttribute('aria-expanded', open); menu.classList.toggle('open', open); };
    burger.addEventListener('click', () => set(burger.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
    addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
    addEventListener('scroll', () => set(false), { passive: true });
  }


  /* =========================================================
     OPENING GATE — two panels slide apart as you scroll, revealing About
     ========================================================= */
  function initGate() {
    const gate = $('#gate'), panels = $('#gatePanels');
    if (!gate || !panels) return;
    if (reduceMotion) { panels.remove(); document.body.classList.add('gate-open'); return; }
    const L = panels.querySelector('.gp-l'), R = panels.querySelector('.gp-r'), stageAbout = gate.querySelector('.about');
    const mq = matchMedia('(max-width:900px),(max-height:700px)'), ease = t => t * t * (3 - 2 * t);
    let H = innerHeight, done = false, counted = false, target = 0, cur = 0, raf = 0, last = 0;
    const apply = p => {
      const e = ease(p);
      L.style.transform = `translate3d(${(-e * 101).toFixed(3)}%,0,0)`; R.style.transform = `translate3d(${(e * 101).toFixed(3)}%,0,0)`;
      panels.style.setProperty('--gp', Math.max(0, 1 - p * 2.4).toFixed(3));
      stageAbout.style.transform = p < .999 ? `scale(${(1.06 - .06 * e).toFixed(4)})` : '';
      stageAbout.style.opacity = (.2 + .8 * Math.min(1, p * 1.5)).toFixed(3);
      document.body.classList.toggle('gate-open', p > .5);
      if (p > .45 && !counted) { counted = true; gate.querySelectorAll('[data-target]').forEach(countUp); }
      const fin = p >= .999; if (fin !== done) { done = fin; panels.style.visibility = fin ? 'hidden' : 'visible'; }
    };
    // the panels glide toward the scroll position instead of snapping to it
    const loop = now => {
      const dt = last ? Math.min(.05, (now - last) / 1000) : .016; last = now;
      cur += (target - cur) * (1 - Math.exp(-dt * 7)); if (Math.abs(target - cur) < .0005) cur = target;
      apply(cur); raf = cur === target ? 0 : requestAnimationFrame(loop); if (!raf) last = 0;
    };
    const upd = onFrame(() => {
      H = innerHeight; const len = mq.matches ? H * .75 : H; gate.style.setProperty('--gl', len + 'px');
      target = Math.min(1, Math.max(0, scrollY / len)); if (!raf) raf = requestAnimationFrame(loop);
    });
    addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
  }

  function boot() {
    $('#year').textContent = new Date().getFullYear();
    $('#statFirms').dataset.target = S.partners.length;
    renderTape(); renderPartners(); renderSocials(); renderVideos(); renderPayouts(); renderCerts(); initLightbox();
    startBackground(); initFollowers(); initPillNav(); initSimulator();
  }

  boot();
  initGate();
  document.body.classList.add('ready');
  initScrollFx();
})();
