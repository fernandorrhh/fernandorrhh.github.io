/*
 * Motor de festivos — funciones puras.
 * Combina festivos nacionales, capas activas (comunidad + municipio) y festivos de empresa.
 * Pruebas: tests/festivos.test.js
 */
(function (root) {
  /**
   * @param {object} festivos   P.festivos
   * @param {number} anio
   * @param {string[]} capas    p. ej. ['madrid','clm']
   * @param {{fecha:string,nombre:string}[]} empresa
   * @returns {Map<string, {nombre, ambito:'nacional'|'autonomico'|'local'|'empresa', capa}[]>}
   */
  function delAnio(festivos, anio, capas = [], empresa = []) {
    const out = new Map(), add = (f, e) => { if (!out.has(f)) out.set(f, []); out.get(f).push(e); };
    const datos = festivos[anio];
    if (datos) {
      const nac = new Set(datos.nacionales.map(([f]) => f));
      datos.nacionales.forEach(([f, n]) => add(f, { nombre: n, ambito: 'nacional', capa: 'nac' }));
      for (const c of capas) {
        const capa = datos.capas?.[c]; if (!capa) continue;
        capa.dias.forEach(([f, n]) => { if (!nac.has(f)) add(f, { nombre: n, ambito: 'autonomico', capa: c }); });
        (capa.local?.dias || []).forEach(([f, n]) => add(f, { nombre: n, ambito: 'local', capa: c }));
      }
    }
    empresa.filter(e => e.fecha.startsWith(anio + '-')).forEach(e => add(e.fecha, { nombre: e.nombre || 'Festivo de empresa', ambito: 'empresa', capa: 'empresa' }));
    return new Map([...out.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  }

  /* Próximos festivos desde una fecha (AAAA-MM-DD), mirando este año y el siguiente. */
  function proximos(festivos, desde, capas = [], empresa = [], n = 5) {
    const y = Number(desde.slice(0, 4)), res = [];
    for (const anio of [y, y + 1]) for (const [f, l] of delAnio(festivos, anio, capas, empresa)) if (f >= desde) res.push({ fecha: f, items: l });
    return res.slice(0, n);
  }

  const api = { delAnio, proximos };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MotorFestivos = api;
})(typeof window !== 'undefined' ? window : globalThis);
