// Pruebas del motor de procesos. Ejecutar: node tests/procesos.test.js
global.window = {};
require('../js/params.js');
const P = window.RRHH_PARAMS, C = P.procesos;
const M = require('../js/engines/procesos.js');
let fallos = 0, total = 0;
const ok = (n, c, x = '') => { total++; if (!c) fallos++; console.log(`${c ? '✔' : '✘'} ${n}${!c && x !== '' ? '  → ' + x : ''}`); };
const hoy = '2026-10-21';
/* Vacantes */
const v = { puesto: 'Producción', apertura: '2026-09-01', candidaturas: { m: 12, h: 30 }, entrevistas: { m: 3, h: 5 }, seleccionados: [{ nombre: 'Rosa', sexo: 'mujer' }] };
ok('Fase: publicada sin candidaturas', M.faseVacante({ apertura: '2026-09-01' }) === 'publicada');
ok('Fase: cribado con candidaturas', M.faseVacante({ candidaturas: { m: 1, h: 0 } }) === 'cribado');
ok('Fase: entrevistas', M.faseVacante({ candidaturas: { m: 1 }, entrevistas: { m: 1 } }) === 'entrevistas');
ok('Fase: selección', M.faseVacante(v) === 'seleccion');
ok('Fase: cerrada al cubrirse', M.faseVacante({ ...v, estado: 'cubierta' }) === 'cerrada');
const e = M.embudo(v);
ok('Embudo: tasa de entrevista por sexo (25 % mujeres, 16,7 % hombres)', Math.abs(e.tasaEntrevista.m - 0.25) < 1e-9 && Math.abs(e.tasaEntrevista.h - 5 / 30) < 1e-9);
ok('Embudo: seleccionadas (1 mujer de 3 entrevistadas)', e.seleccionados.m === 1 && Math.abs(e.tasaSeleccion.m - 1 / 3) < 1e-9);
ok('Validar: más entrevistas que candidaturas', M.validarVacante({ puesto: 'X', apertura: hoy, candidaturas: { m: 1 }, entrevistas: { m: 2 } }).length === 1);
ok('Días abierta', M.diasAbierta({ apertura: '2026-10-01' }, hoy) === 20 && M.diasAbierta({ apertura: '2026-09-01', cierre: '2026-09-30' }, hoy) === 29);
/* Periodos de prueba */
ok('Máximo convenio: titulado superior 6, técnico no titulado 3, comercial 6, producción 2', M.maxMeses('A1', C.prueba) === 6 && M.maxMeses('A3', C.prueba) === 3 && M.maxMeses('E2', C.prueba) === 6 && M.maxMeses('F6', C.prueba) === 2);
ok('Fin: 1 mes desde el 02/11 → 01/12', M.finPrueba('2026-11-02', 1) === '2026-12-01');
ok('Fin: 6 meses desde el 31/08 → 27/02 (mes corto)', M.finPrueba('2026-08-31', 6) === '2027-02-27', M.finPrueba('2026-08-31', 6));
const h1 = M.hitos('2026-11-02', 1, C.prueba);
ok('1 mes: un único aviso al final (5 días antes)', h1.length === 1 && h1[0].fecha === '2026-11-26');
const h3 = M.hitos('2026-11-02', 3, C.prueba);
ok('3 meses: a mitad y al final (7 días antes)', h3.length === 2 && h3[0].id === 'mitad' && h3[1].fecha === '2027-01-25', JSON.stringify(h3));
const h2 = M.hitos('2026-11-02', 2, C.prueba);
ok('2 meses: a mitad y al final', h2.length === 2 && h2[0].id === 'mitad');
const h6 = M.hitos('2026-11-02', 6, C.prueba);
ok('6 meses: a los 2, a los 4 y al final', h6.map(x => x.id).join() === 'm2,m4,final' && h6[0].fecha === '2027-01-02' && h6[1].fecha === '2027-03-02');
ok('Estado prueba: en curso / termina pronto / sin resolver', M.estadoPrueba({ fin: '2026-12-31' }, hoy) === 'en-curso' && M.estadoPrueba({ fin: '2026-10-30' }, hoy) === 'termina-pronto' && M.estadoPrueba({ fin: '2026-10-01' }, hoy) === 'sin-resolver');
ok('Estado prueba: superado y no superado', M.estadoPrueba({ fin: '2026-10-01', resultado: 'favorable' }, hoy) === 'superado' && M.estadoPrueba({ resultado: 'desiste' }, hoy) === 'no-superado');
/* Salidas */
const s = { fechaBaja: '2026-10-31', check: { comunicacion: true, preaviso: true } };
const pr = M.progresoSalida(C.salida, s);
ok('Salida: el paso opcional no cuenta (9 obligatorios)', pr.total === 9 && pr.hechos === 2);
ok('Salida: en curso, atrasada, completada', M.estadoSalida(C.salida, s, hoy) === 'en-curso' && M.estadoSalida(C.salida, s, '2026-11-05') === 'atrasada'
  && M.estadoSalida(C.salida, { check: Object.fromEntries(C.salida.map(p => [p.id, true])) }, hoy) === 'completada');
console.log(fallos ? `\n${fallos} de ${total} pruebas fallidas` : `\nTodas las pruebas correctas (${total})`);
process.exit(fallos ? 1 : 0);
