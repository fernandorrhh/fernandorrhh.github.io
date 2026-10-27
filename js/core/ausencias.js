/*
 * Ausencias: se guardan dentro de cada ficha de la base cifrada de empleados (empleado.ausencias).
 * - Índice público (sin nombres ni tipos) para que el calendario muestre "Ausencia" con la base bloqueada.
 * - Tarea automática de reincorporación (o de fin de reducción) N días antes de la vuelta prevista; sin el tipo de ausencia.
 */
const Ausencias = (() => {
  const P = window.RRHH_PARAMS, C = P.ausencias, PUB = 'ausenciasPublico';
  const nuevoId = () => Date.now() + Math.random();
  const hoyISO = () => Fecha.iso(Fecha.hoy());
  const tipo = id => MotorAusencias.tipoDe(C.tipos, id);

  /* Todas las ausencias, con el empleado (solo con la base desbloqueada). */
  function todas() {
    if (!Empleados.desbloqueado) return [];
    return Empleados.todos().flatMap(e => (e.ausencias || []).map(a => ({ ...a, empleadoId: e.id, empleado: e.nombreCompleto, codigo: e.codigo, centro: e.centro })));
  }
  const buscar = id => todas().find(a => a.id === id);

  /* Índice público: solo fechas, para el calendario con la base bloqueada. */
  function indexar() {
    if (!Empleados.desbloqueado) return;
    const idx = todas().filter(a => tipo(a.tipo).ausencia !== false).map(a => ({ id: a.id, desde: a.desde, hasta: a.finReal || a.hastaPrevista || '' }));
    if (JSON.stringify(Datos.get(PUB, [])) !== JSON.stringify(idx)) Datos.set(PUB, idx);
  }
  const publico = () => Datos.get(PUB, []);

  const tareaDe = id => Tareas.todas().find(t => t.auto === 'reinc' && t.ausenciaId === id);
  function sincronizarTarea(a, nombre) {
    const t = tareaDe(a.id), x = MotorAusencias.tarea(a, nombre, tipo(a.tipo), C.avisoDias);
    if (x) {
      if (!t) { const l = Tareas.todas(); l.push({ id: nuevoId(), titulo: x.titulo, nota: 'Tarea automática del seguimiento de ausencias.', prioridad: 'alta', fecha: x.fecha, repite: '', estado: 'pendiente', hecha: false, auto: 'reinc', ausenciaId: a.id }); Datos.set('tareas', l); }
      else if (t.titulo !== x.titulo || t.fecha !== x.fecha) Tareas.editar(t.id, { titulo: x.titulo, fecha: x.fecha, ...(t.estado === 'terminado' ? { estado: 'pendiente', hecha: false, hechaEl: null } : {}) });
    } else if (t) {
      if (a.finReal) { if (t.estado !== 'terminado') Tareas.setEstado(t.id, 'terminado'); }   // ya ha vuelto
      else Tareas.eliminar(t.id);                                                              // ya no hay fecha prevista
    }
  }

  const limpiar = a => { const { empleadoId, empleado, codigo, centro, ...resto } = a; return resto; };
  async function guardar(empleadoId, datos) {
    const e = Empleados.buscar(empleadoId); if (!e) throw new Error('Empleado no encontrado');
    const lista = e.ausencias || [], i = lista.findIndex(x => x.id === datos.id);
    const a = limpiar({ acciones: {}, ...(i >= 0 ? lista[i] : {}), ...datos, id: datos.id || nuevoId() });
    // Si cambia de persona, se quita de la ficha anterior.
    if (datos._antes && datos._antes !== empleadoId) { const o = Empleados.buscar(datos._antes); if (o) await Empleados.editarEmpleado(o.id, { ausencias: (o.ausencias || []).filter(x => x.id !== a.id) }); }
    delete a._antes;
    const nueva = i >= 0 ? lista.map(x => x.id === a.id ? a : x) : [...lista, a];
    await Empleados.editarEmpleado(empleadoId, { ausencias: nueva });
    sincronizarTarea(a, e.nombreCompleto); indexar();
    return a;
  }
  async function marcarAccion(empleadoId, id, i, valor) { const a = buscar(id); if (!a) return; return guardar(empleadoId, { id, acciones: { ...(a.acciones || {}), [i]: valor } }); }
  async function confirmarVuelta(empleadoId, id, finReal) { return guardar(empleadoId, { id, finReal }); }
  async function eliminar(empleadoId, id) {
    const e = Empleados.buscar(empleadoId); if (!e) return null;
    const a = (e.ausencias || []).find(x => x.id === id);
    await Empleados.editarEmpleado(empleadoId, { ausencias: (e.ausencias || []).filter(x => x.id !== id) });
    const t = tareaDe(id); if (t) Tareas.eliminar(t.id);
    indexar(); return { empleadoId, ausencia: a, tarea: t };
  }
  async function restaurar({ empleadoId, ausencia, tarea }) {
    const e = Empleados.buscar(empleadoId); if (!e) return;
    await Empleados.editarEmpleado(empleadoId, { ausencias: [...(e.ausencias || []), ausencia] });
    if (tarea) Tareas.restaurar(tarea); indexar();
  }
  /* Días sin devengo de vacaciones de un empleado en un año. */
  const sinDevengo = (empleado, anio, hasta) => MotorAusencias.diasSinDevengo(empleado?.ausencias || [], C.tipos, anio, hasta, hasta || hoyISO());

  Empleados.on(() => { if (Empleados.desbloqueado) indexar(); });
  return { todas, buscar, guardar, marcarAccion, confirmarVuelta, eliminar, restaurar, publico, tipo, sinDevengo, tareaDe };
})();
