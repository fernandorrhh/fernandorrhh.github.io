/*
 * Motor de procesos — funciones puras: vacantes (reclutamiento), periodos de prueba y salidas.
 * Pruebas: tests/procesos.test.js
 */
(function (root) {
  const DAY = 86400000;
  const parse = s => { if (!s) return null; const [y, m, d] = String(s).split('-').map(Number); return (y && m && d) ? Date.UTC(y, m - 1, d) : null; };
  const iso = t => new Date(t).toISOString().slice(0, 10);
  const sumarDias = (s, n) => iso(parse(s) + n * DAY);
  function sumarMeses(s, n) {
    const d = new Date(parse(s)), y = d.getUTCFullYear(), m = d.getUTCMonth() + n;
    const ult = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return iso(Date.UTC(y, m, Math.min(d.getUTCDate(), ult)));
  }
  const diasEntre = (a, b) => Math.round((parse(b) - parse(a)) / DAY);

  /* ---------- Vacantes ---------- */
  const FASES = [['publicada', 'Publicada'], ['cribado', 'Cribado'], ['entrevistas', 'Entrevistas'], ['seleccion', 'Selección'], ['cerrada', 'Cerrada']];
  const CIERRES = { cubierta: 'Cubierta', desierta: 'Desierta', cancelada: 'Cancelada' };
  const suma = o => (Number(o?.m) || 0) + (Number(o?.h) || 0);
  function faseVacante(v) {
    if (v.estado && v.estado !== 'abierta') return 'cerrada';
    if ((v.seleccionados || []).length) return 'seleccion';
    if (suma(v.entrevistas)) return 'entrevistas';
    if (suma(v.candidaturas)) return 'cribado';
    return 'publicada';
  }
  function validarVacante(v) {
    const e = [];
    if (!v.puesto) e.push('Falta el puesto');
    if (!v.apertura) e.push('Falta la fecha de apertura');
    ['m', 'h'].forEach(k => { if ((Number(v.entrevistas?.[k]) || 0) > (Number(v.candidaturas?.[k]) || 0)) e.push(`Hay más ${k === 'm' ? 'mujeres' : 'hombres'} entrevistados que candidaturas`); });
    if (v.cierre && v.apertura && v.cierre < v.apertura) e.push('El cierre es anterior a la apertura');
    return e;
  }
  const diasAbierta = (v, hoy) => diasEntre(v.apertura, v.cierre || hoy);
  const tasa = (a, b) => b ? a / b : 0;
  /* Embudo por sexo: candidaturas → entrevistas → seleccionados. */
  function embudo(v) {
    const sel = { m: (v.seleccionados || []).filter(s => s.sexo === 'mujer').length, h: (v.seleccionados || []).filter(s => s.sexo === 'hombre').length };
    const c = { m: Number(v.candidaturas?.m) || 0, h: Number(v.candidaturas?.h) || 0 }, en = { m: Number(v.entrevistas?.m) || 0, h: Number(v.entrevistas?.h) || 0 };
    return { candidaturas: c, entrevistas: en, seleccionados: sel, tasaEntrevista: { m: tasa(en.m, c.m), h: tasa(en.h, c.h) }, tasaSeleccion: { m: tasa(sel.m, en.m), h: tasa(sel.h, en.h) } };
  }

  /* ---------- Periodos de prueba ---------- */
  /* Máximo del convenio según la categoría (art. 27). */
  const maxMeses = (catId, cfg) => catId ? (cfg.maxMeses[catId] ?? cfg.maxResto) : null;
  /* Último día del periodo: inicio + meses − 1 día. */
  const finPrueba = (inicio, meses) => sumarDias(sumarMeses(inicio, meses), -1);
  /* Hitos de seguimiento: 1 mes → final · 2 o 3 meses → mitad y final · 6 meses → 2, 4 y final. */
  function hitos(inicio, meses, cfg) {
    const fin = finPrueba(inicio, meses), antes = meses === 1 ? 5 : cfg.avisoFinalDias;
    const l = [];
    if (meses === 2 || meses === 3) l.push({ id: 'mitad', nombre: 'Seguimiento a mitad del periodo', fecha: sumarDias(inicio, Math.round(diasEntre(inicio, fin) / 2)) });
    if (meses === 6) l.push({ id: 'm2', nombre: 'Seguimiento a los 2 meses', fecha: sumarMeses(inicio, 2) }, { id: 'm4', nombre: 'Seguimiento a los 4 meses', fecha: sumarMeses(inicio, 4) });
    if (meses > 3 && meses !== 6) l.push({ id: 'mitad', nombre: 'Seguimiento a mitad del periodo', fecha: sumarDias(inicio, Math.round(diasEntre(inicio, fin) / 2)) });
    const ff = sumarDias(fin, -antes);
    l.push({ id: 'final', nombre: 'Valoración final y decisión', fecha: ff < inicio ? inicio : ff });
    return l;
  }
  const RESULTADOS = { favorable: 'Superado', 'no-favorable': 'No superado (decisión de la empresa)', desiste: 'No superado (decisión de la persona)' };
  function estadoPrueba(p, hoy) {
    if (p.resultado) return p.resultado === 'favorable' ? 'superado' : 'no-superado';
    if (hoy > p.fin) return 'sin-resolver';
    if (diasEntre(hoy, p.fin) <= 15) return 'termina-pronto';
    return 'en-curso';
  }
  const ESTADOS_PRUEBA = { 'en-curso': 'En curso', 'termina-pronto': 'Termina pronto', 'sin-resolver': 'Terminado sin resolver', superado: 'Superado', 'no-superado': 'No superado' };

  /* ---------- Salidas ---------- */
  function progresoSalida(pasos, s) {
    const obl = pasos.filter(p => !p.opcional), hechos = obl.filter(p => s.check?.[p.id]).length;
    return { hechos, total: obl.length, pct: obl.length ? hechos / obl.length : 0, faltan: obl.filter(p => !s.check?.[p.id]) };
  }
  function estadoSalida(pasos, s, hoy) {
    if (s.cerrada) return 'cerrada';
    const p = progresoSalida(pasos, s);
    if (p.pct === 1) return 'completada';
    if (s.fechaBaja && hoy > s.fechaBaja) return 'atrasada';
    return 'en-curso';
  }

  const api = { FASES, CIERRES, faseVacante, validarVacante, diasAbierta, embudo, maxMeses, finPrueba, hitos, RESULTADOS, estadoPrueba, ESTADOS_PRUEBA, progresoSalida, estadoSalida, sumarDias, sumarMeses, diasEntre };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MotorProcesos = api;
})(typeof window !== 'undefined' ? window : globalThis);
