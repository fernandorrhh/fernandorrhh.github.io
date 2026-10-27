/*
 * Motor de empleados — funciones puras: validación, filtros e importación/exportación CSV.
 * Modelo: { id, codigo, nombre, apellido1, apellido2, sexo ('mujer'|'hombre'), departamento, responsable, centro, puesto, fechaContratacion, salario, fechaBaja, motivoBaja, vacaciones: {anio: dias}, ausencias: [], promociones: [] }
 * nombreCompleto se calcula al leer (normalizar).
 * Pruebas: tests/empleados.test.js
 */
(function (root) {
  const COLUMNAS = ['codigo', 'nombre', 'primer_apellido', 'segundo_apellido', 'sexo', 'departamento', 'responsable', 'centro', 'puesto', 'fecha_contratacion', 'salario_anual', 'fecha_baja', 'motivo_baja'];
  const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  /* Separa "Nombre Apellido1 Apellido2" (o "Apellido1 Apellido2, Nombre"). Las partículas (de, del, la…) van con el apellido. */
  const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'da', 'dos', 'san', 'santa', 'van', 'von']);
  function partirNombre(completo) {
    completo = String(completo || '').trim().replace(/\s+/g, ' ');
    if (!completo) return { nombre: '', apellido1: '', apellido2: '' };
    if (completo.includes(',')) { const [ap, nom] = completo.split(',').map(x => x.trim()); const a = partirNombre('X ' + ap); return { nombre: nom, apellido1: a.apellido1, apellido2: a.apellido2 }; }
    const t = completo.split(' '), grupos = []; let acc = [];
    t.slice(1).forEach(w => { acc.push(w); if (!PARTICULAS.has(w.toLowerCase())) { grupos.push(acc.join(' ')); acc = []; } });
    if (acc.length) grupos.push(acc.join(' '));
    return { nombre: t[0], apellido1: grupos[0] || '', apellido2: grupos.slice(1).join(' ') };
  }
  /* Sexo: 'mujer' | 'hombre' · '' si vacío · null si no se reconoce ("M" sola es ambigua: mujer o masculino). */
  function sexo(v) {
    const n = norm(v).replace(/[^a-z]/g, '');
    if (!n) return '';
    if (['mujer', 'f', 'femenino', 'fem', 'muj'].includes(n)) return 'mujer';
    if (['hombre', 'h', 'v', 'varon', 'masculino', 'masc', 'hom'].includes(n)) return 'hombre';
    return null;
  }
  const SEXO = { mujer: 'Mujer', hombre: 'Hombre' };
  const nombreCompleto = e => [e.nombre, e.apellido1, e.apellido2].map(x => String(x || '').trim()).filter(Boolean).join(' ');
  /* Fichas antiguas (solo "nombre" con todo) pasan a nombre + apellidos. */
  function normalizar(e) {
    const n0 = e.apellido1 === undefined ? { ...e, ...partirNombre(e.nombre) } : { ...e, apellido2: e.apellido2 || '' };
    const n = { ...n0, sexo: n0.sexo || '', motivoBaja: n0.motivoBaja || '' };
    return { ...n, nombreCompleto: nombreCompleto(n) };
  }
  /* Orden por apellidos sin tener en cuenta las partículas iniciales ("de la Iglesia" va en la I). */
  const claveOrden = e => [e.apellido1, e.apellido2, e.nombre].join(' ').replace(/^((de|del|la|las|los|y|da|dos|san|santa|van|von)\s+)+/i, '');
  /* Departamento: devuelve el valor oficial de la lista (sin distinguir mayúsculas ni tildes) o null. */
  const departamentoValido = (d, lista) => lista.find(x => norm(x) === norm(d)) || null;

  /* Fechas: acepta 31/12/2026, 31-12-2026 o 2026-12-31. Devuelve AAAA-MM-DD o '' si está vacía, null si no es válida. */
  function fecha(s) {
    s = String(s ?? '').trim(); if (!s) return '';
    let y, m, d, r;
    if ((r = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) [, y, m, d] = r;
    else if ((r = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/))) [, d, m, y] = r;
    else return null;
    const t = new Date(Date.UTC(+y, +m - 1, +d));
    if (t.getUTCFullYear() !== +y || t.getUTCMonth() !== +m - 1 || t.getUTCDate() !== +d) return null;
    return t.toISOString().slice(0, 10);
  }
  /* Importes: acepta 28.000,50 · 28000,5 · 28000.50 · 28 000 €. Devuelve número, '' si vacío, null si no válido. */
  function importe(s) {
    s = String(s ?? '').replace(/[€\s]/g, '').trim(); if (!s) return '';
    if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    else s = s.replace(/,/g, '');
    const n = Number(s); return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
  }

  function validar(e, existentes = []) {
    const err = [];
    if (!String(e.codigo || '').trim()) err.push('Falta el código de empleado');
    else if (existentes.some(x => x.id !== e.id && norm(x.codigo) === norm(e.codigo))) err.push(`El código ${e.codigo} ya existe`);
    if (!String(e.nombre || '').trim()) err.push('Falta el nombre');
    if (!String(e.apellido1 || '').trim()) err.push('Falta el primer apellido');
    if (!e.fechaContratacion) err.push('Falta la fecha de contratación');
    if (e.fechaBaja && e.fechaContratacion && e.fechaBaja < e.fechaContratacion) err.push('La fecha de baja es anterior a la de contratación');
    if (e.salario !== '' && e.salario != null && !(e.salario >= 0)) err.push('Salario no válido');
    return err;
  }

  const activo = (e, hoy) => !e.fechaBaja || e.fechaBaja >= hoy;
  function filtrar(lista, { q = '', centro = '', departamento = '', responsable = '', sexo: sx = '', estado = 'activos', hoy } = {}) {
    const nq = norm(q);
    return lista.filter(e =>
      (!nq || norm([e.codigo, nombreCompleto(e), e.departamento, e.responsable, e.puesto].join(' ')).includes(nq)) &&
      (!centro || e.centro === centro) && (!departamento || e.departamento === departamento) && (!responsable || e.responsable === responsable) && (!sx || (sx === 'sin' ? !e.sexo : e.sexo === sx)) &&
      (estado === 'todos' || (estado === 'activos') === activo(e, hoy))
    ).sort((a, b) => claveOrden(a).localeCompare(claveOrden(b), 'es'));
  }
  const valores = (lista, campo) => [...new Set(lista.map(e => e[campo]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));

  /* CSV: detecta ; o , como separador; admite comillas. Primera fila = cabeceras (flexibles). */
  function parseCSV(texto) {
    texto = texto.replace(/^﻿/, '');
    const primera = texto.split(/\r?\n/)[0] || '';
    const sep = (primera.match(/;/g) || []).length >= (primera.match(/,/g) || []).length ? ';' : ',';
    const filas = []; let fila = [], campo = '', comillas = false;
    for (let i = 0; i < texto.length; i++) {
      const c = texto[i];
      if (comillas) { if (c === '"') { if (texto[i + 1] === '"') { campo += '"'; i++; } else comillas = false; } else campo += c; }
      else if (c === '"') comillas = true;
      else if (c === sep) { fila.push(campo); campo = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && texto[i + 1] === '\n') i++; fila.push(campo); filas.push(fila); fila = []; campo = ''; }
      else campo += c;
    }
    if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila); }
    return filas.filter(f => f.some(x => x.trim() !== ''));
  }
  const ALIAS = { codigo: ['codigo', 'cod', 'codigo empleado', 'n empleado', 'id'], nombre: ['nombre'], completo: ['nombre y apellidos', 'apellidos y nombre', 'empleado', 'nombre completo'],
    apellido1: ['primer apellido', 'apellido 1', 'apellido1', '1 apellido', 'apellido'], apellido2: ['segundo apellido', 'apellido 2', 'apellido2', '2 apellido'],
    departamento: ['departamento', 'dpto', 'area'], responsable: ['responsable', 'jefe', 'manager'], centro: ['centro', 'centro de trabajo'],
    puesto: ['puesto', 'cargo'], fechaContratacion: ['fecha contratacion', 'fecha_contratacion', 'fecha alta', 'antiguedad', 'fecha de contratacion'],
    salario: ['salario', 'salario anual', 'salario_anual', 'bruto anual', 'salario bruto anual'], fechaBaja: ['fecha baja', 'fecha_baja', 'fecha de baja'],
    sexo: ['sexo', 'genero'], motivoBaja: ['motivo baja', 'motivo_baja', 'motivo de baja', 'causa baja', 'causa de baja'] };
  /* Devuelve { empleados (nuevos), actualizaciones:[{id, codigo, nombre, cambios}], errores:[{fila, mensajes}] } sin guardar nada.
     Si el código ya existe, la fila ACTUALIZA esa ficha con las columnas que traiga rellenas (no duplica ni borra datos). */
  function importarCSV(texto, existentes = [], { departamentos = null } = {}) {
    const filas = parseCSV(texto); if (filas.length < 2) return { empleados: [], errores: [{ fila: 1, mensajes: ['El archivo no tiene filas de datos'] }] };
    const cab = filas[0].map(h => norm(h).replace(/[_º.]/g, ' ').replace(/\s+/g, ' '));
    const idx = Object.fromEntries(Object.entries(ALIAS).map(([k, al]) => [k, cab.findIndex(h => al.includes(h))]));
    const empleados = [], errores = [], actualizaciones = [];
    filas.slice(1).forEach((f, i) => {
      const v = k => idx[k] >= 0 ? (f[idx[k]] || '').trim() : '';
      const nom = idx.apellido1 >= 0 || !(idx.completo >= 0) ? { nombre: v('nombre'), apellido1: v('apellido1'), apellido2: v('apellido2') } : partirNombre(v('completo'));
      const dep = v('departamento'), depOk = departamentos && dep ? departamentoValido(dep, departamentos) : dep;
      const e = { codigo: v('codigo'), ...nom, departamento: depOk || dep, responsable: v('responsable'), centro: v('centro'), puesto: v('puesto'),
        fechaContratacion: fecha(v('fechaContratacion')), salario: importe(v('salario')), fechaBaja: fecha(v('fechaBaja')), sexo: sexo(v('sexo')), motivoBaja: v('motivoBaja'), vacaciones: {} };
      const m = [];
      if (e.fechaContratacion === null) m.push(`Fecha de contratación no válida: "${v('fechaContratacion')}"`);
      if (e.fechaBaja === null) m.push(`Fecha de baja no válida: "${v('fechaBaja')}"`);
      if (e.salario === null) m.push(`Salario no válido: "${v('salario')}"`);
      if (e.sexo === null) m.push(`Sexo no reconocido: "${v('sexo')}" (usa Mujer u Hombre)`);
      if (departamentos && dep && !depOk) m.push(`Departamento "${dep}" no está en la lista (${departamentos.join(', ')})`);
      const previo = e.codigo && existentes.find(x => norm(x.codigo) === norm(e.codigo));
      if (previo && !m.length) {
        // Actualización: solo columnas presentes y con valor; nunca se vacía un dato existente.
        const cambios = {};
        const poner = (k, val) => { if (val !== '' && val !== null && val !== undefined && val !== previo[k]) cambios[k] = val; };
        ['nombre', 'apellido1', 'apellido2'].forEach(k => poner(k, e[k]));
        ['sexo', 'departamento', 'responsable', 'centro', 'puesto', 'fechaContratacion', 'salario', 'fechaBaja', 'motivoBaja'].forEach(k => poner(k, e[k]));
        if (actualizaciones.some(a => a.id === previo.id)) errores.push({ fila: i + 2, mensajes: [`El código ${e.codigo} está repetido en el archivo`] });
        else if (Object.keys(cambios).length) actualizaciones.push({ id: previo.id, codigo: previo.codigo, nombre: nombreCompleto(previo), cambios });
        return;
      }
      if (!m.length) m.push(...validar(e, [...existentes, ...empleados]));
      if (m.length) errores.push({ fila: i + 2, mensajes: m }); else empleados.push(e);
    });
    return { empleados, actualizaciones, errores };
  }
  function exportarCSV(lista) {
    const q = s => { s = String(s ?? ''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const f = s => s ? s.split('-').reverse().join('/') : '';
    const n = x => x === '' || x == null ? '' : String(x).replace('.', ',');
    return '﻿' + [COLUMNAS.join(';'), ...lista.map(e => [e.codigo, e.nombre, e.apellido1, e.apellido2, SEXO[e.sexo] || '', e.departamento, e.responsable, e.centro, e.puesto, f(e.fechaContratacion), n(e.salario), f(e.fechaBaja), e.motivoBaja || ''].map(q).join(';'))].join('\r\n') + '\r\n';
  }

  const api = { COLUMNAS, SEXO, sexo, partirNombre, nombreCompleto, normalizar, departamentoValido, fecha, importe, validar, activo, filtrar, valores, parseCSV, importarCSV, exportarCSV };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MotorEmpleados = api;
})(typeof window !== 'undefined' ? window : globalThis);
