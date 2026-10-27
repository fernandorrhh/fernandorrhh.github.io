/*
 * Motor de informes de igualdad — funciones puras. Todo desagregado por sexo (mujeres / hombres / sin indicar).
 * Base: RD 901/2020 (planes de igualdad: diagnóstico y seguimiento por sexo) · LO 3/2007, art. 46.
 * Cada informe devuelve { id, titulo, periodo, norma, secciones:[{ titulo, unidad, filas:[{ etiqueta, m, h, s }] }], detalle:{ columnas, filas }, notas }.
 * Pruebas: tests/informes.test.js
 */
(function (root) {
  const DAY = 86400000;
  const parse = s => { if (!s) return null; const [y, m, d] = String(s).split('-').map(Number); return (y && m && d) ? Date.UTC(y, m - 1, d) : null; };
  const SEXOS = { mujer: 'Mujer', hombre: 'Hombre' };
  const sx = v => v === 'mujer' ? 'm' : v === 'hombre' ? 'h' : 's';
  const nombreDe = e => e.nombreCompleto || [e.nombre, e.apellido1, e.apellido2].filter(Boolean).join(' ');
  const fdmy = s => s ? s.split('-').reverse().join('/') : '';
  const r1 = x => Math.round(x * 10) / 10;

  /* Agrupa una lista por una clave y cuenta (o suma "valor") por sexo. */
  function agrupar(lista, clave, { valor = () => 1, orden = null, todas = [] } = {}) {
    const mapa = new Map(todas.map(k => [k, { etiqueta: k, m: 0, h: 0, s: 0 }]));
    lista.forEach(x => { const k = clave(x) || 'Sin indicar'; if (!mapa.has(k)) mapa.set(k, { etiqueta: k, m: 0, h: 0, s: 0 }); mapa.get(k)[sx(x.sexo)] += valor(x); });
    const filas = [...mapa.values()];
    if (orden) filas.sort((a, b) => { const ia = orden.indexOf(a.etiqueta), ib = orden.indexOf(b.etiqueta); return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.etiqueta.localeCompare(b.etiqueta, 'es'); });
    else filas.sort((a, b) => (b.m + b.h + b.s) - (a.m + a.h + a.s) || a.etiqueta.localeCompare(b.etiqueta, 'es'));
    return filas;
  }
  const total = (lista, etiqueta = 'Total', valor = () => 1) => { const f = { etiqueta, m: 0, h: 0, s: 0 }; lista.forEach(x => f[sx(x.sexo)] += valor(x)); return f; };

  const activo = (e, fecha) => e.fechaContratacion && e.fechaContratacion <= fecha && (!e.fechaBaja || e.fechaBaja >= fecha);
  const categoria = (e, P) => { const p = P.puestos.find(x => x.puesto.toLowerCase() === String(e.puesto || '').toLowerCase()); return p ? P.tablas.categorias.find(c => c.id === p.categoria) : null; };
  const anios = (desde, hasta) => (parse(hasta) - parse(desde)) / (365.25 * DAY);
  const TRAMOS_ANTIG = ['Menos de 1 año', 'De 1 a 3 años', 'De 3 a 5 años', 'De 5 a 10 años', 'Más de 10 años'];
  const tramoAntig = a => a < 1 ? TRAMOS_ANTIG[0] : a < 3 ? TRAMOS_ANTIG[1] : a < 5 ? TRAMOS_ANTIG[2] : a < 10 ? TRAMOS_ANTIG[3] : TRAMOS_ANTIG[4];
  const sinSexo = l => l.filter(x => !x.sexo).length;
  const notaSinSexo = n => n ? [`${n} registro${n === 1 ? '' : 's'} sin sexo indicado: aparece${n === 1 ? '' : 'n'} en la columna “Sin indicar”. Complétalo para que el informe sea válido.`] : [];

  /* 1. Plantilla a una fecha. */
  function plantilla(empleados, { fecha, P }) {
    const l = empleados.filter(e => activo(e, fecha));
    const conCat = l.map(e => ({ ...e, _cat: categoria(e, P) }));
    return {
      id: 'plantilla', titulo: 'Composición de la plantilla', periodo: `A ${fdmy(fecha)}`, norma: 'RD 901/2020, anexo (diagnóstico: clasificación profesional y condiciones de trabajo)',
      secciones: [
        { titulo: 'Total de la plantilla', unidad: 'personas', filas: [total(l, 'Plantilla')] },
        { titulo: 'Por centro de trabajo', unidad: 'personas', filas: agrupar(l, e => e.centro, { orden: P.centros }) },
        { titulo: 'Por departamento', unidad: 'personas', filas: agrupar(l, e => e.departamento, { orden: P.departamentos }) },
        { titulo: 'Por grupo profesional (convenio)', unidad: 'personas', filas: agrupar(conCat, e => e._cat ? e._cat.grupo : 'Puesto sin categoría asignada', { orden: [...new Set(P.tablas.categorias.map(c => c.grupo))] }) },
        { titulo: 'Por puesto', unidad: 'personas', filas: agrupar(l, e => e.puesto) },
        { titulo: 'Por antigüedad', unidad: 'personas', filas: agrupar(l, e => tramoAntig(anios(e.fechaContratacion, fecha)), { orden: TRAMOS_ANTIG, todas: TRAMOS_ANTIG }) }
      ],
      detalle: { columnas: ['Código', 'Nombre', 'Sexo', 'Centro', 'Departamento', 'Puesto', 'Categoría', 'Contratación', 'Antigüedad (años)'],
        filas: conCat.sort((a, b) => nombreDe(a).localeCompare(nombreDe(b), 'es')).map(e => [e.codigo, nombreDe(e), SEXOS[e.sexo] || 'Sin indicar', e.centro, e.departamento, e.puesto, e._cat ? `${e._cat.id} · ${e._cat.nombre}` : '', fdmy(e.fechaContratacion), r1(anios(e.fechaContratacion, fecha))]) },
      notas: notaSinSexo(sinSexo(l))
    };
  }

  /* 2. Movimientos del año: incorporaciones y bajas. */
  function movimientos(empleados, { anio, hoy, P }) {
    const ini = `${anio}-01-01`, fin = `${anio}-12-31`, corte = hoy && hoy < fin ? hoy : fin;
    const inc = empleados.filter(e => e.fechaContratacion >= ini && e.fechaContratacion <= fin);
    const baj = empleados.filter(e => e.fechaBaja && e.fechaBaja >= ini && e.fechaBaja <= fin);
    const pIni = empleados.filter(e => activo(e, ini)), pFin = empleados.filter(e => activo(e, corte));
    return {
      id: 'movimientos', titulo: 'Incorporaciones y bajas', periodo: `Año ${anio}`, norma: 'RD 901/2020, anexo (diagnóstico: proceso de selección y contratación)',
      secciones: [
        { titulo: 'Resumen del año', unidad: 'personas', filas: [total(pIni, 'Plantilla a 1 de enero'), total(inc, 'Incorporaciones'), total(baj, 'Bajas'), total(pFin, corte === fin ? 'Plantilla a 31 de diciembre' : `Plantilla a ${fdmy(corte)}`)] },
        { titulo: 'Incorporaciones por centro', unidad: 'personas', filas: agrupar(inc, e => e.centro, { orden: P.centros }) },
        { titulo: 'Incorporaciones por departamento', unidad: 'personas', filas: agrupar(inc, e => e.departamento, { orden: P.departamentos }) },
        { titulo: 'Bajas por motivo', unidad: 'personas', filas: agrupar(baj, e => e.motivoBaja || 'Motivo sin indicar', { orden: P.motivosBaja }) },
        { titulo: 'Bajas por centro', unidad: 'personas', filas: agrupar(baj, e => e.centro, { orden: P.centros }) }
      ],
      detalle: { columnas: ['Movimiento', 'Fecha', 'Nombre', 'Sexo', 'Centro', 'Departamento', 'Puesto', 'Motivo de baja'],
        filas: [...inc.map(e => ['Incorporación', e.fechaContratacion, e]), ...baj.map(e => ['Baja', e.fechaBaja, e])].sort((a, b) => a[1].localeCompare(b[1]))
          .map(([t, f, e]) => [t, fdmy(f), nombreDe(e), SEXOS[e.sexo] || 'Sin indicar', e.centro, e.departamento, e.puesto, t === 'Baja' ? (e.motivoBaja || '') : '']) },
      notas: [...notaSinSexo(sinSexo([...inc, ...baj])), ...(baj.some(e => !e.motivoBaja) ? [`${baj.filter(e => !e.motivoBaja).length} bajas sin motivo indicado.`] : [])]
    };
  }

  /* 3. Ausencias del año (corresponsabilidad y conciliación). Días naturales dentro del año. */
  function ausencias(empleados, { anio, hoy, tipos }) {
    const ini = `${anio}-01-01`, fin = `${anio}-12-31`;
    const tipo = id => tipos.find(t => t.id === id) || { nombre: id };
    const l = [];
    empleados.forEach(e => (e.ausencias || []).forEach(a => {
      const hasta = a.finReal || a.hastaPrevista || (hoy > a.desde ? hoy : a.desde);
      const d = a.desde < ini ? ini : a.desde, h = hasta > fin ? fin : hasta;
      if (h < d) return;
      l.push({ ...a, sexo: e.sexo, persona: nombreDe(e), codigo: e.codigo, empleadoId: e.id, tipoNombre: tipo(a.tipo).nombre, dias: Math.round((parse(h) - parse(d)) / DAY) + 1, d, h });
    }));
    const orden = tipos.map(t => t.nombre);
    const personasPorTipo = [...new Map(l.map(a => [`${a.tipo}|${a.empleadoId}`, a])).values()];
    return {
      id: 'ausencias', titulo: 'Ausencias, permisos y reducciones', periodo: `Año ${anio}`, norma: 'RD 901/2020, anexo (ejercicio corresponsable de los derechos de la vida personal, familiar y laboral)',
      secciones: [
        { titulo: 'Personas por tipo', unidad: 'personas', filas: agrupar(personasPorTipo, a => a.tipoNombre, { orden }) },
        { titulo: 'Días de ausencia por tipo (sin reducciones de jornada)', unidad: 'días', filas: agrupar(l.filter(a => tipo(a.tipo).ausencia !== false), a => a.tipoNombre, { orden, valor: a => a.dias }) },
        { titulo: 'Personas por tipo y detalle', unidad: 'personas', filas: agrupar([...new Map(l.map(a => [`${a.tipo}|${a.subtipo}|${a.empleadoId}`, a])).values()], a => a.subtipo ? `${a.tipoNombre} · ${a.subtipo}` : a.tipoNombre, { orden: tipos.flatMap(t => [t.nombre, ...(t.subtipos || []).map(s => `${t.nombre} · ${s}`)]) }) }
      ],
      detalle: { columnas: ['Nombre', 'Sexo', 'Tipo', 'Detalle', 'Desde', 'Hasta', 'Días en el año', 'Reducción %', 'Estado'],
        filas: l.sort((a, b) => a.desde.localeCompare(b.desde)).map(a => [a.persona, SEXOS[a.sexo] || 'Sin indicar', a.tipoNombre, a.subtipo || '', fdmy(a.d), fdmy(a.h), a.dias, a.porcentaje || '', a.finReal ? 'Finalizada' : a.desde > hoy ? 'Programada' : 'En curso']) },
      notas: [...notaSinSexo(new Set(l.filter(a => !a.sexo).map(a => a.empleadoId)).size), 'No incluye diagnósticos ni datos de salud: solo el tipo de ausencia y las fechas.']
    };
  }

  /* 4. Procesos de alta del año. */
  function altas(lista, { anio, estado, progreso, P }) {
    const ini = `${anio}-01-01`, fin = `${anio}-12-31`;
    const enAnio = a => { const f = a.fechaIncorporacion || a.fechaOferta || (a.creada ? new Date(a.creada).toISOString().slice(0, 10) : ''); return f >= ini && f <= fin; };
    const l = lista.filter(enAnio).map(a => ({ ...a, _estado: estado(a), _dias: a.fechaOferta && a.fechaIncorporacion ? Math.round((parse(a.fechaIncorporacion) - parse(a.fechaOferta)) / DAY) : null }));
    const EST = { 'sin-iniciar': 'Sin iniciar', 'pendiente-docs': 'Pendiente de documentos', 'en-proceso': 'En proceso', bloqueada: 'Bloqueada', completada: 'Completada', cerrada: 'Cerrada (ficha creada)' };
    const media = k => { const v = l.filter(a => sx(a.sexo) === k && a._dias !== null).map(a => a._dias); return v.length ? r1(v.reduce((s, x) => s + x, 0) / v.length) : 0; };
    return {
      id: 'altas', titulo: 'Procesos de alta', periodo: `Año ${anio}`, norma: 'RD 901/2020, anexo (proceso de selección y contratación)',
      secciones: [
        { titulo: 'Altas por estado', unidad: 'personas', filas: agrupar(l, a => EST[a._estado], { orden: Object.values(EST) }) },
        { titulo: 'Altas por centro', unidad: 'personas', filas: agrupar(l, a => a.centro, { orden: P.centros }) },
        { titulo: 'Altas por puesto', unidad: 'personas', filas: agrupar(l, a => a.puesto) },
        { titulo: 'Días medios de la oferta a la incorporación', unidad: 'media', filas: [{ etiqueta: 'Media de días', m: media('m'), h: media('h'), s: media('s') }] }
      ],
      detalle: { columnas: ['Nombre', 'Sexo', 'Centro', 'Departamento', 'Puesto', 'Oferta', 'Incorporación', 'Días', 'Estado', 'Progreso %'],
        filas: l.sort((a, b) => (a.fechaIncorporacion || '').localeCompare(b.fechaIncorporacion || '')).map(a => [a.nombre, SEXOS[a.sexo] || 'Sin indicar', a.centro, a.departamento || '', a.puesto || '', fdmy(a.fechaOferta), fdmy(a.fechaIncorporacion), a._dias ?? '', EST[a._estado], Math.round(progreso(a).pct * 100)]) },
      notas: notaSinSexo(sinSexo(l))
    };
  }

  /* Subida media (%) de las subidas salariales con salario anterior y nuevo. */
  function subidaMedia(l) {
    const v = k => { const x = l.filter(p => sx(p.sexo) === k && p.salarioAnterior > 0 && p.salarioNuevo > 0).map(p => (p.salarioNuevo - p.salarioAnterior) / p.salarioAnterior * 100); return x.length ? r1(x.reduce((a, b) => a + b, 0) / x.length) : 0; };
    return { etiqueta: 'Subida media sobre el salario anterior', m: v('m'), h: v('h'), s: v('s') };
  }

  /* 6. Selección y contratación (vacantes abiertas en el año). Solo recuentos por sexo. */
  function seleccion(vacantes, { anio, hoy }) {
    const l = vacantes.filter(v => (v.apertura || '').startsWith(String(anio)));
    const s = (k, x) => l.reduce((a, v) => a + (Number(v[k]?.[x]) || 0), 0);
    const sel = x => l.reduce((a, v) => a + (v.seleccionados || []).filter(p => p.sexo === x).length, 0);
    const C = { m: s('candidaturas', 'm'), h: s('candidaturas', 'h') }, E = { m: s('entrevistas', 'm'), h: s('entrevistas', 'h') }, S = { m: sel('mujer'), h: sel('hombre') };
    const pc = (a, b) => b ? r1(a / b * 100) : 0;
    const porPuesto = [...new Set(l.map(v => v.puesto))].map(p => { const vs = l.filter(v => v.puesto === p); return { etiqueta: p, m: vs.reduce((a, v) => a + (Number(v.candidaturas?.m) || 0), 0), h: vs.reduce((a, v) => a + (Number(v.candidaturas?.h) || 0), 0), s: 0 }; }).sort((a, b) => (b.m + b.h) - (a.m + a.h));
    const cubiertas = l.filter(v => v.estado === 'cubierta' && v.cierre), media = cubiertas.length ? Math.round(cubiertas.reduce((a, v) => a + (parse(v.cierre) - parse(v.apertura)) / DAY, 0) / cubiertas.length) : null;
    const canales = {}; l.forEach(v => (v.canales || []).forEach(c => { const n = c === 'Otro' && v.otroCanal ? v.otroCanal : c; canales[n] = (canales[n] || 0) + 1; }));
    const EST = { abierta: 'Abierta', cubierta: 'Cubierta', desierta: 'Desierta', cancelada: 'Cancelada' };
    return {
      id: 'seleccion', titulo: 'Selección y contratación', periodo: `Año ${anio}`, norma: 'RD 901/2020, anexo (proceso de selección y contratación)',
      secciones: [
        { titulo: 'Embudo de selección', unidad: 'personas', sinTotal: true, filas: [{ etiqueta: 'Candidaturas', ...C, s: 0 }, { etiqueta: 'Entrevistas', ...E, s: 0 }, { etiqueta: 'Personas seleccionadas', ...S, s: 0 }] },
        { titulo: 'Tasas de paso', unidad: 'porcentaje', filas: [{ etiqueta: '% de candidaturas que llegan a entrevista', m: pc(E.m, C.m), h: pc(E.h, C.h), s: 0 }, { etiqueta: '% de entrevistas que acaban en selección', m: pc(S.m, E.m), h: pc(S.h, E.h), s: 0 }] },
        { titulo: 'Candidaturas por puesto', unidad: 'personas', filas: porPuesto }
      ],
      detalle: { columnas: ['Puesto', 'Centro', 'Departamento', 'Apertura', 'Cierre', 'Estado', 'Días', 'Canales', 'Candidaturas M', 'Candidaturas H', 'Entrevistas M', 'Entrevistas H', 'Seleccionadas'],
        filas: l.sort((a, b) => a.apertura.localeCompare(b.apertura)).map(v => [v.puesto, v.centro || '', v.departamento || '', fdmy(v.apertura), fdmy(v.cierre), EST[v.estado || 'abierta'], Math.round((parse(v.cierre || hoy) - parse(v.apertura)) / DAY), (v.canales || []).map(c => c === 'Otro' && v.otroCanal ? v.otroCanal : c).join(', '), Number(v.candidaturas?.m) || 0, Number(v.candidaturas?.h) || 0, Number(v.entrevistas?.m) || 0, Number(v.entrevistas?.h) || 0, (v.seleccionados || []).map(p => `${p.nombre} (${SEXOS[p.sexo] || '?'})`).join(', ')]) },
      notas: [`${l.length} vacante${l.length === 1 ? '' : 's'} abierta${l.length === 1 ? '' : 's'} en el año; ${cubiertas.length} cubierta${cubiertas.length === 1 ? '' : 's'}${media !== null ? `, en ${media} días de media` : ''}.`,
        ...(Object.keys(canales).length ? [`Canales usados (número de vacantes): ${Object.entries(canales).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} (${n})`).join(', ')}.`] : [])]
    };
  }

  /* 5. Promociones del año. */
  function promociones(empleados, { anio, P }) {
    const ini = `${anio}-01-01`, fin = `${anio}-12-31`;
    const l = empleados.flatMap(e => (e.promociones || []).filter(p => p.fecha >= ini && p.fecha <= fin).map(p => ({ ...p, sexo: e.sexo, persona: nombreDe(e), empleadoId: e.id })));
    const personas = [...new Map(l.map(p => [p.empleadoId, p])).values()];
    const media = empleados.filter(e => activo(e, `${anio}-07-01`));
    const pm = total(media, 'Plantilla a 1 de julio'), pp = total(personas, 'Personas promocionadas');
    const tasa = { etiqueta: '% de la plantilla promocionada', m: pm.m ? r1(pp.m / pm.m * 100) : 0, h: pm.h ? r1(pp.h / pm.h * 100) : 0, s: pm.s ? r1(pp.s / pm.s * 100) : 0 };
    return {
      id: 'promociones', titulo: 'Promociones y cambios de puesto', periodo: `Año ${anio}`, norma: 'RD 901/2020, anexo (promoción profesional)',
      secciones: [
        { titulo: 'Resumen', unidad: 'personas', filas: [pp, pm] },
        { titulo: 'Tasa de promoción', unidad: 'porcentaje', filas: [tasa] },
        { titulo: 'Por tipo de cambio', unidad: 'cambios', filas: agrupar(l.map(p => ({ ...p, tipo: p.tipo === 'Mejora salarial' ? 'Subida salarial' : p.tipo })), p => p.tipo, { orden: P.tiposPromocion }) },
        { titulo: 'Subida salarial media', unidad: 'porcentaje', filas: [subidaMedia(l)] }
      ],
      detalle: { columnas: ['Fecha', 'Nombre', 'Sexo', 'Tipo', 'Antes', 'Después', 'Nota'],
        filas: l.sort((a, b) => a.fecha.localeCompare(b.fecha)).map(p => [fdmy(p.fecha), p.persona, SEXOS[p.sexo] || 'Sin indicar', p.tipo, p.de || '', p.a || '', p.nota || '']) },
      notas: notaSinSexo(new Set(l.filter(p => !p.sexo).map(p => p.empleadoId)).size)
    };
  }

  /* Totales y porcentajes de una sección (para mostrar y exportar). */
  function conTotales(sec) {
    const sumable = sec.unidad === 'personas' || sec.unidad === 'días' || sec.unidad === 'cambios';
    const filas = sec.filas.map(f => ({ ...f, t: f.m + f.h + f.s, pm: f.m + f.h + f.s ? f.m / (f.m + f.h + f.s) : 0, ph: f.m + f.h + f.s ? f.h / (f.m + f.h + f.s) : 0 }));
    const tot = sumable && !sec.sinTotal && filas.length > 1 ? filas.reduce((a, f) => ({ etiqueta: 'Total', m: a.m + f.m, h: a.h + f.h, s: a.s + f.s }), { etiqueta: 'Total', m: 0, h: 0, s: 0 }) : null;
    if (tot) { tot.t = tot.m + tot.h + tot.s; tot.pm = tot.t ? tot.m / tot.t : 0; tot.ph = tot.t ? tot.h / tot.t : 0; }
    return { ...sec, sumable, filas, total: tot, conSin: !!(filas.some(f => f.s) || (tot && tot.s > 0)) };
  }


  /* Hojas para Excel: "Resumen" (secciones con totales y %) y "Detalle" (listado). */
  function aHojas(inf, { empresa = '', generado = '' } = {}) {
    const R = [[{ v: inf.titulo, s: 2 }], [`${empresa ? empresa + ' · ' : ''}${inf.periodo}`], [{ v: `Base: ${inf.norma}`, s: 6 }], [{ v: `Generado el ${generado}`, s: 6 }], []];
    inf.secciones.map(conTotales).forEach(sec => {
      const pct = sec.sumable, sin = sec.conSin;
      R.push([{ v: `${sec.titulo} (${sec.unidad})`, s: 4 }]);
      R.push(['Concepto', 'Mujeres', 'Hombres', ...(sin ? ['Sin indicar'] : []), ...(pct ? ['Total', '% mujeres', '% hombres'] : [])].map(v => ({ v, s: 1 })));
      const fila = (f, b) => [{ v: f.etiqueta, s: b ? 4 : 0 }, { v: f.m, s: b ? 4 : 0 }, { v: f.h, s: b ? 4 : 0 }, ...(sin ? [{ v: f.s, s: b ? 4 : 0 }] : []), ...(pct ? [{ v: f.t, s: b ? 4 : 0 }, { v: f.pm, s: b ? 5 : 3 }, { v: f.ph, s: b ? 5 : 3 }] : [])];
      sec.filas.forEach(f => R.push(fila(f, false)));
      if (sec.total) R.push(fila(sec.total, true));
      R.push([]);
    });
    (inf.notas || []).forEach(n => R.push([{ v: n, s: 6 }]));
    const D = [inf.detalle.columnas.map(v => ({ v, s: 1 })), ...inf.detalle.filas];
    return [
      { nombre: 'Resumen', anchos: [44, 12, 12, 12, 12, 12, 12], filas: R },
      { nombre: 'Detalle', anchos: inf.detalle.columnas.map(c => Math.max(12, Math.min(40, c.length + 6, Math.max(...inf.detalle.filas.map(f => String(f[inf.detalle.columnas.indexOf(c)] ?? '').length)) + 2))), filas: D }
    ];
  }

  const api = { aHojas, seleccion, plantilla, movimientos, ausencias, altas, promociones, conTotales, agrupar, SEXOS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MotorInformes = api;
})(typeof window !== 'undefined' ? window : globalThis);
