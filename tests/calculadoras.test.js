// Pruebas de las calculadoras (fase 5). Ejecutar: node tests/calculadoras.test.js
global.window = {};
require('../js/params.js');
const P = window.RRHH_PARAMS;
const I = require('../js/engines/indemnizacion.js');
const S = require('../js/engines/salarios.js');
const PE = require('../js/engines/permisos.js');
const N = require('../js/engines/nacimiento.js');
const F = require('../js/engines/finiquito.js');

let fallos = 0, total = 0;
const ok = (nombre, cond, extra = '') => { total++; if (!cond) fallos++; console.log(`${cond ? '✔' : '✘'} ${nombre}${!cond && extra ? '  → ' + extra : ''}`); };
const cerca = (a, b, t = 0.011) => Math.abs(a - b) <= t;

/* ---------- Indemnización ---------- */
const caso = { inicio: '2019-03-01', fin: '2026-10-18', salarioAnual: 28000 };
const imp = I.calcular({ ...caso, tipo: 'improcedente' }, P.indemnizacion), obj = I.calcular({ ...caso, tipo: 'objetivo' }, P.indemnizacion);
ok('Caso de referencia: improcedente 19.408 €', imp.importeRedondo === 19408, imp.importe);
ok('Caso de referencia: objetivo 11.763 €', obj.importeRedondo === 11763, obj.importe);
ok('Antigüedad 7 años, 7 meses y 18 días → 92 meses computables', imp.antiguedad.anios === 7 && imp.antiguedad.meses === 7 && imp.antiguedad.dias === 18 && imp.antiguedad.mesesComputables === 92);
ok('Salario diario = anual ÷ 365', cerca(imp.salarioDiario, 76.71));
ok('Periodo exacto sin fracción (84 meses)', JSON.stringify(I.periodo(I.parse('2019-03-01'), I.parse('2026-02-28'))) === JSON.stringify({ completos: 84, dias: 0, meses: 84 }));
ok('Un solo día cuenta como un mes', I.periodo(I.parse('2026-10-18'), I.parse('2026-10-18')).meses === 1);
const mixto = I.calcular({ inicio: '2005-01-10', fin: '2026-10-18', salarioAnual: 30000, tipo: 'improcedente' }, P.indemnizacion);
ok('Anterior a 2012: dos tramos (45 y 33 días)', mixto.tramos.length === 2 && mixto.tramos[0].diasPorAnio === 45 && mixto.tramos[1].diasPorAnio === 33);
ok('Anterior a 2012: tramo 1 = 86 meses, tramo 2 = 177 meses', mixto.tramos[0].meses === 86 && mixto.tramos[1].meses === 177);
ok('Anterior a 2012: tope de 720 días aplicado', mixto.topeAplicado && cerca(mixto.importe, 59178.08), mixto.importe);
const largo = I.calcular({ inicio: '1990-01-01', fin: '2026-10-18', salarioAnual: 36500, tipo: 'improcedente' }, P.indemnizacion);
ok('Tramo anterior > 720 días: se queda ese importe (997,5 días)', cerca(largo.importe, 99750) && largo.tramos[1].excluido === true, largo.importe);
const largo2 = I.calcular({ inicio: '1975-01-01', fin: '2026-10-18', salarioAnual: 36500, tipo: 'improcedente' }, P.indemnizacion);
ok('Tope de 42 mensualidades', largo2.topeAplicado && cerca(largo2.importe, 42 * 36500 / 12), largo2.importe);
const tope24 = I.calcular({ inicio: '2012-03-01', fin: '2026-10-18', salarioAnual: 36500, tipo: 'improcedente' }, P.indemnizacion);
ok('Posterior a 2012: tope 24 mensualidades no alcanzado con 14 años', !tope24.topeAplicado);
const obj12 = I.calcular({ inicio: '2000-01-01', fin: '2026-10-18', salarioAnual: 36500, tipo: 'objetivo' }, P.indemnizacion);
ok('Objetivo: tope 12 mensualidades', obj12.topeAplicado && cerca(obj12.importe, 36500));
const temp = I.calcular({ inicio: '2026-01-01', fin: '2026-06-30', salarioAnual: 36500, tipo: 'temporal' }, P.indemnizacion);
ok('Fin de temporal: 12 días/año, 6 meses → 600 €', cerca(temp.importe, 600), temp.importe);
ok('Fechas al revés: error', !!I.calcular({ inicio: '2026-05-01', fin: '2026-01-01', salarioAnual: 1000 }, P.indemnizacion).error);
ok('Comparar los 5 tipos', I.todos(caso, P.indemnizacion).length === 5);

/* ---------- Salarios ---------- */
ok('Tablas: todas las categorías cuadran (mes × 16 o día × 485 = anual)', P.tablas.categorias.every(c => cerca(S.calcular(c, { P }).comprobacion, c.anual, 0.02)),
  P.tablas.categorias.filter(c => !cerca(S.calcular(c, { P }).comprobacion, c.anual, 0.02)).map(c => c.id).join());
const esp = S.calcular(P.tablas.categorias.find(c => c.id === 'F6'), { P });
ok('Especialista: paga = 30 días (1.314 €)', cerca(esp.paga, 1314));
ok('Especialista: nómina mensual con 2 pagas prorrateadas', cerca(esp.nominaMensual, 1551.25));
const a1 = S.calcular(P.tablas.categorias.find(c => c.id === 'A1'), { P });
ok('Titulado Superior: nómina = mes × 14/12', cerca(a1.nominaMensual, 1611.29 * 14 / 12));
const parcial = S.calcular(P.tablas.categorias.find(c => c.id === 'F6'), { horas: 20, P });
ok('Jornada parcial 20 h: mitad del anual', cerca(parcial.anual, 10621.5) && parcial.parcial);
ok('Precio hora = anual ÷ 1.760', cerca(esp.precioHora, 21243 / 1760));
const bus = S.buscar('produccion', P);
ok('Buscar "produccion": puesto con categoría y alternativas', bus.puestos[0].categoria.id === 'F6' && bus.puestos[0].alternativas.length === 3);
ok('Buscar categoría sin tildes ("peon")', S.buscar('peon', P).categorias.some(c => c.categoria.id === 'F7'));
ok('Todos los puestos apuntan a categorías existentes', P.puestos.every(p => P.tablas.categorias.some(c => c.id === p.categoria) && (p.alternativas || []).every(x => P.tablas.categorias.some(c => c.id === x))));

/* ---------- Permisos ---------- */
const def = id => P.permisos.find(p => p.id === id);
ok('Enfermedad grave sin desplazamiento: 5 días (ET)', PE.calcular(def('enfermedad')).dias === 5 && PE.calcular(def('enfermedad')).aplica === 'et');
ok('Enfermedad grave con desplazamiento: 6 días (convenio)', PE.calcular(def('enfermedad'), { desplazamiento: true }).dias === 6 && PE.calcular(def('enfermedad'), { desplazamiento: true }).aplica === 'convenio');
ok('Fallecimiento: 3 días (convenio frente a 2 del ET)', PE.calcular(def('fallecimiento')).dias === 3 && PE.calcular(def('fallecimiento')).aplica === 'convenio');
ok('Fallecimiento con desplazamiento: 6 días', PE.calcular(def('fallecimiento'), { desplazamiento: true }).dias === 6);
ok('Traslado de domicilio: 2 días (convenio)', PE.calcular(def('traslado')).dias === 2);
ok('Matrimonio: 15 días, iguales', PE.calcular(def('matrimonio')).aplica === 'igual' && PE.calcular(def('matrimonio')).dias === 15);
ok('Boda de un familiar a más de 100 km: 2 días', PE.calcular(def('bodaFamiliar'), { lejos: true }).dias === 2);
ok('Deber inexcusable: sin número de días', PE.calcular(def('deber')).dias === null);
const red = PE.reduccion({ horasSemana: 40, salarioAnual: 30000, fraccion: 0.125 });
ok('Reducción 1/8: 35 h, 7 h/día, 26.250 €', red.horasSemana === 35 && red.horasDia === 7 && red.salarioAnual === 26250);
ok('Reducción del 60 %: fuera de rango', PE.reduccion({ horasSemana: 40, fraccion: 0.6 }).fueraDeRango);
ok('Todos los permisos tienen ET o convenio', P.permisos.every(p => p.et || p.conv));

/* ---------- Nacimiento ---------- */
const nb = N.calcular({ fecha: '2026-11-02' }, P.nacimiento);
ok('Biparental: 19 semanas (133 días)', nb.totalDias === 133 && nb.semanasBase === 19);
ok('6 semanas obligatorias: hasta el 13/12/2026', nb.bloques[0].hasta === '2026-12-13');
ok('Voluntarias hasta los 12 meses: 01/11/2027', nb.bloques[1].hasta === '2027-11-01');
ok('2 semanas hasta los 8 años: 01/11/2034', nb.bloques[2].semanas === 2 && nb.bloques[2].hasta === '2034-11-01');
ok('Todo seguido (17 semanas) termina el 28/02/2027', nb.seguidoHasta === '2027-02-28', nb.seguidoHasta);
const nm = N.calcular({ fecha: '2026-11-02', monoparental: true }, P.nacimiento);
ok('Monoparental: 32 semanas (6 + 22 + 4)', nm.totalDias === 224 && nm.bloques[1].semanas === 22 && nm.bloques[2].semanas === 4);
ok('Gemelos: +1 semana (biparental)', N.calcular({ fecha: '2026-11-02', hijos: 2 }, P.nacimiento).totalDias === 140);
ok('Gemelos: +2 semanas (monoparental)', N.calcular({ fecha: '2026-11-02', hijos: 2, monoparental: true }, P.nacimiento).totalDias === 238);
ok('Discapacidad: +1 semana', N.calcular({ fecha: '2026-11-02', discapacidad: true }, P.nacimiento).totalDias === 140);
ok('Hospitalización de 10 días: +10 días', N.calcular({ fecha: '2026-11-02', hospitalizacionDias: 10 }, P.nacimiento).totalDias === 143);
ok('Hospitalización de 7 días: no amplía', N.calcular({ fecha: '2026-11-02', hospitalizacionDias: 7 }, P.nacimiento).totalDias === 133);
ok('Hospitalización larga: máximo 13 semanas', N.calcular({ fecha: '2026-11-02', hospitalizacionDias: 200 }, P.nacimiento).diasHospitalizacion === 91);
ok('Lactancia hasta los 9 meses (01/08/2027) y 14 días acumulados', nb.lactancia.hasta === '2027-08-01' && nb.lactancia.acumuladaDias === 14);
ok('Lactancia acumulada con gemelos: 28 días', N.calcular({ fecha: '2026-11-02', hijos: 2 }, P.nacimiento).lactancia.acumuladaDias === 28);

/* ---------- Finiquito ---------- */
const cfgF = { pagasExtra: P.pagasExtra, vacaciones: { diasLaborables: P.vacaciones.diasLaborables } };
const fq = F.calcular({ inicio: '2024-03-15', fin: '2026-10-15', salarioAnual: 32000, vacacionesPendientes: 5 }, cfgF);
const L = id => fq.lineas.find(l => l.id === id)?.importe;
ok('Finiquito: salario de 15 días (1.000 €)', L('salario') === 1000);
ok('Finiquito: prorrata de 2 pagas (166,67 €)', L('prorrata') === 166.67);
ok('Finiquito: paga de diciembre, 4 de 6 meses (1.333,33 €)', L('paga') === 1333.33 && fq.lineas.find(l => l.id === 'paga').concepto.includes('diciembre'));
ok('Finiquito: 5 días de vacaciones × 30/22 (597,76 €)', L('vacaciones') === 597.76, L('vacaciones'));
ok('Finiquito: total 3.097,76 €', fq.finiquito === 3097.76, fq.finiquito);
ok('Último día del mes = 30 días', F.calcular({ inicio: '2020-01-01', fin: '2026-10-31', salarioAnual: 32000 }, cfgF).diasMes === 30);
ok('28 de febrero = mes completo', F.calcular({ inicio: '2020-01-01', fin: '2026-02-28', salarioAnual: 32000 }, cfgF).diasMes === 30);
ok('Alta y baja en el mismo mes: 11 días', F.calcular({ inicio: '2026-10-10', fin: '2026-10-20', salarioAnual: 32000 }, cfgF).diasMes === 11);
ok('Paga de junio si la baja es en el primer semestre', F.calcular({ inicio: '2020-01-01', fin: '2026-03-10', salarioAnual: 32000 }, cfgF).lineas.find(l => l.id === 'paga').concepto.includes('junio'));
ok('Alta a mitad de semestre: cuenta desde el alta (fracción entera)', F.calcular({ inicio: '2026-08-20', fin: '2026-10-15', salarioAnual: 32000 }, cfgF).mesesSemestre === 3);
const pv = F.calcular({ inicio: '2024-03-15', fin: '2026-10-15', salarioAnual: 32000, voluntaria: true, comunicacion: '2026-10-01', preaviso: { tipo: 'mes' } }, cfgF);
ok('Preaviso de un mes incumplido: 17 días de descuento', pv.preaviso.retraso === 17 && pv.lineas.find(l => l.id === 'preaviso').importe === -1490.41, JSON.stringify(pv.preaviso));
const pv8 = F.calcular({ inicio: '2024-03-15', fin: '2026-10-15', salarioAnual: 32000, voluntaria: true, comunicacion: '2026-10-01', preaviso: { tipo: 'dias', dias: 8 } }, cfgF);
ok('Preaviso de 8 días cumplido: sin descuento', pv8.preaviso.retraso === 0 && !pv8.lineas.some(l => l.id === 'preaviso'));
ok('Vacaciones disfrutadas de más: descuento', F.calcular({ inicio: '2020-01-01', fin: '2026-10-15', salarioAnual: 32000, vacacionesPendientes: -2 }, cfgF).lineas.find(l => l.id === 'vacaciones').importe < 0);
ok('Preaviso por categoría: especialista 8 días, encargado y administrativo un mes, encargado de mantenimiento 8 días',
  F.preavisoDe('F6', P.preavisoBajaVoluntaria).tipo === 'dias' && F.preavisoDe('F2', P.preavisoBajaVoluntaria).tipo === 'mes' && F.preavisoDe('D2', P.preavisoBajaVoluntaria).tipo === 'mes' && F.preavisoDe('G1', P.preavisoBajaVoluntaria).tipo === 'dias');
ok('Jefe de Fábrica: un mes (criterio de empresa)', F.preavisoDe('F1', P.preavisoBajaVoluntaria).tipo === 'mes');
ok('Indemnización sumada al total', F.calcular({ inicio: '2024-03-15', fin: '2026-10-15', salarioAnual: 32000, vacacionesPendientes: 5, indemnizacion: 1000 }, cfgF).total === 4097.76);

console.log(fallos ? `\n${fallos} de ${total} pruebas fallidas` : `\nTodas las pruebas correctas (${total})`);
process.exit(fallos ? 1 : 0);
