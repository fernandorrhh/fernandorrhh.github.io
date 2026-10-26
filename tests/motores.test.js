// Pruebas de los motores de la web. Ejecutar: node tests/motores.test.js
global.window = {};
require('../motor/parametros.js');
const W = window.RRHH_WEB_PARAMS;
const I = require('../motor/indemnizacion.js');
const V = require('../motor/vacaciones.js');
const F = require('../motor/finiquito.js');

let fallos = 0, total = 0;
const ok = (n, c, x = '') => { total++; if (!c) fallos++; console.log(`${c ? '✔' : '✘'} ${n}${!c && x !== '' ? '  → ' + x : ''}`); };

/* Indemnización: caso de referencia del proyecto */
const caso = { inicio: '2019-03-01', fin: '2026-10-18', salarioAnual: 28000 };
ok('Improcedente 19.408 €', I.calcular({ ...caso, tipo: 'improcedente' }, W.indemnizacion).importeRedondo === 19408);
ok('Objetivo 11.763 €', I.calcular({ ...caso, tipo: 'objetivo' }, W.indemnizacion).importeRedondo === 11763);
const mixto = I.calcular({ inicio: '2005-01-10', fin: '2026-10-18', salarioAnual: 30000, tipo: 'improcedente' }, W.indemnizacion);
ok('Anterior a 2012: dos tramos y tope de 720 días (59.178,08 €)', mixto.tramos.length === 2 && mixto.topeAplicado && Math.abs(mixto.importe - 59178.08) < 0.02, mixto.importe);

/* Vacaciones: mismos casos que la plataforma */
const v1 = V.calcular({ inicio: '2019-03-01', anio: 2026, hoy: '2026-10-20', consumidos: 10 });
ok('Vacaciones 22 lab.: a 20/10 generadas 18, año 22, pendientes 8', v1.genHoy === 18 && v1.genFin === 22 && v1.pendHoy === 8);
const v2 = V.calcular({ inicio: '2026-03-16', anio: 2026, fin: '2026-09-30', hoy: '2026-10-20', consumidos: 15 });
ok('Vacaciones: alta y baja en el año → 12 generadas, −3', v2.genFin === 12 && v2.pendFin === -3);
const v3 = V.calcular({ inicio: '2026-07-01', anio: 2026, hoy: '2026-12-31', diasConvenio: 30 });
ok('Vacaciones 30 nat.: 1/7 a 31/12 → 184/365 × 30 = 15,12 → 16', v3.genFin === 16, v3.genFin);

/* Finiquito: la versión web con 16 pagas reproduce la prueba de la plataforma */
const cfgPlat = { pagasExtra: { numero: 4, prorrateadas: 2, noProrrateadas: [{ nombre: 'Paga de junio' }, { nombre: 'Paga de diciembre' }] }, vacaciones: { diasLaborables: 22 } };
const fp = F.calcular({ inicio: '2024-03-15', fin: '2026-10-15', salarioAnual: 32000, vacacionesPendientes: 5 }, cfgPlat);
ok('Plataforma (16 pagas): total 3.097,76 €', fp.finiquito === 3097.76, fp.finiquito);

/* Finiquito público: 14 pagas, 22 laborables. 28.000 € → paga 2.000 € */
const p14 = W.finiquito.pagas[0], p12 = W.finiquito.pagas[1];
const cfg14 = { pagasExtra: p14, vacaciones: { diasLaborables: 22 } };
const f14 = F.calcular({ inicio: '2022-01-10', fin: '2026-10-15', salarioAnual: 28000, vacacionesPendientes: 4 }, cfg14);
const L = (r, id) => (r.lineas.find(l => l.id === id) || {}).importe;
ok('14 pagas: paga mensual 2.000 €', f14.paga === 2000);
ok('14 pagas: salario de 15 días = 1.000 €', L(f14, 'salario') === 1000);
ok('14 pagas: sin línea de prorrata', L(f14, 'prorrata') === undefined);
ok('14 pagas: paga de diciembre 4/6 = 1.333,33 €', L(f14, 'paga') === 1333.33);
ok('14 pagas: 4 días lab. × 30/22 × 28.000/365 = 418,43 €', L(f14, 'vacaciones') === 418.43, L(f14, 'vacaciones'));
ok('14 pagas: total 2.751,76 €', f14.finiquito === 2751.76, f14.finiquito);

/* Finiquito público: 12 pagas (prorrateadas) → mensual 28.000/12 = 2.333,33 € */
const f12 = F.calcular({ inicio: '2022-01-10', fin: '2026-10-31', salarioAnual: 28000 }, { pagasExtra: p12, vacaciones: { diasLaborables: 22 } });
ok('12 pagas: mes completo = 2.333,33 € (salario + prorrata)', Math.abs(L(f12, 'salario') + L(f12, 'prorrata') - 2333.33) < 0.02);
ok('12 pagas: sin paga del semestre', L(f12, 'paga') === undefined);

/* Vacaciones en días naturales dentro del finiquito */
const fn = F.calcular({ inicio: '2022-01-10', fin: '2026-10-15', salarioAnual: 36500, vacacionesPendientes: 10 }, { pagasExtra: p14, vacaciones: { naturales: true, diasLaborables: 22 } });
ok('Naturales: 10 días × 100 € = 1.000 €', L(fn, 'vacaciones') === 1000);

console.log(fallos ? `\n${fallos} de ${total} pruebas fallan` : `\nTodas las pruebas correctas (${total})`);
process.exit(fallos ? 1 : 0);
