/* ============================================================
   MILLE — interactions
   ============================================================ */
(() => {
  'use strict';

  const doc = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches && window.innerWidth > 1024;

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

  /* ---------- Preloader ---------- */
  const preloader = $('.preloader');
  const skipPreloader = doc.classList.contains('skip-preloader');
  let loaderDone = false;

  function finishLoader() {
    if (loaderDone) return;
    loaderDone = true;
    const reveal = () => {
      body.classList.add('is-loaded');
      doc.classList.remove('is-loading');
      if (preloader) {
        preloader.classList.add('is-done');
        window.setTimeout(() => preloader.remove(), 1300);
      }
    };
    if (!preloader || skipPreloader) {
      if (preloader) preloader.remove();
      reveal();
      return;
    }
    preloader.classList.add('is-ready');
    window.setTimeout(reveal, reduceMotion ? 0 : 700);
  }

  if (document.readyState === 'complete') {
    finishLoader();
  } else {
    window.addEventListener('load', finishLoader, { once: true });
  }
  window.setTimeout(finishLoader, 2800);

  /* ---------- Header ---------- */
  const header = $('[data-header]');
  let lastScroll = window.scrollY;
  let scrollTicking = false;

  function onScrollFrame() {
    const y = window.scrollY;
    if (header) {
      header.classList.toggle('is-solid', y > 44);
      const goingDown = y > lastScroll;
      const hide = goingDown && y > 520 && !body.classList.contains('menu-open');
      header.classList.toggle('is-hidden', hide);
    }
    lastScroll = y;
    updateParallax();
    scrollTicking = false;
  }

  function requestScrollFrame() {
    if (!scrollTicking) {
      scrollTicking = true;
      window.requestAnimationFrame(onScrollFrame);
    }
  }
  window.addEventListener('scroll', requestScrollFrame, { passive: true });

  /* ---------- Mobile menu ---------- */
  const menu = $('[data-menu]');
  const menuToggle = $('[data-menu-toggle]');
  const menuLinks = $$('[data-menu] a');
  const pageMain = $('main');
  const pageFooter = $('.site-footer');

  function setMenu(open) {
    if (!menu || !menuToggle) return;
    menu.classList.toggle('is-open', open);
    body.classList.toggle('menu-open', open);
    body.classList.toggle('no-scroll', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Menu sluiten' : 'Menu openen');
    menu.setAttribute('aria-hidden', String(!open));
    if (pageMain) pageMain.inert = open;
    if (pageFooter) pageFooter.inert = open;
    if (header) header.classList.remove('is-hidden');
    if (open) {
      window.setTimeout(() => { const first = $('a', menu); if (first) first.focus({ preventScroll: true }); }, 350);
    } else if (menu.contains(document.activeElement)) {
      menuToggle.focus({ preventScroll: true });
    }
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  }
  menuLinks.forEach(link => link.addEventListener('click', () => setMenu(false)));

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1024 && body.classList.contains('menu-open')) setMenu(false);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (body.classList.contains('menu-open')) setMenu(false);
      if (lightbox && lightbox.classList.contains('is-open')) closeLightbox();
    }
  });

  /* ---------- Scroll reveals ---------- */
  const revealEls = $$('[data-reveal], .reveal-lines');

  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-inview');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-inview'));
  }

  /* ---------- Counters ---------- */
  const counters = $$('[data-count]');

  function runCounter(el) {
    const target = parseFloat(el.dataset.count || '0');
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    if (reduceMotion) {
      el.textContent = prefix + target.toFixed(decimals) + suffix;
      return;
    }
    const duration = 1700;
    const start = performance.now();
    const ease = t => 1 - Math.pow(1 - t, 4);
    const tick = now => {
      const p = clamp((now - start) / duration, 0, 1);
      const value = target * ease(p);
      el.textContent = prefix + value.toFixed(decimals) + suffix;
      if (p < 1) window.requestAnimationFrame(tick);
      else el.textContent = prefix + target.toFixed(decimals) + suffix;
    };
    window.requestAnimationFrame(tick);
  }

  if ('IntersectionObserver' in window) {
    const counterIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          runCounter(entry.target);
          counterIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(el => counterIO.observe(el));
  } else {
    counters.forEach(runCounter);
  }

  /* ---------- Service hover media ---------- */
  const serviceItems = $$('[data-service]');
  const serviceImages = $$('[data-service-img]');

  serviceItems.forEach((item, index) => {
    const activate = () => {
      serviceImages.forEach(img => img.classList.toggle('is-active', Number(img.dataset.serviceImg) === index));
    };
    item.addEventListener('mouseenter', activate);
    item.addEventListener('focusin', activate);
  });
  if (serviceImages.length) serviceImages[0].classList.add('is-active');

  /* ---------- Quote slider ---------- */
  const quoteItems = $$('[data-quote]');
  const quotePhotos = $$('[data-quote-photo]');
  const quoteDots = $$('[data-quote-dot]');
  const quoteCount = $('[data-quote-count]');
  let quoteIndex = 0;

  function showQuote(index) {
    if (!quoteItems.length) return;
    quoteIndex = (index + quoteItems.length) % quoteItems.length;
    quoteItems.forEach((item, i) => item.classList.toggle('is-active', i === quoteIndex));
    quotePhotos.forEach((img, i) => img.classList.toggle('is-active', i === quoteIndex));
    quoteDots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === quoteIndex);
      dot.setAttribute('aria-selected', String(i === quoteIndex));
    });
    if (quoteCount) quoteCount.textContent = String(quoteIndex + 1).padStart(2, '0') + ' / ' + String(quoteItems.length).padStart(2, '0');
  }

  if (quoteItems.length) {
    quoteDots.forEach((dot, i) => dot.addEventListener('click', () => showQuote(i)));
    const prev = $('[data-quote-prev]');
    const next = $('[data-quote-next]');
    if (prev) prev.addEventListener('click', () => showQuote(quoteIndex - 1));
    if (next) next.addEventListener('click', () => showQuote(quoteIndex + 1));
    showQuote(0);
  }

  /* ---------- Collection filters ---------- */
  const collection = $('[data-collection]');
  if (collection) {
    const cards = $$('[data-type]', collection);
    const chips = $$('[data-filter]');
    const regionSelect = $('[data-region]');
    const visibleCount = $('[data-visible-count]');
    const emptyState = $('[data-empty]');
    let activeFilter = 'alles';

    const applyFilters = () => {
      let shown = 0;
      cards.forEach(card => {
        const typeOk = activeFilter === 'alles' || card.dataset.type === activeFilter;
        const regionOk = !regionSelect || !regionSelect.value || card.dataset.region === regionSelect.value;
        const show = typeOk && regionOk;
        card.classList.toggle('is-hidden', !show);
        if (show) shown += 1;
      });
      if (visibleCount) visibleCount.textContent = String(shown);
      if (emptyState) emptyState.classList.toggle('is-visible', shown === 0);
    };

    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        activeFilter = chip.dataset.filter;
        chips.forEach(c => {
          c.classList.toggle('is-active', c === chip);
          c.setAttribute('aria-pressed', String(c === chip));
        });
        applyFilters();
      });
    });

    if (regionSelect) regionSelect.addEventListener('change', applyFilters);
    applyFilters();
  }

  /* ---------- Lightbox ---------- */
  const lightbox = $('[data-lightbox-root]');
  const lightboxTriggers = $$('[data-lightbox]');
  let lightboxIndex = 0;
  let lastLightboxTrigger = null;

  function renderLightbox() {
    if (!lightbox || !lightboxTriggers.length) return;
    const trigger = lightboxTriggers[lightboxIndex];
    const img = $('[data-lightbox-img]', lightbox);
    const caption = $('[data-lightbox-caption]', lightbox);
    if (img) {
      img.src = trigger.dataset.full || trigger.querySelector('img')?.src || '';
      img.alt = trigger.querySelector('img')?.alt || '';
    }
    if (caption) caption.textContent = trigger.dataset.caption || '';
  }

  function openLightbox(index) {
    if (!lightbox) return;
    lightboxIndex = (index + lightboxTriggers.length) % lightboxTriggers.length;
    lastLightboxTrigger = lightboxTriggers[lightboxIndex];
    renderLightbox();
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    body.classList.add('no-scroll');
    if (header) header.inert = true;
    if (pageMain) pageMain.inert = true;
    if (pageFooter) pageFooter.inert = true;
    const closeBtn = $('[data-lightbox-close]', lightbox);
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    if (!body.classList.contains('menu-open')) body.classList.remove('no-scroll');
    if (header) header.inert = false;
    if (pageMain) pageMain.inert = false;
    if (pageFooter) pageFooter.inert = false;
    if (lastLightboxTrigger) lastLightboxTrigger.focus({ preventScroll: true });
  }

  lightboxTriggers.forEach((trigger, i) => {
    trigger.addEventListener('click', () => openLightbox(i));
    trigger.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(i); }
    });
  });

  if (lightbox) {
    const closeBtn = $('[data-lightbox-close]', lightbox);
    const prevBtn = $('[data-lightbox-prev]', lightbox);
    const nextBtn = $('[data-lightbox-next]', lightbox);
    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (prevBtn) prevBtn.addEventListener('click', () => { lightboxIndex = (lightboxIndex - 1 + lightboxTriggers.length) % lightboxTriggers.length; renderLightbox(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { lightboxIndex = (lightboxIndex + 1) % lightboxTriggers.length; renderLightbox(); });
    lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', e => {
      if (!lightbox.classList.contains('is-open')) return;
      if (e.key === 'ArrowRight') { lightboxIndex = (lightboxIndex + 1) % lightboxTriggers.length; renderLightbox(); }
      if (e.key === 'ArrowLeft') { lightboxIndex = (lightboxIndex - 1 + lightboxTriggers.length) % lightboxTriggers.length; renderLightbox(); }
    });
  }

  /* ---------- Forms ---------- */
  $$('[data-form]').forEach(form => {
    const inputs = $$('input, select, textarea', form);

    inputs.forEach(input => {
      input.addEventListener('input', () => {
        const wrap = input.closest('.field') || input.closest('.checkbox');
        if (wrap) wrap.classList.remove('has-error');
      });
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      let valid = true;
      let firstInvalid = null;

      inputs.forEach(input => {
        if (!input.required) return;
        const wrap = input.closest('.field') || input.closest('.checkbox');
        const value = input.type === 'checkbox' ? input.checked : input.value.trim();
        let ok = Boolean(value);
        if (ok && input.type === 'email') ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
        if (wrap) wrap.classList.toggle('has-error', !ok);
        if (!ok) {
          valid = false;
          if (!firstInvalid) firstInvalid = input;
        }
      });

      if (!valid) {
        if (firstInvalid) firstInvalid.focus({ preventScroll: false });
        return;
      }

      const scope = form.closest('[data-form-scope]') || document;
      const success = $('[data-success]', scope);
      form.style.display = 'none';
      if (success) {
        success.classList.add('is-visible');
        success.focus({ preventScroll: true });
      }
      form.reset();
    });
  });

  /* ---------- Newsletter ---------- */
  $$('[data-newsletter]').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const input = $('input[type="email"]', form);
      const msg = $('[data-newsletter-msg]', form.parentElement) || $('[data-newsletter-msg]');
      if (!input || !msg) return;
      const value = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        msg.textContent = 'Vul een geldig e-mailadres in.';
        input.focus();
        return;
      }
      msg.textContent = 'Dank u wel — u ontvangt onze selectie per e-mail.';
      form.reset();
    });
  });

  /* ---------- Cursor ---------- */
  if (finePointer && !reduceMotion) {
    const dot = $('.cursor');
    const ring = $('.cursor-ring');
    if (dot && ring) {
      const label = $('.cursor-ring__label', ring);
      let mouseX = window.innerWidth / 2;
      let mouseY = window.innerHeight / 2;
      let ringX = mouseX;
      let ringY = mouseY;
      let shown = false;

      window.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (!shown) {
          shown = true;
          dot.classList.add('is-visible');
          ring.classList.add('is-visible');
        }
        dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      }, { passive: true });

      const loop = () => {
        ringX += (mouseX - ringX) * 0.15;
        ringY += (mouseY - ringY) * 0.15;
        ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
        window.requestAnimationFrame(loop);
      };
      window.requestAnimationFrame(loop);

      document.addEventListener('mouseover', e => {
        const view = e.target.closest('[data-cursor]');
        const link = e.target.closest('a, button, input, select, textarea, .prop, .quote__dot, [data-lightbox]');
        ring.classList.toggle('is-view', Boolean(view));
        ring.classList.toggle('is-link', !view && Boolean(link));
        if (view && label) label.textContent = view.dataset.cursor || 'Bekijk';
      });

      document.documentElement.addEventListener('mouseleave', () => {
        dot.classList.remove('is-visible');
        ring.classList.remove('is-visible');
      });
    }
  }

  /* ---------- Magnetic buttons ---------- */
  if (finePointer && !reduceMotion) {
    $$('[data-magnetic]').forEach(el => {
      let rect = null;
      el.addEventListener('mouseenter', () => { rect = el.getBoundingClientRect(); });
      el.addEventListener('mousemove', e => {
        if (!rect) return;
        const x = clamp((e.clientX - rect.left - rect.width / 2) * 0.14, -7, 7);
        const y = clamp((e.clientY - rect.top - rect.height / 2) * 0.14, -5, 5);
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; rect = null; });
    });
  }

  /* ---------- Hero parallax ---------- */
  const parallaxEls = $$('[data-parallax]');

  function updateParallax() {
    if (reduceMotion) return;
    const y = window.scrollY;
    parallaxEls.forEach(el => {
      const speed = parseFloat(el.dataset.parallax) || 0.12;
      el.style.transform = `translate3d(0, ${(y * speed).toFixed(1)}px, 0)`;
    });
  }
  if (parallaxEls.length) updateParallax();

  /* ---------- Page transitions ---------- */
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const link = e.target.closest('a[href]');
    if (!link) return;
    if (link.target === '_blank' || link.hasAttribute('download') || link.dataset.noTransition !== undefined) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;
    let url;
    try { url = new URL(link.href, window.location.href); } catch (err) { return; }
    if (url.origin !== window.location.origin) return;
    if (url.pathname === window.location.pathname && url.search === window.location.search) return;
    e.preventDefault();
    try { window.sessionStorage.setItem('mille-nav', '1'); } catch (err) {}
    body.classList.add('is-leaving');
    window.setTimeout(() => { window.location.href = url.href; }, reduceMotion ? 0 : 430);
  });

  if (doc.classList.contains('veil-on')) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => doc.classList.remove('veil-on'));
    });
  }

  window.addEventListener('pageshow', () => {
    body.classList.remove('is-leaving', 'no-scroll', 'menu-open');
    doc.classList.remove('is-loading');
    body.classList.add('is-loaded');
    if (menu) menu.classList.remove('is-open');
    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
    if (lightbox) lightbox.classList.remove('is-open');
  });

  /* ---------- Misc ---------- */
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  const path = window.location.pathname.split('/').pop() || 'index.html';
  $$('.nav__link, .menu__link').forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    const isProperty = /^(villa|penthouse|landgoed|landhuis)-/.test(path);
    const active = href === path || (isProperty && href === 'collectie.html');
    if (active) {
      link.classList.add('is-active');
      link.setAttribute('aria-current', 'page');
    }
  });

  $$('[data-top]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  /* Same-page anchor smoothness with fixed header */
  $$('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const id = anchor.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - (window.innerWidth > 860 ? 90 : 74);
      window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  // Initial state
  if (header) header.classList.toggle('is-solid', window.scrollY > 44);
  updateParallax();
})();
