/*
 * Motor de nacimiento y cuidado del menor — funciones puras (una persona progenitora cada vez).
 * ET 48.4 (RDL 9/2025): 19 semanas = 6 obligatorias tras el parto + 11 hasta los 12 meses + 2 hasta los 8 años.
 * Familia monoparental: 32 = 6 + 22 + 4.
 * Ampliaciones (ET 48.4 y 48.6): hospitalización del neonato > 7 días (+ días, máx. 13 semanas);
 * discapacidad del hijo y parto múltiple (+1 semana por progenitor; +2 en familia monoparental).
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
  const vispera = t => iso(t - DAY);

  /**
   * @param {object} o  fecha (AAAA-MM-DD) · monoparental · hijos (1, 2…) · discapacidad · hospitalizacionDias
   * @param {object} cfg params.nacimiento
   */
  function calcular({ fecha, monoparental = false, hijos = 1, discapacidad = false, hospitalizacionDias = 0 }, cfg) {
    const t = parse(fecha); if (t === null) return null;
    const base = monoparental ? cfg.monoparental : cfg.biparental, mult = monoparental ? 2 : 1;
    const n = Math.max(1, Math.floor(Number(hijos) || 1)), hosp = Math.max(0, Math.floor(Number(hospitalizacionDias) || 0));
    const ampMultiple = (n - 1) * cfg.ampliacionPorHijoAdicional * mult;
    const ampDisc = discapacidad ? cfg.ampliacionDiscapacidad * mult : 0;
    const ampHospDias = hosp > cfg.hospitalizacionMinDias ? Math.min(hosp, cfg.hospitalizacionMaxSemanas * 7) : 0;
    const semanasAmpl = ampMultiple + ampDisc;
    const totalDias = (base.total + semanasAmpl) * 7 + ampHospDias;
    const finObl = t + base.obligatorias * 7 * DAY - DAY;
    const doceMeses = sumarMeses(t, 12), ochoAnios = sumarMeses(t, 12 * 8), nueveMeses = sumarMeses(t, cfg.lactanciaMeses), doceAnios = sumarMeses(t, 12 * cfg.guardaLegalHastaAnios);
    // Si se disfruta todo seguido desde el parto (salvo las semanas hasta los 8 años):
    const seguidoDias = (base.obligatorias + base.hasta12meses + semanasAmpl) * 7 + ampHospDias;
    return {
      monoparental, hijos: n,
      semanasBase: base.total, semanasAmpliacion: semanasAmpl, diasHospitalizacion: ampHospDias,
      totalDias, totalSemanas: Math.round(totalDias / 7 * 100) / 100,
      bloques: [
        { id: 'obligatorias', semanas: base.obligatorias, texto: 'Obligatorias, ininterrumpidas y a jornada completa, justo después del parto', desde: iso(t), hasta: iso(finObl) },
        { id: 'hasta12', semanas: base.hasta12meses + semanasAmpl, dias: ampHospDias, texto: 'Voluntarias, por semanas (seguidas o no, a jornada completa o parcial con acuerdo), hasta que cumpla 12 meses', hasta: vispera(doceMeses) },
        { id: 'hasta8', semanas: base.hasta8anios, texto: 'Para el cuidado, de forma flexible, hasta que cumpla 8 años', hasta: vispera(ochoAnios) }
      ],
      seguidoHasta: iso(t + seguidoDias * DAY - DAY),
      lactancia: { hasta: vispera(nueveMeses), acumuladaDias: cfg.lactanciaAcumuladaDias * n },
      parental: { semanas: cfg.parentalSemanas, hasta: vispera(ochoAnios) },
      guardaLegal: { hasta: vispera(doceAnios) },
      anticipoMaxSemanas: cfg.anticipoMadreMaxSemanas,
      preavisoDias: 15
    };
  }

  const api = { calcular };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MotorNacimiento = api;
})(typeof window !== 'undefined' ? window : globalThis);
