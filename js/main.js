// =============================================================================
// main.js — content rendering, navigation, theme, project dialog
// Motion lives in motion.js and the 3D hero in hero.js; this file works
// without either of them.
// =============================================================================
(function () {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');

  // Shared with motion.js so it can hook into rendering without re-fetching.
  const Site = (window.Site = { projects: [], onProjectsRendered: [] });

  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  // "May 2024" / "November 2023" -> sortable number. Date() parsing of these
  // strings differs between browsers, so parse them by hand.
  function monthKey(text) {
    const [month = '', year = '0'] = String(text).trim().split(/\s+/);
    const m = MONTHS.indexOf(month.slice(0, 3).toLowerCase());
    return Number(year) * 12 + Math.max(m, 0);
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key === 'dataset') Object.assign(node.dataset, value);
      else node.setAttribute(key, value === true ? '' : value);
    }
    for (const child of [].concat(children)) if (child) node.append(child);
    return node;
  }

  // ── Theme ──────────────────────────────────────────────────────────────────
  const themeToggle = document.getElementById('theme-toggle');

  function applyTheme(theme, persist) {
    root.setAttribute('data-theme', theme);
    if (persist) {
      try { localStorage.setItem('portfolio-theme', theme); } catch (e) { /* storage blocked */ }
    }
    const next = theme === 'light' ? 'dark' : 'light';
    themeToggle.setAttribute('aria-label', `Switch to ${next} theme`);
    themeToggle.querySelector('i').className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    document.querySelector('meta[name="theme-color"]')
      .setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim());
    window.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
  }

  applyTheme(root.getAttribute('data-theme') || 'dark', false);
  themeToggle.addEventListener('click', () => {
    applyTheme(root.getAttribute('data-theme') === 'light' ? 'dark' : 'light', true);
  });

  // ── Header: scrolled state, mobile menu, active section ───────────────────
  const header = document.querySelector('.site-header');
  const nav = document.getElementById('site-nav');
  const navToggle = document.getElementById('nav-toggle');

  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  navToggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); navToggle.focus(); }
  });

  const navLinks = [...nav.querySelectorAll('a')];
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(a => {
        const active = a.getAttribute('href') === '#' + entry.target.id;
        a.classList.toggle('is-active', active);
        if (active) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('main section[id]').forEach(s => sectionObserver.observe(s));

  document.getElementById('year').textContent = new Date().getFullYear();

  // ── Projects ───────────────────────────────────────────────────────────────
  const featuredEl = document.getElementById('featured');
  const gridEl = document.getElementById('project-grid');
  const filterBar = document.querySelector('.filter-bar');
  const CATEGORY_ORDER = ['Robot learning', 'Perception', 'Autonomy', 'Simulation'];

  function projectCard(project, featured) {
    const media = el('div', { class: 'card-media' }, [
      el('img', {
        src: project.cardImage || project.image,
        alt: '',
        loading: featured ? 'eager' : 'lazy',
        decoding: 'async',
      }),
    ]);

    // Muted preview that only loads when someone hovers (or focuses) the card.
    if (project.preview && canHover.matches && !reduceMotion.matches) {
      const video = el('video', { muted: true, loop: true, playsinline: true, preload: 'none' });
      video.muted = true;
      video.dataset.src = project.preview;
      media.append(video);
    }

    const card = el('button', {
      class: 'project-card',
      type: 'button',
      dataset: { category: project.category, id: String(project.id) },
      'aria-haspopup': 'dialog',
    }, [
      media,
      el('span', { class: 'card-body' }, [
        el('h3', { text: project.title }),
        el('p', { text: project.description }),
        el('span', { class: 'card-meta' }, [
          el('span', { class: 'cat', text: project.category }),
          el('span', { text: project.date }),
        ]),
      ]),
    ]);

    card.addEventListener('click', () => openProject(project, card));

    const video = media.querySelector('video');
    if (video) {
      const play = () => {
        if (!video.src) video.src = video.dataset.src;
        video.play().then(() => card.classList.add('is-playing')).catch(() => {});
      };
      const stop = () => { video.pause(); card.classList.remove('is-playing'); };
      card.addEventListener('pointerenter', play);
      card.addEventListener('pointerleave', stop);
      card.addEventListener('focus', play);
      card.addEventListener('blur', stop);
    }
    return card;
  }

  function renderProjects(projects) {
    const featured = projects.filter(p => p.featured).sort((a, b) => a.featured - b.featured);
    const rest = projects.filter(p => !p.featured);

    featuredEl.replaceChildren(...featured.map(p => projectCard(p, true)));
    gridEl.replaceChildren(...rest.map(p => projectCard(p, false)));

    const counts = {};
    rest.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });
    filterBar.querySelector('[data-filter="all"]').append(el('span', { class: 'count', text: String(rest.length) }));
    CATEGORY_ORDER.filter(c => counts[c]).forEach(category => {
      filterBar.append(el('button', {
        class: 'filter-btn', type: 'button', dataset: { filter: category }, 'aria-pressed': 'false',
      }, [category, el('span', { class: 'count', text: String(counts[category]) })]));
    });

    filterBar.addEventListener('click', e => {
      const btn = e.target.closest('.filter-btn');
      if (!btn || btn.classList.contains('is-active')) return;
      filterBar.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
      applyFilter(btn.dataset.filter);
    });

    Site.onProjectsRendered.forEach(fn => fn());
  }

  function applyFilter(filter) {
    const cards = [...gridEl.querySelectorAll('.project-card')];
    const update = () => cards.forEach(card => {
      card.hidden = filter !== 'all' && card.dataset.category !== filter;
    });
    // motion.js swaps this for a GSAP Flip transition when available.
    (Site.animateFilter || (fn => fn()))(cards, update);
  }

  // ── Project dialog ─────────────────────────────────────────────────────────
  const dialog = document.getElementById('project-dialog');
  let lastTrigger = null;

  function slideNode(item, title) {
    if (item.type === 'video') {
      return el('video', {
        src: item.url, poster: item.poster, controls: true, muted: true, loop: true,
        playsinline: true, preload: 'metadata', 'aria-label': `${title} video`,
      });
    }
    if (item.type === 'article') {
      const isPdf = /\.pdf$/i.test(item.url);
      return el('div', { class: 'article-slide' }, [
        item.image ? el('img', { src: item.image, alt: '', loading: 'lazy' }) : null,
        el('a', { class: 'btn btn-primary', href: item.url, target: '_blank', rel: 'noopener' },
          [isPdf ? 'Read the report' : 'Read the article']),
      ]);
    }
    return el('img', { src: item.url, alt: `${title} screenshot`, loading: 'lazy' });
  }

  function openProject(project, trigger) {
    lastTrigger = trigger;
    const slides = project.media.map(m => slideNode(m, project.title));
    const stage = el('div', { class: 'gallery-stage' });
    let index = 0;

    const dots = slides.map((_, i) => el('button', {
      class: 'dot', type: 'button', 'aria-label': `Show item ${i + 1} of ${slides.length}`,
    }));

    function show(i) {
      index = (i + slides.length) % slides.length;
      stage.querySelectorAll('video').forEach(v => v.pause());
      stage.replaceChildren(slides[index]);
      const v = slides[index].tagName === 'VIDEO' ? slides[index] : null;
      if (v && !reduceMotion.matches) v.play().catch(() => {});
      dots.forEach((d, j) => d.setAttribute('aria-current', String(j === index)));
    }
    dots.forEach((d, i) => d.addEventListener('click', () => show(i)));

    const nav = slides.length > 1 ? el('div', { class: 'gallery-nav' }, [
      el('div', { class: 'dots' }, dots),
      el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Previous' }, [el('i', { class: 'fas fa-chevron-left', 'aria-hidden': 'true' })]),
      el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Next' }, [el('i', { class: 'fas fa-chevron-right', 'aria-hidden': 'true' })]),
    ]) : null;
    if (nav) {
      const [prev, next] = nav.querySelectorAll('.icon-btn');
      prev.addEventListener('click', () => show(index - 1));
      next.addEventListener('click', () => show(index + 1));
    }

    const links = el('div', { class: 'dlg-links' }, [
      project.github ? el('a', { class: 'btn btn-primary', href: project.github, target: '_blank', rel: 'noopener' },
        [el('i', { class: 'fab fa-github', 'aria-hidden': 'true' }), 'View code']) : null,
    ]);

    const closeBtn = el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close' },
      [el('i', { class: 'fas fa-times', 'aria-hidden': 'true' })]);
    closeBtn.addEventListener('click', () => dialog.close());

    dialog.replaceChildren(
      el('div', { class: 'dlg-head' }, [
        el('div', {}, [
          el('p', { class: 'cat', text: `${project.category}, ${project.date}` }),
          el('h2', { id: 'dialog-title', text: project.title }),
        ]),
        closeBtn,
      ]),
      el('div', { class: 'dlg-body' }, [
        el('div', { class: 'gallery' }, [stage, nav]),
        el('div', {}, [
          el('p', { text: project.longDescription || project.description }),
          el('ul', { class: 'chips' }, project.tags.map(t => el('li', { text: t }))),
          links,
        ]),
      ]),
    );

    show(0);
    dialog.showModal();
  }

  dialog.addEventListener('close', () => {
    dialog.querySelectorAll('video').forEach(v => { v.pause(); v.removeAttribute('src'); v.load(); });
    dialog.replaceChildren();
    if (lastTrigger) lastTrigger.focus();
  });
  // Click on the backdrop (the dialog element itself, outside its content) closes it.
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (e.target.tagName === 'VIDEO') return;
    const btns = dialog.querySelectorAll('.gallery-nav .icon-btn');
    if (btns.length) btns[e.key === 'ArrowLeft' ? 0 : 1].click();
  });

  fetch('data/project-data.json')
    .then(r => r.json())
    .then(data => {
      Site.projects = data.projects.sort((a, b) => monthKey(b.date) - monthKey(a.date));
      renderProjects(Site.projects);
    })
    .catch(() => {
      gridEl.textContent = 'Projects could not be loaded. Reload the page to try again.';
    });

  // ── Writing ────────────────────────────────────────────────────────────────
  // The newest piece in the current filter is featured large; the rest are
  // compact rows beside it. Filters split talks/videos from written articles.
  const writingFeatured = document.getElementById('writing-featured');
  const writingList = document.getElementById('writing-list');
  const writingMore = document.getElementById('writing-more');
  const writingFilters = document.querySelector('.writing-filters');
  const WRITING_ROWS = 4;
  const TYPE_META = {
    video: { icon: 'fa-play', label: 'Video', unit: 'watch' },
    talk: { icon: 'fa-microphone', label: 'Talk', unit: 'talk' },
    article: { icon: 'fa-file-alt', label: 'Article', unit: 'read' },
  };
  const WRITING_FILTERS = [
    { key: 'all', label: 'All', test: () => true },
    { key: 'watch', label: 'Videos & talks', test: b => b.contentType === 'video' || b.contentType === 'talk' },
    { key: 'read', label: 'Articles', test: b => (b.contentType || 'article') === 'article' },
  ];

  const typeOf = blog => TYPE_META[blog.contentType] || TYPE_META.article;
  const metaText = blog => `${blog.date}, ${blog.readTime || 5} min ${typeOf(blog).unit}`;

  function badge(blog) {
    const type = typeOf(blog);
    return el('span', { class: 'w-badge' }, [el('i', { class: `fas ${type.icon}`, 'aria-hidden': 'true' }), type.label]);
  }

  function featuredCard(blog) {
    return el('a', { class: 'w-feature', href: blog.url, target: '_blank', rel: 'noopener' }, [
      el('span', { class: 'w-thumb' }, [
        el('img', { src: blog.thumb || blog.image, alt: '', loading: 'lazy', decoding: 'async' }),
        badge(blog),
      ]),
      el('span', { class: 'w-feature-body' }, [
        el('span', { class: 'w-meta', text: metaText(blog) }),
        el('span', { class: 'w-feature-title', text: blog.title }),
        el('span', { class: 'w-desc', text: blog.description }),
      ]),
    ]);
  }

  function writingRow(blog) {
    return el('li', {}, [
      el('a', { class: 'w-row', href: blog.url, target: '_blank', rel: 'noopener' }, [
        el('span', { class: 'w-thumb' }, [el('img', { src: blog.thumb || blog.image, alt: '', loading: 'lazy', decoding: 'async' })]),
        el('span', { class: 'w-row-body' }, [
          el('span', { class: 'w-kind' }, [el('i', { class: `fas ${typeOf(blog).icon}`, 'aria-hidden': 'true' }), typeOf(blog).label]),
          el('span', { class: 'w-title', text: blog.title }),
          el('span', { class: 'w-meta', text: metaText(blog) }),
        ]),
      ]),
    ]);
  }

  function renderWriting(blogs, filterKey, expanded) {
    const filter = WRITING_FILTERS.find(f => f.key === filterKey);
    const items = blogs.filter(filter.test);
    const [first, ...rest] = items;
    writingFeatured.replaceChildren(first ? featuredCard(first) : '');
    const shown = expanded ? rest : rest.slice(0, WRITING_ROWS);
    writingList.replaceChildren(...shown.map(writingRow));
    const hiddenCount = rest.length - shown.length;
    writingMore.hidden = hiddenCount <= 0;
    writingMore.textContent = `Show ${hiddenCount} more`;
    return shown.length;
  }

  fetch('data/blog-data.json')
    .then(r => r.json())
    .then(data => {
      const blogs = data.blogs.sort((a, b) => monthKey(b.date) - monthKey(a.date));
      let current = 'all';

      writingFilters.replaceChildren(...WRITING_FILTERS.map(f => el('button', {
        class: 'filter-btn' + (f.key === current ? ' is-active' : ''), type: 'button',
        dataset: { filter: f.key }, 'aria-pressed': String(f.key === current),
      }, [f.label, el('span', { class: 'count', text: String(blogs.filter(f.test).length) })])));

      writingFilters.addEventListener('click', e => {
        const btn = e.target.closest('.filter-btn');
        if (!btn || btn.dataset.filter === current) return;
        current = btn.dataset.filter;
        writingFilters.querySelectorAll('.filter-btn').forEach(b => {
          b.classList.toggle('is-active', b === btn);
          b.setAttribute('aria-pressed', String(b === btn));
        });
        renderWriting(blogs, current, false);
      });

      writingMore.addEventListener('click', () => {
        const before = writingList.children.length;
        renderWriting(blogs, current, true);
        const firstNew = writingList.children[before];
        if (firstNew) firstNew.querySelector('a').focus();
      });

      renderWriting(blogs, current, false);
    })
    .catch(() => {
      writingList.replaceChildren(el('li', { text: 'Articles could not be loaded. Reload the page to try again.' }));
    });
})();
