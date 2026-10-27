// Pruebas del motor de vacaciones. Ejecutar: node tests/vacaciones.test.js
const { calcular } = require('../js/engines/vacaciones.js');

const casos = [
  ['Contrato antiguo, a 20/10/2026, 10 consumidos',
    { inicio:'2019-03-01', anio:2026, hoy:'2026-10-20', consumidos:10 },
    { genHoy:18, genFin:22, pendHoy:8, pendFin:12 }],
  ['Alta y baja en el año, 15 consumidos (disfrutó de más)',
    { inicio:'2026-03-16', anio:2026, fin:'2026-09-30', hoy:'2026-10-20', consumidos:15 },
    { genHoy:12, genFin:12, pendHoy:-3, pendFin:-3 }],
  ['Fin el 30/11/2026, 21 consumidos (20,13 → 21)',
    { inicio:'2019-03-01', anio:2026, fin:'2026-11-30', hoy:'2026-10-20', consumidos:21 },
    { genHoy:18, genFin:21, pendHoy:-3, pendFin:0 }],
  ['Año pasado completo',
    { inicio:'2024-01-01', anio:2024, hoy:'2026-10-20' },
    { genHoy:22, genFin:22, pendHoy:22, pendFin:22 }],
  ['Contrato que empieza después del año',
    { inicio:'2027-02-01', anio:2026, hoy:'2026-10-20' },
    { genHoy:0, genFin:0, pendHoy:0, pendFin:0 }],
  ['31 días sin devengo y 3 del año anterior',
    { inicio:'2026-01-01', anio:2026, hoy:'2026-10-20', sinDevengo:31, pendAnterior:3 },
    { genHoy:16, genFin:21, pendHoy:19, pendFin:24 }],
  ['Año bisiesto completo',
    { inicio:'2020-01-01', anio:2024, hoy:'2024-12-31' },
    { genHoy:22, genFin:22, pendHoy:22, pendFin:22 }],
];

let fallos = 0;
for (const [nombre, entrada, esperado] of casos) {
  const r = calcular(entrada);
  const obtenido = Object.fromEntries(Object.keys(esperado).map(k => [k, r[k]]));
  const ok = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!ok) fallos++;
  console.log(`${ok ? '✔' : '✘'} ${nombre}${ok ? '' : `\n   esperado ${JSON.stringify(esperado)}\n   obtenido ${JSON.stringify(obtenido)}`}`);
}
console.log(fallos ? `\n${fallos} prueba(s) fallida(s)` : `\nTodas las pruebas correctas (${casos.length})`);
process.exit(fallos ? 1 : 0);
