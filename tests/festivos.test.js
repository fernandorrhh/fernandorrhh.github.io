// Pruebas del motor de festivos. Ejecutar: node tests/festivos.test.js
global.window = {};
require('../js/params.js');
const P = window.RRHH_PARAMS;
const { delAnio, proximos } = require('../js/engines/festivos.js');

let fallos = 0, total = 0;
const ok = (nombre, cond) => { total++; if (!cond) fallos++; console.log(`${cond ? '✔' : '✘'} ${nombre}`); };

const nac = delAnio(P.festivos, 2026);
ok('2026 solo nacionales: 8 días', nac.size === 8);
ok('Sin capas, el 2 de mayo no es festivo', !nac.has('2026-05-02'));

const mad = delAnio(P.festivos, 2026, ['madrid']);
ok('Madrid 2026: 2 de mayo autonómico', mad.get('2026-05-02')?.[0].ambito === 'autonomico');
ok('Madrid 2026: San Isidro local', mad.get('2026-05-15')?.[0].ambito === 'local');
ok('Madrid 2026: 1 de enero sigue siendo nacional (no se duplica)', mad.get('2026-01-01').length === 1 && mad.get('2026-01-01')[0].ambito === 'nacional');
ok('Madrid 2026: 14 días (12 autonómicos + 2 locales)', mad.size === 14);

const dos = delAnio(P.festivos, 2026, ['madrid', 'clm']);
ok('Jueves Santo aparece en Madrid y en Castilla-La Mancha', dos.get('2026-04-02').length === 2);
ok('15 de mayo: local en Madrid y en Talavera', dos.get('2026-05-15').length === 2);

const cv = delAnio(P.festivos, 2026, ['cv']);
ok('Valencia 2026: 9 de octubre autonómico', cv.get('2026-10-09')?.[0].ambito === 'autonomico');
ok('Valencia 2026: 1 de noviembre no es festivo', !cv.has('2026-11-01'));

const emp = delAnio(P.festivos, 2026, [], [{ fecha: '2026-12-24', nombre: 'Nochebuena' }, { fecha: '2027-01-02', nombre: 'Otro año' }]);
ok('Festivo de empresa del año incluido', emp.get('2026-12-24')?.[0].ambito === 'empresa');
ok('Festivo de empresa de otro año excluido', !emp.has('2027-01-02'));

ok('Año sin datos devuelve vacío', delAnio(P.festivos, 2031).size === 0);

const prox = proximos(P.festivos, '2026-12-20', ['madrid'], [], 3);
ok('Próximos desde 20/12/2026: 25 dic, 1 ene, 6 ene', prox.map(p => p.fecha).join() === '2026-12-25,2027-01-01,2027-01-06');

ok('Orden cronológico', [...mad.keys()].join() === [...mad.keys()].sort().join());

console.log(fallos ? `\n${fallos} de ${total} pruebas fallidas` : `\nTodas las pruebas correctas (${total})`);
process.exit(fallos ? 1 : 0);
