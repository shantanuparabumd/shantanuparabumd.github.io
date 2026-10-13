// =============================================================================
// reel.js — Highlights carousel: one large video stage plus a strip of
// thumbnail tabs. Only the active clip is ever loaded; playback runs only
// while the stage is on screen, and never starts on its own when the visitor
// prefers reduced motion.
// =============================================================================
(function () {
  'use strict';

  const reel = document.querySelector('[data-reel]');
  if (!reel) return;

  const CLIPS = [
    { id: 'aloha', kicker: 'Imitation learning', title: 'Bimanual ALOHA teleoperation' },
    { id: 'robocon1', kicker: 'ABU Robocon, CRCE', title: 'Ball-handling competition robot' },
    { id: 'quadruped_rl', kicker: 'Reinforcement learning', title: 'TD3 quadruped gait in MuJoCo' },
    { id: 'b2', kicker: 'Legged robots', title: 'Unitree B2 quadruped' },
    { id: 'robocon3', kicker: 'ABU Robocon, CRCE', title: 'Arena run' },
    { id: 'ariac', kicker: 'Industrial automation', title: 'ARIAC agile robotics challenge' },
    { id: 'robocon5', kicker: 'ABU Robocon, CRCE', title: 'Two-robot team on the field' },
    { id: 'drne', kicker: 'Simulation', title: 'Drone delivery in Gazebo' },
    { id: 'autorobot', kicker: 'Autonomy', title: 'Autonomous robot exploration' },
    { id: 'robocon2', kicker: 'ABU Robocon, CRCE', title: 'Pneumatic robot up close' },
    { id: 'firefly', kicker: 'Multi-robot systems', title: 'Firefly swarm robotics' },
    { id: 'robocon4', kicker: 'ABU Robocon, CRCE', title: 'Drive base testing' },
  // Reel clips are colour-graded copies (teal-green shadows, lifted blacks,
  // vignette), trimmed to 12 s; project dialogs keep the ungraded originals.
  ].map(c => ({ ...c, src: `images/videos/reel/${c.id}.mp4`, poster: `images/videos/reel/${c.id}.jpg` }));

  const MAX_CLIP_SECONDS = 9;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const video = reel.querySelector('.reel-video');
  const kicker = reel.querySelector('.reel-kicker');
  const title = reel.querySelector('.reel-title');
  const toggle = reel.querySelector('.reel-toggle');
  const tabStrip = reel.querySelector('.reel-tabs');

  let index = 0;
  let inView = false;
  let paused = reduceMotion.matches;   // reduced motion: wait for an explicit play
  let rafId = 0;

  // ── Tabs ─────────────────────────────────────────────────────────────────
  const tabs = CLIPS.map((clip, i) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'reel-tab';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', 'false');
    tab.tabIndex = -1;
    tab.innerHTML = `<img alt="" loading="lazy" decoding="async"><span></span><b class="reel-progress"><i></i></b>`;
    tab.querySelector('img').src = clip.poster;
    tab.querySelector('span').textContent = clip.title;
    tab.addEventListener('click', () => { paused = false; select(i); });
    tabStrip.append(tab);
    return tab;
  });

  tabStrip.addEventListener('keydown', e => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    select((index + step + CLIPS.length) % CLIPS.length);
    tabs[index].focus();
  });

  // ── Playback ─────────────────────────────────────────────────────────────
  function limit() {
    return Math.min(video.duration || MAX_CLIP_SECONDS, MAX_CLIP_SECONDS);
  }

  function setProgress(fraction) {
    tabs[index].querySelector('.reel-progress i').style.transform = `scaleX(${fraction})`;
  }

  function tick() {
    setProgress(Math.min(video.currentTime / limit(), 1));
    if (video.currentTime >= limit() - 0.05) { next(); return; }
    rafId = requestAnimationFrame(tick);
  }

  function play() {
    if (paused || !inView) return;
    video.play().then(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(tick);
    }).catch(() => { /* autoplay blocked; the play button still works */ });
  }

  function pause() {
    video.pause();
    cancelAnimationFrame(rafId);
  }

  function next() {
    select((index + 1) % CLIPS.length);
  }

  function select(i) {
    pause();
    setProgress(0);
    tabs[index].setAttribute('aria-selected', 'false');
    tabs[index].tabIndex = -1;

    index = i;
    const clip = CLIPS[index];
    tabs[index].setAttribute('aria-selected', 'true');
    tabs[index].tabIndex = 0;
    // Scroll only the tab strip sideways. scrollIntoView() would also scroll
    // the page itself, yanking visitors down to the reel as it starts.
    const tab = tabs[index];
    const left = tab.offsetLeft - (tabStrip.clientWidth - tab.offsetWidth) / 2;
    tabStrip.scrollTo({ left: Math.max(0, left), behavior: reduceMotion.matches ? 'auto' : 'smooth' });

    video.classList.add('is-swapping');
    setTimeout(() => {
      video.poster = clip.poster;
      video.src = clip.src;
      kicker.textContent = clip.kicker;
      if (window.Site && window.Site.decode) window.Site.decode(title, clip.title, 600);
      else title.textContent = clip.title;
      video.addEventListener('loadeddata', () => {
        video.classList.remove('is-swapping');
        play();
      }, { once: true });
      video.load();
      // Warm the next poster so the swap after this one is instant.
      new Image().src = CLIPS[(index + 1) % CLIPS.length].poster;
    }, reduceMotion.matches ? 0 : 250);
    updateToggle();
  }

  function updateToggle() {
    toggle.setAttribute('aria-label', paused ? 'Play highlights' : 'Pause highlights');
    toggle.querySelector('i').className = paused ? 'fas fa-play' : 'fas fa-pause';
  }

  toggle.addEventListener('click', () => {
    paused = !paused;
    updateToggle();
    if (paused) pause(); else play();
  });

  video.addEventListener('ended', next);
  video.addEventListener('playing', () => reel.classList.add('is-playing'));
  video.addEventListener('pause', () => reel.classList.remove('is-playing'));

  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView) play(); else pause();
  }, { threshold: 0.35 }).observe(reel);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause(); else play();
  });

  // Start with the first clip's poster and caption; the video loads lazily.
  video.poster = CLIPS[0].poster;
  kicker.textContent = CLIPS[0].kicker;
  title.textContent = CLIPS[0].title;
  tabs[0].setAttribute('aria-selected', 'true');
  tabs[0].tabIndex = 0;
  updateToggle();

  let started = false;
  new IntersectionObserver(([entry], obs) => {
    if (!entry.isIntersecting || started) return;
    started = true;
    obs.disconnect();
    select(0);
  }, { rootMargin: '200px 0px' }).observe(reel);
})();
