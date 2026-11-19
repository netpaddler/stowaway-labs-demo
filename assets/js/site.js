/* Stowaway Labs: shared site behavior (nav, motion, gallery, email forms). */
(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.remove('no-js');

  // Mobile nav
  var toggle = document.querySelector('[data-nav-toggle]');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    var setOpen = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
    };
    toggle.addEventListener('click', function () { setOpen(toggle.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
  }

  // Header shadow on scroll
  var header = document.querySelector('[data-header]');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Reveal on scroll (respects reduced motion via CSS)
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  // Year
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // Gallery lightbox
  var gallery = document.querySelector('[data-gallery]');
  var box = document.querySelector('[data-lightbox]');
  if (gallery && box && typeof box.showModal === 'function') {
    var items = Array.prototype.slice.call(gallery.querySelectorAll('button'));
    var img = box.querySelector('img');
    var cap = box.querySelector('figcaption');
    var idx = 0;
    var show = function (i) {
      idx = (i + items.length) % items.length;
      var src = items[idx].querySelector('img');
      img.src = src.currentSrc || src.src;
      img.alt = src.alt;
      cap.textContent = items[idx].getAttribute('data-caption') || src.alt;
    };
    items.forEach(function (b, i) {
      b.addEventListener('click', function () { show(i); box.showModal(); });
    });
    box.querySelector('[data-lb-prev]').addEventListener('click', function () { show(idx - 1); });
    box.querySelector('[data-lb-next]').addEventListener('click', function () { show(idx + 1); });
    box.querySelector('[data-lb-close]').addEventListener('click', function () { box.close(); });
    box.addEventListener('click', function (e) { if (e.target === box) box.close(); });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  // Email-composing forms: <form data-mailto="subject">. Builds a tidy email
  // in the visitor's mail app, so nothing is stored anywhere.
  document.querySelectorAll('form[data-mailto]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      form.querySelectorAll('[required]').forEach(function (f) {
        var bad = f.type === 'checkbox' ? !f.checked : !f.value.trim() || (f.type === 'email' && !/^\S+@\S+\.\S+$/.test(f.value));
        f.setAttribute('aria-invalid', bad ? 'true' : 'false');
        if (bad && ok) { f.focus(); ok = false; }
      });
      if (!ok) return;
      var lines = [];
      Array.prototype.forEach.call(form.elements, function (f) {
        if (!f.name || f.type === 'submit') return;
        if ((f.type === 'checkbox' || f.type === 'radio') && !f.checked) return;
        var label = f.getAttribute('data-label') || f.name;
        if (f.value.trim()) lines.push(label + ': ' + f.value.trim());
      });
      var subject = form.getAttribute('data-mailto');
      var href = 'mailto:ahoy@stowawaylabs.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent('Ahoy Stowaway Labs,\n\n' + lines.join('\n') + '\n\nThanks!');
      var done = form.querySelector('[data-success]');
      if (done) { done.hidden = false; done.focus(); }
      window.location.href = href;
    });
  });
})();
