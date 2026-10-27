/*
 * Motor de ausencias — funciones puras.
 * Ausencia: { id, tipo, subtipo, desde, hastaPrevista, finReal, porcentaje, nota, acciones: {i: true} }
 *  desde: primer día · hastaPrevista: último día previsto (opcional) · finReal: último día real (al confirmar la vuelta).
 * Estado: finalizada (finReal) · programada (empieza después de hoy) · sin-confirmar (pasó la fecha prevista y no se confirmó) · en-curso.
 * Pruebas: tests/ausencias.test.js
 */
(function (root) {
  const DAY = 86400000;
  const parse = s => { if (!s) return null; const [y, m, d] = String(s).split('-').map(Number); return (y && m && d) ? Date.UTC(y, m - 1, d) : null; };
  const iso = t => new Date(t).toISOString().slice(0, 10);
  const sumar = (s, n) => iso(parse(s) + n * DAY);

  const ESTADOS = { 'en-curso': 'En curso', programada: 'Programada', 'sin-confirmar': 'Vuelta sin confirmar', finalizada: 'Finalizada' };

  function estado(a, hoy) {
    if (a.finReal) return 'finalizada';
    if (a.desde > hoy) return 'programada';
    if (a.hastaPrevista && hoy > a.hastaPrevista) return 'sin-confirmar';
    return 'en-curso';
  }
  /* Último día a efectos de calendario (si no hay fin, hasta hoy). */
  const finEfectivo = (a, hoy) => a.finReal || a.hastaPrevista || (hoy > a.desde ? hoy : a.desde);
  /* Fecha de vuelta prevista = día siguiente al último día previsto. */
  const vueltaPrevista = a => a.hastaPrevista ? sumar(a.hastaPrevista, 1) : null;
  /* Días naturales transcurridos (hasta hoy o hasta el fin real) y totales previstos. */
  function dias(a, hoy) {
    const d = parse(a.desde), f = parse(a.finReal || hoy);
    const prev = a.hastaPrevista ? Math.round((parse(a.hastaPrevista) - d) / DAY) + 1 : null;
    return { transcurridos: !a.finReal && a.desde > hoy ? 0 : Math.max(0, Math.round((f - d) / DAY) + 1), previstos: prev };
  }

  const tipoDe = (tipos, id) => tipos.find(t => t.id === id) || tipos[tipos.length - 1];
  const activaEn = (a, fecha, hoy) => a.desde <= fecha && fecha <= finEfectivo(a, hoy);

  /* ¿Quién está ausente en una fecha? lista = [{...ausencia, empleado}] */
  const ausentesEn = (lista, fecha, tipos, hoy = fecha) => lista.filter(a => tipoDe(tipos, a.tipo).ausencia !== false && activaEn(a, fecha, hoy));

  /* Próximas vueltas (no finalizadas) en los próximos n días, y las que no se han confirmado. */
  function proximasVueltas(lista, hoy, n = 30) {
    const lim = sumar(hoy, n);
    return lista.filter(a => !a.finReal && a.hastaPrevista && vueltaPrevista(a) >= hoy && vueltaPrevista(a) <= lim).sort((a, b) => a.hastaPrevista.localeCompare(b.hastaPrevista));
  }

  /* Tarea automática: n días antes de la vuelta prevista. null si no corresponde. */
  function tarea(a, nombre, tipo, avisoDias) {
    if (a.finReal || !a.hastaPrevista) return null;
    const vuelta = vueltaPrevista(a), f = tipo.ausencia === false ? a.hastaPrevista : vuelta;   // reducción: se indica su último día
    const dd = `${f.slice(8, 10)}/${f.slice(5, 7)}`;
    const titulo = tipo.ausencia === false ? `Fin de ${tipo.nombre.toLowerCase()} de ${nombre} (${dd})` : `Reincorporación de ${nombre} (${dd})`;
    return { titulo, fecha: sumar(vuelta, -avisoDias) };
  }

  /* Días naturales sin devengo de vacaciones en un año (excedencias, permisos no retribuidos), hasta una fecha. */
  function diasSinDevengo(ausencias = [], tipos, anio, hasta = null, hoy = hasta || `${anio}-12-31`) {
    const ini = parse(`${anio}-01-01`), fin = parse(hasta || `${anio}-12-31`);
    return ausencias.filter(a => tipoDe(tipos, a.tipo).sinDevengo).reduce((s, a) => {
      const d = Math.max(parse(a.desde), ini), f = Math.min(parse(a.finReal || a.hastaPrevista || hoy), fin);
      return s + (f >= d ? Math.round((f - d) / DAY) + 1 : 0);
    }, 0);
  }

  function validar(a) {
    const e = [];
    if (!a.empleadoId) e.push('Elige a la persona');
    if (!a.tipo) e.push('Elige el tipo');
    if (!a.desde) e.push('Falta la fecha de inicio');
    if (a.hastaPrevista && a.desde && a.hastaPrevista < a.desde) e.push('El fin previsto es anterior al inicio');
    if (a.finReal && a.desde && a.finReal < a.desde) e.push('El fin real es anterior al inicio');
    if (a.porcentaje !== undefined && a.porcentaje !== '' && a.porcentaje !== null && !(a.porcentaje > 0 && a.porcentaje <= 100)) e.push('Porcentaje no válido');
    return e;
  }

  const api = { ESTADOS, estado, finEfectivo, vueltaPrevista, dias, ausentesEn, proximasVueltas, tarea, diasSinDevengo, validar, tipoDe, sumar };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MotorAusencias = api;
})(typeof window !== 'undefined' ? window : globalThis);
