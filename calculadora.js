/* RRHH Simple — calculadora de indemnización por despido (interfaz)
   El cálculo lo hace motor/indemnizacion.js, el mismo motor verificado de la
   plataforma interna, con los parámetros de motor/parametros.js.
   Todo se calcula en el navegador. No se guarda ni se envía ningún dato. */
(function (root) {
  var M = root.MotorIndemnizacion, W = root.RRHH_WEB_PARAMS;
  if (!M || !W) return;

  // Adaptador: devuelve lo que necesita la interfaz a partir del motor común.
  function calcular(e) {
    if (!e.inicio || !e.fin) return { error: 'Revisa las fechas.' };
    if (e.fin < e.inicio) return { error: 'La fecha del despido no puede ser anterior a la de inicio.' };
    if (!(Number(e.salarioAnual) > 0)) return { error: 'Indica tu salario bruto anual.' };
    var imp = M.calcular({ inicio: e.inicio, fin: e.fin, salarioAnual: Number(e.salarioAnual), tipo: 'improcedente' }, W.indemnizacion);
    var obj = M.calcular({ inicio: e.inicio, fin: e.fin, salarioAnual: Number(e.salarioAnual), tipo: 'objetivo' }, W.indemnizacion);
    if (!imp || !obj) return { error: 'Revisa los datos.' };
    return {
      anios: imp.antiguedad.anios,
      mesesResto: imp.antiguedad.meses,
      mesesPre: imp.tramos.length > 1 ? 1 : 0,
      salarioDiario: imp.salarioDiario,
      improcedente: { dias: imp.dias, importe: imp.importe, topeAplicado: imp.topeAplicado },
      objetivo: { dias: obj.dias, importe: obj.importe, topeAplicado: obj.topeAplicado }
    };
  }
  var LEY = { vigenteDesde: W.vigencia };

  // ============================================================
  // Interfaz (solo en calculadora-despido.html)
  // El cálculo es instantáneo: no se finge ninguna espera. Lo que se
  // anima es la entrada del resultado, para que se vea de dónde sale.
  // ============================================================
  if (typeof document === 'undefined') return;
  var form = document.getElementById('calcForm');
  if (!form) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  var num1 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

  var finInput = document.getElementById('fin');
  var hoy = new Date();
  finInput.value = hoy.getFullYear() + '-' +
    String(hoy.getMonth() + 1).padStart(2, '0') + '-' +
    String(hoy.getDate()).padStart(2, '0');

  var vigencia = document.getElementById('vigencia');
  if (vigencia) vigencia.textContent = LEY.vigenteDesde;

  function antiguedadTexto(r) {
    var t = [];
    if (r.anios) t.push(r.anios + (r.anios === 1 ? ' año' : ' años'));
    if (r.mesesResto) t.push(r.mesesResto + (r.mesesResto === 1 ? ' mes' : ' meses'));
    return t.join(' y ') || 'menos de un mes';
  }

  // Los euros suben hasta su valor en vez de aparecer de golpe.
  function contarHasta(el, destino) {
    if (reduce || !window.requestAnimationFrame || destino <= 0) {
      el.textContent = eur.format(destino);
      return;
    }
    var inicio = null;
    var dur = 620;
    function paso(t) {
      if (inicio === null) inicio = t;
      var p = Math.min(1, (t - inicio) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = eur.format(destino * e);
      if (p < 1) window.requestAnimationFrame(paso);
      else el.textContent = eur.format(destino);
    }
    window.requestAnimationFrame(paso);
  }

  var btn = document.getElementById('calcBtn');
  var err = document.getElementById('calcError');
  var out = document.getElementById('resultado');

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var r = calcular({
      inicio: document.getElementById('inicio').value,
      fin: finInput.value,
      salarioAnual: document.getElementById('salario').value
    });

    if (r.error) {
      err.textContent = r.error;
      err.hidden = false;
      out.hidden = true;
      out.classList.remove('is-shown');
      return;
    }
    err.hidden = true;

    document.getElementById('rAntig').textContent = antiguedadTexto(r);
    document.getElementById('rDiario').textContent = num1.format(r.salarioDiario) + ' € brutos/día';
    document.getElementById('rImpDias').textContent =
      num1.format(r.improcedente.dias) + ' días de salario' +
      (r.improcedente.topeAplicado ? ' · tope legal aplicado' : '');
    document.getElementById('rObjDias').textContent =
      num1.format(r.objetivo.dias) + ' días de salario' +
      (r.objetivo.topeAplicado ? ' · tope legal aplicado' : '');
    document.getElementById('rPre').hidden = !(r.mesesPre > 0);

    out.hidden = false;
    // Un fotograma para que el navegador registre el cambio antes de animar.
    window.requestAnimationFrame(function () {
      out.classList.add('is-shown');
      contarHasta(document.getElementById('rImp'), r.improcedente.importe);
      contarHasta(document.getElementById('rObj'), r.objetivo.importe);
    });

    if (btn) btn.textContent = 'Volver a calcular';
    out.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });
})(typeof window !== 'undefined' ? window : globalThis);
