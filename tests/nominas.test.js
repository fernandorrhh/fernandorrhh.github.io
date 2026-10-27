// Pruebas del motor de nóminas. Ejecutar: node tests/nominas.test.js
global.window = {};
require('../js/params.js');
const P = window.RRHH_PARAMS;
const N = require('../js/engines/nominas.js');
let fallos = 0, total = 0;
const ok = (n, c, x = '') => { total++; if (!c) fallos++; console.log(`${c ? '✔' : '✘'} ${n}${!c && x !== '' ? '  → ' + x : ''}`); };
const E = [
  { id: 1, codigo: '12', nombre: 'Fátima', apellido1: 'Mosaoui', fechaContratacion: '2020-01-01', ausencias: [{ id: 101, tipo: 'nacimiento', subtipo: 'Semanas obligatorias', desde: '2026-08-03', hastaPrevista: '2026-09-06' }] },
  { id: 2, codigo: '59', nombre: 'Elena', apellido1: 'Jiménez', apellido2: 'Cordero', fechaContratacion: '2019-01-01', ausencias: [{ id: 102, tipo: 'it', subtipo: 'Enfermedad común', desde: '2026-08-03', finReal: '2026-09-01' }, { id: 103, tipo: 'nacimiento', desde: '2026-09-03', hastaPrevista: '2027-01-13' }] },
  { id: 3, codigo: '27', nombre: 'Eva', apellido1: 'Martín', fechaContratacion: '2018-01-01', ausencias: [{ id: 104, tipo: 'it', subtipo: 'Accidente de trabajo', desde: '2026-09-23', hastaPrevista: '2026-09-25' }, { id: 105, tipo: 'it', desde: '2026-07-01', finReal: '2026-07-10' }] },
  { id: 4, codigo: '91', nombre: 'Fernando', apellido1: 'de la Sota', fechaContratacion: '2015-01-01', ausencias: [{ id: 106, tipo: 'noRetribuido', desde: '2026-09-10', hastaPrevista: '2026-09-10' }, { id: 107, tipo: 'reduccion', desde: '2026-09-01', hastaPrevista: '2027-08-31', porcentaje: 12.5, subtipo: 'Guarda legal (menor de 12 años)' }] },
  { id: 5, codigo: '20', nombre: 'Jonatan', apellido1: 'Herrero', fechaContratacion: '2021-01-01', variablesNomina: [{ id: 1, mes: '2026-09', cat: 'guardias', detalle: '2 semanas' }, { id: 2, mes: '2026-08', cat: 'guardias', detalle: '1 semana' }] },
  { id: 6, codigo: '78', nombre: 'María Lucía', apellido1: 'Parraga', fechaContratacion: '2026-09-15', puesto: 'Producción', salario: 21243, promociones: [{ id: 7, fecha: '2026-09-20', tipo: 'Subida salarial', salarioAnterior: 21243, salarioNuevo: 22000 }] },
  { id: 7, codigo: '33', nombre: 'Luis', apellido1: 'Gil', fechaContratacion: '2010-01-01', fechaBaja: '2026-09-30', motivoBaja: 'Baja voluntaria' }
];
const r = N.resumen(E, { mes: '2026-09', cfg: P.nomina, tipos: P.ausencias.tipos });
const cat = id => r.find(c => c.id === id).lineas;
ok('Maternidad/Paternidad: las que tocan el mes (2)', cat('nacimiento').length === 2 && cat('nacimiento')[0].texto === '03/08/2026 - 06/09/2026', JSON.stringify(cat('nacimiento')));
ok('Formato: código y nombre en mayúsculas', cat('nacimiento')[0].quien === '12 FÁTIMA MOSAOUI');
ok('Bajas laborales: solo las del mes (2), no la de julio', cat('it').length === 2);
ok('Baja por accidente de trabajo lo indica', cat('it').some(l => /accidente de trabajo/.test(l.texto)));
ok('Permiso sin sueldo de un día: una sola fecha', cat('noRetribuido')[0].texto === '10/09/2026');
ok('Reducción: inicio con porcentaje', /12,5 %.*01\/09\/2026/.test(cat('reduccion')[0].texto));
ok('Manuales: guardias del mes (no las de agosto)', cat('guardias').length === 1 && cat('guardias')[0].texto === '2 semanas');
ok('Incorporación del mes con puesto y salario', /alta el 15\/09\/2026 · Producción · 21\.243,00 €/.test(cat('altas')[0].texto), cat('altas')[0].texto);
ok('Baja de la empresa con motivo', /baja el 30\/09\/2026 · Baja voluntaria/.test(cat('bajas')[0].texto));
ok('Subida salarial del mes', /21\.243,00 € → 22\.000,00 €/.test(cat('cambios')[0].texto));
const t = N.texto(r, { mes: '2026-09', cfg: P.nomina });
ok('Texto: saludo y mes', t.startsWith('Buenos días,') && t.includes('mes de septiembre'));
ok('Texto: título y línea como el ejemplo', t.includes('Guardias Fábrica:\n- 20 JONATAN HERRERO 2 semanas'));
ok('Texto: categorías vacías no salen', !t.includes('Anticipos'));
const r2 = N.resumen(E, { mes: '2026-09', cfg: P.nomina, tipos: P.ausencias.tipos, excluidas: ['aus-106'] });
ok('Excluir una línea la quita del correo', !N.texto(r2, { mes: '2026-09', cfg: P.nomina }).includes('Permiso día sin sueldo'));
ok('HTML con títulos en negrita y listas', /<p><b>Bajas laborales:<\/b><\/p><ul><li>/.test(N.html(r, { mes: '2026-09', cfg: P.nomina })));
ok('Último día del mes (febrero 2028)', N.ultimo('2028-02') === '2028-02-29');
console.log(fallos ? `\n${fallos} de ${total} pruebas fallidas` : `\nTodas las pruebas correctas (${total})`);
process.exit(fallos ? 1 : 0);
