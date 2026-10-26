/*
 * Motor de indemnizaciones por extinción del contrato — funciones puras.
 * Salario diario = bruto anual ÷ 365 · mensualidad = bruto anual ÷ 12.
 * Antigüedad: prorrateo por meses; la fracción de mes cuenta como mes completo.
 * Improcedente con servicios anteriores al 12/02/2012: 45 días/año por ese periodo y 33 después (DT 11.ª ET):
 *   tope 720 días, salvo que el periodo anterior ya supere 720 días (entonces ese importe, con máximo de 42 mensualidades).
 * Pruebas: tests/calculadoras.test.js
 */
(function (root) {
  const DAY = 86400000;
  const parse = s => { if (!s) return null; const [y, m, d] = String(s).split('-').map(Number); return (y && m && d) ? Date.UTC(y, m - 1, d) : null; };
  const iso = t => new Date(t).toISOString().slice(0, 10);
  function sumarMeses(t, n) {
    const d = new Date(t), y = d.getUTCFullYear(), m = d.getUTCMonth() + n;
    const ult = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return Date.UTC(y, m, Math.min(d.getUTCDate(), ult));
  }
  /* Periodo entre dos fechas (ambas incluidas): meses completos, días sueltos y meses computables (fracción = mes). */
  function periodo(a, b) {
    if (a === null || b === null || b < a) return { completos: 0, dias: 0, meses: 0 };
    const fin = b + DAY;   // exclusivo
    const da = new Date(a), db = new Date(fin);
    let m = (db.getUTCFullYear() - da.getUTCFullYear()) * 12 + (db.getUTCMonth() - da.getUTCMonth());
    while (m > 0 && sumarMeses(a, m) > fin) m--;
    while (sumarMeses(a, m + 1) <= fin) m++;
    const dias = Math.round((fin - sumarMeses(a, m)) / DAY);
    return { completos: m, dias, meses: m + (dias > 0 ? 1 : 0) };
  }
  const r2 = x => Math.round(x * 100) / 100;

  /**
   * @param {object} o  inicio, fin (AAAA-MM-DD) · salarioAnual (€) · tipo (clave de params.indemnizacion.tipos)
   * @param {object} cfg  params.indemnizacion
   */
  function calcular({ inicio, fin, salarioAnual, tipo = 'improcedente' }, cfg) {
    const a = parse(inicio), b = parse(fin), sal = Number(salarioAnual);
    const t = cfg.tipos[tipo];
    if (a === null || b === null || !(sal > 0) || !t) return null;
    if (b < a) return { error: 'La fecha de extinción es anterior a la de inicio.' };
    const diario = sal / 365, mensual = sal / 12;
    const total = periodo(a, b);
    const corte = parse(cfg.reforma2012);
    const tramos = [];
    let dias, importe, tope = null, topeAplicado = false;

    if (tipo === 'improcedente' && a < corte) {
      const p1 = periodo(a, Math.min(b, corte - DAY)), p2 = b >= corte ? periodo(corte, b) : { completos: 0, dias: 0, meses: 0 };
      const d1 = cfg.anterior2012.dias * p1.meses / 12, d2 = t.dias * p2.meses / 12;
      tramos.push({ desde: inicio, hasta: iso(Math.min(b, corte - DAY)), meses: p1.meses, diasPorAnio: cfg.anterior2012.dias, dias: d1, importe: d1 * diario });
      if (p2.meses) tramos.push({ desde: cfg.reforma2012, hasta: fin, meses: p2.meses, diasPorAnio: t.dias, dias: d2, importe: d2 * diario });
      if (d1 > cfg.anterior2012.topeDias) {
        // El periodo anterior ya supera 720 días: no se suma nada después; máximo 42 mensualidades.
        tope = { texto: `${cfg.anterior2012.topeMensualidades} mensualidades`, importe: cfg.anterior2012.topeMensualidades * mensual };
        dias = d1; importe = d1 * diario; tramos.forEach((x, i) => { if (i > 0) { x.dias = 0; x.importe = 0; x.excluido = true; } });
      } else {
        tope = { texto: `${cfg.anterior2012.topeDias} días`, importe: cfg.anterior2012.topeDias * diario };
        dias = d1 + d2; importe = dias * diario;
      }
    } else {
      dias = t.dias * total.meses / 12; importe = dias * diario;
      tramos.push({ desde: inicio, hasta: fin, meses: total.meses, diasPorAnio: t.dias, dias, importe });
      if (t.topeMensualidades) tope = { texto: `${t.topeMensualidades} mensualidades`, importe: t.topeMensualidades * mensual };
    }
    if (tope && importe > tope.importe) { importe = tope.importe; topeAplicado = true; }
    return {
      tipo, nombre: t.nombre, art: t.art, diasPorAnio: t.dias,
      antiguedad: { anios: Math.floor(total.completos / 12), meses: total.completos % 12, dias: total.dias, mesesComputables: total.meses },
      salarioDiario: r2(diario), mensualidad: r2(mensual),
      dias: Math.round(dias * 100) / 100, importe: r2(importe), importeRedondo: Math.round(importe),
      tramos: tramos.map(x => ({ ...x, dias: Math.round(x.dias * 100) / 100, importe: r2(x.importe) })),
      tope, topeAplicado
    };
  }

  /* Los cinco tipos a la vez (para comparar). */
  const todos = (o, cfg) => Object.keys(cfg.tipos).map(tipo => calcular({ ...o, tipo }, cfg)).filter(Boolean);

  const api = { calcular, todos, periodo, sumarMeses, parse, iso };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MotorIndemnizacion = api;
})(typeof window !== 'undefined' ? window : globalThis);
