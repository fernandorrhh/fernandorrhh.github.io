(function () {
  // ---- Menú móvil ----
  var toggle = document.getElementById('menuToggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Abrir menú');
      });
    });
  }

  // ---- Formulario de contacto (solo en contacto.html) ----
  var form = document.getElementById('contactForm');
  if (!form) return;

  var WHATSAPP = '34638292643';
  var EMAIL = 'fernando@rrhhsimple.com';

  var submitBtn = document.getElementById('submitBtn');
  document.querySelectorAll('input[name="canal"]').forEach(function (r) {
    r.addEventListener('change', function () {
      submitBtn.textContent = this.value === 'whatsapp' ? 'Enviar por WhatsApp →' : 'Enviar por email →';
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var nombre = document.getElementById('nombre').value.trim();
    var perfil = document.getElementById('perfil').value;
    var necesidad = document.getElementById('necesidad').value;
    var mensaje = document.getElementById('mensaje').value.trim();
    var canal = document.querySelector('input[name="canal"]:checked').value;

    var texto =
      'Hola Fernando! Soy ' + nombre + ' (' + perfil + ').\n' +
      'Sobre: ' + necesidad + '\n' +
      'Mi caso: ' + mensaje + '\n\n' +
      'Vengo desde la web de RRHH Simple.';

    if (canal === 'whatsapp') {
      window.open('https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(texto), '_blank');
    } else {
      var asunto = 'Consulta laboral desde RRHH Simple — ' + nombre;
      window.location.href = 'mailto:' + EMAIL +
        '?subject=' + encodeURIComponent(asunto) +
        '&body=' + encodeURIComponent(texto);
    }
  });
})();
