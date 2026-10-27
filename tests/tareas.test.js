// Pruebas del motor de tickets (tareas y recordatorios). Ejecutar: node tests/tareas.test.js
const M = require('../js/engines/tareas.js');
const { siguienteFecha, agrupar, ics, siguienteEstado, normalizar } = M;

let fallos = 0, total = 0;
const ok = (nombre, cond) => { total++; if (!cond) fallos++; console.log(`${cond ? '✔' : '✘'} ${nombre}`); };
const DAY = 86400000;

ok('Semanal: +7 días', siguienteFecha('2026-10-20', 'semana') === '2026-10-27');
ok('Mensual: mismo día del mes siguiente', siguienteFecha('2026-10-20', 'mes') === '2026-11-20');
ok('Mensual desde el 31: último día del mes siguiente', siguienteFecha('2026-01-31', 'mes') === '2026-02-28');
ok('Mensual en diciembre pasa de año', siguienteFecha('2026-12-15', 'mes') === '2027-01-15');
ok('Anual desde 29/02 en bisiesto: 28/02', siguienteFecha('2028-02-29', 'anio') === '2029-02-28');
ok('Sin repetición: null', siguienteFecha('2026-10-20', '') === null);
ok('Sin fecha no se repite: null', siguienteFecha('', 'mes') === null);

const T = [
  { id: 1, titulo: 'A', fecha: '2026-10-18', prioridad: 'media' },
  { id: 2, titulo: 'B', fecha: '2026-10-20', prioridad: 'baja' },
  { id: 3, titulo: 'C', fecha: '2026-10-20', prioridad: 'alta' },
  { id: 4, titulo: 'D', fecha: '2026-10-21', prioridad: 'media' },
  { id: 5, titulo: 'E', fecha: '2026-10-27', prioridad: 'media' },
  { id: 6, titulo: 'F', fecha: '2026-10-28', prioridad: 'media' },
  { id: 8, titulo: 'H', fecha: '', prioridad: 'baja' },
];
const g = agrupar(T, '2026-10-20');
ok('Agrupar: vencidas', g.vencidas.map(t => t.id).join() === '1');
ok('Agrupar: hoy por importancia', g.hoy.map(t => t.id).join() === '3,2');
ok('Agrupar: mañana, semana, después y sin fecha', g.manana[0].id === 4 && g.semana[0].id === 5 && g.despues[0].id === 6 && g.sinFecha[0].id === 8);

/* Estados */
ok('Estado: Por hacer → En curso', siguienteEstado('pendiente') === 'proceso');
ok('Estado: En curso → Hecha', siguienteEstado('proceso') === 'terminado');
ok('Estado: En espera → En curso', siguienteEstado('espera') === 'proceso');
ok('Estado: Hecha → Por hacer', siguienteEstado('terminado') === 'pendiente');
ok('Recordatorio: pendiente ⇄ hecho', siguienteEstado('pendiente', 'recordatorio') === 'terminado' && siguienteEstado('terminado', 'recordatorio') === 'pendiente');

/* Migración */
const viejo = normalizar({ id: 1, titulo: 'x', hecha: true, fecha: '2026-01-01', prioridad: 'alta' });
ok('Migración: hecha antigua → terminado, tarea, categoría Otras', viejo.estado === 'terminado' && viejo.tipo === 'tarea' && viejo.categoria === 'otras');
ok('Migración: sin fecha de cierre → archivada', M.archivado(viejo, Date.now()));
ok('Migración: automáticas con su categoría', normalizar({ auto: 'prueba' }).categoria === 'prueba' && normalizar({ auto: 'docs' }).categoria === 'contratacion' && normalizar({ auto: 'reinc' }).categoria === 'ausencias' && normalizar({ auto: 'salida' }).categoria === 'bajas');
ok('Recordatorio: siempre en calendario y sin estados intermedios', (r => r.aviso && r.estado === 'pendiente')(normalizar({ tipo: 'recordatorio', estado: 'proceso' })));
ok('Normalizar: estado manda sobre "hecha"', normalizar({ id: 1, estado: 'proceso', hecha: true }).hecha === false);
ok('Clave con tres cifras', M.clave(7) === 'T-007' && M.clave(1234) === 'T-1234');

/* Rangos */
ok('Semana de lunes a domingo (jueves 22/10/2026)', JSON.stringify(M.semanaDe('2026-10-22')) === '{"desde":"2026-10-19","hasta":"2026-10-25"}');
ok('Semana desde un domingo', M.semanaDe('2026-10-25').desde === '2026-10-19');
ok('Mes natural (febrero 2028 bisiesto)', M.mesDe('2028-02-10').hasta === '2028-02-29');

/* Vistas: hoy jueves 22/10/2026 a las 12:00 */
const hoy = '2026-10-22', ahora = new Date(2026, 9, 22, 12).getTime();
const tk = [
  { id: 1, clave: 1, titulo: 'Vencida', fecha: '2026-10-10' },
  { id: 2, clave: 2, titulo: 'Esta semana', fecha: '2026-10-24' },
  { id: 3, clave: 3, titulo: 'Este mes', fecha: '2026-10-30' },
  { id: 4, clave: 4, titulo: 'Mes siguiente', fecha: '2026-11-15' },
  { id: 5, clave: 5, titulo: 'Sin fecha', fecha: '' },
  { id: 6, clave: 6, titulo: 'Sin fecha fijada', fecha: '', fijada: true },
  { id: 7, clave: 7, titulo: 'Hecha ayer', fecha: '2026-10-21', estado: 'terminado', hechaEl: ahora - DAY },
  { id: 8, clave: 8, titulo: 'Hecha hace 10 días', fecha: '2026-10-12', estado: 'terminado', hechaEl: ahora - 10 * DAY },
  { id: 9, clave: 9, titulo: 'Recordatorio con antelación', tipo: 'recordatorio', fecha: '2026-11-05', antelacion: 15 },
  { id: 10, clave: 10, titulo: 'Aviso sin antelación', fecha: '2026-11-20', aviso: true }
].map(normalizar);
const ids = l => l.map(t => t.id).sort((a, b) => a - b).join();
ok('Mi semana: vencidas + semana + fijadas + hechas recientes + avisos en curso', ids(M.vista(tk, 'semana', { hoy, ahora })) === '1,2,6,7,9');
ok('Este mes: añade lo del resto del mes', ids(M.vista(tk, 'mes', { hoy, ahora })) === '1,2,3,6,7,9');
ok('Todas: incluye las sin fecha no fijadas, nunca las archivadas', ids(M.vista(tk, 'todas', { hoy, ahora })) === '1,2,3,4,5,6,7,9,10');
ok('Las sin fecha y sin fijar solo salen en Todas', !M.vista(tk, 'semana', { hoy, ahora }).some(t => t.id === 5) && !M.vista(tk, 'fijadas', { hoy, ahora }).some(t => t.id === 5));
ok('Fijadas', ids(M.vista(tk, 'fijadas', { hoy, ahora })) === '6');
ok('Recordatorios', ids(M.vista(tk, 'recordatorios', { hoy, ahora })) === '9');
ok('Archivo: hechas hace más de 7 días', ids(M.vista(tk, 'archivo', { hoy, ahora })) === '8');
ok('Hecha hace exactamente 7 días: aún visible', !M.archivado({ estado: 'terminado', hechaEl: ahora - 7 * DAY }, ahora));
ok('Calendario: recordatorios y tareas con aviso', tk.filter(M.enCalendario).map(t => t.id).join() === '9,10');

/* Orden y filtros */
const ord = M.ordenar(M.vista(tk, 'mes', { hoy, ahora }), hoy).map(t => t.id).join();
ok('Orden: fijada sin fecha, vencida, por fecha y las hechas al final', ord === '6,1,2,3,9,7');
ok('Filtro por texto en clave', M.filtrar(tk, { q: 't-004' }).map(t => t.id).join() === '4');
ok('Filtro por tipo y con aviso', M.filtrar(tk, { tipo: 'recordatorio' }).length === 1 && M.filtrar(tk, { aviso: true }).length === 2);
ok('Filtro por estado', M.filtrar(tk, { estado: 'terminado' }).length === 2);

/* Archivo por meses */
const arch = M.archivoPorMes([
  { id: 1, hechaEl: new Date(2026, 8, 30, 10).getTime(), categoria: 'gestoria' },
  { id: 2, hechaEl: new Date(2026, 9, 1, 10).getTime(), categoria: 'prl' },
  { id: 3, hechaEl: 0, categoria: 'otras' },
  { id: 4, hechaEl: new Date(2026, 9, 5, 10).getTime(), categoria: 'prl' }]);
ok('Archivo: por mes de cierre, del más reciente al más antiguo', arch.map(x => x.mes).join() === '2026-10,2026-09,sin-fecha' && arch[0].items.map(t => t.id).join() === '4,2');
ok('Archivo: recuento por categoría', M.porCategoria(arch[0].items).prl === 2);

/* Posponer */
ok('Posponer +1 semana desde su fecha', M.posponer('2026-10-24', 7, hoy) === '2026-10-31');
ok('Posponer una vencida: desde hoy', M.posponer('2026-10-10', 1, hoy) === '2026-10-23');
ok('Posponer sin fecha: desde hoy', M.posponer('', 1, hoy) === '2026-10-23');

/* ICS */
const cal = ics([{ id: 10, titulo: 'Sin día', fecha: '', prioridad: 'baja' }, { id: 9.5, clave: 12, titulo: 'Enviar TC, gestoría; urgente', fecha: '2026-10-20', prioridad: 'alta', repite: 'mes', nota: 'Línea 1\nLínea 2', antelacion: 3 }], new Date('2026-10-20T10:00:00Z'));
ok('ICS: cabecera y cierre', cal.startsWith('BEGIN:VCALENDAR') && cal.trim().endsWith('END:VCALENDAR'));
ok('ICS: evento de día completo', cal.includes('DTSTART;VALUE=DATE:20261020') && cal.includes('DTEND;VALUE=DATE:20261021'));
ok('ICS: repetición mensual', cal.includes('RRULE:FREQ=MONTHLY'));
ok('ICS: clave y escapado', cal.includes('SUMMARY:T-012 · Enviar TC\\, gestoría\\; urgente'));
ok('ICS: aviso con antelación', cal.includes('TRIGGER:-P3D'));
ok('ICS: sin fecha no se exporta', (cal.match(/BEGIN:VEVENT/g) || []).length === 1);

console.log(fallos ? `\n${fallos} de ${total} pruebas fallidas` : `\nTodas las pruebas correctas (${total})`);
process.exit(fallos ? 1 : 0);
