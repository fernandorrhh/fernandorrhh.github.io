/* ===========================================================================
   Empresas — selector de tareas y aviso de presupuesto
   - Cada tarea es una casilla real: se puede usar con teclado y lector de pantalla.
   - El aviso flotante no bloquea: aparece al marcar la primera tarea y deja
     seguir eligiendo. Su botón baja al formulario, que ya lleva las tareas.
   - Se esconde cuando el formulario está a la vista, porque ahí sobra.
   =========================================================================== */
(function () {
  var casillas = Array.prototype.slice.call(document.querySelectorAll('input[name="tarea"]'));
  var pop = document.getElementById('quotePop');
  if (!casillas.length || !pop) return;

  var cuenta = document.getElementById('quoteCount');
  var lista = document.getElementById('quoteList');
  var ir = document.getElementById('quoteGo');
  var vaciar = document.getElementById('quoteClear');
  var resumen = document.getElementById('taskSummary');
  var formSeccion = document.getElementById('presupuesto');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var formVisible = false;
  var vaciarResumen = resumen ? resumen.innerHTML : '';

  function elegidas() {
    return casillas.filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
  }

  function texto(n) { return n === 1 ? '1 tarea elegida' : n + ' tareas elegidas'; }

  function pintar() {
    var sel = elegidas(), n = sel.length;

    cuenta.textContent = texto(n);
    lista.textContent = n ? '· ' + sel.slice(0, 2).join(', ') + (n > 2 ? ' y ' + (n - 2) + ' más' : '') : '';

    if (resumen) {
      if (n) {
        resumen.innerHTML = '';
        var ul = document.createElement('ul');
        ul.className = 'task-summary-list';
        sel.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
        var cambiar = document.createElement('a');
        cambiar.className = 'link'; cambiar.href = '#tareas'; cambiar.textContent = 'Cambiar la selección';
        resumen.appendChild(ul); resumen.appendChild(cambiar);
      } else {
        resumen.innerHTML = vaciarResumen;
      }
    }

    mostrar(n > 0 && !formVisible);
  }

  function mostrar(si) {
    if (si && pop.hidden) {
      pop.hidden = false;
      if (!reduce) { pop.classList.remove('is-in'); void pop.offsetWidth; }
      pop.classList.add('is-in');
    } else if (!si && !pop.hidden) {
      pop.classList.remove('is-in');
      if (reduce) { pop.hidden = true; return; }
      setTimeout(function () { if (!pop.classList.contains('is-in')) pop.hidden = true; }, 240);
    }
  }

  function bajarA(el, despues) {
    if (window.__lenis) {
      window.__lenis.scrollTo(el, { offset: -96, onComplete: despues });
    } else {
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      setTimeout(despues, reduce ? 0 : 600);
    }
  }

  casillas.forEach(function (c) {
    c.addEventListener('change', function () {
      pintar();
      if (!reduce && !pop.hidden) { pop.classList.remove('is-bump'); void pop.offsetWidth; pop.classList.add('is-bump'); }
    });
  });

  ir.addEventListener('click', function (e) {
    e.preventDefault();
    bajarA(formSeccion, function () {
      var campo = document.getElementById('e-empresa');
      if (campo && !campo.value) campo.focus({ preventScroll: true });
    });
  });

  vaciar.addEventListener('click', function () {
    casillas.forEach(function (c) { c.checked = false; });
    pintar();
  });

  /* Enlaces internos a la lista (desde el resumen del formulario) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href="#tareas"], a[href="#presupuesto"]');
    if (!a) return;
    e.preventDefault();
    var menu = document.getElementById('navLinks');
    if (menu && menu.classList.contains('is-open')) { var t = document.getElementById('menuToggle'); if (t) t.click(); }
    if (a.getAttribute('href') === '#tareas') {
      bajarA(document.getElementById('tareas'), function () { casillas[0].focus({ preventScroll: true }); });
    } else {
      bajarA(formSeccion, function () { var c = document.getElementById('e-empresa'); if (c && !c.value) c.focus({ preventScroll: true }); });
    }
  });

  if ('IntersectionObserver' in window && formSeccion) {
    new IntersectionObserver(function (entradas) {
      formVisible = entradas[0].isIntersecting;
      mostrar(elegidas().length > 0 && !formVisible);
    }, { threshold: 0.15 }).observe(formSeccion);
  }

  /* En móvil, cada bloque enseña 4 tareas y un botón para ver el resto:
     las 24 seguidas ocupaban varias pantallas antes de llegar al precio. */
  var VISIBLES = 4;
  var estrecho = window.matchMedia('(max-width: 640px)');
  var listas = Array.prototype.slice.call(document.querySelectorAll('.task-list'));
  listas.forEach(function (ul, i) {
    var total = ul.children.length;
    if (total <= VISIBLES + 1) return;
    ul.id = ul.id || 'tareas-' + (i + 1);
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'task-more';
    b.setAttribute('aria-controls', ul.id);
    b.setAttribute('aria-expanded', 'false');
    b.textContent = 'Ver las ' + (total - VISIBLES) + ' restantes';
    b.addEventListener('click', function () {
      var abrir = ul.classList.contains('is-collapsed');
      ul.classList.toggle('is-collapsed', !abrir);
      b.setAttribute('aria-expanded', String(abrir));
      b.textContent = abrir ? 'Ver menos' : 'Ver las ' + (total - VISIBLES) + ' restantes';
      if (abrir) { var sig = ul.children[VISIBLES]; var c = sig && sig.querySelector('input'); if (c) c.focus(); }
    });
    ul.insertAdjacentElement('afterend', b);
    ul.__boton = b;
  });
  function ajustarListas() {
    listas.forEach(function (ul) {
      if (!ul.__boton) return;
      ul.classList.toggle('is-collapsed', estrecho.matches && ul.__boton.getAttribute('aria-expanded') !== 'true');
      ul.__boton.hidden = !estrecho.matches;
    });
  }
  if (estrecho.addEventListener) estrecho.addEventListener('change', ajustarListas); else estrecho.addListener(ajustarListas);
  ajustarListas();

  /* Al volver atrás el navegador puede recordar las casillas marcadas */
  window.addEventListener('pageshow', pintar);
  pintar();
})();
