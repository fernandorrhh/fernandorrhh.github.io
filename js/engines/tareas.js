/*
 * Motor de tickets (tareas y recordatorios) — funciones puras.
 * Modelo de ticket:
 *   { id, clave (nº, se muestra T-001), tipo: 'tarea'|'recordatorio', titulo, nota, categoria, prioridad: 'alta'|'media'|'baja',
 *     estado: 'pendiente' (Por hacer) | 'proceso' (En curso) | 'espera' (En espera) | 'terminado' (Hecha),
 *     fecha: 'AAAA-MM-DD' o '', aviso (sale en el calendario), antelacion (días antes en que empieza a avisar),
 *     fijada, empleadoId, pasos: [{ t, ok }], historial: [{ f (ms), t }], repite: ''|'semana'|'mes'|'anio',
 *     hecha (= terminado), hechaEl (ms), auto ('docs'|'reinc'|'prueba'|'salida'|…) }
 * Los recordatorios solo tienen "pendiente" y "terminado" y siempre salen en el calendario.
 * Un ticket hecho sigue visible 7 días; después pasa al archivo.
 * Pruebas: tests/tareas.test.js
 */
(function (root) {
  const DAY = 86400000;
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  const iso = t => new Date(t).toISOString().slice(0, 10);
  const sumarDias = (f, n) => iso(parse(f) + n * DAY);
  const ARCHIVAR_DIAS = 7;

  const ESTADOS = ['pendiente', 'proceso', 'espera', 'terminado'];
  const PRIO = { alta: 0, media: 1, baja: 2 };
  /* Categoría por defecto de las tareas automáticas. */
  const CAT_AUTO = { docs: 'contratacion', prueba: 'prueba', promocion: 'cambios', reinc: 'ausencias', salida: 'bajas', cae: 'prl' };

  /* Siguiente estado (botón "avanzar"): Por hacer → En curso → Hecha → Por hacer; En espera → En curso.
     Recordatorio: pendiente ⇄ terminado. */
  function siguienteEstado(e, tipo = 'tarea') {
    if (tipo === 'recordatorio') return e === 'terminado' ? 'pendiente' : 'terminado';
    return { pendiente: 'proceso', proceso: 'terminado', espera: 'proceso', terminado: 'pendiente' }[e] || 'pendiente';
  }

  /* Completa los campos que falten (tareas antiguas o creadas por otros módulos). */
  function normalizar(t) {
    const tipo = t.tipo === 'recordatorio' ? 'recordatorio' : 'tarea';
    let estado = ESTADOS.includes(t.estado) ? t.estado : (t.hecha ? 'terminado' : 'pendiente');
    if (tipo === 'recordatorio' && estado !== 'terminado') estado = 'pendiente';
    const hecha = estado === 'terminado';
    return {
      ...t, tipo, estado, hecha,
      fecha: t.fecha || '', nota: t.nota || '', prioridad: PRIO[t.prioridad] !== undefined ? t.prioridad : 'media',
      categoria: t.categoria || CAT_AUTO[t.auto] || 'otras',
      aviso: tipo === 'recordatorio' ? true : !!t.aviso,
      antelacion: Math.max(0, Number(t.antelacion) || 0),
      fijada: !!t.fijada, empleadoId: t.empleadoId ?? null,
      pasos: Array.isArray(t.pasos) ? t.pasos : [], historial: Array.isArray(t.historial) ? t.historial : [],
      repite: t.repite || '',
      hechaEl: hecha ? (t.hechaEl ?? 0) : null
    };
  }
  const clave = n => 'T-' + String(n || 0).padStart(3, '0');

  /* Siguiente fecha de un ticket que se repite. Si el día no existe en el mes (31), usa el último. */
  function siguienteFecha(fecha, repite) {
    if (!fecha) return null;
    const t = parse(fecha), d = new Date(t);
    if (repite === 'semana') return iso(t + 7 * DAY);
    if (repite !== 'mes' && repite !== 'anio') return null;
    const y = d.getUTCFullYear() + (repite === 'anio' ? 1 : 0), m = d.getUTCMonth() + (repite === 'mes' ? 1 : 0);
    const ultimo = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return iso(Date.UTC(y, m, Math.min(d.getUTCDate(), ultimo)));
  }

  /* Rangos: semana de lunes a domingo y mes natural que contienen "hoy". */
  function semanaDe(hoy) { const t = parse(hoy), dow = (new Date(t).getUTCDay() + 6) % 7; return { desde: iso(t - dow * DAY), hasta: iso(t + (6 - dow) * DAY) }; }
  function mesDe(hoy) { const [y, m] = hoy.split('-').map(Number); return { desde: `${hoy.slice(0, 7)}-01`, hasta: iso(Date.UTC(y, m, 0)) }; }

  /* Fecha (local) en que se completó, como AAAA-MM-DD. */
  const diaDe = ms => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  /* Archivado: hecho hace más de 7 días (o sin fecha de cierre conocida). */
  const archivado = (t, ahora) => t.estado === 'terminado' && (!t.hechaEl || ahora - t.hechaEl > ARCHIVAR_DIAS * DAY);
  const vencido = (t, hoy) => !!t.fecha && t.estado !== 'terminado' && t.fecha < hoy;
  /* Con aviso: desde (fecha − antelación) hasta su fecha, el ticket "avisa". */
  const avisando = (t, hoy) => !!t.fecha && t.aviso && t.estado !== 'terminado' && t.fecha >= hoy && sumarDias(t.fecha, -t.antelacion) <= hoy;
  const enCalendario = t => !!t.fecha && (t.tipo === 'recordatorio' || t.aviso);

  /* ¿Entra un ticket en un rango (semana o mes)? Pendiente: fijado, vencido, con fecha en el rango o avisando.
     Hecho (aún no archivado): si su fecha o el día en que se completó caen en el rango, o si está fijado. */
  function enRango(t, r, hoy) {
    if (t.estado === 'terminado') return t.fijada || (t.fecha >= r.desde && t.fecha <= r.hasta) || (!!t.hechaEl && diaDe(t.hechaEl) >= r.desde && diaDe(t.hechaEl) <= r.hasta);
    return t.fijada || vencido(t, hoy) || (!!t.fecha && t.fecha >= r.desde && t.fecha <= r.hasta) || avisando(t, hoy);
  }

  /* Vistas: semana · mes · todas · fijadas · recordatorios · archivo. */
  const VISTAS = ['semana', 'mes', 'todas', 'fijadas', 'recordatorios', 'archivo'];
  function vista(lista, nombre, { hoy, ahora }) {
    if (nombre === 'archivo') return lista.filter(t => archivado(t, ahora));
    const vivos = lista.filter(t => !archivado(t, ahora));
    if (nombre === 'semana') { const r = semanaDe(hoy); return vivos.filter(t => enRango(t, r, hoy)); }
    if (nombre === 'mes') { const r = mesDe(hoy); return vivos.filter(t => enRango(t, r, hoy)); }
    if (nombre === 'fijadas') return vivos.filter(t => t.fijada);
    if (nombre === 'recordatorios') return vivos.filter(t => t.tipo === 'recordatorio');
    return vivos;
  }

  /* Filtros rápidos: categoría, importancia, estado, tipo, con aviso, texto. */
  function filtrar(lista, f = {}) {
    const n = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const q = n(f.q || '').trim();
    return lista.filter(t => (!f.categoria || t.categoria === f.categoria) && (!f.prioridad || t.prioridad === f.prioridad)
      && (!f.estado || t.estado === f.estado) && (!f.tipo || t.tipo === f.tipo) && (!f.aviso || enCalendario(t))
      && (!q || n(`${clave(t.clave)} ${t.titulo} ${t.nota} ${(t.pasos || []).map(p => p.t).join(' ')}`).includes(q)));
  }

  /* Orden de trabajo: primero lo pendiente (vencido, luego por fecha; sin fecha al final), después lo hecho.
     Dentro de la misma fecha, por importancia. */
  function ordenar(lista, hoy) {
    return [...lista].sort((a, b) => (a.estado === 'terminado') - (b.estado === 'terminado')
      || (a.estado === 'terminado' ? (b.hechaEl || 0) - (a.hechaEl || 0) : 0)
      || (b.fijada && !b.fecha) - (a.fijada && !a.fecha)
      || (a.fecha || '9999').localeCompare(b.fecha || '9999')
      || PRIO[a.prioridad] - PRIO[b.prioridad]
      || (a.clave || 0) - (b.clave || 0));
  }

  /* Archivo agrupado por mes de cierre (AAAA-MM), del más reciente al más antiguo. Sin fecha de cierre: 'sin-fecha'. */
  function archivoPorMes(lista) {
    const m = new Map();
    [...lista].sort((a, b) => (b.hechaEl || 0) - (a.hechaEl || 0)).forEach(t => { const k = t.hechaEl ? diaDe(t.hechaEl).slice(0, 7) : 'sin-fecha'; if (!m.has(k)) m.set(k, []); m.get(k).push(t); });
    return [...m.entries()].sort((a, b) => a[0] === 'sin-fecha' ? 1 : b[0] === 'sin-fecha' ? -1 : b[0].localeCompare(a[0])).map(([mes, items]) => ({ mes, items }));
  }
  const porCategoria = lista => lista.reduce((o, t) => (o[t.categoria] = (o[t.categoria] || 0) + 1, o), {});

  /* Posponer: n días desde su fecha (o desde hoy si no tiene o ya pasó). */
  function posponer(fecha, dias, hoy) { const base = fecha && fecha >= hoy ? fecha : hoy; return sumarDias(base, dias); }

  /* Agrupa tickets según su fecha respecto a hoy. Quien llama decide qué estados incluir. */
  function agrupar(tareas, hoy) {
    const h = parse(hoy), g = { vencidas: [], hoy: [], manana: [], semana: [], despues: [], sinFecha: [] };
    tareas.forEach(t => {
      if (!t.fecha) { g.sinFecha.push(t); return; }
      const dif = Math.round((parse(t.fecha) - h) / DAY);
      (dif < 0 ? g.vencidas : dif === 0 ? g.hoy : dif === 1 ? g.manana : dif <= 7 ? g.semana : g.despues).push(t);
    });
    Object.values(g).forEach(l => l.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '') || PRIO[a.prioridad] - PRIO[b.prioridad]));
    return g;
  }

  /* Exportación a calendario (Outlook, Google…): eventos de día completo con aviso (antelación) a las 9:00. */
  function ics(tareas, ahora = new Date()) {
    const e = s => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
    const fold = l => { const out = []; let s = l; while (s.length > 74) { out.push(s.slice(0, 74)); s = ' ' + s.slice(74); } out.push(s); return out.join('\r\n'); };
    const d = f => f.replace(/-/g, '');
    const stamp = ahora.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const FREQ = { semana: 'WEEKLY', mes: 'MONTHLY', anio: 'YEARLY' };
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//RRHH Simple//Plataforma RRHH//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    for (const t of tareas.filter(x => x.fecha)) {
      const ant = Number(t.antelacion) || 0;
      L.push('BEGIN:VEVENT', `UID:${String(t.id).replace(/\W/g, '')}@plataforma-rrhh`, `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${d(t.fecha)}`, `DTEND;VALUE=DATE:${d(iso(parse(t.fecha) + DAY))}`,
        `SUMMARY:${e((t.clave ? clave(t.clave) + ' · ' : '') + t.titulo)}`, `DESCRIPTION:${e(`Importancia: ${t.prioridad}${t.nota ? '\n' + t.nota : ''}`)}`);
      if (FREQ[t.repite]) L.push(`RRULE:FREQ=${FREQ[t.repite]}`);
      L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${e(t.titulo)}`, `TRIGGER:${ant ? `-P${ant}D` : 'PT9H'}`, 'END:VALARM', 'END:VEVENT');
    }
    L.push('END:VCALENDAR');
    return L.map(fold).join('\r\n') + '\r\n';
  }

  const api = { ESTADOS, CAT_AUTO, ARCHIVAR_DIAS, VISTAS, siguienteEstado, normalizar, clave, siguienteFecha, semanaDe, mesDe, diaDe,
    archivado, vencido, avisando, enCalendario, enRango, vista, filtrar, ordenar, archivoPorMes, porCategoria, posponer, agrupar, ics };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MotorTareas = api;
})(typeof window !== 'undefined' ? window : globalThis);
