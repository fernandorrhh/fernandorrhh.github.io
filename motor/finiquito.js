/*
 * Motor de finiquito — funciones puras. Importes brutos (sin IRPF ni cotizaciones).
 * Paga extra (P) = bruto anual ÷ 16 (4 pagas de 30 días, convenio art. 24 · 12 + 4 = 16).
 *  1. Salario del mes de la baja: P × días ÷ 30 (mes comercial: el último día del mes cuenta como 30).
 *  2. Prorrata de las 2 pagas prorrateadas: solo la del mes en curso (2P ÷ 12 × días ÷ 30).
 *  3. Paga de junio (ene-jun) o de diciembre (jul-dic): P × meses del semestre ÷ 6; la fracción de mes cuenta entera (convenio art. 24).
 *  4. Vacaciones no disfrutadas: días laborables × 30/22 = días naturales × (bruto anual ÷ 365).
 *  5. Falta de preaviso en la baja voluntaria (convenio art. 29): un día de salario por cada día de retraso.
 * Pruebas: tests/calculadoras.test.js
 *
 * VERSIÓN WEB (rrhhsimple.com): adaptada para cualquier convenio.
 *  - Número de pagas extra configurable: paga = bruto anual ÷ (12 + cfg.pagasExtra.numero). Con numero = 4 da ÷ 16 (plataforma).
 *  - Sin pagas no prorrateadas (todo prorrateado) no se añade la línea de paga del semestre.
 *  - Vacaciones en días laborables (× 30 / diasLaborables) o en días naturales (cfg.vacaciones.naturales = true).
 *  - El descuento por preaviso depende del convenio: la web no lo usa.
 * Pruebas: tests/motores.test.js
 */
(function (root) {
  const DAY = 86400000;
  const parse = s => { if (!s) return null; const [y, m, d] = String(s).split('-').map(Number); return (y && m && d) ? Date.UTC(y, m - 1, d) : null; };
  const iso = t => new Date(t).toISOString().slice(0, 10);
  const r2 = x => Math.round(x * 100) / 100;
  const n2 = x => Number(x).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' });
  const dd = (n, s) => `${n} ${n === 1 ? s : s + 's'}`;
  function sumarMeses(t, n) {
    const d = new Date(t), y = d.getUTCFullYear(), m = d.getUTCMonth() + n;
    const ult = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return Date.UTC(y, m, Math.min(d.getUTCDate(), ult));
  }
  /* Meses tocados entre dos fechas del mismo semestre (fracción = mes completo). */
  const mesesTocados = (a, b) => b < a ? 0 : (new Date(b).getUTCFullYear() - new Date(a).getUTCFullYear()) * 12 + new Date(b).getUTCMonth() - new Date(a).getUTCMonth() + 1;

  /* Plazo de preaviso según la categoría (convenio art. 29). */
  function preavisoDe(catId, cfg) {
    if (!catId) return null;
    const mes = cfg.unMesCategorias.some(p => catId === p || (p.length === 1 && catId[0] === p));
    return mes ? { tipo: 'mes', texto: 'un mes' } : { tipo: 'dias', dias: 8, texto: 'ocho días' };
  }

  /**
   * @param {object} o
   *  inicio, fin (AAAA-MM-DD) · salarioAnual · vacacionesPendientes (días laborables; negativo = disfrutadas de más)
   *  complementos (€) · indemnizacion (€) · voluntaria · comunicacion (AAAA-MM-DD) · preaviso ({tipo:'mes'} | {tipo:'dias', dias})
   * @param {object} cfg { pagasExtra, vacaciones }
   */
  function calcular(o, cfg) {
    const a = parse(o.inicio), b = parse(o.fin), sal = Number(o.salarioAnual);
    if (a === null || b === null || !(sal > 0)) return null;
    if (b < a) return { error: 'La fecha de baja es anterior a la de inicio.' };
    const P = sal / (12 + (cfg.pagasExtra.numero ?? 4)), diario = sal / 365, fb = new Date(b);
    const y = fb.getUTCFullYear(), m = fb.getUTCMonth(), dia = fb.getUTCDate();
    const ultimoDelMes = new Date(Date.UTC(y, m + 1, 0)).getUTCDate() === dia;
    const iniMes = Date.UTC(y, m, 1), desdeMes = Math.max(a, iniMes);
    const diasMes = ultimoDelMes && desdeMes === iniMes ? 30 : Math.min(30, Math.round((b - desdeMes) / DAY) + 1);
    const lineas = [];
    const add = (id, concepto, importe, detalle, signo = 1) => lineas.push({ id, concepto, importe: r2(importe * signo), detalle });

    add('salario', 'Salario del mes', P * diasMes / 30, `${dd(diasMes, 'día')} × ${n2(P / 30)} €/día (paga mensual ${n2(P)} € ÷ 30)`);
    const nProrr = cfg.pagasExtra.prorrateadas;
    if (nProrr) add('prorrata', `Prorrata de ${nProrr} pagas extra (mes en curso)`, nProrr * P / 12 * diasMes / 30, `${nProrr} × ${n2(P)} € ÷ 12 × ${diasMes}/30`);

    // Paga del semestre en curso (junio o diciembre).
    const semIni = m < 6 ? Date.UTC(y, 0, 1) : Date.UTC(y, 6, 1);
    const paga = (cfg.pagasExtra.noProrrateadas || [])[m < 6 ? 0 : 1];
    const meses = mesesTocados(Math.max(a, semIni), b);
    if (paga) add('paga', `${paga.nombre} (parte proporcional)`, P * meses / 6, `${meses} de 6 meses × ${n2(P)} €`);

    // Vacaciones.
    const vac = Number(o.vacacionesPendientes) || 0;
    const nat = cfg.vacaciones.naturales ? vac : vac * 30 / cfg.vacaciones.diasLaborables;
    const L = cfg.vacaciones.diasLaborables;
    const det = v => cfg.vacaciones.naturales
      ? `${dd(v, 'día')} natural${v === 1 ? '' : 'es'} × ${n2(diario)} €`
      : `${dd(v, 'día')} laborable${v === 1 ? '' : 's'} × 30/${L} = ${n2(v * 30 / L)} días naturales × ${n2(diario)} €`;
    if (vac > 0) add('vacaciones', 'Vacaciones no disfrutadas', nat * diario, det(vac));
    else if (vac < 0) add('vacaciones', 'Vacaciones disfrutadas de más', nat * diario, det(-vac));

    const comp = Number(o.complementos) || 0;
    if (comp) add('complementos', 'Otros conceptos', comp, 'Importe indicado');

    // Preaviso (solo baja voluntaria).
    let preaviso = null;
    if (o.voluntaria && o.preaviso) {
      const c = parse(o.comunicacion);
      if (c !== null) {
        const minimo = o.preaviso.tipo === 'mes' ? sumarMeses(c, 1) : c + o.preaviso.dias * DAY;
        const retraso = Math.max(0, Math.round((minimo - b) / DAY));
        preaviso = { exigido: o.preaviso, comunicacion: iso(c), fechaMinima: iso(minimo), retraso };
        if (retraso) add('preaviso', 'Descuento por falta de preaviso', retraso * diario, `${dd(retraso, 'día')} de retraso × ${n2(diario)} € (convenio art. 29)`, -1);
      }
    }

    const finiquito = r2(lineas.reduce((s, l) => s + l.importe, 0));
    const indem = Number(o.indemnizacion) || 0;
    return {
      lineas, finiquito, indemnizacion: r2(indem), total: r2(finiquito + indem),
      paga: r2(P), salarioDiario: r2(diario), diasMes, mesesSemestre: meses, preaviso,
      negativo: finiquito < 0
    };
  }

  const api = { calcular, preavisoDe, mesesTocados };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MotorFiniquito = api;
})(typeof window !== 'undefined' ? window : globalThis);
