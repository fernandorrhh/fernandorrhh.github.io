// Pruebas del motor de documentos. Ejecutar: node tests/documentos.test.js
global.window = {};
require('../js/params.js');
const P = window.RRHH_PARAMS;
const D = require('../js/engines/documentos.js');

let fallos = 0, total = 0;
const ok = (nombre, cond) => { total++; if (!cond) fallos++; console.log(`${cond ? '✔' : '✘'} ${nombre}`); };
const ctx = (hora = 10) => ({ empresa: P.empresa, planIgualdad: P.planIgualdad, anio: 2026, hora });
const base = { tratamiento: 'o', nombre: 'Javier', centro: 'Fábrica (Talavera)', puesto: 'Oficial de producción', departamento: 'Fábrica', contrato: 'indefinido', salario: 21985.05, jornada: 'completa (40 horas semanales)' };

ok('Importe con decimales', D.euros(21985.05) === '21.985,05 €');
ok('Importe entero y miles de 4 cifras', D.euros(2800) === '2.800 €' && D.euros(28000) === '28.000 €');
ok('Importe vacío', D.euros('') === null);
ok('Fecha larga', D.fechaLarga('2026-10-26') === '26 de octubre de 2026');
ok('Saludo por la mañana / por la tarde', D.saludoHora(9) === 'Buenos días' && D.saludoHora(16) === 'Buenas tardes');

let r = D.generar('oferta-correo', base, ctx());
ok('Oferta: asunto con el puesto', r.asunto === 'Oferta de trabajo — Oficial de producción');
ok('Oferta: Estimado + nombre', r.cuerpo.startsWith('Estimado Javier,'));
ok('Oferta: centro en texto (Talavera de la Reina)', r.cuerpo.includes('en el centro de Talavera de la Reina.'));
ok('Oferta: salario formateado', r.cuerpo.includes('- Salario: 21.985,05 € brutos anuales'));
ok('Oferta: sin datos que falten', r.faltan.length === 0);
r = D.generar('oferta-correo', { ...base, tratamiento: 'a', nombre: 'Lucía', centro: 'Oficina (Madrid)' }, ctx());
ok('Oferta: Estimada y centro Madrid', r.cuerpo.startsWith('Estimada Lucía,') && r.cuerpo.includes('en el centro de Madrid.'));
r = D.generar('oferta-correo', { tratamiento: 'o' }, ctx());
ok('Oferta: lo que falta va entre corchetes y se lista', r.cuerpo.includes('[Puesto]') && r.faltan.includes('Nombre') && r.faltan.includes('Salario'));

r = D.generar('oferta-carta', base, ctx());
ok('Carta general: usted, sin DNI', r.cuerpo.startsWith('Estimado Javier:') && !/DNI/i.test(r.cuerpo));
ok('Carta general: retribución sencilla', r.cuerpo.includes('contrato indefinido y una retribución anual bruta de 21.985,05 €.'));
ok('Carta: validez 07 días', r.cuerpo.includes('Validez de oferta 07 días.'));
r = D.generar('oferta-carta', { ...base, comercial: true, departamento: 'Comercial', salario: 28000, noCompetencia: 3000, bono: 4000, comisiones: true, garantia: 36000, beneficios: 'seguro de viaje y de accidentes' }, ctx());
ok('Carta comercial: no competencia', r.cuerpo.includes('- Salario base 28.000 €. (La cláusula de no competencia son 3.000 euros año).'));
ok('Carta comercial: bono con el ejercicio', r.cuerpo.includes('de 4.000 € anuales, según establecido por la empresa para el ejercicio 2026.'));
ok('Carta comercial: comisiones y garantía', r.cuerpo.includes('- Comisiones variables') && r.cuerpo.includes('será de 36.000 €.'));
ok('Carta comercial: beneficios', r.cuerpo.includes('Actualmente seguro de viaje y de accidentes.'));
r = D.generar('oferta-carta', { ...base, comercial: true, salario: 28000 }, ctx());
ok('Carta comercial: sin extras, no aparecen sus líneas', !r.cuerpo.includes('no competencia') && !r.cuerpo.includes('Bono') && !r.cuerpo.includes('Comisiones') && !r.cuerpo.includes('beneficios'));

r = D.generar('documentacion', base, ctx(16));
ok('Documentación: saludo de tarde', r.cuerpo.startsWith('Buenas tardes Javier,'));
ok('Documentación: título siempre', r.cuerpo.includes('- Título de Graduado'));
ok('Documentación fábrica: con tallas y "pantalón"', r.cuerpo.includes('Talla de pantalón') && !r.cuerpo.includes('pantón'));
r = D.generar('documentacion', { ...base, centro: 'Oficina (Madrid)' }, ctx());
ok('Documentación oficina: sin tallas', !r.cuerpo.includes('tallaje'));

r = D.generar('bienvenida', base, ctx());
ok('Bienvenida: Plan de Igualdad con fechas', r.cuerpo.includes('aprobado el 17 de diciembre de 2024') && r.cuerpo.includes('hasta el 16 de diciembre de 2028'));
ok('Bienvenida: nombre del ministerio corregido', r.cuerpo.includes('Ministerio de Trabajo y Economía Social'));

r = D.generar('emergencias', base, ctx());
ok('Emergencias: sin acuse de recibo', !/acuse|confirmes|confirma que/i.test(r.cuerpo));
ok('Emergencias: asunto con el centro', r.asunto === 'Plan de Emergencias — Talavera de la Reina');

r = D.generar('prl-calidad', { ...base, tratamiento: 'a', nombre: 'Rosa', apellidos: 'Méndez', fechaIncorporacion: '2026-11-02', tallaPie: '39', tallaRopa: 'M', tallaPantalon: '40-42' }, ctx());
ok('PRL y Calidad: fecha, tallas y "dada de alta"', r.cuerpo.includes('el 2 de noviembre de 2026 se incorpora Rosa Méndez') && r.cuerpo.includes('- Pie: 39') && r.cuerpo.includes('dada de alta'));
ok('PRL y Calidad: asunto', r.asunto === 'Nueva incorporación en fábrica — Rosa Méndez — 2 de noviembre de 2026');

ok('Oferta: el saludo usa solo el nombre aunque haya apellidos', D.generar('oferta-correo', { ...base, apellidos: 'Ruiz Soto' }, ctx()).cuerpo.startsWith('Estimado Javier,'));
ok('Sin líneas en blanco triples', D.PLANTILLAS.every(p => !/\n{3,}/.test(D.generar(p.id, base, ctx()).cuerpo)));
const h = D.aHtml('Hola,\n\n- uno\n- dos\nFin <b>');
ok('HTML: listas y escape', h.includes('<ul><li>uno</li><li>dos</li></ul>') && h.includes('Fin &lt;b&gt;'));
ok('Mailto codificado', D.mailto('Asunto á', 'Línea 1\nLínea 2').startsWith('mailto:?subject=Asunto%20%C3%A1&body=L%C3%ADnea%201%0ALínea'.replace('Línea', 'L%C3%ADnea')));

console.log(fallos ? `\n${fallos} de ${total} pruebas fallidas` : `\nTodas las pruebas correctas (${total})`);
process.exit(fallos ? 1 : 0);
