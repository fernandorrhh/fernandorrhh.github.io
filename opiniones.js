/* ===========================================================================
   Opiniones de clientela — RRHH Simple
   1. Página opina.html: la persona escribe su opinión y se envía al
      formulario de Google de Fernando (no pasa por ningún servidor propio).
   2. Bloques [data-opiniones]: leen las opiniones que Fernando ha marcado
      como publicables en su hoja y las muestran en la web.
   Sin configuración (opiniones-config.js vacío), nada se muestra ni se envía.
   =========================================================================== */
(function () {
  'use strict';

  var CFG = window.RRHH_OPINIONES || {};
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  var SERVICIOS = {
    cv: 'Revisión de CV',
    entrevista: 'Simulación de entrevista',
    pack: 'Pack CV + entrevista',
    nomina: 'Nómina, contrato o convenio',
    despido: 'Despido o conflicto',
    tramite: 'Trámite (IRPF, cartas, escritos)',
    excedencia: 'Excedencia o negociación',
    empresa: 'RRHH para empresas',
    igualdad: 'Plan de igualdad',
    otro: 'Otro'
  };
  var ES_EMPRESA = /empresa|igualdad/i;

  function medir(nombre) { if (window.rrhhMedir) window.rrhhMedir(nombre); }

  /* Estrella dibujada en SVG (no un carácter de texto) */
  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.6l2.85 6.03 6.6.79-4.87 4.53 1.27 6.53L12 17.2l-5.85 3.28 1.27-6.53L2.55 9.42l6.6-.79z"/></svg>';
  function estrellas(n) {
    var h = '';
    for (var i = 1; i <= 5; i++) h += '<span class="op-star' + (i <= n ? ' is-on' : '') + '">' + STAR + '</span>';
    return h;
  }

  /* -------------------------------------------------------------
     1. Página para opinar
     ------------------------------------------------------------- */
  var form = document.getElementById('opinaForm');
  if (form) iniciarFormulario(form);

  function iniciarFormulario(form) {
    var activo = !!(CFG.formulario && CFG.campos && CFG.campos.opinion);
    var status = form.querySelector('.form-status');
    var submit = form.querySelector('button[type="submit"]');
    var select = form.querySelector('#op-servicio');
    var texto = form.querySelector('#op-opinion');
    var contador = form.querySelector('#op-contador');

    // Opciones del desplegable y servicio rellenado desde el enlace (?servicio=cv)
    Object.keys(SERVICIOS).forEach(function (k) {
      var o = document.createElement('option');
      o.value = SERVICIOS[k]; o.textContent = SERVICIOS[k];
      select.appendChild(o);
    });
    var pedido = new URLSearchParams(location.search).get('servicio');
    if (pedido && SERVICIOS[pedido]) select.value = SERVICIOS[pedido];

    if (texto && contador) {
      var max = parseInt(texto.getAttribute('maxlength'), 10) || 700;
      var contar = function () { contador.textContent = texto.value.length + ' / ' + max; };
      texto.addEventListener('input', contar); contar();
    }

    if (!activo) {
      submit.disabled = true;
      estado('error', '<strong>El formulario todavía no está activo.</strong> Si quieres dejar tu opinión ya, escríbela a <a class="link" href="mailto:fernando@rrhhsimple.com">fernando@rrhhsimple.com</a>.');
    }

    function estado(tono, html) {
      if (!status) return;
      status.hidden = false; status.dataset.tone = tono;
      status.innerHTML = '<span>' + html + '</span>';
    }

    // Errores propios bajo cada campo
    function errorDe(id) { return document.getElementById('err-' + id); }
    function marcar(campo, msg, ancla) {
      var id = ancla.id || campo.id;
      if (errorDe(id)) return;
      var p = document.createElement('p');
      p.className = 'field-error'; p.id = 'err-' + id; p.textContent = msg;
      ancla.insertAdjacentElement('afterend', p);
      campo.setAttribute('aria-invalid', 'true');
      campo.setAttribute('aria-describedby', p.id);
    }
    function limpiar(campo, ancla) {
      var p = errorDe(ancla.id || campo.id); if (p) p.remove();
      campo.removeAttribute('aria-invalid'); campo.removeAttribute('aria-describedby');
    }

    var nombre = form.querySelector('#op-nombre');
    var rate = form.querySelector('#op-rate');
    var acepto = form.querySelector('#op-acepto');
    var aceptoFila = form.querySelector('#op-acepto-fila');

    function validar() {
      var primero = null;
      var reglas = [
        [nombre, !nombre.value.trim(), 'Escribe cómo quieres que aparezca tu nombre: vale con el nombre de pila o tus iniciales.', nombre],
        [rate.querySelector('input'), !rate.querySelector('input:checked'), 'Elige una puntuación de 1 a 5.', rate],
        [texto, texto.value.trim().length < 10, 'Cuéntame un poco más: con dos o tres frases es suficiente.', texto],
        [acepto, !acepto.checked, 'Para publicarla necesito tu permiso. Si prefieres que no se publique, escríbeme.', aceptoFila]
      ];
      reglas.forEach(function (r) {
        if (r[1]) { marcar(r[0], r[2], r[3]); if (!primero) primero = r[0]; }
        else limpiar(r[0], r[3]);
      });
      return primero;
    }
    [nombre, texto].forEach(function (c) { c.addEventListener('input', function () { if (c.value.trim().length >= (c === texto ? 10 : 1)) limpiar(c, c); }); });
    rate.addEventListener('change', function () { limpiar(rate.querySelector('input'), rate); });
    acepto.addEventListener('change', function () { if (acepto.checked) limpiar(acepto, aceptoFila); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!activo) return;
      var fallo = validar();
      if (fallo) { estado('error', '<strong>Falta algún dato.</strong> Revisa los campos marcados.'); fallo.focus(); return; }

      var c = CFG.campos;
      var datos = new URLSearchParams();
      datos.append(c.nombre, nombre.value.trim());
      datos.append(c.servicio, select.value);
      datos.append(c.puntuacion, rate.querySelector('input:checked').value);
      datos.append(c.opinion, texto.value.trim());
      if (c.consentimiento) datos.append(c.consentimiento, 'Sí');

      submit.setAttribute('aria-busy', 'true');
      submit.innerHTML = '<span class="spinner" aria-hidden="true"></span>Enviando…';
      if (status) status.hidden = true;

      // Google no deja leer la respuesta desde otra web (modo no-cors):
      // si la petición sale, la opinión ha llegado al formulario.
      fetch(CFG.formulario, { method: 'POST', mode: 'no-cors', body: datos })
        .then(function () {
          medir('opinion-enviada');
          var ok = document.getElementById('opinaOk');
          form.hidden = true;
          if (ok) { ok.hidden = false; ok.focus(); ok.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }
        })
        .catch(function () {
          submit.removeAttribute('aria-busy');
          submit.textContent = 'Enviar mi opinión';
          estado('error', '<strong>No se ha podido enviar.</strong> Revisa la conexión e inténtalo de nuevo, o mándamela a <a class="link" href="mailto:fernando@rrhhsimple.com">fernando@rrhhsimple.com</a>.');
        });
    });
  }

  /* -------------------------------------------------------------
     2. Bloques de opiniones en la web
     ------------------------------------------------------------- */
  var bloques = Array.prototype.slice.call(document.querySelectorAll('[data-opiniones]'));
  if (!bloques.length || !CFG.hoja) return;

  fetch(CFG.hoja)
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(function (csv) {
      var lista = aOpiniones(leerCSV(csv));
      bloques.forEach(function (b) { pintar(b, lista); });
    })
    .catch(function () { /* sin opiniones visibles: la página sigue igual */ });

  // CSV con comillas, comas y saltos de línea dentro de los campos
  function leerCSV(t) {
    var filas = [], fila = [], campo = '', q = false;
    for (var i = 0; i < t.length; i++) {
      var ch = t[i];
      if (q) {
        if (ch === '"') { if (t[i + 1] === '"') { campo += '"'; i++; } else q = false; }
        else campo += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { fila.push(campo); campo = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && t[i + 1] === '\n') i++;
        fila.push(campo); filas.push(fila); fila = []; campo = '';
      } else campo += ch;
    }
    if (campo || fila.length) { fila.push(campo); filas.push(fila); }
    return filas.filter(function (f) { return f.some(function (c) { return c.trim(); }); });
  }

  function normal(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }

  function aOpiniones(filas) {
    if (filas.length < 2) return [];
    var cab = filas[0].map(normal);
    function col(clave, defecto) { var i = cab.findIndex(function (c) { return c.indexOf(clave) === 0; }); return i >= 0 ? i : defecto; }
    var iNom = col('nombre', 0), iSer = col('servicio', 1), iPun = col('puntuacion', 2), iOpi = col('opinion', 3), iFec = col('marca temporal', 4);
    return filas.slice(1).map(function (f) {
      return {
        nombre: (f[iNom] || '').trim(),
        servicio: (f[iSer] || '').trim(),
        puntos: Math.max(0, Math.min(5, parseInt(f[iPun], 10) || 0)),
        texto: (f[iOpi] || '').trim(),
        fecha: aFecha(f[iFec])
      };
    }).filter(function (o) { return o.texto && o.nombre && o.puntos >= 1; })
      .sort(function (a, b) { return (b.fecha || 0) - (a.fecha || 0); });
  }

  // «31/10/2026 22:30:00» (hoja en español) o fecha ISO
  function aFecha(s) {
    s = (s || '').trim(); if (!s) return null;
    var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
    var d = new Date(s); return isNaN(d) ? null : d;
  }

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  function pintar(bloque, todas) {
    var filtro = bloque.getAttribute('data-opiniones');
    var lista = todas.filter(function (o) {
      if (filtro === 'empresas') return ES_EMPRESA.test(o.servicio);
      if (filtro === 'personas') return !ES_EMPRESA.test(o.servicio);
      return true;
    });
    if (!lista.length) return;   // sin opiniones aprobadas, el bloque no aparece

    var max = parseInt(bloque.getAttribute('data-max'), 10) || 6;
    var media = lista.reduce(function (s, o) { return s + o.puntos; }, 0) / lista.length;

    var cab = el('div', 'op-head');
    var tit = el('h2', 'title op-title', bloque.getAttribute('data-titulo') || 'Lo que dice quien ya ha pasado por aquí');
    tit.id = 'op-tit-' + filtro;
    cab.appendChild(tit);
    if (lista.length >= 3) {
      var resumen = el('p', 'op-summary');
      resumen.innerHTML = '<span class="op-avg">' + media.toFixed(1).replace('.', ',') + '</span>' +
        '<span class="op-stars" role="img" aria-label="Media de ' + media.toFixed(1).replace('.', ',') + ' sobre 5">' + estrellas(Math.round(media)) + '</span>' +
        '<span class="op-count">' + lista.length + ' opiniones</span>';
      cab.appendChild(resumen);
    }
    bloque.setAttribute('aria-labelledby', tit.id);

    var ul = el('ul', 'op-list'); ul.setAttribute('role', 'list');
    // En móvil la lista se desliza en horizontal: debe poder recorrerse con teclado
    ul.setAttribute('tabindex', '0'); ul.setAttribute('aria-label', 'Opiniones');
    lista.forEach(function (o, i) {
      var li = el('li', 'op-card' + (i >= max ? ' is-extra' : ''));
      var st = el('div', 'op-stars'); st.setAttribute('role', 'img'); st.setAttribute('aria-label', o.puntos + ' de 5'); st.innerHTML = estrellas(o.puntos);
      var q = el('blockquote', 'op-text'); q.appendChild(el('p', null, o.texto));
      var meta = el('p', 'op-meta');
      meta.appendChild(el('strong', null, o.nombre));
      var linea = [o.servicio, o.fecha ? MESES[o.fecha.getMonth()] + ' ' + o.fecha.getFullYear() : ''].filter(Boolean).join(' · ');
      if (linea) meta.appendChild(el('span', null, linea));
      li.appendChild(st); li.appendChild(q); li.appendChild(meta);
      ul.appendChild(li);
    });

    var nota = el('p', 'note op-note', 'Opiniones escritas por personas que han contratado un servicio: les envío el enlace al terminarlo. Se publican todas, salvo las que incluyen insultos o datos personales de otras personas.');

    bloque.innerHTML = '';
    bloque.appendChild(cab);
    bloque.appendChild(ul);
    if (lista.length > max) {
      var mas = el('button', 'task-more op-more', 'Ver las ' + lista.length + ' opiniones');
      mas.type = 'button';
      mas.addEventListener('click', function () {
        ul.classList.add('is-all'); mas.remove();
        var sig = ul.children[max]; if (sig) { sig.setAttribute('tabindex', '-1'); sig.focus(); }
      });
      bloque.appendChild(mas);
    }
    bloque.appendChild(nota);
    bloque.hidden = false;

    // «Leer más» solo en las opiniones que no caben
    requestAnimationFrame(function () {
      ul.querySelectorAll('.op-text').forEach(function (q, i) {
        var p = q.querySelector('p');
        if (!p || p.scrollHeight <= p.clientHeight + 2) return;
        var b = el('button', 'op-readmore', 'Leer más'); b.type = 'button';
        b.setAttribute('aria-expanded', 'false');
        b.addEventListener('click', function () {
          var abierto = q.classList.toggle('is-open');
          b.textContent = abierto ? 'Leer menos' : 'Leer más';
          b.setAttribute('aria-expanded', String(abierto));
        });
        q.insertAdjacentElement('afterend', b);
      });
    });
  }
})();
