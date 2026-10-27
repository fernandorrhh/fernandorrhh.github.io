// Pruebas del motor CAE (empresas externas). Ejecutar: node tests/cae.test.js
global.window = {}; require('../js/params.js'); const C = window.RRHH_PARAMS.cae;
const M = require('../js/engines/cae.js');
let fallos = 0, total = 0;
const ok = (n, c) => { total++; if (!c) fallos++; console.log(`${c ? '✔' : '✘'} ${n}`); };

/* Vigencias */
ok('Año natural: válido todo el año de entrega', M.vigente('2026-03-10', 'anio', '2026-12-31') && !M.vigente('2026-03-10', 'anio', '2027-01-04'));
ok('Año natural: entregado después de la visita, mismo año, cuenta', M.vigente('2026-11-02', 'anio', '2026-10-27'));
ok('Trimestre: certificado de octubre vale hasta el 31/12', M.vigente('2026-10-05', 'trimestre', '2026-12-31') && !M.vigente('2026-10-05', 'trimestre', '2027-01-01'));
ok('Trimestre: certificado de septiembre no vale en octubre', !M.vigente('2026-09-30', 'trimestre', '2026-10-01'));
ok('Periodo del 1.er trimestre', JSON.stringify(M.periodo('2027-02-15', 'trimestre')) === '{"desde":"2027-01-01","hasta":"2027-03-31"}');
ok('Póliza: hasta su vencimiento', M.vigente('2026-05-01', 'vence', '2027-04-30', '2027-04-30') && !M.vigente('2026-05-01', 'vence', '2027-05-01', '2027-04-30'));
ok('Póliza sin vencimiento: año natural', M.vigente('2026-05-01', 'vence', '2026-12-01') && !M.vigente('2026-05-01', 'vence', '2027-01-02'));
ok('Sin documento: no vigente', !M.vigente('', 'anio', '2026-10-27'));

const emp = { id: 1, nombre: 'Limpiezas Ejemplo SL', docs: { ss: '2026-10-02', hacienda: '2026-02-01', rc: '2026-02-01', rcVence: '2027-01-31', anexo2: '2026-02-01', anexo3: '2026-02-01' } };
const ana = { id: 11, empresaId: 1, nombre: 'Ana', apellidos: 'Prueba Uno', docs: { formacion: '2026-02-01', aptitud: '2026-02-01', epis: '2026-02-01' } };
const luis = { id: 12, empresaId: 1, nombre: 'Luis', apellidos: 'Prueba Dos', docs: {} };
ok('Empresa al día en octubre', M.faltanEmpresa(emp, '2026-10-27', C).length === 0);
ok('Empresa en enero: faltan SS (trimestre nuevo), Hacienda y anexos (año nuevo)', M.faltanEmpresa(emp, '2027-01-12', C).map(d => d.id).join() === 'ss,hacienda,anexo2,anexo3');
ok('Trabajador nuevo: le falta todo', M.faltanTrabajador(luis, '2026-10-27', C).length === 3 && M.trabajadorNuevo(luis));
ok('Trabajador con todo del año: nada', M.faltanTrabajador(ana, '2026-10-27', C).length === 0 && !M.trabajadorNuevo(ana));

/* Visitas */
ok('Semanal: próximo martes desde un martes es el mismo día', M.proximaFecha({ semanal: true, dia: 1 }, '2026-10-27') === '2026-10-27');
ok('Semanal: próximo lunes desde un martes', M.proximaFecha({ semanal: true, dia: 0 }, '2026-10-27') === '2026-11-02');
ok('Semanal: respeta "desde"', M.proximaFecha({ semanal: true, dia: 4, desde: '2026-11-10' }, '2026-10-27') === '2026-11-13');
ok('Semanal: terminada si pasa de "hasta"', M.proximaFecha({ semanal: true, dia: 0, hasta: '2026-10-30' }, '2026-10-27') === null);
ok('Puntual: su fecha', M.proximaFecha({ fecha: '2026-11-05' }, '2026-10-27') === '2026-11-05');
ok('Texto semanal', M.textoFecha({ semanal: true, dia: 1 }) === 'Cada martes');

const v = { id: 5, empresaId: 1, fecha: '2026-11-05', trabajadores: [11, 12] };
const est = M.estadoVisita(v, emp, [ana, luis], '2026-10-27', C);
ok('Estado: falta lo de Luis (3) y nada de la empresa', est.total === 3 && est.faltanEmpresa.length === 0 && est.trabajadores[1].nuevo);
const vs = { id: 6, empresaId: 1, semanal: true, dia: 0, trabajadores: [11] };
const est2 = M.estadoVisita(vs, emp, [ana, luis], '2026-12-29', C);
ok('Semanal en el cambio de año: se mira el lunes 04/01/2027 y caduca todo', est2.fecha === '2027-01-04' && est2.faltanEmpresa.length === 4 && est2.trabajadores[0].faltan.length === 3);
ok('Visita completa', M.estadoVisita({ ...v, trabajadores: [11] }, emp, [ana], '2026-10-27', C).completa);

/* Correo */
const nombre = t => `${t.nombre} ${t.apellidos}`;
const c1 = M.correo({ v, emp: { nombre: 'Nueva SA', docs: {} }, est, nombre, cfg: C, hoy: '2026-10-27' });
ok('Empresa nueva: correo completo con los anexos', c1.tipo === 'completo' && c1.texto.includes('Copia de la Póliza de Responsabilidad Civil') && c1.texto.includes('R-PRL-10-03 Anexo III'));
const c2 = M.correo({ v, emp, est, nombre, cfg: C, hoy: '2026-10-27' });
ok('Con persona nueva: pide confirmar y solo lo de Luis', c2.tipo === 'pendientes' && c2.texto.includes('Que no ha cambiado nada') && c2.texto.includes('Luis Prueba Dos (persona nueva)') && !c2.texto.includes('Ana Prueba Uno') && !c2.texto.includes('Póliza'));
const c3 = M.correo({ v: { ...v, trabajadores: [11] }, emp, est: M.estadoVisita({ ...v, trabajadores: [11] }, emp, [ana], '2026-10-27', C), nombre, cfg: C, hoy: '2026-10-27' });
ok('Todo al día: solo confirmar día, personas y que no ha cambiado nada', c3.tipo === 'confirmar' && !c3.texto.includes('Además'));
const c4 = M.correo({ v: vs, emp, est: est2, nombre, cfg: C, hoy: '2026-12-29' });
ok('Año nuevo: pide SS del 1.er trimestre y anexos con enlace', c4.texto.includes('(del 1.º trimestre de 2027)') && c4.texto.includes('sharepoint.com') && c4.asunto.includes('servicio semanal'));
ok('HTML: listas y enlaces', M.html(c4.texto).includes('<ul>') && M.html(c4.texto).includes('<a href="https://'));

/* Carpeta */
ok('Ruta del servidor: base\\EMPRESA\\año\\archivo', M.ruta('\\\\srv\\PRL\\EMPRESAS CAE', 2026, 'SERVICIO DE LIMPIEZA EJEMPLO', 'Formación PRL', 'Ana Prueba Uno') === '\\\\srv\\PRL\\EMPRESAS CAE\\SERVICIO DE LIMPIEZA EJEMPLO\\2026\\Ana Prueba Uno - Formación PRL.pdf');
ok('Ruta sin caracteres no válidos y sin barra final doble', M.ruta('\\\\srv\\CAE\\', 2026, 'A/B: SL', 'Anexo II') === '\\\\srv\\CAE\\A-B- SL\\2026\\Anexo II.pdf');
ok('Etiqueta de periodo', M.etiquetaPeriodo('2026-10-02', 'trimestre') === '4.º trim. 2026' && M.etiquetaPeriodo('2026-02-01', 'vence', '2027-01-31') === 'hasta 31/01/2027');

/* Proceso oficial (27/10/2026): SS mensual o trimestral, Hacienda anual, fichas de seguridad si usa productos */
ok('SS mensual: el de octubre no vale en noviembre', M.vigente('2026-10-05', 'mes', '2026-10-31') && !M.vigente('2026-10-05', 'mes', '2026-11-01'));
const empM = { ...emp, ssPeriodo: 'mes', productos: true };
ok('Empresa con SS mensual y productos: pide SS de noviembre y fichas de seguridad', M.faltanEmpresa(empM, '2026-11-03', C).map(d => d.id).join() === 'ss,fds');
ok('Sin productos no se piden fichas de seguridad', !M.docsDe(emp, C).some(d => d.id === 'fds'));
ok('Diaria: un sábado, la próxima es el lunes', M.proximaFecha({ frec: 'diaria' }, '2026-10-31') === '2026-11-02');
ok('Diaria: un martes, ese mismo día', M.proximaFecha({ frec: 'diaria' }, '2026-10-27') === '2026-10-27');
ok('Mensual el día 31: en noviembre, el 30', M.proximaFecha({ frec: 'mensual', diaMes: 31 }, '2026-11-02') === '2026-11-30');
ok('Mensual: si ya pasó, el mes siguiente', M.proximaFecha({ frec: 'mensual', diaMes: 5 }, '2026-12-20') === '2027-01-05');
ok('Textos de frecuencia', M.textoFecha({ frec: 'diaria' }) === 'De lunes a viernes' && M.textoFecha({ frec: 'mensual', diaMes: 15 }) === 'Cada mes, el día 15');
ok('Visita antigua con "semanal" sigue funcionando', M.frec({ semanal: true }) === 'semanal' && M.continuo({ semanal: true }));
const limp = { id: 7, empresaId: 1, frec: 'diaria', trabajadores: [11] };
const e15 = M.estadoVisita(limp, emp, [ana], '2026-10-27', C);
ok('Servicio diario el 27/10: mira 15 días adelante (11/11) y está al día', e15.en === '2026-11-11' && e15.total === 0);
const e16 = M.estadoVisita(limp, emp, [ana], '2026-12-20', C);
ok('Servicio diario el 20/12: ya pide lo de 2027 (SS 1.er trim., Hacienda, anexos, póliza vigente) y lo de la persona', e16.en === '2027-01-04' && e16.faltanEmpresa.map(d => d.id).join() === 'ss,hacienda,anexo2,anexo3' && e16.trabajadores[0].faltan.length === 3);
const c5 = M.correo({ v: limp, emp: empM, est: M.estadoVisita(limp, empM, [ana], '2026-11-03', C), nombre, cfg: C, hoy: '2026-11-03' });
ok('Correo del servicio diario: pide la SS del mes con su nombre', c5.asunto.includes('servicio diario') && c5.texto.includes('(de noviembre de 2026)') && c5.texto.includes('Fichas de datos de seguridad'));
ok('Primera solicitud: incluye Hacienda y fichas si usa productos', M.plantillaCompleta(C, { productos: true }).includes('Agencia Tributaria') && M.plantillaCompleta(C, { productos: true }).includes('Fichas de datos de seguridad') && !M.plantillaCompleta(C, {}).includes('Fichas'));
ok('Póliza que vence el 15/12/2026: en un servicio continuo se pide desde el 30/11', M.faltanEmpresa({ ...emp, docs: { ...emp.docs, rcVence: '2026-12-15' } }, '2026-12-16', C).some(d => d.id === 'rc') && M.estadoVisita(limp, { ...emp, docs: { ...emp.docs, rcVence: '2026-12-15' } }, [ana], '2026-12-01', C).faltanEmpresa.some(d => d.id === 'rc'));

console.log(fallos ? `\n${fallos} de ${total} pruebas fallidas` : `\nTodas las pruebas correctas (${total})`);
process.exit(fallos ? 1 : 0);
