// =============================================================================
// ig.js — the /ig/ link-in-bio page: the searchable list of per-reel
// resources from data/ig-links.json.
// Deep links: /ig/#R001 highlights one reel; /ig/?q=mujoco pre-fills search.
// =============================================================================
(function () {
  'use strict';

  const ICONS = {
    github: 'fab fa-github',
    blog: 'fas fa-file-alt',
    schematic: 'fas fa-microchip',
    video: 'fab fa-youtube',
  };
  const KINDS = { github: 'GitHub', blog: 'Blog', schematic: 'Schematic', video: 'Video', docs: 'Docs', signup: 'Sign up' };
  const iconFor = (type) => ICONS[type] || 'fas fa-link';

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else node.setAttribute(key, value === true ? '' : value);
    }
    for (const child of [].concat(children)) if (child) node.append(child);
    return node;
  }

  const icon = (cls) => el('i', { class: cls, 'aria-hidden': 'true' });

  // ── Rendering ─────────────────────────────────────────────────────────────
  // "2024-09-15" -> "Sep 2024". Built by hand: Date() parses a bare ISO date
  // as UTC, so a local formatter can land on the previous day/month.
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function formatDate(iso) {
    const [y, m] = String(iso || '').split('-').map(Number);
    return y && m ? `${MONTHS[m - 1]} ${y}` : '';
  }

  function reelCard(reel) {
    const links = (reel.links || []).map((l) => el('li', {}, el('a', {
      href: l.url, target: '_blank', rel: 'noopener',
    }, [icon(iconFor(l.type)), el('span', { class: 'label', text: l.label }), el('span', { class: 'kind', text: KINDS[l.type] || 'Link' })])));

    return el('li', { class: 'ig-reel', id: reel.code }, [
      el('div', { class: 'ig-reel-meta' }, [
        el('span', { class: 'ig-code', text: reel.code }),
        el('time', { datetime: reel.date, text: formatDate(reel.date) }),
      ]),
      el('h2', { text: reel.title }),
      reel.summary && el('p', { text: reel.summary }),
      links.length && el('ul', { class: 'ig-links', 'aria-label': `Links for ${reel.title}` }, links),
    ]);
  }

  // ── Search ────────────────────────────────────────────────────────────────
  const normalize = (s) => String(s).toLowerCase().replace(/\s+/g, ' ').trim();

  function setupReels(reels) {
    const list = document.getElementById('ig-list');
    const input = document.getElementById('ig-query');
    const count = document.getElementById('ig-count');

    // ISO dates sort correctly as strings; newest first, and on the same day
    // the higher (later) code first.
    const sorted = [...reels].sort((a, b) => String(b.date).localeCompare(String(a.date))
      || String(b.code).localeCompare(String(a.code), undefined, { numeric: true }));
    const entries = sorted.map((reel) => ({
      node: reelCard(reel),
      haystack: normalize([reel.code, reel.title, reel.summary, ...(reel.tags || []),
        ...(reel.links || []).map((l) => `${l.label} ${l.type}`)].join(' ')),
    }));
    const empty = el('li', { class: 'ig-empty', text: 'No reel matches that. Try the code shown in the video.' });
    list.replaceChildren(...entries.map((e) => e.node), empty);

    function filter() {
      const terms = normalize(input.value).split(' ').filter(Boolean);
      let shown = 0;
      for (const e of entries) {
        const match = terms.every((t) => e.haystack.includes(t));
        e.node.hidden = !match;
        if (match) shown++;
      }
      empty.hidden = shown > 0;
      count.textContent = terms.length
        ? `${shown} of ${entries.length} reels`
        : `${entries.length} reel${entries.length === 1 ? '' : 's'}`;
    }

    input.addEventListener('input', filter);

    const params = new URLSearchParams(location.search);
    if (params.get('q')) input.value = params.get('q');
    filter();

    // /ig/#R001 → spotlight that reel. Codes are matched case-insensitively
    // since people type them by hand from a video.
    function spotlight() {
      const code = decodeURIComponent(location.hash.slice(1)).toUpperCase();
      for (const e of entries) e.node.classList.toggle('is-target', e.node.id.toUpperCase() === code);
      const target = entries.find((e) => e.node.id.toUpperCase() === code);
      if (target) {
        target.node.hidden = false;
        target.node.scrollIntoView({ block: 'start' });
      }
    }
    window.addEventListener('hashchange', spotlight);
    if (location.hash) spotlight();
  }

  fetch('../data/ig-links.json')
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data) => {
      setupReels(data.reels || []);
    })
    .catch(() => {
      document.getElementById('ig-list').replaceChildren(el('li', { class: 'ig-empty' }, [
        'Links failed to load. Pull down to refresh.',
      ]));
    });
})();
