/* hellouchit.com — minimal site JS. No frameworks. */
document.documentElement.classList.add('js');
(function () {
  'use strict';

  // Scroll-reveal — hero shows immediately, below-fold reveals on entry
  const revealNow = el => el.classList.add('in');
  document.querySelectorAll('.hero .reveal').forEach(revealNow);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { revealNow(e.target); io.unobserve(e.target); } });
    }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll('.reveal:not(.in)').forEach(el => io.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach(revealNow);
  }

  // Count-up — animate stat numbers when in view
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const runCount = (el) => {
    const target = parseInt(el.getAttribute('data-count'), 10);
    if (!Number.isFinite(target)) return;
    if (reduced) { el.firstChild.nodeValue = String(target); return; }
    const dur = 1100; const start = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      const v = Math.round(target * eased);
      // write into the first text node only (keeps inline <em>/<span> intact)
      const tn = [...el.childNodes].find(n => n.nodeType === 3);
      if (tn) tn.nodeValue = String(v);
      else el.textContent = String(v);
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { runCount(e.target); cio.unobserve(e.target); } });
    }, { threshold: .6 });
    document.querySelectorAll('[data-count]').forEach(el => cio.observe(el));
  }

  // Scroll-blur on nav
  const nav = document.querySelector('header.nav');
  if (nav) {
    const onScroll = () => {
      if (window.scrollY > 8) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Calendly — defer until user clicks the CTA
  const calendlyBtn = document.querySelector('[data-calendly]');
  if (calendlyBtn) {
    let loaded = false;
    const CAL_URL = calendlyBtn.getAttribute('data-calendly');
    calendlyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const open = () => {
        if (window.Calendly) {
          window.Calendly.initPopupWidget({ url: CAL_URL });
        } else {
          window.open(CAL_URL, '_blank', 'noopener');
        }
      };
      if (loaded) { open(); return; }
      loaded = true;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://assets.calendly.com/assets/external/widget.css';
      document.head.appendChild(link);
      const s = document.createElement('script');
      s.src = 'https://assets.calendly.com/assets/external/widget.js';
      s.async = true;
      s.onload = open;
      document.body.appendChild(s);
    });
  }

  // Mobile nav toggle
  const menuBtn = document.querySelector('.menu-btn');
  const navLinks = document.querySelector('nav.links');
  const closeMenu = () => {
    if (!navLinks) return;
    navLinks.classList.remove('open');
    document.body.classList.remove('menu-open');
    menuBtn && menuBtn.setAttribute('aria-expanded', 'false');
  };
  const openMenu = () => {
    if (!navLinks) return;
    navLinks.classList.add('open');
    document.body.classList.add('menu-open');
    menuBtn && menuBtn.setAttribute('aria-expanded', 'true');
  };
  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', () => {
      navLinks.classList.contains('open') ? closeMenu() : openMenu();
    });
    navLinks.addEventListener('click', (e) => {
      if (e.target.closest('a')) closeMenu();
    });
    document.addEventListener('click', (e) => {
      if (!navLinks.classList.contains('open')) return;
      if (e.target.closest('nav.links') || e.target.closest('.menu-btn')) return;
      closeMenu();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navLinks.classList.contains('open')) closeMenu();
    });
  }

  // Smooth anchor focus (a11y) for in-page nav
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      target.setAttribute('tabindex', '-1');
      setTimeout(() => target.focus({ preventScroll: true }), 320);
    });
  });
})();
