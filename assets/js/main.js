/* Rajesh Arekar Photography: interactions */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ------------------------------------------------------------ Smooth scroll */
  let lenis = null;
  if (!reduced && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.0, smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  const header = $('[data-header]');
  const scrollToTarget = target => {
    const offset = target.id === 'top' ? 0 : -header.offsetHeight;
    if (lenis) lenis.scrollTo(target, { offset, duration: 1.2 });
    else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY + offset, behavior: reduced ? 'auto' : 'smooth' });
  };
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const target = a.getAttribute('href').length > 1 && $(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    closeMenu();
    scrollToTarget(target);
  });

  /* ------------------------------------------------------------ Header */
  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 10);
    if (!document.body.classList.contains('menu-open')) {
      header.classList.toggle('is-hidden', y > lastY && y > 600);
    }
    lastY = y;
  };
  if (lenis) lenis.on('scroll', onScroll); else window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------------ Mobile menu */
  const toggle = $('[data-menu-toggle]');
  const menu = $('[data-mobile-menu]');
  function closeMenu() {
    if (!document.body.classList.contains('menu-open')) return;
    document.body.classList.remove('menu-open');
    toggle.textContent = 'Menu';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    menu.setAttribute('aria-hidden', 'true');
    lenis?.start();
  }
  toggle.addEventListener('click', () => {
    if (document.body.classList.contains('menu-open')) return closeMenu();
    document.body.classList.add('menu-open');
    header.classList.remove('is-hidden');
    toggle.textContent = 'Close';
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    menu.setAttribute('aria-hidden', 'false');
    lenis?.stop();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  /* ------------------------------------------------------------ Hero slideshow */
  const slides = $$('.hero__slide');
  const dotsWrap = $('[data-hero-dots]');
  const caption = $('[data-hero-caption]');
  let current = 0, timer = null;

  slides.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Show photograph ${i + 1}: ${s.dataset.caption}`);
    b.addEventListener('click', () => { show(i); restart(); });
    dotsWrap.appendChild(b);
  });
  const dots = [...dotsWrap.children];

  function show(i) {
    slides[current].classList.remove('is-active');
    dots[current].classList.remove('is-active');
    current = (i + slides.length) % slides.length;
    const img = $('img', slides[current]);
    if (img.loading === 'lazy') img.loading = 'eager';
    slides[current].classList.add('is-active');
    dots[current].classList.add('is-active');
    caption.textContent = slides[current].dataset.caption;
    const next = $('img', slides[(current + 1) % slides.length]);
    if (next.loading === 'lazy') next.loading = 'eager';
  }
  function restart() {
    clearInterval(timer);
    if (!reduced) timer = setInterval(() => show(current + 1), 5500);
  }
  show(0);
  restart();
  document.addEventListener('visibilitychange', () => (document.hidden ? clearInterval(timer) : restart()));

  /* ------------------------------------------------------------ Fade in on view */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -10% 0px' });
  $$('[data-fade]').forEach(el => io.observe(el));

  /* ------------------------------------------------------------ Parallax (large images only) */
  if (hasGsap && !reduced) {
    $$('[data-parallax] img').forEach(img => {
      gsap.fromTo(img, { yPercent: -10 }, {
        yPercent: 0, ease: 'none',
        scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
    gsap.fromTo('[data-bleed]', { yPercent: -8 }, {
      yPercent: 8, ease: 'none',
      scrollTrigger: { trigger: '.bleed', start: 'top bottom', end: 'bottom top', scrub: true }
    });

    // Active nav link
    ['work', 'services', 'about', 'contact'].forEach(id => {
      const link = $(`.nav a[href="#${id}"]`);
      ScrollTrigger.create({
        trigger: '#' + id,
        endTrigger: id === 'work' ? '#gallery' : '#' + id,
        start: 'top 45%', end: 'bottom 45%',
        onToggle: self => link.classList.toggle('is-active', self.isActive)
      });
    });
    window.addEventListener('load', () => ScrollTrigger.refresh());
  }

  /* ------------------------------------------------------------ Services: image follows the active row */
  const svcImg = $('[data-svc-img]');
  const svcRows = $$('.svc');
  const setService = row => {
    if (row.classList.contains('is-active')) return;
    svcRows.forEach(r => r.classList.toggle('is-active', r === row));
    svcImg.classList.add('is-fading');
    setTimeout(() => {
      svcImg.src = row.dataset.img;
      svcImg.onload = () => svcImg.classList.remove('is-fading');
    }, 180);
  };
  if (finePointer) svcRows.forEach(row => row.addEventListener('mouseenter', () => setService(row)));
  if (hasGsap && !reduced) {
    svcRows.forEach(row => ScrollTrigger.create({
      trigger: row, start: 'top 55%', end: 'bottom 55%',
      onToggle: self => self.isActive && setService(row)
    }));
  }
  svcRows.forEach(r => { const i = new Image(); i.src = r.dataset.img; });

  /* ------------------------------------------------------------ Gallery: filter */
  const tiles = $$('.tile');
  const filters = $$('.filter');
  if (!reduced) {
    tiles.forEach(t => {
      t.classList.add('reveal');
      const img = $('img', t);
      const done = () => t.classList.add('is-in');
      if (img.complete && img.naturalWidth) done(); else img.addEventListener('load', done, { once: true });
    });
  }
  const applyFilter = cat => {
    filters.forEach(f => {
      const on = f.dataset.filter === cat;
      f.classList.toggle('is-active', on);
      f.setAttribute('aria-selected', on);
    });
    tiles.forEach(t => t.classList.toggle('is-hidden', !(cat === 'all' || t.dataset.cat === cat)));
    if (hasGsap) ScrollTrigger.refresh();
  };
  filters.forEach(f => f.addEventListener('click', () => applyFilter(f.dataset.filter)));
  $$('[data-filter-jump]').forEach(b => b.addEventListener('click', () => {
    applyFilter(b.dataset.filterJump);
    scrollToTarget($('#gallery'));
  }));

  /* ------------------------------------------------------------ Lightbox */
  const lb = $('[data-lightbox]');
  const lbImg = $('[data-lb-img]');
  const lbCap = $('[data-lb-caption]');
  const lbCount = $('[data-lb-count]');
  let list = [], idx = 0, lastFocus = null;

  const lbShow = i => {
    idx = (i + list.length) % list.length;
    const img = $('img', list[idx]);
    lbImg.classList.add('is-swapping');
    const pre = new Image();
    pre.onload = pre.onerror = () => { lbImg.src = pre.src; lbImg.alt = img.alt; lbImg.classList.remove('is-swapping'); };
    pre.src = img.currentSrc || img.src;
    lbCap.textContent = $('figcaption', list[idx])?.textContent || '';
    lbCount.textContent = `${idx + 1} / ${list.length}`;
  };
  const lbOpen = tile => {
    list = tiles.filter(t => !t.classList.contains('is-hidden'));
    lastFocus = document.activeElement;
    lb.hidden = false;
    requestAnimationFrame(() => lb.classList.add('is-open'));
    lbShow(list.indexOf(tile));
    lenis?.stop();
    document.body.style.overflow = 'hidden';
    $('[data-lb-close]').focus();
  };
  const lbClose = () => {
    lb.classList.remove('is-open');
    setTimeout(() => { lb.hidden = true; lbImg.removeAttribute('src'); }, 300);
    lenis?.start();
    document.body.style.overflow = '';
    lastFocus?.focus();
  };
  tiles.forEach(t => {
    t.tabIndex = 0;
    t.setAttribute('role', 'button');
    t.setAttribute('aria-label', `View larger: ${$('img', t).alt}`);
    t.addEventListener('click', () => lbOpen(t));
    t.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lbOpen(t); } });
  });
  $('[data-lb-close]').addEventListener('click', lbClose);
  $('[data-lb-prev]').addEventListener('click', () => lbShow(idx - 1));
  $('[data-lb-next]').addEventListener('click', () => lbShow(idx + 1));
  lb.addEventListener('click', e => { if (e.target === lb || e.target.classList.contains('lightbox__figure')) lbClose(); });
  document.addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') lbClose();
    if (e.key === 'ArrowRight') lbShow(idx + 1);
    if (e.key === 'ArrowLeft') lbShow(idx - 1);
    if (e.key === 'Tab') {
      const f = $$('button', lb), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  let touchX = null;
  lb.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) lbShow(idx + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  /* ------------------------------------------------------------ Contact form → email */
  const form = $('[data-contact-form]');
  const note = $('[data-form-note]');
  const defaultNote = note.textContent;
  form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    ['name', 'reach', 'service'].forEach(n => {
      const field = form.elements[n];
      const bad = !field.value.trim();
      field.closest('.field').classList.toggle('is-invalid', bad);
      if (bad) ok = false;
    });
    if (!ok) {
      note.textContent = 'Please fill in your name, a way to reach you and the service.';
      note.classList.add('is-error');
      return;
    }
    note.textContent = defaultNote;
    note.classList.remove('is-error');
    const d = Object.fromEntries(new FormData(form));
    const subject = `Enquiry: ${d.service}${d.date ? ', ' + d.date : ''}`;
    const body = [`Name: ${d.name}`, `Contact: ${d.reach}`, `Service: ${d.service}`, d.date ? `Date: ${d.date}` : null, '', d.message || '']
      .filter(l => l !== null).join('\n');
    window.location.href = `mailto:rajesharekar@gmail.com?cc=arekaryash9@gmail.com&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
  form.addEventListener('input', e => e.target.closest('.field')?.classList.remove('is-invalid'));

  $('[data-year]').textContent = new Date().getFullYear();
})();
