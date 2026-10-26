/* ===========================================================================
   RRHH Simple — interacciones de la interfaz v3 (fase 3)
   Todo es mejora progresiva: si este archivo no carga, la página se ve
   completa y quieta. Con prefers-reduced-motion no se anima nada.
   =========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('ui');

  /* Red de seguridad: si algo falla, a los 2,5 s todo queda visible */
  var safety = setTimeout(function () {
    document.querySelectorAll('[data-split]').forEach(function (el) { el.classList.add('is-in'); });
  }, 2500);

  /* ---------------------------------------------------------------
     Scroll suave con inercia (Lenis, autoalojado)
     --------------------------------------------------------------- */
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ duration: 1.1, smoothWheel: true });
    var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  /* ---------------------------------------------------------------
     Partir texto en palabras sin romper la accesibilidad:
     el texto original queda en aria-label.
     --------------------------------------------------------------- */
  function split(el) {
    var words = [];
    var i = 0;
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var s = document.createElement('span');
            s.className = 'w';
            s.setAttribute('aria-hidden', 'true');
            s.style.setProperty('--i', i++);
            s.textContent = part;
            words.push(s);
            frag.appendChild(s);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    })(el);
    return words;
  }

  // Título de portada: entra palabra a palabra
  document.querySelectorAll('[data-split]').forEach(function (el) {
    split(el);
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('is-in'); }); });
  });

  // Declaración: cada palabra se enciende según el avance del scroll
  var statements = [];
  document.querySelectorAll('[data-words]').forEach(function (el) {
    statements.push({ el: el, words: split(el) });
  });

  /* ---------------------------------------------------------------
     Bucle de scroll: declaración, tarjetas apiladas y cabecera
     --------------------------------------------------------------- */
  var cards = Array.prototype.slice.call(document.querySelectorAll('.stack-card'));
  var ticking = false;

  function onScroll() {
    var vh = window.innerHeight;
    document.body.classList.toggle('is-scrolled', window.scrollY > 40);

    if (!reduce) {
      statements.forEach(function (st) {
        var r = st.el.getBoundingClientRect();
        // 0 cuando el bloque entra por abajo, 1 cuando llega al tercio superior
        var p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.45)));
        var lit = p * st.words.length;
        st.words.forEach(function (w, i) {
          w.style.setProperty('--p', Math.min(1, Math.max(0, lit - i)).toFixed(3));
        });
      });

      cards.forEach(function (card, i) {
        var next = cards[i + 1];
        if (!next) { card.style.setProperty('--cover', 0); return; }
        var a = card.getBoundingClientRect();
        var b = next.getBoundingClientRect();
        var cover = Math.min(1, Math.max(0, (a.bottom - b.top) / a.height));
        card.style.setProperty('--cover', cover.toFixed(3));
      });
    }
    ticking = false;
  }
  function queue() { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  onScroll();

  /* ---------------------------------------------------------------
     Nómina en directo: un lector recorre las líneas marcadas y
     enciende su nota. Se pausa al pasar el cursor o al enfocar,
     y la persona puede elegir línea con el ratón o el teclado.
     --------------------------------------------------------------- */
  document.querySelectorAll('[data-live]').forEach(function (slip) {
    var rows = Array.prototype.slice.call(slip.querySelectorAll('tbody tr'));
    var notes = Array.prototype.slice.call(slip.querySelectorAll('.payslip-note'));
    // Fila marcada → nota que la explica
    var map = [];
    rows.forEach(function (tr) {
      if (tr.querySelector('.flag')) map.push(tr);
    });

    function show(k) {
      rows.forEach(function (tr) { tr.classList.remove('is-reading'); });
      notes.forEach(function (n) { n.classList.remove('is-on'); });
      if (map[k]) map[k].classList.add('is-reading');
      if (notes[k]) notes[k].classList.add('is-on');
    }

    map.forEach(function (tr, k) {
      tr.tabIndex = 0;
      tr.addEventListener('mouseenter', function () { show(k); });
      tr.addEventListener('focus', function () { show(k); });
    });

    if (reduce) return;
    var k = 0, timer = null, paused = false;
    function tick() { if (!paused) { show(k); k = (k + 1) % map.length; } }
    function start() {
      if (timer) return;
      slip.classList.add('is-live');
      tick(); timer = setInterval(tick, 2600);
    }
    slip.addEventListener('mouseenter', function () { paused = true; });
    slip.addEventListener('mouseleave', function () { paused = false; });
    slip.addEventListener('focusin', function () { paused = true; });
    slip.addEventListener('focusout', function () { paused = false; });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es, io) {
        es.forEach(function (e) { if (e.isIntersecting) { start(); io.disconnect(); } });
      }, { threshold: 0.35 }).observe(slip);
    } else { start(); }
  });

  /* ---------------------------------------------------------------
     Menú: píldora deslizante + relevo de texto al pasar el cursor
     --------------------------------------------------------------- */
  var links = document.querySelector('.v3 .nav-links');
  if (links) {
    var hl = document.createElement('span');
    hl.className = 'nav-hl';
    hl.setAttribute('aria-hidden', 'true');
    links.insertBefore(hl, links.firstChild);
    var items = links.querySelectorAll('a:not(.btn)');
    items.forEach(function (a) {
      var t = a.textContent.trim();
      a.setAttribute('aria-label', t);
      a.innerHTML = '<span class="roll" aria-hidden="true"><span>' + t + '</span><span>' + t + '</span></span>';
    });
    var current = links.querySelector('a[aria-current="page"]');
    function moveTo(a, show) {
      if (!a || window.matchMedia('(max-width: 640px)').matches) { hl.style.opacity = 0; return; }
      hl.style.width = a.offsetWidth + 'px';
      hl.style.transform = 'translateX(' + a.offsetLeft + 'px)';
      hl.style.opacity = show ? 1 : 0;
    }
    // Arranca sobre la página actual, sin animación
    hl.style.transition = 'none';
    moveTo(current, !!current);
    requestAnimationFrame(function () { hl.style.transition = ''; });
    items.forEach(function (a) {
      a.addEventListener('mouseenter', function () { moveTo(a, true); });
      a.addEventListener('focus', function () { moveTo(a, true); });
    });
    links.addEventListener('mouseleave', function () { moveTo(current, !!current); });
    window.addEventListener('resize', function () { moveTo(current, !!current); });
  }

  /* ---------------------------------------------------------------
     Fotos en píldora: se abren al entrar en pantalla
     --------------------------------------------------------------- */
  var pills = document.querySelectorAll('[data-pill]');
  if (pills.length) {
    if (reduce || !('IntersectionObserver' in window)) {
      pills.forEach(function (p) { p.classList.add('is-in'); });
    } else {
      var pio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); pio.unobserve(e.target); } });
      }, { threshold: 0.3 });
      pills.forEach(function (p) { pio.observe(p); });
      setTimeout(function () { pills.forEach(function (p) { p.classList.add('is-in'); }); }, 6000);
    }
  }

  // (la red de seguridad se deja correr: no hace daño si todo ya está visible)
})();
