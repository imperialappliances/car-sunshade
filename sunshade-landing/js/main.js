/* Sun shade landing page. Plain JavaScript, no libraries. */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ------------------------------------------------------------------
     Ad tracking. Fires only if the pixel code has been added to <head>.
     ------------------------------------------------------------------ */
  var TIKTOK_EVENTS = { ViewContent: 'ViewContent', InitiateCheckout: 'InitiateCheckout', Lead: 'SubmitForm' };
  function track(event, data) {
    try { if (window.fbq) window.fbq('track', event, data || {}); } catch (e) {}
    try { if (window.ttq && TIKTOK_EVENTS[event]) window.ttq.track(TIKTOK_EVENTS[event], data || {}); } catch (e) {}
  }
  track('ViewContent', { content_name: 'Car Windshield Sun Shade Umbrella' });

  /* ------------------------------------------------------------------
     UTM capture: remembers which ad the visitor came from so it is sent
     with the order. Add e.g. ?utm_source=facebook&utm_campaign=shade1
     to the links in your ads.
     ------------------------------------------------------------------ */
  var AD_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'ttclid'];
  function getAdData() {
    var found = {};
    var params = new URLSearchParams(window.location.search);
    AD_KEYS.forEach(function (k) { if (params.get(k)) found[k] = params.get(k); });
    try {
      if (Object.keys(found).length) sessionStorage.setItem('adData', JSON.stringify(found));
      else found = JSON.parse(sessionStorage.getItem('adData') || '{}');
    } catch (e) {}
    return found;
  }
  var adData = getAdData();

  /* ------------------------------------------------------------------
     Carousels (gallery, reviews)
     Markup: [data-carousel] > [data-track] > [data-slide]
     Optional: [data-prev] [data-next] buttons, [data-dot] buttons.
     ------------------------------------------------------------------ */
  $$('[data-carousel]').forEach(function (root) {
    var track_ = $('[data-track]', root);
    var slides = $$('[data-slide]', root);
    var prev = $('[data-prev]', root);
    var next = $('[data-next]', root);
    var dots = $$('[data-dot]', root);
    var current = 0;
    if (!track_ || !slides.length) return;

    function maxScroll() { return track_.scrollWidth - track_.clientWidth; }
    function goTo(i) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      track_.scrollTo({ left: Math.min(slides[i].offsetLeft, maxScroll()), behavior: 'smooth' });
    }
    function update() {
      var x = track_.scrollLeft, best = 0, bestDist = Infinity;
      slides.forEach(function (s, i) {
        var d = Math.abs(s.offsetLeft - x);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      if (maxScroll() > 0 && x >= maxScroll() - 2) best = slides.length - 1;
      current = best;
      dots.forEach(function (d, i) {
        d.classList.toggle('is-active', i === current);
        var bar = d.parentElement;
        if (i === current && bar.scrollWidth > bar.clientWidth) {
          bar.scrollTo({ left: d.offsetLeft - bar.clientWidth / 2 + d.clientWidth / 2, behavior: 'smooth' });
        }
      });
      var scrollable = maxScroll() > 2;
      if (prev) prev.disabled = !scrollable || x <= 2;
      if (next) next.disabled = !scrollable || x >= maxScroll() - 2;
    }

    if (prev) prev.addEventListener('click', function () { goTo(current - 1); });
    if (next) next.addEventListener('click', function () { goTo(current + 1); });
    dots.forEach(function (d, i) { d.addEventListener('click', function () { goTo(i); }); });

    var ticking = false;
    track_.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { update(); ticking = false; });
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  /* ------------------------------------------------------------------
     How to use: ONE continuous video split into timed steps.
     Each step button has data-start (seconds). The active tile, its bar
     and the dotted progress line all follow the video clock.
     With no video file yet, a timer of data-duration seconds stands in.
     ------------------------------------------------------------------ */
  $$('[data-how]').forEach(function (root) {
    var video = $('video', root);
    var list = $('[data-how-steps]', root);
    var steps = $$('.how__step', root);
    var dotsBox = $('[data-how-dots]', root);
    var fill = $('[data-how-fill]', root);
    if (!steps.length) return;

    var starts = steps.map(function (s) { return parseFloat(s.getAttribute('data-start')) || 0; });
    var fallbackDuration = parseFloat(root.getAttribute('data-duration')) || (starts[starts.length - 1] + 5);
    var hasVideo = !!(video && (video.getAttribute('src') || $('source', video)));
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var simTime = 0, lastTick = 0, inView = false, active = -1, raf = 0;

    if (video) video.addEventListener('error', function () { hasVideo = false; }, true);

    var dots = steps.map(function (step, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'steps__dot';
      b.setAttribute('aria-label', 'Step ' + (i + 1) + ': ' + $('strong', step).textContent);
      b.addEventListener('click', function () { seek(i); });
      dotsBox.appendChild(b);
      return b;
    });
    steps.forEach(function (step, i) { step.addEventListener('click', function () { seek(i); }); });

    function duration() { return hasVideo && isFinite(video.duration) && video.duration > 0 ? video.duration : fallbackDuration; }
    function now() { return hasVideo ? video.currentTime : simTime; }
    function play() {
      if (!hasVideo) return;
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    }
    function seek(i) {
      if (hasVideo) {
        try { video.currentTime = starts[i]; } catch (e) {}
        if (inView && !reduceMotion) play();
      } else {
        simTime = starts[i];
      }
      render();
    }

    function render() {
      var t = now(), total = duration(), i = 0;
      for (var k = 0; k < starts.length; k++) if (t >= starts[k]) i = k;
      var end = i + 1 < starts.length ? starts[i + 1] : total;
      var frac = Math.max(0, Math.min(1, (t - starts[i]) / Math.max(0.1, end - starts[i])));

      $('.how__bar', steps[i]).style.width = (frac * 100) + '%';
      if (fill) fill.style.width = Math.min(100, ((i + frac) / Math.max(1, steps.length - 1)) * 100) + '%';

      if (i !== active) {
        active = i;
        steps.forEach(function (s, n) {
          s.classList.toggle('is-active', n === i);
          s.setAttribute('aria-current', n === i ? 'step' : 'false');
        });
        dots.forEach(function (d, n) { d.classList.toggle('is-active', n === i); });
        if (list.scrollWidth > list.clientWidth + 2) {
          list.scrollTo({ left: steps[i].parentElement.offsetLeft, behavior: reduceMotion ? 'auto' : 'smooth' });
        }
      }
    }

    function tick(ts) {
      if (!hasVideo && lastTick) {
        simTime += (ts - lastTick) / 1000;
        if (simTime >= fallbackDuration) simTime = 0;
      }
      lastTick = ts;
      render();
      raf = requestAnimationFrame(tick);
    }
    function start() {
      if (reduceMotion || raf) return;
      lastTick = 0;
      play();
      raf = requestAnimationFrame(tick);
    }
    function stop() {
      cancelAnimationFrame(raf);
      raf = 0;
      if (hasVideo) video.pause();
    }

    // Only play while the section is on screen (saves the visitor's data).
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView) start(); else stop();
      }, { threshold: 0.35 }).observe(root);
    } else {
      inView = true;
      start();
    }
    render();
  });

  /* ------------------------------------------------------------------
     Read more (product description)
     ------------------------------------------------------------------ */
  var readMore = $('[data-readmore]');
  if (readMore) {
    var desc = document.getElementById(readMore.getAttribute('aria-controls'));
    readMore.addEventListener('click', function () {
      var open = desc.classList.toggle('is-open');
      readMore.setAttribute('aria-expanded', String(open));
      readMore.textContent = open ? 'Read less' : 'Read more';
    });
  }

  /* ------------------------------------------------------------------
     Quantity cards -> summary. The summary copies whatever text is in
     the selected card, so prices only need editing in index.html.
     ------------------------------------------------------------------ */
  var form = $('#order');
  function text(el, sel) { var n = $(sel, el); return n ? n.textContent.trim() : ''; }
  function updateSummary() {
    var checked = $('input[name="package"]:checked', form);
    if (!checked) return;
    var card = checked.closest('.tier');
    var set = function (key, value) { var n = $('[data-sum="' + key + '"]', form); if (n) n.textContent = value; };
    set('name', text(card, '.tier__name').toLowerCase());
    set('was', text(card, '.tier__was'));
    set('price', text(card, '.tier__price'));
    set('ship', text(card, '.tier__ship'));
    var ship = $('[data-sum="ship"]', form);
    if (ship) ship.style.color = $('.tier__ship--free', card) ? '' : 'inherit';
  }
  if (form) {
    $$('input[name="package"]', form).forEach(function (r) { r.addEventListener('change', updateSummary); });
    updateSummary();
  }

  /* ------------------------------------------------------------------
     Order form: validate, send, show thank-you.
     Works with FormSubmit and Formspree (the form's "action").
     ------------------------------------------------------------------ */
  function validate() {
    var firstBad = null;
    $$('.field', form).forEach(function (field) {
      var input = $('input, textarea', field);
      var error = $('.field__error', field);
      if (!input || !input.required) return;
      var value = input.value.trim();
      var ok = value.length > 1;
      if (input.type === 'tel') ok = value.replace(/\D/g, '').length >= 9;
      field.classList.toggle('is-invalid', !ok);
      input.setAttribute('aria-invalid', String(!ok));
      if (error) error.hidden = ok;
      if (!ok && !firstBad) firstBad = input;
    });
    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  if (form) {
    var started = false;
    form.addEventListener('focusin', function () {
      if (started) return;
      started = true;
      track('InitiateCheckout');
    });

    $$('.field input, .field textarea', form).forEach(function (input) {
      input.addEventListener('input', function () {
        var field = input.closest('.field');
        if (!field.classList.contains('is-invalid')) return;
        field.classList.remove('is-invalid');
        input.removeAttribute('aria-invalid');
        var error = $('.field__error', field);
        if (error) error.hidden = true;
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var button = $('[data-submit]', form);
      var label = $('[data-submit-label]', form);
      var errorBox = $('[data-form-error]', form);
      errorBox.hidden = true;
      if (!validate()) return;

      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = typeof v === 'string' ? v.trim() : v; });
      if (data._honey) return;            // a bot filled the hidden field
      delete data._honey;

      var card = $('input[name="package"]:checked', form).closest('.tier');
      data.price = text(card, '.tier__price');
      data.delivery = text(card, '.tier__ship');
      Object.keys(adData).forEach(function (k) { data[k] = adData[k]; });
      data.page = window.location.href.split('?')[0];
      data._subject = 'New order: ' + data.package + ' (' + data.name + ')';

      var endpoint = form.action;
      if (endpoint.indexOf('formsubmit.co/') > -1 && endpoint.indexOf('/ajax/') === -1) {
        endpoint = endpoint.replace('formsubmit.co/', 'formsubmit.co/ajax/');
        data._template = 'table';
        data._captcha = 'false';
      }

      var original = label.textContent;
      button.disabled = true;
      label.textContent = 'Sending…';

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (body) {
            if (!res.ok || String(body.success) === 'false') throw new Error('Form service rejected the order');
          });
        })
        .then(function () {
          track('Lead', { content_name: data.package });
          var thanks = $('#thanks');
          form.hidden = true;
          thanks.hidden = false;
          thanks.focus();
          thanks.scrollIntoView({ block: 'center' });
          var sticky = $('[data-sticky]');
          if (sticky) sticky.remove();
          document.body.style.paddingBottom = '0';
        })
        .catch(function () {
          errorBox.hidden = false;
          button.disabled = false;
          label.textContent = original;
        });
    });
  }

  /* ------------------------------------------------------------------
     Sticky bar: appears once the order form has scrolled out of view.
     ------------------------------------------------------------------ */
  var sticky = $('[data-sticky]');
  if (sticky && form && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      sticky.classList.toggle('is-visible', !e.isIntersecting && e.boundingClientRect.bottom < 0);
    }).observe(form);
  }

  var year = $('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();
