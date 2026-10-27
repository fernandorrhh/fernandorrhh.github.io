/*
 * Motor de salarios de convenio — funciones puras.
 * Tablas: params.tablas (salario mensual × 16 pagas o diario × 485 días = anual).
 * Pagas: 4 de 30 días (convenio art. 24). En la empresa, 2 se prorratean y 2 se cobran en junio y diciembre.
 * Jornada parcial: todo en proporción a las horas semanales sobre 40 (1.760 h/año, convenio art. 10).
 * Pruebas: tests/calculadoras.test.js
 */
(function (root) {
  const r2 = x => Math.round(x * 100) / 100;
  const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  /* Busca por puesto de la empresa, categoría o grupo. Devuelve [{tipo:'puesto'|'categoria', ...}] */
  function buscar(q, P) {
    const n = norm(q), cats = P.tablas.categorias, porId = id => cats.find(c => c.id === id);
    const puestos = P.puestos.filter(p => !n || norm(p.puesto).includes(n) || norm(porId(p.categoria)?.nombre).includes(n))
      .map(p => ({ tipo: 'puesto', puesto: p.puesto, categoria: porId(p.categoria), alternativas: (p.alternativas || []).map(porId).filter(Boolean) }));
    const categorias = cats.filter(c => !n || norm(c.nombre).includes(n) || norm(c.grupo).includes(n) || norm(c.id) === n)
      .map(c => ({ tipo: 'categoria', categoria: c }));
    return { puestos, categorias };
  }

  /**
   * @param {object} cat  categoría de la tabla ({mes} o {dia}, anual)
   * @param {object} o    horas (semanales, por defecto 40) · P (params)
   */
  function calcular(cat, { horas = 40, P }) {
    if (!cat) return null;
    const T = P.tablas, ref = P.jornada.horasSemanalesReferencia, f = Math.min(Math.max(Number(horas) || 0, 0), ref) / ref;
    const paga = cat.mes ? cat.mes : cat.dia * P.pagasExtra.diasCadaUna;          // una paga extra = 30 días
    const anual = cat.anual;
    const prorr = P.pagasExtra.prorrateadas, noProrr = P.pagasExtra.noProrrateadas.length;
    const nominaMensual = (anual - noProrr * paga) / 12;                          // 12 nóminas con 2 pagas prorrateadas
    return {
      categoria: cat, factor: f, horas: Number(horas) || 0, parcial: f < 1,
      tipo: cat.mes ? 'mensual' : 'diario',
      base: r2((cat.mes || cat.dia) * f),                                         // salario base de tabla (mes o día)
      paga: r2(paga * f),
      anual: r2(anual * f),
      nominaMensual: r2(nominaMensual * f),
      prorrataMensual: r2(prorr * paga / 12 * f),
      precioHora: r2(anual / P.jornada.horasAnuales),                             // igual a tiempo completo y parcial
      horasAnuales: Math.round(P.jornada.horasAnuales * f),
      primaAsistencia: T.primaAsistenciaDia,
      comprobacion: cat.mes ? r2(cat.mes * T.pagasSalarioMensual) : r2(cat.dia * T.diasAbonadosSalarioDiario)
    };
  }

  const api = { buscar, calcular };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MotorSalarios = api;
})(typeof window !== 'undefined' ? window : globalThis);
