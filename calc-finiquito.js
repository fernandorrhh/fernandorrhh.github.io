/* RRHH Simple — calculadora de finiquito (interfaz). Motor: motor/finiquito.js */
(function () {
  var M = window.MotorFiniquito, W = window.RRHH_WEB_PARAMS;
  var form = document.getElementById('finForm');
  if (!M || !W || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', useGrouping: 'always' });
  document.querySelectorAll('[data-vigencia]').forEach(function (e) { e.textContent = W.vigencia; });

  W.finiquito.pagas.forEach(function (p) {
    var o = document.createElement('option'); o.value = p.id; o.textContent = p.texto; $('f-pagas').appendChild(o);
  });
  var hoy = new Date();
  $('f-fin').value = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');

  function esc(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('finError'), out = $('finRes');
    var pagas = W.finiquito.pagas.filter(function (p) { return p.id === $('f-pagas').value; })[0];
    var naturales = $('f-vactipo').value === 'naturales';
    var r = M.calcular({
      inicio: $('f-inicio').value, fin: $('f-fin').value,
      salarioAnual: $('f-salario').value, vacacionesPendientes: $('f-vac').value
    }, { pagasExtra: pagas, vacaciones: { diasLaborables: 22, naturales: naturales } });

    var msg = !r ? 'Revisa las fechas y el salario.' : r.error;
    if (msg) { err.textContent = msg; err.hidden = false; out.hidden = true; return; }
    err.hidden = true;

    var filas = r.lineas.map(function (l) {
      return '<tr><td>' + esc(l.concepto) + '<br><span class="note">' + esc(l.detalle) + '</span></td><td>' + eur.format(l.importe) + '</td></tr>';
    });
    filas.push('<tr class="row-total"><td>Total finiquito (bruto)</td><td>' + eur.format(r.finiquito) + '</td></tr>');
    $('finLineas').innerHTML = filas.join('');
    out.hidden = false;
    requestAnimationFrame(function () { out.classList.add('is-shown'); });
    out.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });
})();
