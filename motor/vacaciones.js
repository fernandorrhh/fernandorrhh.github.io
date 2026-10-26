/*
 * Motor de vacaciones — funciones puras, sin interfaz.
 * Regla: diasConvenio × días de alta en el año ÷ días del año, redondeado SIEMPRE al alza.
 * Base: convenio art. 12 (22 jornadas laborables) · ET art. 38.
 * Pruebas: tests/vacaciones.test.js
 */
(function (root) {
  const DAY = 86400000;
  const parse = s => { if (!s) return null; const [y, m, d] = String(s).split('-').map(Number); return (y && m && d) ? Date.UTC(y, m - 1, d) : null; };
  const span = (a, b) => b < a ? 0 : Math.round((b - a) / DAY) + 1;   // días naturales, ambos incluidos
  const up = x => Math.ceil(x - 1e-9);                                  // al alza sin falsos decimales

  /**
   * @param {object} o
   *  inicio (AAAA-MM-DD, obligatorio) · anio · fin (opcional) · hoy (AAAA-MM-DD)
   *  consumidos · pendAnterior · sinDevengo (días naturales) · diasConvenio (22)
   */
  function calcular({ inicio, anio, fin = null, hoy, consumidos = 0, pendAnterior = 0, sinDevengo = 0, diasConvenio = 22 }) {
    const ini = parse(inicio), f = parse(fin), h = parse(hoy);
    if (ini === null || !anio || h === null) return null;
    const yIni = Date.UTC(anio, 0, 1), yFin = Date.UTC(anio, 11, 31), diasAnio = span(yIni, yFin);
    const desde = Math.max(ini, yIni);
    const hasta = Math.min(f ?? yFin, yFin);
    const corte = Math.min(Math.max(h, yIni - DAY), hasta);
    const altaHoy = Math.max(0, span(desde, corte) - sinDevengo);
    const altaFin = Math.max(0, span(desde, hasta) - sinDevengo);
    const exHoy = diasConvenio * altaHoy / diasAnio, exFin = diasConvenio * altaFin / diasAnio;
    const genHoy = up(exHoy), genFin = up(exFin);
    return {
      diasAnio, altaHoy, altaFin, exHoy, exFin, genHoy, genFin,
      pendHoy: genHoy + pendAnterior - consumidos,
      pendFin: genFin + pendAnterior - consumidos,
      desde, hasta, corte, yIni, yFin,
      conFin: f !== null,
      fueraDeAnio: ini > yFin || (f !== null && f < yIni)
    };
  }

  const api = { calcular, parse };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MotorVacaciones = api;
})(typeof window !== 'undefined' ? window : globalThis);
