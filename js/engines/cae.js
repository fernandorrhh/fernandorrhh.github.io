/*
 * Motor de coordinación de actividades empresariales (CAE) — funciones puras.
 * Proceso de la empresa (27/10/2026): la solicitud CAE (anexos II y III) se hace una vez al año por empresa; los documentos
 * de cada trabajador valen por año natural; la Seguridad Social, por mes o por trimestre natural según la empresa; Hacienda,
 * por año natural; la póliza de RC, hasta su vencimiento; las fichas de seguridad de productos, por año (si aplica).
 * Servicios: puntual (un día) o continuo (diario de lunes a viernes, semanal o mensual).
 * Base legal: art. 24 Ley 31/1995 de PRL y RD 171/2004.
 * Pruebas: tests/cae.test.js
 */
(function (root) {
  const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  const iso = t => new Date(t).toISOString().slice(0, 10);
  const f = s => s ? s.split('-').reverse().join('/') : '';
  const trimestre = s => Math.floor((Number(s.slice(5, 7)) - 1) / 3);   // 0-3
  const ultimoDia = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();  // m: 1-12

  /* Periodo de validez de un documento entregado el día "fecha". */
  function periodo(fecha, vigencia, vence = '') {
    if (!fecha) return null;
    const y = Number(fecha.slice(0, 4));
    if (vigencia === 'mes') { const m = Number(fecha.slice(5, 7)); return { desde: `${fecha.slice(0, 7)}-01`, hasta: `${fecha.slice(0, 7)}-${ultimoDia(y, m)}` }; }
    if (vigencia === 'trimestre') { const q = trimestre(fecha), m1 = q * 3 + 1, m3 = q * 3 + 3; return { desde: `${y}-${String(m1).padStart(2, '0')}-01`, hasta: `${y}-${String(m3).padStart(2, '0')}-${ultimoDia(y, m3)}` }; }
    if (vigencia === 'vence' && vence) return { desde: fecha, hasta: vence };
    return { desde: `${y}-01-01`, hasta: `${y}-12-31` };
  }
  /* ¿Cubre el documento el día "en"? */
  function vigente(fecha, vigencia, en, vence = '') { const p = periodo(fecha, vigencia, vence); return !!p && en >= p.desde && en <= p.hasta; }

  /* Documentos que se piden a una empresa (las fichas de seguridad, solo si usa productos) con su vigencia propia (SS mensual o trimestral). */
  const docsDe = (emp, cfg) => cfg.docsEmpresa.filter(d => !d.siProductos || emp.productos).map(d => d.id === 'ss' && emp.ssPeriodo ? { ...d, vigencia: emp.ssPeriodo } : d);
  const faltanEmpresa = (emp, en, cfg) => docsDe(emp, cfg).filter(d => !vigente(emp.docs?.[d.id], d.vigencia, en, d.id === 'rc' ? emp.docs?.rcVence : ''));
  const faltanTrabajador = (t, en, cfg) => cfg.docsTrabajador.filter(d => !vigente(t.docs?.[d.id], d.vigencia, en));
  /* Nueva: la empresa aún no ha aportado nada. Trabajador nuevo: ningún documento. */
  const empresaNueva = emp => !Object.values(emp.docs || {}).some(Boolean);
  const trabajadorNuevo = t => !Object.values(t.docs || {}).some(Boolean);

  /* Frecuencia: 'puntual' | 'diaria' (lunes a viernes) | 'semanal' (v.dia 0-6) | 'mensual' (v.diaMes 1-31). Visitas antiguas: v.semanal. */
  const frec = v => v.frec || (v.semanal ? 'semanal' : 'puntual');
  const continuo = v => frec(v) !== 'puntual';
  /* Próxima fecha del servicio (o null si ya terminó). */
  function proximaFecha(v, hoy) {
    const fr = frec(v); if (fr === 'puntual') return v.fecha || null;
    const ini = v.desde && v.desde > hoy ? v.desde : hoy, t0 = parse(ini), dow = (new Date(t0).getUTCDay() + 6) % 7;
    let sig;
    if (fr === 'diaria') sig = iso(t0 + (dow === 5 ? 2 : dow === 6 ? 1 : 0) * 86400000);
    else if (fr === 'semanal') sig = iso(t0 + ((Number(v.dia) - dow + 7) % 7) * 86400000);
    else { const dm = Math.min(Math.max(Number(v.diaMes) || 1, 1), 31), d0 = new Date(t0), y = d0.getUTCFullYear(), m = d0.getUTCMonth() + 1;
      const en = (yy, mm) => `${yy}-${String(mm).padStart(2, '0')}-${String(Math.min(dm, ultimoDia(yy, mm))).padStart(2, '0')}`;
      sig = en(y, m); if (sig < ini) sig = m === 12 ? en(y + 1, 1) : en(y, m + 1); }
    return v.hasta && sig > v.hasta ? null : sig;
  }
  function textoFecha(v) {
    const fr = frec(v), h = v.hasta ? ` hasta el ${f(v.hasta)}` : '';
    return fr === 'puntual' ? f(v.fecha) : fr === 'diaria' ? `De lunes a viernes${h}` : fr === 'semanal' ? `Cada ${DIAS[Number(v.dia)]}${h}` : `Cada mes, el día ${Number(v.diaMes) || 1}${h}`;
  }

  /**
   * Estado de una visita: qué falta para su próxima fecha.
   * @returns { fecha, terminada, faltanEmpresa, trabajadores:[{t, faltan, nuevo}], total, completa }
   */
  function estadoVisita(v, emp, trabajadores, hoy, cfg) {
    const fecha = proximaFecha(v, hoy), terminada = !fecha || (!continuo(v) && fecha < hoy);
    // Servicio continuo: se mira con antelación (renovarDias) para pedir a tiempo lo del mes, trimestre o año siguiente.
    const ref = continuo(v) ? iso(parse(hoy) + (cfg.renovarDias || 0) * 86400000) : hoy;
    let en = fecha && fecha >= hoy ? fecha : (fecha || hoy);
    if (continuo(v) && fecha && ref > en && (!v.hasta || ref <= v.hasta)) en = ref;
    const fe = faltanEmpresa(emp, en, cfg);
    const ts = (v.trabajadores || []).map(id => trabajadores.find(t => t.id === id)).filter(Boolean).map(t => ({ t, faltan: faltanTrabajador(t, en, cfg), nuevo: trabajadorNuevo(t) }));
    const total = fe.length + ts.reduce((a, x) => a + x.faltan.length, 0);
    return { fecha, en, terminada, faltanEmpresa: fe, trabajadores: ts, total, completa: total === 0 && ts.length > 0 };
  }

  /* Correo exacto de la primera solicitud (empresa nueva). */
  function plantillaCompleta(cfg, emp = null) {
    return ['Buenos días:', '', 'Me pongo en contacto para coordinar las actividades empresariales (CAE) entre ambas empresas, por la presente solicito la siguiente documentación preceptiva:', '',
      '•     Día de visita/entrada/trabajos en las instalaciones de Liptosa',
      '•     Número de DNI/NIE/NIF nombre y apellidos del/las persona(s) que venga(n) a las instalaciones de Liptosa',
      '•     Justificante de estar al corriente de pago en la seguridad social, como autónomos o como personal contratado por la empresa',
      '•     Justificante de estar al corriente de pago con la Agencia Tributaria (Hacienda)',
      '•     Copia de la Póliza de Responsabilidad Civil.',
      '•     Certificados de formación en prevención de riesgos laborales de los trabajadores que van a realizar tareas en nuestras instalaciones, emitidos por una entidad acreditada o por Técnico de Prevención de Riesgos Laborales de la empresa. Formación relativa para realizar las tareas del puesto de trabajo',
      '•     Certificado de Aptitud',
      "•     Entrega de EPI's y, cuando corresponda, el Certificado de revisión de estos.",
      ...(emp && emp.productos ? ['•     Fichas de datos de seguridad de los productos químicos que se vayan a utilizar en nuestras instalaciones'] : []),
      '•     Los siguientes Anexos con fecha, firma y sello',
      ...cfg.anexos.map(a => `       ${a.nombre}: ${a.url}`)].join('\n');
  }

  /**
   * Correo para una visita. Empresa nueva → plantilla completa. Si no, pide confirmar día y personas, que no ha cambiado
   * nada de lo aportado, y solo los documentos que faltan (de la empresa y de cada persona; también para personas nuevas).
   * @param {object} o  v (visita) · emp · est (estadoVisita) · nombre(t) · cfg · hoy
   */
  function correo({ v, emp, est, nombre, cfg, hoy }) {
    const cont = continuo(v), FR = { diaria: 'servicio diario', semanal: 'servicio semanal', mensual: 'servicio mensual' };
    const asunto = `CAE · ${emp.nombre} · ${cont ? FR[frec(v)] : 'trabajos del ' + f(est.fecha)}`;
    if (empresaNueva(emp)) return { asunto, tipo: 'completo', texto: plantillaCompleta(cfg, emp) };
    const L = ['Buenos días:', '', `Me pongo en contacto para coordinar las actividades empresariales (CAE) entre ambas empresas para ${cont ? `el servicio que realizáis en las instalaciones de Liptosa (${textoFecha(v).toLowerCase()})` : `los trabajos del ${f(est.fecha)} en las instalaciones de Liptosa`}. Por favor, confirmadnos:`, '',
      `•     Día${cont ? 's' : ''} de visita/entrada/trabajos en las instalaciones de Liptosa`,
      '•     Número de DNI/NIE/NIF, nombre y apellidos de la(s) persona(s) que venga(n)',
      `•     Que no ha cambiado nada respecto a la documentación que ya nos habéis aportado${est.fecha ? ` (sigue vigente a ${f(est.en)})` : ''}`];
    const pend = [];
    const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    est.faltanEmpresa.forEach(d => pend.push(`•     ${d.nombre}${d.vigencia === 'trimestre' ? ` (del ${trimestre(est.en) + 1}.º trimestre de ${est.en.slice(0, 4)})` : d.vigencia === 'mes' ? ` (de ${MES[Number(est.en.slice(5, 7)) - 1]} de ${est.en.slice(0, 4)})` : d.vigencia === 'anio' && !d.anexo ? ` (de ${est.en.slice(0, 4)})` : ''}`));
    est.trabajadores.filter(x => x.faltan.length).forEach(x => pend.push(`•     ${nombre(x.t)}${x.nuevo ? ' (persona nueva)' : ''}: ${x.faltan.map(d => d.pide || d.corto).join(', ')}`));
    if (pend.length) L.push('', 'Además, necesitamos la siguiente documentación preceptiva:', '', ...pend);
    if (est.faltanEmpresa.some(d => d.anexo)) L.push('', 'Os adjunto los anexos para que los devolváis con fecha, firma y sello:', ...cfg.anexos.filter((a, i) => est.faltanEmpresa.some(d => d.id === ['anexo2', 'anexo3'][i])).map(a => `       ${a.nombre}: ${a.url}`));
    L.push('', `Si viene alguna persona que no haya trabajado en nuestras instalaciones este año, necesitamos también su formación en PRL del puesto, certificado de aptitud y entrega de EPI's.`, '', 'Muchas gracias. Un saludo.');
    return { asunto, tipo: pend.length ? 'pendientes' : 'confirmar', texto: L.join('\n') };
  }
  const html = texto => texto.split('\n').map(l => l.trim().startsWith('•') ? `<li>${esc(l.replace(/^\s*•\s*/, ''))}</li>` : l.trim().match(/^\S.*: https?:\/\//) ? `<li>${linkHtml(l)}</li>` : l ? `<p>${esc(l)}</p>` : '').join('').replace(/(<li>.*?<\/li>)+/g, m => `<ul>${m}</ul>`);
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const linkHtml = l => { const i = l.indexOf(': http'); const n = l.slice(0, i).trim(), u = l.slice(i + 2).trim(); return `<a href="${esc(u)}">${esc(n)}</a>`; };

  /* Ruta en la carpeta de PRL del servidor: Base\Carpeta de la empresa\Año[\Persona - Documento.pdf] */
  const limpio = s => String(s || '').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();
  const carpeta = (base, empresa, anio) => `${String(base).replace(/[\\/]+$/, '')}\\${limpio(empresa)}\\${anio}`;
  const ruta = (base, anio, empresa, doc, persona = '') => `${carpeta(base, empresa, anio)}\\${persona ? limpio(persona) + ' - ' : ''}${limpio(doc)}.pdf`;
  /* "4.º trimestre 2026" o "2026" */
  const MESC = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const etiquetaPeriodo = (fecha, vigencia, vence = '') => !fecha ? '' : vigencia === 'mes' ? `${MESC[Number(fecha.slice(5, 7)) - 1]} ${fecha.slice(0, 4)}` : vigencia === 'trimestre' ? `${trimestre(fecha) + 1}.º trim. ${fecha.slice(0, 4)}` : vigencia === 'vence' && vence ? `hasta ${f(vence)}` : fecha.slice(0, 4);

  const api = { DIAS, frec, continuo, docsDe, carpeta, periodo, vigente, faltanEmpresa, faltanTrabajador, empresaNueva, trabajadorNuevo, proximaFecha, textoFecha, estadoVisita, plantillaCompleta, correo, html, ruta, etiquetaPeriodo, trimestre };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MotorCae = api;
})(typeof window !== 'undefined' ? window : globalThis);
