// Pruebas del motor de informes y del generador de Excel. Ejecutar: node tests/informes.test.js
global.window = {};
require('../js/params.js');
const P = window.RRHH_PARAMS;
const I = require('../js/engines/informes.js');
const X = require('../js/engines/xlsx.js');
const MA = require('../js/engines/altas.js');
let fallos = 0, total = 0;
const ok = (n, c, x = '') => { total++; if (!c) fallos++; console.log(`${c ? '✔' : '✘'} ${n}${!c && x !== '' ? '  → ' + x : ''}`); };
const E = [
  { id: 1, codigo: 'A1', nombre: 'Ana', apellido1: 'Ruiz', sexo: 'mujer', centro: 'Fábrica (Talavera)', departamento: 'Fábrica', puesto: 'Producción', fechaContratacion: '2015-03-01', fechaBaja: '',
    ausencias: [{ id: 11, tipo: 'it', subtipo: 'Enfermedad común', desde: '2026-02-01', finReal: '2026-02-10' }, { id: 12, tipo: 'reduccion', subtipo: 'Guarda legal (menor de 12 años)', desde: '2026-01-01', hastaPrevista: '2026-12-31', porcentaje: 12.5 }],
    promociones: [{ id: 1, fecha: '2026-05-01', tipo: 'Promoción de categoría', de: 'Producción', a: 'Carretillero/a' }] },
  { id: 2, codigo: 'A2', nombre: 'Luis', apellido1: 'Gil', sexo: 'hombre', centro: 'Fábrica (Talavera)', departamento: 'Fábrica', puesto: 'Producción', fechaContratacion: '2026-03-01', fechaBaja: '',
    ausencias: [{ id: 21, tipo: 'nacimiento', subtipo: 'Semanas obligatorias', desde: '2026-06-01', hastaPrevista: '2026-07-12' }, { id: 22, tipo: 'it', desde: '2025-12-20', finReal: '2026-01-05' }] },
  { id: 3, codigo: 'A3', nombre: 'Eva', apellido1: 'Sanz', sexo: 'mujer', centro: 'Oficina (Madrid)', departamento: 'Comercial', puesto: 'Comercial', fechaContratacion: '2020-01-15', fechaBaja: '2026-06-30', motivoBaja: 'Baja voluntaria' },
  { id: 4, codigo: 'A4', nombre: 'Juan', apellido1: 'Paz', sexo: '', centro: 'Oficina (Madrid)', departamento: 'Administración y Finanzas', puesto: 'Administrativo/a Contable', fechaContratacion: '2018-09-01', fechaBaja: '' }
];
const pl = I.plantilla(E, { fecha: '2026-10-21', P });
const tot = pl.secciones[0].filas[0];
ok('Plantilla a fecha: 3 activos (Eva ya está de baja)', tot.m === 1 && tot.h === 1 && tot.s === 1, JSON.stringify(tot));
ok('Plantilla: grupo profesional desde el puesto', pl.secciones[3].filas.find(f => f.etiqueta === 'Personal de producción').m === 1);
ok('Plantilla: antigüedad por tramos (con todos los tramos)', pl.secciones[5].filas.length === 5 && pl.secciones[5].filas.find(f => f.etiqueta === 'Más de 10 años').m === 1);
ok('Plantilla: aviso de registros sin sexo', pl.notas.length === 1 && /1 registro/.test(pl.notas[0]));
ok('Plantilla: detalle con una fila por persona', pl.detalle.filas.length === 3);
const mv = I.movimientos(E, { anio: 2026, hoy: '2026-10-21', P });
const res = Object.fromEntries(mv.secciones[0].filas.map(f => [f.etiqueta.split(' ')[0], f]));
ok('Movimientos: 1 incorporación (hombre) y 1 baja (mujer)', res.Incorporaciones.h === 1 && res.Incorporaciones.m === 0 && res.Bajas.m === 1);
ok('Movimientos: plantilla a 1 de enero (3) y a hoy (3)', res.Plantilla.m + res.Plantilla.h + res.Plantilla.s === 3);
ok('Movimientos: baja por motivo', mv.secciones[3].filas[0].etiqueta === 'Baja voluntaria' && mv.secciones[3].filas[0].m === 1);
const au = I.ausencias(E, { anio: 2026, hoy: '2026-10-21', tipos: P.ausencias.tipos });
const dias = au.secciones[1].filas.find(f => f.etiqueta === 'Baja médica (IT)');
ok('Ausencias: días de IT dentro del año (10 mujer, 5 hombre)', dias.m === 10 && dias.h === 5, JSON.stringify(dias));
ok('Ausencias: nacimiento 42 días (hombre)', au.secciones[1].filas.find(f => f.etiqueta.startsWith('Nacimiento')).h === 42);
ok('Ausencias: personas por tipo y detalle (reducción por guarda legal)', au.secciones[2].filas.some(f => f.etiqueta === 'Reducción de jornada · Guarda legal (menor de 12 años)' && f.m === 1));
ok('Ausencias: el detalle no incluye notas', !au.detalle.columnas.includes('Nota'));
const al = I.altas([{ id: 1, nombre: 'Rosa', sexo: 'mujer', centro: 'Fábrica (Talavera)', puesto: 'Producción', fechaOferta: '2026-09-01', fechaIncorporacion: '2026-09-15', check: {} },
  { id: 2, nombre: 'Mario', sexo: 'hombre', centro: 'Oficina (Madrid)', puesto: 'Comercial', fechaOferta: '2026-10-01', fechaIncorporacion: '2026-10-21', check: {}, cerrada: true },
  { id: 3, nombre: 'Vieja', sexo: 'mujer', centro: 'Oficina (Madrid)', fechaIncorporacion: '2025-05-01', check: {} }], { anio: 2026, estado: MA.estado, progreso: MA.progreso, P });
ok('Altas del año: 2 (excluye 2025)', al.detalle.filas.length === 2);
ok('Altas: días medios oferta → incorporación (14 mujer, 20 hombre)', al.secciones[3].filas[0].m === 14 && al.secciones[3].filas[0].h === 20);
const pr = I.promociones(E, { anio: 2026, P });
ok('Promociones: 1 mujer promocionada', pr.secciones[0].filas[0].m === 1 && pr.secciones[0].filas[0].h === 0);
ok('Promociones: tasa = 1 de 1 mujer en plantilla a 1 de julio (100 %)', pr.secciones[1].filas[0].m === 100, JSON.stringify(pr.secciones[1].filas[0]));
const ct = I.conTotales(pl.secciones[1]);
ok('Totales y porcentajes', ct.total && ct.total.t === 3 && Math.abs(ct.filas[0].pm - 0.5) < 1e-9);
ok('Columna "Sin indicar" solo si hace falta', I.conTotales(mv.secciones[3]).conSin === false && ct.conSin === true);
/* Excel */
const hojas = I.aHojas(pl, { empresa: 'Liptosa', generado: '21/10/2026' });
ok('Excel: hojas Resumen y Detalle', hojas.length === 2 && hojas[1].filas.length === 4);
const bin = X.crear(hojas);
ok('Excel: es un ZIP válido (firma PK)', bin[0] === 0x50 && bin[1] === 0x4B && bin.length > 1000);
ok('CRC32 conocido ("123456789" = CBF43926)', X.crc32(new TextEncoder().encode('123456789')).toString(16) === 'cbf43926');
ok('Columnas de Excel: A, Z, AA, AB', [0, 25, 26, 27].map(X.col).join() === 'A,Z,AA,AB');
require('fs').writeFileSync(require('path').join(require('os').tmpdir(), 'prueba-informe.xlsx'), bin);
/* Selección (fase procesos) */
const sl = I.seleccion([{ puesto: 'Producción', apertura: '2026-03-01', cierre: '2026-03-31', estado: 'cubierta', canales: ['LinkedIn', 'InfoJobs'], candidaturas: { m: 10, h: 30 }, entrevistas: { m: 4, h: 6 }, seleccionados: [{ nombre: 'Rosa', sexo: 'mujer' }] },
  { puesto: 'Comercial', apertura: '2026-06-01', canales: ['LinkedIn'], candidaturas: { m: 5, h: 5 }, entrevistas: { m: 1, h: 2 }, seleccionados: [] },
  { puesto: 'Vieja', apertura: '2025-06-01', candidaturas: { m: 99, h: 99 } }], { anio: 2026, hoy: '2026-10-21' });
ok('Selección: embudo del año (15 M / 35 H candidaturas)', sl.secciones[0].filas[0].m === 15 && sl.secciones[0].filas[0].h === 35);
ok('Selección: sin fila de total en el embudo', I.conTotales(sl.secciones[0]).total === null);
ok('Selección: tasa de entrevista (33,3 % M, 22,9 % H)', sl.secciones[1].filas[0].m === 33.3 && sl.secciones[1].filas[0].h === 22.9, JSON.stringify(sl.secciones[1].filas[0]));
ok('Selección: canales en notas (LinkedIn 2)', /LinkedIn \(2\)/.test(sl.notas[1]));
ok('Selección: días medios hasta cubrir (30)', /30 días de media/.test(sl.notas[0]));
const prS = I.promociones([{ id: 9, sexo: 'mujer', fechaContratacion: '2020-01-01', promociones: [{ fecha: '2026-03-01', tipo: 'Subida salarial', salarioAnterior: 20000, salarioNuevo: 21000 }] }], { anio: 2026, P });
ok('Promociones: subida media 5 % (mujer)', prS.secciones[3].filas[0].m === 5);

console.log(fallos ? `\n${fallos} de ${total} pruebas fallidas` : `\nTodas las pruebas correctas (${total})`);
process.exit(fallos ? 1 : 0);
