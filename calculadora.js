/* RRHH Simple — calculadora de indemnización por despido
   Todo se calcula en el navegador. No se guarda ni se envía ningún dato. */
(function (root) {

  // ============================================================
  // PARÁMETROS LEGALES — si cambia la ley, se edita SOLO este bloque
  // Base: art. 56 y 53 del Estatuto de los Trabajadores + DT 11ª RDL 3/2012
  // ============================================================
  var LEY = {
    vigenteDesde: 'octubre de 2026',
    fechaReforma2012: '2012-02-12',   // los servicios desde esta fecha computan a 33 días
    improcedente: { diasAnio: 33, topeDias: 720 },          // 24 mensualidades
    improcedentePre2012: { diasAnio: 45, topeDias: 720, topeExcepcionalDias: 1260 }, // 42 mensualidades
    objetivo: { diasAnio: 20, topeDias: 360 },               // 12 mensualidades
    diasAnioSalario: 365
  };

  function parseFecha(s) {
    var p = String(s).split('-');
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  }

  // Meses de servicio entre dos fechas (el día final cuenta). Las fracciones de mes se
  // computan como mes completo, que es el criterio habitual al prorratear por meses.
  function mesesServicio(inicio, finExclusivo) {
    if (finExclusivo <= inicio) return 0;
    var meses = (finExclusivo.getUTCFullYear() - inicio.getUTCFullYear()) * 12 +
                (finExclusivo.getUTCMonth() - inicio.getUTCMonth());
    var ref = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + meses, inicio.getUTCDate()));
    if (ref > finExclusivo) { meses -= 1; ref = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + meses, inicio.getUTCDate())); }
    if (finExclusivo > ref) meses += 1;   // resto de días = mes completo
    return meses;
  }

  function calcular(entrada) {
    var inicio = parseFecha(entrada.inicio);
    var fin = parseFecha(entrada.fin);
    var salarioAnual = Number(entrada.salarioAnual);

    if (isNaN(inicio) || isNaN(fin)) return { error: 'Revisa las fechas.' };
    if (fin < inicio) return { error: 'La fecha de fin no puede ser anterior a la de inicio.' };
    if (!(salarioAnual > 0)) return { error: 'Indica tu salario bruto anual.' };

    var finExcl = new Date(fin.getTime() + 86400000);
    var corte = parseFecha(LEY.fechaReforma2012);
    var diario = salarioAnual / LEY.diasAnioSalario;

    var mesesTotal = mesesServicio(inicio, finExcl);
    var mesesPre = 0, mesesPost = mesesTotal;
    if (inicio < corte) {
      mesesPre = mesesServicio(inicio, finExcl < corte ? finExcl : corte);
      mesesPost = finExcl > corte ? mesesTotal - mesesPre : 0;
      if (mesesPost < 0) mesesPost = 0;
    }

    // ---- Improcedente ----
    var diasPre = (mesesPre / 12) * LEY.improcedentePre2012.diasAnio;
    var diasPost = (mesesPost / 12) * LEY.improcedente.diasAnio;
    var diasImp, topeDiasImp, topeAplicado = false;
    if (mesesPre > 0) {
      if (diasPre > LEY.improcedentePre2012.topeDias) {
        // El tramo anterior a 2012 ya supera 24 mensualidades: manda ese tramo, con máximo de 42 mensualidades
        diasImp = Math.min(diasPre, LEY.improcedentePre2012.topeExcepcionalDias);
        topeDiasImp = LEY.improcedentePre2012.topeExcepcionalDias;
        topeAplicado = diasPre > topeDiasImp;
      } else {
        diasImp = diasPre + diasPost;
        topeDiasImp = LEY.improcedentePre2012.topeDias;
        if (diasImp > topeDiasImp) { diasImp = topeDiasImp; topeAplicado = true; }
      }
    } else {
      diasImp = diasPost;
      topeDiasImp = LEY.improcedente.topeDias;
      if (diasImp > topeDiasImp) { diasImp = topeDiasImp; topeAplicado = true; }
    }

    // ---- Objetivo ----
    var diasObj = (mesesTotal / 12) * LEY.objetivo.diasAnio;
    var topeObjAplicado = false;
    if (diasObj > LEY.objetivo.topeDias) { diasObj = LEY.objetivo.topeDias; topeObjAplicado = true; }

    return {
      mesesTotal: mesesTotal,
      anios: Math.floor(mesesTotal / 12),
      mesesResto: mesesTotal % 12,
      mesesPre: mesesPre,
      mesesPost: mesesPost,
      salarioDiario: diario,
      improcedente: { dias: diasImp, importe: diasImp * diario, topeAplicado: topeAplicado },
      objetivo: { dias: diasObj, importe: diasObj * diario, topeAplicado: topeObjAplicado },
      disciplinario: { dias: 0, importe: 0 }
    };
  }

  var api = { calcular: calcular, LEY: LEY, mesesServicio: mesesServicio, parseFecha: parseFecha };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CalcDespido = api;

  // ============================================================
  // Interfaz (solo en calculadora-despido.html)
  // ============================================================
  if (typeof document === 'undefined') return;
  var form = document.getElementById('calcForm');
  if (!form) return;

  var eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  var num1 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

  var finInput = document.getElementById('fin');
  var hoy = new Date();
  finInput.value = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');

  document.getElementById('vigencia').textContent = LEY.vigenteDesde;

  function antiguedadTexto(r) {
    var t = [];
    if (r.anios) t.push(r.anios + (r.anios === 1 ? ' año' : ' años'));
    if (r.mesesResto) t.push(r.mesesResto + (r.mesesResto === 1 ? ' mes' : ' meses'));
    return t.join(' y ') || 'menos de un mes';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = document.getElementById('calcError');
    var out = document.getElementById('resultado');
    var r = calcular({
      inicio: document.getElementById('inicio').value,
      fin: finInput.value,
      salarioAnual: document.getElementById('salario').value
    });
    if (r.error) {
      err.textContent = r.error;
      err.hidden = false;
      out.hidden = true;
      return;
    }
    err.hidden = true;

    document.getElementById('rAntig').textContent = antiguedadTexto(r);
    document.getElementById('rDiario').textContent = num1.format(r.salarioDiario) + ' € brutos/día';
    document.getElementById('rImp').textContent = eur.format(r.improcedente.importe);
    document.getElementById('rImpDias').textContent = num1.format(r.improcedente.dias) + ' días de salario' + (r.improcedente.topeAplicado ? ' (tope legal aplicado)' : '');
    document.getElementById('rObj').textContent = eur.format(r.objetivo.importe);
    document.getElementById('rObjDias').textContent = num1.format(r.objetivo.dias) + ' días de salario' + (r.objetivo.topeAplicado ? ' (tope legal aplicado)' : '');
    document.getElementById('rPre').hidden = !(r.mesesPre > 0);
    out.hidden = false;
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})(typeof window !== 'undefined' ? window : globalThis);
