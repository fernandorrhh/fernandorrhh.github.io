/* RRHH Simple — calculadora de vacaciones (interfaz). Motor: motor/vacaciones.js */
(function () {
  var M = window.MotorVacaciones, W = window.RRHH_WEB_PARAMS;
  var form = document.getElementById('vacForm');
  if (!M || !W || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var n = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });
  document.querySelectorAll('[data-vigencia]').forEach(function (e) { e.textContent = W.vigencia; });

  W.vacaciones.opciones.forEach(function (o) {
    var op = document.createElement('option'); op.value = o.dias; op.textContent = o.texto; $('v-dias').appendChild(op);
  });
  var d = new Date();
  var hoy = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  var dias = function (x, u) { return n.format(x) + ' ' + (Math.abs(x) === 1 ? u : u + 's'); };

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('vacError'), out = $('vacRes');
    var fin = $('v-fin').value || null;
    if (!$('v-inicio').value) { err.textContent = 'Indica la fecha de inicio del contrato.'; err.hidden = false; out.hidden = true; return; }
    if (fin && fin < $('v-inicio').value) { err.textContent = 'La fecha de fin no puede ser anterior a la de inicio.'; err.hidden = false; out.hidden = true; return; }
    var dc = Number($('v-dias').value), unidad = dc === 30 ? 'día natural' : 'día laborable';
    var r = M.calcular({
      inicio: $('v-inicio').value, anio: d.getFullYear(), fin: fin, hoy: hoy,
      consumidos: Number($('v-cons').value) || 0, pendAnterior: Number($('v-ant').value) || 0, diasConvenio: dc
    });
    if (!r) { err.textContent = 'Revisa los datos.'; err.hidden = false; out.hidden = true; return; }
    err.hidden = true;
    var u = function (x) { return dias(x, unidad).replace('día naturals', 'días naturales').replace('día laborables', 'días laborables'); };
    $('vPendHoy').textContent = u(r.pendHoy);
    $('vGenHoy').textContent = 'Generadas hasta hoy: ' + u(r.genHoy) + ' (' + r.exHoy.toLocaleString('es-ES', { maximumFractionDigits: 2 }) + ' sin redondear).';
    $('vPendFin').textContent = u(r.pendFin);
    $('vGenFin').textContent = 'Generadas en todo el año: ' + u(r.genFin) + (r.conFin ? ', hasta tu fecha de fin.' : '.');
    $('vAlta').textContent = n.format(r.altaFin);
    $('vAltaTxt').textContent = 'de ' + r.diasAnio + ' días del año' + (r.fueraDeAnio ? ' (el contrato no cae en este año)' : '') + '.';
    out.hidden = false;
    requestAnimationFrame(function () { out.classList.add('is-shown'); });
    out.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });
})();
