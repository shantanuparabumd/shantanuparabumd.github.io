// =============================================================================
// fx.js — interaction polish: decoding headings, marquee loop, card glare and
// tilt, magnetic buttons, contact headline fill, section-tinted aurora.
// Pointer effects only run on hover-capable devices; everything respects
// prefers-reduced-motion and degrades to the static page.
// =============================================================================
(function () {
  'use strict';

  const Site = window.Site || (window.Site = { projects: [], onProjectsRendered: [] });
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.documentElement;

  // ── Decode: text resolves out of terminal glyphs, left to right ──────────
  const GLYPHS = '01<>/\\_#$%*+=[]{}';

  function decode(el, text = el.dataset.text || el.textContent, duration = 750) {
    el.dataset.text = text;
    if (reduceMotion) { el.textContent = text; return; }
    if (!el.hasAttribute('aria-label') && el.matches('h1, h2, h3')) el.setAttribute('aria-label', text);
    const start = performance.now();
    el.classList.add('is-decoding');
    (function frame(now) {
      const t = Math.min((now - start) / duration, 1);
      const settled = Math.floor(t * text.length);
      let out = text.slice(0, settled);
      for (let i = settled; i < text.length; i++) {
        out += text[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (t < 1) requestAnimationFrame(frame);
      else { el.textContent = text; el.classList.remove('is-decoding'); }
    })(start);
  }
  Site.decode = decode;

  const decodeObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      decodeObserver.unobserve(entry.target);
      decode(entry.target);
    });
  }, { rootMargin: '0px 0px -15% 0px' });
  document.querySelectorAll('[data-decode]').forEach(el => decodeObserver.observe(el));

  // ── Marquee: duplicate each track once so the loop is seamless ────────────
  document.querySelectorAll('[data-marquee] .marquee-track').forEach(track => {
    [...track.children].forEach(item => {
      const clone = item.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.append(clone);
    });
  });

  // ── Aurora: drift the ambient light toward each section as it arrives ─────
  const AURORA = { top: [0, 0], highlights: [24, 10], work: [-6, 30], projects: [30, -8], writing: [10, 36], skills: [-10, 12], contact: [26, 40] };
  const auroraObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const [x, y] = AURORA[entry.target.id] || [0, 0];
      root.style.setProperty('--aurora-x', x + '%');
      root.style.setProperty('--aurora-y', y + '%');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('main section[id]').forEach(s => auroraObserver.observe(s));

  // ── Work: the sticky side panel shows the headline result of the role ───
  // you are reading, rather than repeating its title and dates.
  const badge = document.querySelector('.work-badge');
  if (badge && getComputedStyle(badge.parentElement).display !== 'none') {
    const items = [...document.querySelectorAll('.tl-item')];
    const logo = badge.querySelector('.work-logo');
    const step = badge.querySelector('.work-step b');
    const metric = badge.querySelector('.work-metric');
    const label = badge.querySelector('.work-metric-label');
    const ticks = [...badge.querySelectorAll('.work-ticks i')];
    let current = items[0];
    const show = item => {
      if (item === current) return;
      current = item;
      const index = items.indexOf(item);
      const tile = item.querySelector('.logo-tile');
      badge.classList.add('is-swapping');
      setTimeout(() => {
        logo.className = tile.className + ' work-logo';
        logo.querySelector('img').src = tile.querySelector('img').src;
        step.textContent = String(index + 1);
        metric.textContent = item.dataset.metric;
        label.textContent = item.dataset.metricLabel;
        ticks.forEach((t, i) => t.classList.toggle('is-on', i <= index));
        badge.classList.remove('is-swapping');
      }, reduceMotion ? 0 : 200);
    };
    const workObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) show(entry.target); });
    }, { rootMargin: '-40% 0px -55% 0px' });
    items.forEach(item => workObserver.observe(item));
  }

  // ── Inline role metrics for screens where the sticky panel is hidden ────
  document.querySelectorAll('.tl-item[data-metric]').forEach(item => {
    const chip = document.createElement('p');
    chip.className = 'tl-metric';
    const value = document.createElement('b');
    value.textContent = item.dataset.metric;
    // Short label: the full sentence already appears in the paragraph below.
    chip.append(value, item.dataset.metricShort || item.dataset.metricLabel);
    const anchorEl = item.querySelector('.tl-roles, .tl-role');
    anchorEl.after(chip);
  });

  // ── Footer status: cycles through a few live readouts of the page ─────────
  const statusLine = document.querySelector('.status-line');
  if (statusLine) {
    const lines = () => [
      'status: arm online',
      `reel: ${document.querySelectorAll('.reel-tab').length} clips loaded`,
      `projects: ${(Site.projects || []).length} indexed`,
      `writing: ${document.querySelector('.writing-filters .count')?.textContent || 0} entries`,
    ];
    if (!reduceMotion) {
      let i = 0;
      setInterval(() => {
        if (document.hidden) return;
        i = (i + 1) % 4;
        decode(statusLine, lines()[i], 500);
      }, 3600);
    }
  }

  // ── Touch devices: only the card nearest mid-screen shows full colour ──
  // Cards are taller than any fixed band, so a band would light two at once.
  // Instead track which cards are on screen and light the single one whose
  // centre is closest to the viewport centre.
  if (!finePointer && !reduceMotion) {
    const onScreen = new Set();
    let lit = null;
    let queued = false;
    const pick = () => {
      queued = false;
      const mid = window.innerHeight / 2;
      let best = null;
      let bestDist = Infinity;
      onScreen.forEach(card => {
        if (!card.isConnected || card.hidden) { onScreen.delete(card); return; }
        const r = card.getBoundingClientRect();
        const dist = Math.abs(r.top + r.height / 2 - mid);
        if (dist < bestDist) { bestDist = dist; best = card; }
      });
      // Only light it once it is reasonably central, not while barely peeking in.
      if (best && bestDist > window.innerHeight * 0.3) best = null;
      if (best !== lit) {
        if (lit) lit.classList.remove('is-lit');
        if (best) best.classList.add('is-lit');
        lit = best;
      }
    };
    const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(pick); } };
    const visibility = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) onScreen.add(entry.target); else onScreen.delete(entry.target);
      });
      schedule();
    });
    const watch = () => document.querySelectorAll('.project-card, .w-feature, .w-row')
      .forEach(card => visibility.observe(card));
    watch();
    Site.onProjectsRendered.push(watch);
    const rewatch = new MutationObserver(watch);
    ['writing-list', 'writing-featured'].forEach(id => rewatch.observe(document.getElementById(id), { childList: true }));
    window.addEventListener('scroll', schedule, { passive: true });
  }

  // ── Contact headline fills with neon, word by word, as you scroll to it ──
  const mega = document.querySelector('.contact h2.mega');
  if (mega) {
    const text = mega.textContent.trim();
    mega.setAttribute('aria-label', text);
    mega.replaceChildren(...text.split(/\s+/).flatMap((word, i) => {
      const span = document.createElement('span');
      span.className = 'w';
      span.setAttribute('aria-hidden', 'true');
      span.textContent = word;
      return i ? [' ', span] : [span];
    }));
    const words = mega.querySelectorAll('.w');
    if (reduceMotion || !window.gsap || !window.ScrollTrigger) {
      words.forEach(w => w.style.setProperty('--fill', '100%'));
    } else {
      // Ends while the headline is still well inside the viewport, so the
      // fill always completes before the page runs out of scroll.
      gsap.timeline({
        scrollTrigger: { trigger: mega, start: 'top 90%', end: 'bottom 70%', scrub: 0.5 },
      }).fromTo(words, { '--fill': '0%' }, { '--fill': '100%', ease: 'none', stagger: 0.6, duration: 1 });
    }
  }

  if (!finePointer || reduceMotion) return;

  // ── Cards: glare follows the cursor, card tilts toward it ─────────────────
  const TILT = 5; // degrees
  let activeCard = null;

  document.addEventListener('pointermove', e => {
    const card = e.target.closest('.project-card, .w-feature');
    if (card !== activeCard && activeCard) resetCard(activeCard);
    activeCard = card;
    if (!card) return;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    card.style.setProperty('--mx', `${px * 100}%`);
    card.style.setProperty('--my', `${py * 100}%`);
    card.style.transform =
      `perspective(900px) rotateX(${(0.5 - py) * TILT}deg) rotateY(${(px - 0.5) * TILT}deg) translateY(-4px)`;
  }, { passive: true });

  document.addEventListener('pointerleave', () => { if (activeCard) resetCard(activeCard); activeCard = null; });

  function resetCard(card) {
    card.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)';
    card.style.transform = '';
    setTimeout(() => { card.style.transition = ''; }, 500);
  }

  // ── Magnetic CTAs: pulled a little toward the cursor ──────────────────────
  if (window.gsap) {
    document.querySelectorAll('[data-magnetic]').forEach(el => {
      const toX = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3.out' });
      const toY = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3.out' });
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        toX((e.clientX - (r.left + r.width / 2)) * 0.3);
        toY((e.clientY - (r.top + r.height / 2)) * 0.3);
      });
      el.addEventListener('pointerleave', () => { toX(0); toY(0); });
    });
  }
})();
