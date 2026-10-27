/*
 * Datos de la coordinación de actividades empresariales (CAE).
 * - Empresas (sin datos personales): almacén "caeEmpresas" → nombre, CIF, servicio, carpeta y fechas de sus documentos.
 * - Visitas (sin datos personales): almacén "caeVisitas" → empresa, fecha o día de la semana, ids de trabajadores, envío.
 * - Cifrado con la contraseña de Empleados ("caeCifrado"): contactos de cada empresa y trabajadores externos (nombre, DNI, documentos).
 * - Ticket automático (auto 'cae', categoría PRL) por visita con documentación pendiente; se cierra solo al completarla.
 * Lógica pura: js/engines/cae.js
 */
const Cae = (() => {
  const C = window.RRHH_PARAMS.cae, CIF = 'caeCifrado';
  Empleados.registrarExtra(CIF);
  const nuevoId = () => Date.now() + Math.random();
  const hoyISO = () => Fecha.iso(Fecha.hoy());
  const abierta = () => Empleados.configurado() && Empleados.desbloqueado;

  /* ---------- Empresas y visitas (sin cifrar) ---------- */
  const empresas = () => Datos.get('caeEmpresas', []).map(e => ({ docs: {}, ...e })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const empresa = id => empresas().find(e => e.id === id) || null;
  function guardarEmpresa(e) {
    const l = Datos.get('caeEmpresas', []), i = l.findIndex(x => x.id === e.id);
    const n = { docs: {}, ...(i >= 0 ? l[i] : {}), ...e, id: e.id || nuevoId() };
    if (i >= 0) l[i] = n; else l.push(n);
    Datos.set('caeEmpresas', l); sincronizar(); return n;
  }
  const visitas = () => Datos.get('caeVisitas', []);
  const visita = id => visitas().find(v => v.id === id) || null;
  function guardarVisita(v) {
    const l = visitas(), i = l.findIndex(x => x.id === v.id);
    const n = { trabajadores: [], ...(i >= 0 ? l[i] : {}), ...v, id: v.id || nuevoId() };
    if (i >= 0) l[i] = n; else l.push(n);
    Datos.set('caeVisitas', l); sincronizar(); return n;
  }
  function eliminarVisita(id) { const v = visita(id); Datos.set('caeVisitas', visitas().filter(x => x.id !== id)); quitarTarea(id); return v; }
  function restaurarVisita(v) { Datos.set('caeVisitas', [...visitas(), v]); sincronizar(); }

  /* ---------- Contactos y trabajadores externos (cifrados) ---------- */
  const privado = () => Empleados.extra(CIF, { contactos: {}, trabajadores: [] });
  const guardarPrivado = async d => { await Empleados.guardarExtra(CIF, d); sincronizar(); };
  const contacto = empId => privado().contactos[empId] || { persona: '', email: '', telefono: '' };
  async function guardarContacto(empId, c) { const d = privado(); d.contactos[empId] = c; await guardarPrivado(d); }
  const trabajadores = (empId = null) => privado().trabajadores.map(t => ({ docs: {}, ...t })).filter(t => empId === null || t.empresaId === empId)
    .sort((a, b) => `${a.apellidos} ${a.nombre}`.localeCompare(`${b.apellidos} ${b.nombre}`, 'es'));
  const trabajador = id => trabajadores().find(t => t.id === id) || null;
  async function guardarTrabajador(t) {
    const d = privado(), i = d.trabajadores.findIndex(x => x.id === t.id);
    const n = { docs: {}, ...(i >= 0 ? d.trabajadores[i] : {}), ...t, id: t.id || nuevoId() };
    if (i >= 0) d.trabajadores[i] = n; else d.trabajadores.push(n);
    await guardarPrivado(d); return n;
  }
  async function eliminarTrabajador(id) {
    const d = privado(), t = d.trabajadores.find(x => x.id === id); d.trabajadores = d.trabajadores.filter(x => x.id !== id); await guardarPrivado(d);
    Datos.set('caeVisitas', visitas().map(v => ({ ...v, trabajadores: (v.trabajadores || []).filter(x => x !== id) }))); sincronizar();
    return t;
  }
  const nombre = t => t ? `${t.nombre} ${t.apellidos}`.trim() : '';

  /* Documento recibido (fecha) o quitado (''). tipo: 'empresa' | 'trabajador'. */
  async function marcarDoc(tipo, id, docId, fecha) {
    if (tipo === 'empresa') { const e = empresa(id); guardarEmpresa({ id, docs: { ...e.docs, [docId]: fecha } }); }
    else { const t = trabajador(id); await guardarTrabajador({ id, docs: { ...t.docs, [docId]: fecha } }); }
  }

  /* Empresa entera fuera (con sus visitas y trabajadores). Devuelve lo necesario para deshacer. */
  async function eliminarEmpresa(id) {
    const e = empresa(id), vs = visitas().filter(v => v.empresaId === id), d = privado();
    const ts = d.trabajadores.filter(t => t.empresaId === id), ct = d.contactos[id];
    Datos.set('caeEmpresas', Datos.get('caeEmpresas', []).filter(x => x.id !== id));
    Datos.set('caeVisitas', visitas().filter(v => v.empresaId !== id)); vs.forEach(v => quitarTarea(v.id));
    d.trabajadores = d.trabajadores.filter(t => t.empresaId !== id); delete d.contactos[id]; await guardarPrivado(d);
    return { e, vs, ts, ct };
  }
  async function restaurarEmpresa({ e, vs, ts, ct }) {
    Datos.set('caeEmpresas', [...Datos.get('caeEmpresas', []), e]); Datos.set('caeVisitas', [...visitas(), ...vs]);
    const d = privado(); d.trabajadores.push(...ts); if (ct) d.contactos[e.id] = ct; await guardarPrivado(d);
  }

  /* Estado de una visita (qué falta para su próxima fecha). Necesita la base desbloqueada. */
  const estado = v => { const e = empresa(v.empresaId); return e ? MotorCae.estadoVisita(v, e, trabajadores(v.empresaId), hoyISO(), C) : null; };
  /* Carpeta base del servidor (se puede cambiar desde la página) y carpeta de cada empresa/año. */
  const carpetaBase = () => Datos.get('caeCarpetaBase', '') || C.carpetaBase;
  const setCarpetaBase = s => Datos.set('caeCarpetaBase', s);
  const nombreCarpeta = e => e.carpetaNombre || e.nombre.toUpperCase();
  const carpeta = (e, anio = hoyISO().slice(0, 4)) => MotorCae.carpeta(carpetaBase(), nombreCarpeta(e), anio);

  /* ---------- Tickets automáticos ---------- */
  const tareaDe = id => Tareas.todas().find(t => t.auto === 'cae' && t.caeVisitaId === id);
  function quitarTarea(id) { const t = tareaDe(id); if (t) Tareas.eliminar(t.id); }
  function sincronizar() {
    if (!abierta() || typeof Tareas === 'undefined') return;
    const h = hoyISO();
    visitas().forEach(v => {
      const e = empresa(v.empresaId), t = tareaDe(v.id); if (!e) return;
      const est = estado(v), pendiente = !v.cerrada && !est.terminada && est.total > 0 && est.trabajadores.length > 0;
      if (pendiente) {
        const lim = MotorCae.continuo(v) ? (est.fecha < est.en ? est.fecha : est.en) : est.fecha;
        const fecha = Fecha.iso(Math.max(Fecha.hoy(), Fecha.parse(lim) - C.avisoDias * DAY));
        const titulo = MotorCae.continuo(v) ? `CAE · ${e.nombre}: pedir ${est.total} documento${est.total === 1 ? '' : 's'} (antes del ${Fecha.corta(Fecha.parse(est.en))})`
          : `CAE · ${e.nombre}: falta${est.total === 1 ? '' : 'n'} ${est.total} documento${est.total === 1 ? '' : 's'} para el ${Fecha.corta(Fecha.parse(est.fecha))}`;
        if (!t) { const l = Tareas.todas(); l.push({ id: nuevoId(), titulo, nota: 'Ticket automático de la coordinación de actividades empresariales (PRL → Empresas externas).', prioridad: 'alta', categoria: 'prl', fecha, aviso: true, antelacion: 0, repite: '', estado: 'pendiente', hecha: false, auto: 'cae', caeVisitaId: v.id }); Datos.set('tareas', l); }
        else if (t.titulo !== titulo || t.fecha !== fecha || t.estado === 'terminado') Tareas.editar(t.id, { titulo, fecha, ...(t.estado === 'terminado' ? { estado: 'pendiente', hecha: false, hechaEl: null } : {}) });
      } else if (t && t.estado !== 'terminado') Tareas.setEstado(t.id, 'terminado');
    });
  }
  Empleados.on(() => { if (abierta()) sincronizar(); });

  /* Avisos para la barra lateral: visitas próximas (14 días) con documentación pendiente. */
  function pendientes() {
    if (!abierta()) return [];
    const h = hoyISO(), lim = Fecha.iso(Fecha.hoy() + 14 * DAY);
    return visitas().filter(v => !v.cerrada).map(v => ({ v, est: estado(v) })).filter(x => x.est && !x.est.terminada && (x.est.fecha <= lim || MotorCae.continuo(x.v)) && x.est.total > 0);
  }

  return { empresas, empresa, guardarEmpresa, eliminarEmpresa, restaurarEmpresa, visitas, visita, guardarVisita, eliminarVisita, restaurarVisita,
    contacto, guardarContacto, trabajadores, trabajador, guardarTrabajador, eliminarTrabajador, nombre, marcarDoc, estado, sincronizar, pendientes, tareaDe, carpetaBase, setCarpetaBase, nombreCarpeta, carpeta };
})();
