// =============================================================================
// motion.js — GSAP choreography: hero intro, scroll-drawn work timeline,
// reel reveal and Flip project filtering. (The project dialog
// animates in CSS: tweening a <dialog> with GSAP drops it out of modal state
// in Chrome.)
// Everything here is progressive enhancement; without GSAP or with
// prefers-reduced-motion the page is fully usable and static.
// =============================================================================
(function () {
  'use strict';

  const Site = window.Site || (window.Site = { projects: [], onProjectsRendered: [] });
  if (!window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);
  if (window.Flip) gsap.registerPlugin(Flip);

  // Layout shifts once projects and articles render; re-measure triggers.
  Site.onProjectsRendered.push(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh());

  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    // ── Hero intro: the one orchestrated page-load moment ───────────────────
    // Each line is clipped at its bottom edge only while the name rises in;
    // the clip is then removed so the "Parab" glow is never cut off.
    gsap.set('.hero-name .line', { clipPath: 'inset(-50% -50% 0% -50%)' });
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .from('.hero-name .line > span', {
        yPercent: 110, duration: 1.2, stagger: 0.12,
        onComplete: () => gsap.set('.hero-name .line', { clearProps: 'clipPath' }),
      })
      .from('.hero-lede, .hero-actions, .hero-now', { y: 18, autoAlpha: 0, duration: 0.9, stagger: 0.08 }, '-=0.8')
      .from('.hero-hint', { autoAlpha: 0, duration: 0.6 }, '-=0.3');

    // ── Hero copy drifts up and fades as the arm reaches out (desktop) ──────
    if (window.matchMedia('(hover: hover) and (min-width: 900px)').matches) {
      gsap.to('.hero-copy', {
        yPercent: -18, opacity: 0.15, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
      });
    }

    // ── Work timeline: the rail draws as you read down it ───────────────────
    const timeline = document.querySelector('.timeline');
    if (timeline) {
      timeline.classList.add('is-animated');
      ScrollTrigger.create({
        trigger: timeline,
        start: 'top 70%',
        end: 'bottom 55%',
        scrub: 0.4,
        onUpdate: self => timeline.style.setProperty('--progress', self.progress.toFixed(4)),
      });
      timeline.querySelectorAll('.tl-item').forEach(item => {
        ScrollTrigger.create({ trigger: item, start: 'top 72%', toggleClass: 'is-reached' });
      });
    }

    // ── Highlights: the reel opens from a framed window to full bleed ───────
    // Desktop only; on phones the reel is already full width.
    const stage = document.querySelector('.reel-stage');
    if (stage && window.matchMedia('(min-width: 900px)').matches) {
      gsap.fromTo(stage,
        { clipPath: 'inset(9% 16% 9% 16% round 28px)', scale: 0.96 },
        {
          clipPath: 'inset(0% 0% 0% 0% round 10px)', scale: 1, ease: 'none',
          scrollTrigger: { trigger: stage, start: 'top 95%', end: 'top 25%', scrub: 0.5 },
        });
    }

    // ── Project filter: cards glide to their new slots ──────────────────────
    if (window.Flip) {
      Site.animateFilter = (cards, update) => {
        const state = Flip.getState(cards);
        update();
        Flip.from(state, {
          duration: 0.55,
          ease: 'power3.inOut',
          absolute: true,
          nested: true,
          onEnter: els => gsap.fromTo(els, { autoAlpha: 0, scale: 0.94 }, { autoAlpha: 1, scale: 1, duration: 0.45 }),
          onLeave: els => gsap.to(els, { autoAlpha: 0, scale: 0.94, duration: 0.3 }),
          onComplete: () => ScrollTrigger.refresh(),
        });
      };
    }

    return () => {
      delete Site.animateFilter;
      const timeline = document.querySelector('.timeline');
      if (timeline) {
        timeline.classList.remove('is-animated');
        timeline.style.removeProperty('--progress');
      }
    };
  });
})();
