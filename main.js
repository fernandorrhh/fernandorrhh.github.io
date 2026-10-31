/* RRHH Simple — comportamiento compartido
   Sin dependencias. Todo degrada si el script no carga. */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------
     Menú en móvil
     --------------------------------------------------------------- */
  var toggle = document.getElementById('menuToggle');
  var links = document.getElementById('navLinks');

  if (toggle && links) {
    var setMenu = function (open) {
      links.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.textContent = open ? 'Cerrar' : 'Menú';
    };
    toggle.addEventListener('click', function () {
      setMenu(!links.classList.contains('is-open'));
    });
    links.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && links.classList.contains('is-open')) {
        setMenu(false);
        toggle.focus();
      }
    });
  }

  /* ---------------------------------------------------------------
     Entrada por scroll.
     El contenido ya es visible sin JS; esto sólo añade el movimiento,
     y hay una red de seguridad por si el observador no llega a disparar.
     --------------------------------------------------------------- */
  // Avisa al script de la cabecera de que main.js ya se encarga de mostrar
  // el contenido, para que no dispare su red de seguridad.
  window.__riseReady = true;

  var risers = document.querySelectorAll('[data-rise]');

  function revealAll() {
    for (var i = 0; i < risers.length; i++) risers[i].classList.add('is-in');
  }

  if (reduce || !('IntersectionObserver' in window) || !risers.length) {
    revealAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });

    risers.forEach(function (el) { io.observe(el); });
    setTimeout(revealAll, 3000);
  }

  /* ---------------------------------------------------------------
     Calendario de reservas (reservar.html)
     El iframe de Google no se carga hasta que la persona lo pide.
     --------------------------------------------------------------- */
  var loadBtn = document.getElementById('loadCal');
  var holder = document.getElementById('calHolder');

  if (loadBtn && holder) {
    /* Botón de la cabecera: abre el mismo calendario en la página.
       Sin JavaScript, el enlace abre el calendario en otra pestaña. */
    document.querySelectorAll('[data-open-cal]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); loadBtn.click(); });
    });
    loadBtn.addEventListener('click', function () {
      if (holder.querySelector('iframe')) {
        holder.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        return;
      }

      loadBtn.setAttribute('aria-busy', 'true');
      loadBtn.innerHTML = '<span class="spinner" aria-hidden="true"></span>Abriendo el calendario…';

      var skeleton = document.createElement('p');
      skeleton.className = 'cal-skeleton';
      skeleton.textContent = 'Cargando los huecos disponibles…';
      holder.appendChild(skeleton);
      holder.hidden = false;
      holder.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });

      // El iframe se añade visible y sin carga diferida: si se oculta o se
      // marca como lazy, el navegador no lo carga y el aviso no se quita nunca.
      var frame = document.createElement('iframe');
      frame.src = holder.getAttribute('data-src');
      frame.title = 'Calendario para reservar la primera consulta gratuita';
      frame.className = 'cal-frame';
      holder.appendChild(frame);

      var listo = false;
      function terminar() {
        if (listo) return;
        listo = true;
        skeleton.remove();
        loadBtn.removeAttribute('aria-busy');
        loadBtn.textContent = 'Ir al calendario';
      }
      frame.addEventListener('load', terminar);
      // Red de seguridad: si el evento de carga no llega, el aviso se quita igual.
      setTimeout(terminar, 8000);
    });
  }

  /* ---------------------------------------------------------------
     Formulario de contacto (contacto.html)
     No hay backend: se abre WhatsApp o el correo con el mensaje escrito.
     Lo importante es que la persona sepa que ha pasado algo, y tenga
     salida si el navegador bloquea la ventana.
     --------------------------------------------------------------- */
  var WHATSAPP = '34638292643';
  var EMAIL = 'fernando@rrhhsimple.com';

  function val(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? el.value.trim() : '';
  }

  // Formulario de contacto (contacto.html)
  iniciarFormulario(document.getElementById('contactForm'), function (f) {
    var nombre = val(f, 'nombre');
    return {
      asunto: 'Consulta laboral desde RRHH Simple — ' + nombre,
      texto:
        'Hola, Fernando. Soy ' + nombre + ' (' + val(f, 'perfil') + ').\n' +
        'Sobre: ' + val(f, 'necesidad') + '\n' +
        'Mi caso: ' + val(f, 'mensaje') + '\n\n' +
        'Vengo desde la web de RRHH Simple.'
    };
  });

  // Solicitud de servicio a medida (empresas.html)
  iniciarFormulario(document.getElementById('empresaForm'), function (f) {
    var servicios = [];
    f.querySelectorAll('input[name="servicio"]:checked').forEach(function (c) { servicios.push(c.value); });
    /* Las tareas se marcan en la lista de arriba, fuera del formulario */
    var porGrupo = {}, orden = [];
    document.querySelectorAll('input[name="tarea"]:checked').forEach(function (c) {
      var g = c.getAttribute('data-grupo') || 'Otras';
      if (!porGrupo[g]) { porGrupo[g] = []; orden.push(g); }
      porGrupo[g].push(c.value);
    });
    var tareas = orden.map(function (g) { return '- ' + g + ': ' + porGrupo[g].join(', '); }).join('\n');
    var empresa = val(f, 'empresa');
    return {
      asunto: 'Presupuesto RRHH — ' + empresa,
      texto:
        'Hola, Fernando. Os escribo desde ' + empresa + '.\n' +
        'Persona de contacto: ' + val(f, 'nombre') + '\n' +
        'Tamaño de la plantilla: ' + val(f, 'plantilla') + '\n' +
        'Tareas que nos interesan:\n' + (tareas || '- Por concretar') + '\n' +
        (servicios.length ? 'Además: ' + servicios.join(', ') + '\n' : '') +
        'Modalidad: ' + val(f, 'duracion') + '\n' +
        'Lo que necesitamos: ' + val(f, 'mensaje') + '\n' +
        'Para la videollamada, mejor: ' + (val(f, 'horario') || 'cualquier momento') + '\n\n' +
        'Escrito desde la web de RRHH Simple.'
    };
  });

  /* No hay backend: se abre WhatsApp o el correo con el mensaje escrito.
     Lo importante es que la persona sepa que ha pasado algo, y tenga
     salida si el navegador bloquea la ventana. */
  function iniciarFormulario(form, construir) {
    if (!form) return;
    var submitBtn = form.querySelector('button[type="submit"]');
    var status = form.querySelector('.form-status');

    function canalActual() {
      var checked = form.querySelector('input[name="canal"]:checked');
      return checked ? checked.value : 'whatsapp';
    }
    function etiquetaBoton() {
      return canalActual() === 'whatsapp' ? 'Enviar por WhatsApp' : 'Enviar por email';
    }
    form.querySelectorAll('input[name="canal"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        submitBtn.textContent = etiquetaBoton();
        if (status) status.hidden = true;
      });
    });
    function mostrarEstado(tono, icono, html) {
      if (!status) return;
      status.hidden = false;
      status.dataset.tone = tono;
      status.innerHTML = '<span>' + html + '</span>';
    }

    /* Errores propios bajo cada campo, en lugar de la burbuja del navegador.
       Sin JavaScript, la validación nativa sigue funcionando. */
    form.noValidate = true;
    function errorDe(campo) { return document.getElementById('err-' + campo.id); }
    function limpiar(campo) {
      var p = errorDe(campo);
      if (p) p.remove();
      campo.removeAttribute('aria-invalid');
      var desc = (campo.getAttribute('aria-describedby') || '').replace('err-' + campo.id, '').trim();
      if (desc) campo.setAttribute('aria-describedby', desc); else campo.removeAttribute('aria-describedby');
    }
    function marcar(campo) {
      if (errorDe(campo)) return;
      var p = document.createElement('p');
      p.className = 'field-error';
      p.id = 'err-' + campo.id;
      p.textContent = campo.getAttribute('data-error') || 'Rellena este campo.';
      campo.insertAdjacentElement('afterend', p);
      campo.setAttribute('aria-invalid', 'true');
      var desc = campo.getAttribute('aria-describedby');
      campo.setAttribute('aria-describedby', (desc ? desc + ' ' : '') + p.id);
    }
    function validar() {
      var primero = null;
      form.querySelectorAll('[required]').forEach(function (campo) {
        var vacio = !campo.value || !campo.value.trim();
        if (vacio) { marcar(campo); if (!primero) primero = campo; } else limpiar(campo);
      });
      return primero;
    }
    form.querySelectorAll('[required]').forEach(function (campo) {
      campo.addEventListener('input', function () {
        if (!campo.value.trim()) return;
        limpiar(campo);
        if (status && status.dataset.tone === 'error' && !form.querySelector('[aria-invalid="true"]')) status.hidden = true;
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fallo = validar();
      if (fallo) {
        mostrarEstado('error', '', '<strong>Falta algún dato.</strong> Revisa los campos marcados.');
        fallo.focus();
        return;
      }
      window.dispatchEvent(new CustomEvent('rrhh:enviado', { detail: form.id }));

      var m = construir(form);
      var canal = canalActual();
      var destino = canal === 'whatsapp'
        ? 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(m.texto)
        : 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(m.asunto) + '&body=' + encodeURIComponent(m.texto);
      var nombreApp = canal === 'whatsapp' ? 'WhatsApp' : 'tu programa de correo';

      submitBtn.setAttribute('aria-busy', 'true');
      submitBtn.innerHTML = '<span class="spinner" aria-hidden="true"></span>Abriendo ' + nombreApp + '…';
      if (status) status.hidden = true;

      var abierto = true;
      if (canal === 'whatsapp') {
        var win = window.open(destino, '_blank', 'noopener');
        abierto = !!win;
      } else {
        window.location.href = destino;
      }

      window.setTimeout(function () {
        submitBtn.removeAttribute('aria-busy');
        submitBtn.textContent = etiquetaBoton();
        if (abierto) {
          mostrarEstado('ok', '',
            '<strong>Listo.</strong> Se ha abierto ' + nombreApp + ' con el mensaje escrito: solo falta darle a enviar. ' +
            '¿No se ha abierto? <a class="link" href="' + destino + '" target="_blank" rel="noopener">Ábrelo desde aquí</a>.');
        } else {
          mostrarEstado('error', '',
            '<strong>El navegador ha bloqueado la ventana.</strong> ' +
            '<a class="link" href="' + destino + '" target="_blank" rel="noopener">Abre ' + nombreApp + ' desde aquí</a> ' +
            'o escribe a <a class="link" href="mailto:' + EMAIL + '">' + EMAIL + '</a>.');
        }
      }, 450);
    });
  }

  /* ---------------------------------------------------------------
     Medición de acciones (sin cookies)
     No hace nada hasta que se añada el script de un proveedor
     (GoatCounter o Plausible). Solo cuenta clics en acciones clave:
     reservar, abrir el calendario, WhatsApp, correo y formularios.
     --------------------------------------------------------------- */
  function medir(nombre) {
    try {
      if (window.goatcounter && window.goatcounter.count) {
        window.goatcounter.count({ path: 'accion/' + nombre, title: nombre, event: true });
      } else if (window.plausible) {
        window.plausible(nombre);
      }
    } catch (e) { /* la medición nunca debe romper la página */ }
  }
  window.rrhhMedir = medir;

  document.addEventListener('click', function (e) {
    if (!e.isTrusted) return;   /* los clics simulados por el propio código no cuentan dos veces */
    var el = e.target.closest && e.target.closest('a, button');
    if (!el) return;
    var href = el.getAttribute('href') || '';
    if (el.id === 'loadCal' || /calendar\.(app\.)?google/.test(href)) medir('abrir-calendario');
    else if (/reservar\.html/.test(href)) medir('ir-a-reservar');
    else if (/wa\.me\//.test(href)) medir('whatsapp');
    else if (/^mailto:/.test(href)) medir('correo');
    else if (el.id === 'quoteGo' || href === '#presupuesto') medir('empresa-ir-a-presupuesto');
  }, true);

  window.addEventListener('rrhh:enviado', function (e) { medir('formulario-' + e.detail); });

})();
