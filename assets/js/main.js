/* Rajesh Arekar Photography: interactions */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ---------------------------------------------------------------- Smooth scroll */
  let lenis = null;
  if (!reduced && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(time => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = time => { lenis.raf(time); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  const header = $('[data-header]');
  const scrollToTarget = target => {
    const offset = target.id === 'top' ? 0 : -(header?.offsetHeight || 0) + 1;
    if (lenis) lenis.scrollTo(target, { offset, duration: 1.4 });
    else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY + offset, behavior: reduced ? 'auto' : 'smooth' });
  };

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const target = id === '#' ? null : $(id);
    if (!target) return;
    e.preventDefault();
    closeMenu();
    scrollToTarget(target);
  });

  /* ---------------------------------------------------------------- Preloader */
  const loader = $('.loader');
  const countEl = $('[data-loader-count]');
  const barEl = $('.loader__bar span');
  const heroFirst = $('.hero__slide img');

  const heroIntro = () => {
    document.body.classList.remove('is-loading');
    startSlideshow();
    if (!hasGsap || reduced) return;
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from('.hero__title .line > span', { yPercent: 110, duration: 1.4, stagger: 0.12 })
      .from('.hero__eyebrow, .hero__lede, .hero__actions > *, .hero__meta, .scroll-cue', { y: 24, opacity: 0, duration: 1.1, stagger: 0.06 }, '-=1.0')
      .from('.header', { autoAlpha: 0, duration: 1, clearProps: 'opacity,visibility' }, '-=1.1');
  };

  const finishLoader = () => {
    if (!loader) return heroIntro();
    loader.classList.add('is-done');
    if (hasGsap && !reduced) {
      gsap.to(loader, { yPercent: -100, duration: 1.1, ease: 'expo.inOut', onComplete: () => loader.remove() });
      gsap.delayedCall(0.55, heroIntro);
    } else {
      loader.remove();
      heroIntro();
    }
  };

  (() => {
    if (!loader) return finishLoader();
    if (reduced) return finishLoader();
    let ready = false, done = false, readyAt = 0;
    const start = performance.now();
    const minTime = 1300;
    const markReady = () => { if (!ready) { ready = true; readyAt = performance.now(); } };
    if (heroFirst.complete) markReady(); else { heroFirst.addEventListener('load', markReady); heroFirst.addEventListener('error', markReady); }
    setTimeout(markReady, 3500); // never block on a slow network
    const finish = () => { if (!done) { done = true; finishLoader(); } };
    const tick = () => {
      if (done) return;
      const now = performance.now();
      // ease towards 90% while waiting, then run the last stretch quickly once the hero image is in
      let p = Math.min(90, ((now - start) / minTime) * 90);
      if (ready) p = Math.max(p, Math.min(100, 90 + ((now - readyAt) / 400) * 10));
      if (ready && now - start >= minTime && p >= 100) p = 100;
      else p = Math.min(p, 99);
      countEl.textContent = Math.round(p);
      barEl.style.transform = `scaleX(${p / 100})`;
      if (p >= 100) return setTimeout(finish, 160);
      setTimeout(tick, 16);
    };
    tick();
  })();

  /* ---------------------------------------------------------------- Hero slideshow */
  const slides = $$('.hero__slide');
  const dotsWrap = $('[data-hero-dots]');
  const idxEl = $('[data-hero-index]');
  const capEl = $('[data-hero-caption]');
  let slideIdx = 0, slideTimer = null;
  const SLIDE_MS = 6000;

  slides.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Show slide ${i + 1}: ${s.dataset.caption}`);
    b.innerHTML = '<i></i>';
    b.addEventListener('click', () => { goSlide(i); restartTimer(); });
    dotsWrap?.appendChild(b);
  });
  const dots = dotsWrap ? [...dotsWrap.children] : [];

  function goSlide(i) {
    slides[slideIdx].classList.remove('is-active');
    dots[slideIdx]?.classList.remove('is-active');
    slideIdx = (i + slides.length) % slides.length;
    const s = slides[slideIdx];
    const img = $('img', s);
    if (img.loading === 'lazy') img.loading = 'eager';
    s.classList.add('is-active');
    // restart the dot fill animation
    const d = dots[slideIdx];
    if (d) { d.classList.remove('is-active'); void d.offsetWidth; d.classList.add('is-active'); }
    if (idxEl) idxEl.textContent = String(slideIdx + 1).padStart(2, '0');
    if (capEl) capEl.textContent = s.dataset.caption;
    // warm the next image
    const next = $('img', slides[(slideIdx + 1) % slides.length]);
    if (next && next.loading === 'lazy') next.loading = 'eager';
  }
  function restartTimer() {
    clearInterval(slideTimer);
    if (!reduced) slideTimer = setInterval(() => goSlide(slideIdx + 1), SLIDE_MS);
  }
  function startSlideshow() {
    if (!slides.length) return;
    goSlide(0);
    restartTimer();
  }
  document.addEventListener('visibilitychange', () => { document.hidden ? clearInterval(slideTimer) : restartTimer(); });

  /* ---------------------------------------------------------------- Header + progress */
  const progressBar = $('.progress span');
  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progressBar) progressBar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    header.classList.toggle('is-scrolled', y > 40);
    const menuOpen = document.body.classList.contains('menu-open');
    if (!menuOpen) header.classList.toggle('is-hidden', y > lastY && y > window.innerHeight * 0.6);
    lastY = y;
  };
  if (lenis) lenis.on('scroll', onScroll); else window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------------------------------------------------------- Mobile menu */
  const toggle = $('[data-menu-toggle]');
  const menu = $('[data-mobile-menu]');
  function closeMenu() {
    if (!document.body.classList.contains('menu-open')) return;
    document.body.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    menu.setAttribute('aria-hidden', 'true');
    lenis?.start();
  }
  toggle?.addEventListener('click', () => {
    const open = !document.body.classList.contains('menu-open');
    if (!open) return closeMenu();
    document.body.classList.add('menu-open');
    header.classList.remove('is-hidden');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    menu.setAttribute('aria-hidden', 'false');
    lenis?.stop();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  /* ---------------------------------------------------------------- Intro: words light up on scroll */
  const statement = $('[data-split-words]');
  if (statement) {
    const words = statement.textContent.trim().split(/\s+/);
    statement.innerHTML = words.map(w => `<span class="w">${w}</span>`).join(' ');
    if (hasGsap && !reduced) {
      gsap.to($$('.w', statement), {
        opacity: 1, stagger: 0.08, ease: 'none',
        scrollTrigger: { trigger: statement, start: 'top 80%', end: 'bottom 45%', scrub: true }
      });
    } else {
      $$('.w', statement).forEach(w => (w.style.opacity = 1));
    }
  }

  /* ---------------------------------------------------------------- Count-up stats */
  const counters = $$('[data-count]');
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      io.unobserve(el);
      const end = +el.dataset.count;
      if (reduced) return (el.textContent = end);
      const dur = 1600, t0 = performance.now();
      const step = now => {
        const t = Math.min(1, (now - t0) / dur);
        el.textContent = Math.round(end * (1 - Math.pow(1 - t, 4)));
        if (t < 1) requestAnimationFrame(step);
      };
      el.textContent = 0;
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  counters.forEach(c => io.observe(c));

  /* ---------------------------------------------------------------- GSAP scroll scenes */
  if (hasGsap && !reduced) {
    // Hero: image zooms and content drifts up as you leave
    gsap.to('[data-hero-media]', {
      scale: 1.12, yPercent: 8, ease: 'none',
      scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true }
    });
    gsap.to('[data-hero-content]', {
      yPercent: -30, opacity: 0, ease: 'none',
      scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom 20%', scrub: true }
    });

    // Chapters: horizontal scroll on wide screens
    const mm = gsap.matchMedia();
    mm.add('(min-width: 861px)', () => {
      const pin = $('[data-chapters]');
      const track = $('[data-chapters-track]');
      const distance = () => track.scrollWidth - window.innerWidth;
      const tween = gsap.to(track, {
        x: () => -distance(), ease: 'none',
        scrollTrigger: {
          trigger: pin, pin: true, scrub: 1, start: 'top top',
          end: () => '+=' + distance(), invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: self => gsap.set('[data-chapters-bar]', { scaleX: self.progress })
        }
      });
      $$('.chapter').forEach(ch => {
        $$('.chapter__img img', ch).forEach((img, i) => {
          gsap.fromTo(img, { xPercent: -6 - i * 3 }, {
            xPercent: 6 + i * 3, ease: 'none',
            scrollTrigger: { trigger: ch, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true }
          });
        });
        gsap.from($$('.chapter__text > *', ch), {
          y: 40, opacity: 0, stagger: 0.08, duration: 1, ease: 'expo.out',
          scrollTrigger: { trigger: ch, containerAnimation: tween, start: 'left 70%' }
        });
      });
    });
    mm.add('(max-width: 860px)', () => {
      $$('.chapter').forEach(ch => {
        gsap.from($$('.chapter__img', ch), {
          y: 60, opacity: 0, stagger: 0.12, duration: 1.2, ease: 'expo.out',
          scrollTrigger: { trigger: ch, start: 'top 80%' }
        });
      });
    });

    // Section headings rise in
    $$('.section-head, .chapters__intro').forEach(el => {
      gsap.from(el.children, {
        y: 50, opacity: 0, duration: 1.2, stagger: 0.08, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 85%' }
      });
    });

    // Services rows slide in
    gsap.from('.svc', {
      y: 40, opacity: 0, duration: 1, stagger: 0.08, ease: 'expo.out',
      scrollTrigger: { trigger: '.svc-list', start: 'top 80%' }
    });

    // Cinematic band parallax
    gsap.fromTo('[data-parallax-media]', { yPercent: -10 }, {
      yPercent: 10, ease: 'none',
      scrollTrigger: { trigger: '.band', start: 'top bottom', end: 'bottom top', scrub: true }
    });
    gsap.from('.band__quote > *', {
      y: 60, opacity: 0, duration: 1.4, stagger: 0.15, ease: 'expo.out',
      scrollTrigger: { trigger: '.band', start: 'top 55%' }
    });

    // About: portraits drift inside their frames
    $$('.person__photo img').forEach(img => {
      gsap.fromTo(img, { yPercent: -8 }, {
        yPercent: 0, ease: 'none',
        scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
    $$('.person__body').forEach(b => {
      gsap.from(b.children, {
        y: 40, opacity: 0, duration: 1.1, stagger: 0.07, ease: 'expo.out',
        scrollTrigger: { trigger: b, start: 'top 80%' }
      });
    });

    // Contact
    gsap.from('.contact__info > *, .form', {
      y: 40, opacity: 0, duration: 1.1, stagger: 0.07, ease: 'expo.out',
      scrollTrigger: { trigger: '.contact', start: 'top 75%' }
    });

    // Active nav link
    ['work', 'services', 'about', 'contact'].forEach(id => {
      const link = $(`.nav__link[href="#${id}"]`);
      const sec = id === 'work' ? $('#work') : $('#' + id);
      const end = id === 'work' ? '#gallery' : sec;
      ScrollTrigger.create({
        trigger: sec, endTrigger: end, start: 'top 50%', end: 'bottom 50%',
        onToggle: self => link?.classList.toggle('is-active', self.isActive)
      });
    });

    window.addEventListener('load', () => ScrollTrigger.refresh());
  }

  /* ---------------------------------------------------------------- Reveal-on-view (clip masks) */
  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); revealIO.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  $$('[data-reveal-img]').forEach(el => revealIO.observe(el));

  /* ---------------------------------------------------------------- Gallery: filter + reveal */
  const tiles = $$('.tile');
  if (!reduced) tiles.forEach(t => { t.classList.add('reveal'); revealIO.observe(t); });

  const filters = $$('.filter');
  const applyFilter = cat => {
    filters.forEach(f => {
      const on = f.dataset.filter === cat;
      f.classList.toggle('is-active', on);
      f.setAttribute('aria-selected', on);
    });
    tiles.forEach(t => {
      const show = cat === 'all' || t.dataset.cat === cat;
      t.classList.toggle('is-hidden', !show);
      if (show) {
        t.classList.remove('is-in');
        if (!reduced) { void t.offsetWidth; requestAnimationFrame(() => t.classList.add('is-in')); }
      }
    });
    if (hasGsap) ScrollTrigger.refresh();
  };
  filters.forEach(f => f.addEventListener('click', () => applyFilter(f.dataset.filter)));
  $$('[data-filter-jump]').forEach(b => b.addEventListener('click', () => {
    applyFilter(b.dataset.filterJump);
    scrollToTarget($('#gallery'));
  }));

  /* ---------------------------------------------------------------- Lightbox */
  const lb = $('[data-lightbox]');
  const lbImg = $('[data-lb-img]');
  const lbCap = $('[data-lb-caption]');
  const lbCount = $('[data-lb-count]');
  let lbList = [], lbIdx = 0, lastFocus = null;

  const lbShow = i => {
    lbIdx = (i + lbList.length) % lbList.length;
    const t = lbList[lbIdx];
    const img = $('img', t);
    lbImg.classList.add('is-swapping');
    const pre = new Image();
    pre.onload = pre.onerror = () => {
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt;
      lbImg.classList.remove('is-swapping');
    };
    pre.src = img.currentSrc || img.src;
    lbCap.textContent = $('figcaption', t)?.textContent || img.alt;
    lbCount.textContent = `${lbIdx + 1} / ${lbList.length}`;
  };
  const lbOpen = tile => {
    lbList = tiles.filter(t => !t.classList.contains('is-hidden'));
    lastFocus = document.activeElement;
    lb.hidden = false;
    requestAnimationFrame(() => lb.classList.add('is-open'));
    lbShow(lbList.indexOf(tile));
    lenis?.stop();
    document.body.style.overflow = 'hidden';
    $('[data-lb-close]').focus();
  };
  const lbClose = () => {
    lb.classList.remove('is-open');
    setTimeout(() => { lb.hidden = true; lbImg.src = ''; }, 350);
    lenis?.start();
    document.body.style.overflow = '';
    lastFocus?.focus();
  };
  tiles.forEach(t => {
    t.tabIndex = 0;
    t.setAttribute('role', 'button');
    t.setAttribute('aria-label', `Open image: ${$('img', t).alt}`);
    t.addEventListener('click', () => lbOpen(t));
    t.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lbOpen(t); } });
  });
  $('[data-lb-close]').addEventListener('click', lbClose);
  $('[data-lb-prev]').addEventListener('click', () => lbShow(lbIdx - 1));
  $('[data-lb-next]').addEventListener('click', () => lbShow(lbIdx + 1));
  lb.addEventListener('click', e => { if (e.target === lb || e.target.classList.contains('lightbox__figure')) lbClose(); });
  document.addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') lbClose();
    if (e.key === 'ArrowRight') lbShow(lbIdx + 1);
    if (e.key === 'ArrowLeft') lbShow(lbIdx - 1);
    if (e.key === 'Tab') { // keep focus inside
      const f = $$('button', lb); const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  let touchX = null;
  lb.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) lbShow(lbIdx + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  /* ---------------------------------------------------------------- Services: floating preview */
  const float = $('[data-svc-float]');
  const floatImg = float && $('img', float);
  if (float && finePointer && hasGsap) {
    const xTo = gsap.quickTo(float, 'x', { duration: 0.6, ease: 'power3' });
    const yTo = gsap.quickTo(float, 'y', { duration: 0.6, ease: 'power3' });
    let lastX = 0;
    $$('.svc').forEach(row => {
      row.addEventListener('mouseenter', () => {
        if (!floatImg.src.endsWith(row.dataset.img)) floatImg.src = row.dataset.img;
        float.classList.add('is-on');
        gsap.to(float, { scale: 1, duration: 0.5, ease: 'expo.out' });
      });
      row.addEventListener('mouseleave', () => {
        float.classList.remove('is-on');
        gsap.to(float, { scale: 0.6, duration: 0.4, ease: 'expo.out' });
      });
    });
    window.addEventListener('mousemove', e => {
      xTo(e.clientX); yTo(e.clientY);
      gsap.to(float, { rotation: gsap.utils.clamp(-8, 8, (e.clientX - lastX) * 0.4), duration: 0.6 });
      lastX = e.clientX;
    });
    // preload service images
    $$('.svc').forEach(r => { const i = new Image(); i.src = r.dataset.img; });
  }

  /* ---------------------------------------------------------------- Custom cursor */
  const cursor = $('.cursor');
  if (cursor && finePointer && hasGsap && !reduced) {
    const cx = gsap.quickTo(cursor, 'x', { duration: 0.25, ease: 'power3' });
    const cy = gsap.quickTo(cursor, 'y', { duration: 0.25, ease: 'power3' });
    window.addEventListener('mousemove', e => { cx(e.clientX); cy(e.clientY); cursor.classList.add('is-visible'); });
    document.addEventListener('mouseleave', () => cursor.classList.remove('is-visible'));
    document.addEventListener('mouseover', e => {
      const view = e.target.closest('.tile, .chapter__img');
      const link = e.target.closest('a, button, input, select, textarea, .svc');
      cursor.classList.toggle('is-view', !!view);
      cursor.classList.toggle('is-link', !view && !!link);
    });
  }

  /* ---------------------------------------------------------------- Contact form → mailto */
  const form = $('[data-contact-form]');
  const note = $('[data-form-note]');
  form?.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    ['name', 'reach', 'service'].forEach(n => {
      const field = form.elements[n];
      const bad = !field.value.trim();
      field.closest('.field').classList.toggle('is-invalid', bad);
      if (bad) ok = false;
    });
    if (!ok) {
      note.textContent = 'Please add your name, a way to reach you, and the service you need.';
      note.classList.remove('is-success');
      return;
    }
    const d = Object.fromEntries(new FormData(form));
    const subject = `Shoot enquiry: ${d.service}${d.date ? ' on ' + d.date : ''}`;
    const body = [
      `Name: ${d.name}`,
      `Contact: ${d.reach}`,
      `Service: ${d.service}`,
      d.date ? `Event date: ${d.date}` : null,
      '',
      d.message || ''
    ].filter(l => l !== null).join('\n');
    window.location.href = `mailto:rajesharekar@gmail.com?cc=arekaryash9@gmail.com&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    note.textContent = 'Your email app should open with everything filled in. Thank you!';
    note.classList.add('is-success');
  });
  form?.addEventListener('input', e => e.target.closest('.field')?.classList.remove('is-invalid'));

  const year = $('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();
