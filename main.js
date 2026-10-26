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
  var form = document.getElementById('contactForm');
  if (!form) return;

  var WHATSAPP = '34638292643';
  var EMAIL = 'fernando@rrhhsimple.com';

  var submitBtn = document.getElementById('submitBtn');
  var status = document.getElementById('formStatus');

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
    status.innerHTML = '<span class="ico" aria-hidden="true">' + icono + '</span><span>' + html + '</span>';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var nombre = document.getElementById('nombre').value.trim();
    var perfil = document.getElementById('perfil').value;
    var necesidad = document.getElementById('necesidad').value;
    var mensaje = document.getElementById('mensaje').value.trim();
    var canal = canalActual();

    var texto =
      '¡Hola Fernando! Soy ' + nombre + ' (' + perfil + ').\n' +
      'Sobre: ' + necesidad + '\n' +
      'Mi caso: ' + mensaje + '\n\n' +
      'Vengo desde la web de RRHH Simple.';

    var destino = canal === 'whatsapp'
      ? 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(texto)
      : 'mailto:' + EMAIL +
        '?subject=' + encodeURIComponent('Consulta laboral desde RRHH Simple — ' + nombre) +
        '&body=' + encodeURIComponent(texto);

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
        mostrarEstado(
          'ok', '✅',
          '<strong>Listo.</strong> Te he abierto ' + nombreApp + ' con el mensaje escrito: solo tienes que darle a enviar. ' +
          '¿No se ha abierto? <a class="link" href="' + destino + '" target="_blank" rel="noopener">Ábrelo desde aquí</a>.'
        );
      } else {
        mostrarEstado(
          'error', '⚠️',
          '<strong>Tu navegador ha bloqueado la ventana.</strong> ' +
          '<a class="link" href="' + destino + '" target="_blank" rel="noopener">Abre ' + nombreApp + ' desde aquí</a> ' +
          'o escríbeme a <a class="link" href="mailto:' + EMAIL + '">' + EMAIL + '</a>.'
        );
      }
    }, 450);
  });
})();
