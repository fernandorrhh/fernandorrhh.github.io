/* ---------------------------------------------------------------
   Servicios — cuadros que se abren.
   Los precios salen de precios.js (window.PRECIOS) por data-key; el
   data-price del HTML es solo respaldo. Sin este script todo se ve:
   descripciones visibles y precio al pie de cada cuadro.
   --------------------------------------------------------------- */
(function () {
  var root = document.getElementById('servicios-grid');
  if (!root) return;
  var grid = root.querySelector('.srv-grid');
  var tiles = [].slice.call(root.querySelectorAll('.srv-tile'));
  var chips = [].slice.call(root.querySelectorAll('.srv-chip'));
  var sheet = document.getElementById('srvSheet');
  var panel = sheet.querySelector('.srv-panel');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EASE = 'cubic-bezier(0.23, 1, 0.32, 1)', RADIUS = 28, last = null, busy = false;
  var groupName = { buscar: 'Buscar trabajo', entender: 'Entender lo que firmas', procesos: 'Procesos laborales' };
  var P = window.PRECIOS || {};

  function priceOf(t) {
    var k = t.getAttribute('data-key');
    return (k && P[k]) ? P[k] + ' €' : t.getAttribute('data-price');
  }

  /* Altura de la descripción -> cuánto sube el título al pasar el cursor */
  function measure() {
    tiles.forEach(function (t) {
      var d = t.querySelector('.srv-desc'), ti = t.querySelector('.srv-title'), lift = d.offsetHeight + 16;
      t.style.setProperty('--lift', lift + 'px');
      t.style.setProperty('--need', (48 + 44 + 24 + ti.offsetHeight + lift + 8) + 'px');
    });
  }
  root.classList.add('is-ready');
  measure();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(grid);
  else window.addEventListener('resize', measure);

  /* Filtros: atenúan, no ocultan */
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      var f = c.getAttribute('data-filter');
      chips.forEach(function (x) { x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
      tiles.forEach(function (t) { t.classList.toggle('is-dim', f !== 'todos' && t.getAttribute('data-group') !== f); });
    });
  });

  /* Ficha de detalle: crece desde el cuadro */
  function lockScroll(on) {
    var de = document.documentElement;
    if (on) { var sw = window.innerWidth - de.clientWidth; de.style.overflow = 'hidden'; if (sw > 0) de.style.paddingRight = sw + 'px'; }
    else { de.style.overflow = ''; de.style.paddingRight = ''; }
  }
  function inset(tr, pr) {
    return 'inset(' + (tr.top - pr.top) + 'px ' + (pr.right - tr.right) + 'px ' + (pr.bottom - tr.bottom) + 'px ' + (tr.left - pr.left) + 'px round ' + RADIUS + 'px)';
  }
  function fill(t) {
    var price = priceOf(t), amt = panel.querySelector('.srv-amount'), numeric = /\d/.test(price);
    panel.setAttribute('data-tone', t.getAttribute('data-tone'));
    panel.querySelector('.srv-sheet-group').textContent = groupName[t.getAttribute('data-group')] || '';
    panel.querySelector('.srv-sheet-title').textContent = t.querySelector('.srv-title').textContent;
    panel.querySelector('.srv-sheet-desc').textContent = t.querySelector('.srv-desc').textContent;
    amt.textContent = price;
    amt.classList.toggle('is-text', !numeric);
    panel.querySelector('.srv-vat').style.display = numeric ? '' : 'none';
  }
  function openSheet(t) {
    if (busy) return;
    last = t; fill(t);
    panel.getAnimations().forEach(function (a) { a.cancel(); });
    sheet.showModal(); lockScroll(true); panel.scrollTop = 0;
    requestAnimationFrame(function () { sheet.classList.add('is-open'); });
    if (reduce) { panel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'linear' }); return; }
    panel.animate(
      [{ clipPath: inset(t.getBoundingClientRect(), panel.getBoundingClientRect()) }, { clipPath: 'inset(0px 0px 0px 0px round ' + RADIUS + 'px)' }],
      { duration: 480, easing: EASE }
    );
    [].slice.call(panel.querySelectorAll('[data-r]')).forEach(function (el, i) {
      el.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
        { duration: 460, delay: 150 + i * 60, easing: EASE, fill: 'backwards' });
    });
  }
  function closeSheet() {
    if (busy || !sheet.open) return;
    busy = true; sheet.classList.remove('is-open');
    var done = function () { panel.getAnimations().forEach(function (a) { a.cancel(); }); sheet.close(); lockScroll(false); busy = false; if (last) last.focus({ preventScroll: true }); };
    if (reduce) { panel.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' }).finished.then(done, done); return; }
    var to = inset(last.getBoundingClientRect(), panel.getBoundingClientRect());
    panel.animate([{ clipPath: 'inset(0px 0px 0px 0px round ' + RADIUS + 'px)' }, { clipPath: to }],
      { duration: 320, easing: EASE, fill: 'forwards' }).finished.then(done, done);
  }
  tiles.forEach(function (t) { t.addEventListener('click', function () { openSheet(t); }); });
  sheet.querySelector('.srv-close').addEventListener('click', closeSheet);
  sheet.addEventListener('cancel', function (e) { e.preventDefault(); closeSheet(); });
  sheet.addEventListener('click', function (e) { if (e.target === sheet) closeSheet(); });
})();
