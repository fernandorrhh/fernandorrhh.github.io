// Pruebas de los motores de altas y empleados. Ejecutar: node tests/altas_empleados.test.js
const A = require('../js/engines/altas.js');
const E = require('../js/engines/empleados.js');

let fallos = 0, total = 0;
const ok = (nombre, cond) => { total++; if (!cond) fallos++; console.log(`${cond ? '✔' : '✘'} ${nombre}`); };

/* ---------- Altas ---------- */
const nF = A.pasosDe('Fábrica (Talavera)').length, nO = A.pasosDe('Oficina (Madrid)').length;
ok('Fábrica tiene 3 pasos más que oficina (talla, correo personal, aviso PRL y Calidad)', nF - nO === 3);
ok('Oficina no incluye la talla de uniforme', !A.pasosDe('Oficina (Madrid)').some(p => p.id === 'talla'));
ok('No existe el paso duplicado "Acdo. confidenc."', !A.pasosDe('Fábrica (Talavera)').some(p => /acuerdo de confid/i.test(p.nombre)));
const vacia = { centro: 'Oficina (Madrid)', check: {} };
ok('Alta sin pasos: sin iniciar', A.estado(vacia) === 'sin-iniciar');
const algunos = { centro: 'Oficina (Madrid)', check: { ofertaEnviada: true, ofertaAceptada: true } };
ok('Menos de la mitad: pendiente de documentación', A.estado(algunos) === 'pendiente-docs');
const casi = { centro: 'Oficina (Madrid)', check: Object.fromEntries(A.pasosDe('Oficina (Madrid)').slice(0, -2).map(p => [p.id, true])) };
ok('Más de la mitad: en proceso', A.estado(casi) === 'en-proceso');
const todo = { centro: 'Oficina (Madrid)', check: Object.fromEntries(A.pasosDe('Oficina (Madrid)').map(p => [p.id, true])) };
ok('Todo marcado: completada (100 %)', A.estado(todo) === 'completada' && A.progreso(todo).pct === 1);
ok('Con bloqueante escrito: bloqueada', A.estado({ ...algunos, bloqueante: 'Falta Nº SS' }) === 'bloqueada');
ok('Bloqueante en blanco no bloquea', A.estado({ ...algunos, bloqueante: '   ' }) === 'pendiente-docs');
ok('Cerrada manda sobre todo', A.estado({ ...todo, cerrada: true }) === 'cerrada');
ok('Los pasos de fábrica cuentan para fábrica', A.progreso({ centro: 'Fábrica (Talavera)', check: todo.check }).pct < 1);
ok('Documentos pendientes (oficina: 7)', A.docsPendientes(vacia).length === 7);
ok('Documentos pendientes (fábrica: 8)', A.docsPendientes({ centro: 'Fábrica (Talavera)', check: {} }).length === 8);
ok('Días desde la oferta', A.diasDesdeOferta({ fechaOferta: '2026-10-11' }, '2026-10-21') === 10);
ok('Sin oferta enviada: null', A.diasDesdeOferta({}, '2026-10-21') === null);

/* ---------- Empleados ---------- */
ok('Fecha dd/mm/aaaa', E.fecha('01/03/2019') === '2019-03-01');
ok('Fecha aaaa-mm-dd', E.fecha('2019-03-01') === '2019-03-01');
ok('Fecha imposible (31/02)', E.fecha('31/02/2026') === null);
ok('Fecha vacía', E.fecha('') === '');
ok('Importe 28.000,50', E.importe('28.000,50') === 28000.5);
ok('Importe 28000', E.importe('28000') === 28000);
ok('Importe 28.000 (miles)', E.importe('28.000') === 28000);
ok('Importe 28000.75', E.importe('28000.75') === 28000.75);
ok('Importe con € y espacios', E.importe('25 780,64 €') === 25780.64);
ok('Importe no válido', E.importe('abc') === null);

const base = [{ id: 1, codigo: 'E-001', nombre: 'Ana', apellido1: 'Pérez', apellido2: '', departamento: 'Calidad', responsable: 'Luis', centro: 'Fábrica (Talavera)', fechaContratacion: '2020-01-01', fechaBaja: '' },
  { id: 2, codigo: 'E-002', nombre: 'Bruno', apellido1: 'Díaz', apellido2: '', departamento: 'Comercial', responsable: 'Marta', centro: 'Oficina (Madrid)', fechaContratacion: '2021-01-01', fechaBaja: '2026-06-30' }];
ok('Código duplicado (sin distinguir mayúsculas)', E.validar({ codigo: 'e-001', nombre: 'X', apellido1: 'Y', fechaContratacion: '2026-01-01' }, base).some(m => /ya existe/.test(m)));
ok('Faltan datos obligatorios (código, nombre, primer apellido, fecha)', E.validar({}, []).length === 4);
ok('Baja anterior a contratación', E.validar({ codigo: 'Z', nombre: 'Z', apellido1: 'Z', fechaContratacion: '2026-05-01', fechaBaja: '2026-01-01' }).some(m => /anterior/.test(m)));
ok('Filtro activos excluye bajas', E.filtrar(base, { hoy: '2026-10-21' }).length === 1);
ok('Filtro bajas', E.filtrar(base, { estado: 'bajas', hoy: '2026-10-21' })[0].codigo === 'E-002');
ok('Búsqueda sin tildes', E.filtrar(base, { q: 'diaz', estado: 'todos', hoy: '2026-10-21' }).length === 1);
ok('Filtro por centro', E.filtrar(base, { centro: 'Fábrica (Talavera)', estado: 'todos', hoy: '2026-10-21' }).length === 1);

const DEP = ['Fábrica', 'Comercial', 'Administración y Finanzas', 'Homologación y Registros'];
const csv = '﻿Código;Nombre y apellidos;Departamento;Responsable;Centro;Puesto;Fecha contratación;Salario anual;Fecha baja\r\n' +
  'E-010;"Lucía García; Ruiz";fabrica;Andrés;Fábrica (Talavera);Producción;15/04/2023;21.243,00;\r\n' +
  'E-011;Pablo Gil Soto;Homologación y registros;Sergio;Fábrica (Talavera);Técnico/a de logística;2021-11-02;23318.24;\r\n' +
  'E-001;Duplicado Uno;;;;;01/01/2020;;\r\n' +
  'E-012;Fecha Mala;;;;;32/01/2020;;\r\n' +
  'E-013;Ana Ruiz;Producción;;;;01/01/2020;;\r\n';
const r = E.importarCSV(csv, base, { departamentos: DEP });
ok('CSV: 2 filas válidas importadas', r.empleados.length === 2);
ok('CSV: comillas con punto y coma', r.empleados[0].apellido1 === 'García;');
ok('CSV: "Nombre y apellidos" se separa', r.empleados[1].nombre === 'Pablo' && r.empleados[1].apellido1 === 'Gil' && r.empleados[1].apellido2 === 'Soto');
ok('CSV: departamento normalizado a la lista', r.empleados[0].departamento === 'Fábrica' && r.empleados[1].departamento === 'Homologación y Registros');
ok('CSV: código existente no duplica, actualiza (fila 4 sin cambios útiles → nada)', r.errores.map(e => e.fila).join() === '5,6' && r.actualizaciones.length === 1 && r.actualizaciones[0].cambios.nombre === 'Duplicado');
ok('CSV: el error de departamento lo explica', /no está en la lista/.test(r.errores[1].mensajes.join()));
const vuelta = E.importarCSV(E.exportarCSV(r.empleados), [], { departamentos: DEP });
ok('CSV: exportar e importar conserva nombre y apellidos', vuelta.empleados.length === 2 && vuelta.empleados[1].fechaContratacion === '2021-11-02' && vuelta.empleados[1].apellido2 === 'Soto');
ok('CSV con columnas de apellidos y comas como separador', E.importarCSV('codigo,nombre,primer apellido,segundo apellido,fecha_contratacion\nX1,Ana,López,,01/02/2024\n').empleados[0].apellido1 === 'López');

/* Nombres */
const pn = E.partirNombre;
ok('Partir: nombre y dos apellidos', JSON.stringify(pn('Lucía Martín Gómez')) === JSON.stringify({ nombre: 'Lucía', apellido1: 'Martín', apellido2: 'Gómez' }));
ok('Partir: partículas con el apellido', JSON.stringify(pn('Fernando de la Sota Escriche')) === JSON.stringify({ nombre: 'Fernando', apellido1: 'de la Sota', apellido2: 'Escriche' }));
ok('Partir: un solo apellido', pn('Ana Ruiz').apellido1 === 'Ruiz' && pn('Ana Ruiz').apellido2 === '');
ok('Partir: formato "Apellidos, Nombre"', JSON.stringify(pn('Martín Gómez, Lucía')) === JSON.stringify({ nombre: 'Lucía', apellido1: 'Martín', apellido2: 'Gómez' }));
ok('Normalizar ficha antigua', E.normalizar({ nombre: 'Javier Ruiz Soto' }).apellido1 === 'Ruiz' && E.normalizar({ nombre: 'Javier Ruiz Soto' }).nombreCompleto === 'Javier Ruiz Soto');
ok('Normalizar ficha nueva no la toca', E.normalizar({ nombre: 'Ana', apellido1: 'Pérez' }).nombreCompleto === 'Ana Pérez');
ok('Orden ignora partículas (de la Iglesia va en la I)', E.filtrar([{ nombre: 'A', apellido1: 'Fernández' }, { nombre: 'B', apellido1: 'de la Iglesia' }], { estado: 'todos', hoy: '2026-10-21' })[0].nombre === 'A');
ok('Orden por apellidos', E.filtrar([{ nombre: 'Zoe', apellido1: 'Abad' }, { nombre: 'Ana', apellido1: 'Ruiz' }], { estado: 'todos', hoy: '2026-10-21' })[0].nombre === 'Zoe');

/* Sexo y motivo de baja (fase 7) */
ok('Sexo: Mujer, F, femenino → mujer', ['Mujer', 'F', 'femenino', ' MUJER '].every(x => E.sexo(x) === 'mujer'));
ok('Sexo: Hombre, H, V, varón, masculino → hombre', ['Hombre', 'H', 'V', 'Varón', 'masculino'].every(x => E.sexo(x) === 'hombre'));
ok('Sexo: "M" sola es ambigua → no válido', E.sexo('M') === null);
ok('Sexo vacío → vacío', E.sexo('') === '');
const cs = E.importarCSV('codigo;nombre;primer apellido;sexo;fecha contratacion;fecha baja;motivo de baja\nA1;Ana;Ruiz;Mujer;01/01/2020;;\nA2;Luis;Gil;H;01/01/2021;30/06/2026;Baja voluntaria\nA3;Eva;Sanz;M;01/01/2022;;\n');
ok('CSV con sexo y motivo de baja', cs.empleados.length === 2 && cs.empleados[0].sexo === 'mujer' && cs.empleados[1].sexo === 'hombre' && cs.empleados[1].motivoBaja === 'Baja voluntaria');
ok('CSV: sexo ambiguo da error en su fila', cs.errores.length === 1 && cs.errores[0].fila === 4 && /Sexo/.test(cs.errores[0].mensajes[0]));
const ida = E.importarCSV(E.exportarCSV(cs.empleados));
ok('CSV: exportar e importar conserva sexo y motivo', ida.empleados[0].sexo === 'mujer' && ida.empleados[1].motivoBaja === 'Baja voluntaria');
ok('Filtro por sexo y "sin indicar"', E.filtrar([{ nombre: 'A', apellido1: 'B', sexo: 'mujer' }, { nombre: 'C', apellido1: 'D', sexo: '' }], { sexo: 'sin', estado: 'todos', hoy: '2026-10-21' }).length === 1);

/* Actualizar fichas existentes por código */
const ex = [{ id: 7, codigo: 'E-001', nombre: 'Ana', apellido1: 'Pérez', apellido2: '', sexo: '', departamento: 'Fábrica', centro: 'Fábrica (Talavera)', puesto: 'Producción', fechaContratacion: '2020-01-01', salario: 22000, fechaBaja: '' }];
const up = E.importarCSV('codigo;nombre;primer apellido;sexo;departamento;salario anual;fecha contratacion\nE-001;Ana;Pérez;Mujer;;23000;\nE-002;Luis;Gil;Hombre;Comercial;;01/02/2024\n', ex, { departamentos: DEP });
ok('Importar con código existente: actualiza, no duplica', up.empleados.length === 1 && up.empleados[0].codigo === 'E-002' && up.actualizaciones.length === 1);
ok('Actualiza solo lo que cambia y no vacía datos (departamento vacío se mantiene)', JSON.stringify(up.actualizaciones[0].cambios) === JSON.stringify({ sexo: 'mujer', salario: 23000 }), JSON.stringify(up.actualizaciones[0].cambios));
ok('Código repetido dentro del archivo: error', E.importarCSV('codigo;sexo\nE-001;Mujer\ne-001;Hombre\n', ex).errores.length === 1);
console.log(fallos ? `\n${fallos} de ${total} pruebas fallidas` : `\nTodas las pruebas correctas (${total})`);
process.exit(fallos ? 1 : 0);
