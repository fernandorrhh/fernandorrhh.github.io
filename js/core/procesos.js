/*
 * Datos de los procesos.
 * - Vacantes (reclutamiento): almacén "vacantes" (como las altas). Solo recuentos por sexo; la persona elegida, con nombre y sexo.
 * - Periodos de prueba y salidas: dentro de la ficha cifrada del empleado (empleado.pruebas, empleado.salida).
 * - Tareas automáticas: auto 'prueba' (un aviso por hito) y auto 'salida' (pasos pendientes antes de la baja).
 */
const Procesos = (() => {
  const P = window.RRHH_PARAMS, C = P.procesos;
  const nuevoId = () => Date.now() + Math.random();
  const hoyISO = () => Fecha.iso(Fecha.hoy());
  const dm = s => s ? `${s.slice(8, 10)}/${s.slice(5, 7)}` : '';

  /* ---------- Tareas automáticas ---------- */
  function tarea(filtro, datos) {
    const t = Tareas.todas().find(filtro);
    if (!datos) { if (t && t.estado !== 'terminado') Tareas.setEstado(t.id, 'terminado'); return; }
    if (!t) { const l = Tareas.todas(); l.push({ id: nuevoId(), prioridad: 'alta', repite: '', estado: 'pendiente', hecha: false, ...datos }); Datos.set('tareas', l); }
    else if (t.titulo !== datos.titulo || t.fecha !== datos.fecha || t.estado === 'terminado') Tareas.editar(t.id, { titulo: datos.titulo, fecha: datos.fecha, ...(t.estado === 'terminado' ? { estado: 'pendiente', hecha: false, hechaEl: null } : {}) });
  }
  const quitarTareas = filtro => Tareas.todas().filter(filtro).forEach(t => Tareas.eliminar(t.id));

  /* ---------- Vacantes ---------- */
  const Vacantes = {
    todas: () => Datos.get('vacantes', []),
    guardarTodas: l => Datos.set('vacantes', l),
    buscar: id => Vacantes.todas().find(v => v.id === id),
    guardar(v) {
      const l = Vacantes.todas(), i = l.findIndex(x => x.id === v.id);
      const n = { candidaturas: { m: 0, h: 0 }, entrevistas: { m: 0, h: 0 }, seleccionados: [], canales: [], estado: 'abierta', ...(i >= 0 ? l[i] : {}), ...v, id: v.id || nuevoId() };
      if (i >= 0) l[i] = n; else l.push(n);
      Vacantes.guardarTodas(l); return n;
    },
    eliminar(id) { const l = Vacantes.todas(), v = l.find(x => x.id === id); Vacantes.guardarTodas(l.filter(x => x.id !== id)); return v; },
    restaurar(v) { Vacantes.guardarTodas([...Vacantes.todas(), v]); },
    /* Relaciona la persona seleccionada con el alta creada. */
    vincularAlta(vacanteId, nombre, altaId) {
      const v = Vacantes.buscar(vacanteId); if (!v) return;
      Vacantes.guardar({ id: v.id, seleccionados: v.seleccionados.map(s => s.nombre === nombre && !s.altaId ? { ...s, altaId } : s) });
    }
  };

  /* ---------- Periodos de prueba ---------- */
  const tareaHito = (p, h, nombre) => ({ titulo: `Periodo de prueba de ${nombre}: ${h.nombre.toLowerCase()} (fin ${dm(p.fin)})`, fecha: h.fecha, nota: `Tarea automática del periodo de prueba. Responsable: ${p.responsable || 'sin indicar'}.`, auto: 'prueba', pruebaId: p.id, hitoId: h.id });
  function sincronizarPrueba(p, nombre) {
    p.hitos.forEach(h => tarea(t => t.auto === 'prueba' && t.pruebaId === p.id && t.hitoId === h.id, h.hecho || p.resultado ? null : tareaHito(p, h, nombre)));
    // Hitos que ya no existen (p. ej. al cambiar la duración): fuera.
    quitarTareas(t => t.auto === 'prueba' && t.pruebaId === p.id && !p.hitos.some(h => h.id === t.hitoId));
  }
  const Pruebas = {
    todas() {
      if (!Empleados.desbloqueado) return [];
      return Empleados.todos().flatMap(e => (e.pruebas || []).map(p => ({ ...p, empleadoId: e.id, empleado: e.nombreCompleto, puesto: e.puesto, sexo: e.sexo, centro: e.centro })));
    },
    async guardar(empleadoId, datos) {
      const e = Empleados.buscar(empleadoId); if (!e) throw new Error('Empleado no encontrado');
      const l = e.pruebas || [], i = l.findIndex(x => x.id === datos.id), prev = i >= 0 ? l[i] : null;
      const meses = Number(datos.meses ?? prev?.meses), inicio = datos.inicio ?? prev?.inicio;
      const fin = MotorProcesos.finPrueba(inicio, meses);
      let hitos = MotorProcesos.hitos(inicio, meses, C.prueba);
      if (prev) hitos = hitos.map(h => { const o = prev.hitos.find(x => x.id === h.id); return o ? { ...h, hecho: o.hecho, nota: o.nota } : h; });
      const p = { ...(prev || {}), ...datos, id: datos.id || nuevoId(), inicio, meses, fin, hitos };
      ['empleadoId', 'empleado', 'puesto', 'sexo', 'centro'].forEach(k => delete p[k]);
      await Empleados.editarEmpleado(empleadoId, { pruebas: i >= 0 ? l.map(x => x.id === p.id ? p : x) : [...l, p] });
      sincronizarPrueba(p, e.nombreCompleto); return p;
    },
    async marcarHito(empleadoId, id, hitoId, hecho) {
      const e = Empleados.buscar(empleadoId), p = (e?.pruebas || []).find(x => x.id === id); if (!p) return;
      return Pruebas.guardar(empleadoId, { id, hitos: p.hitos.map(h => h.id === hitoId ? { ...h, hecho } : h) });
    },
    async resolver(empleadoId, id, resultado, fechaResultado, nota = '') {
      const e = Empleados.buscar(empleadoId), p = (e?.pruebas || []).find(x => x.id === id); if (!p) return;
      return Pruebas.guardar(empleadoId, { id, resultado, fechaResultado: resultado ? fechaResultado : '', notaResultado: nota, hitos: p.hitos.map(h => resultado && h.id === 'final' ? { ...h, hecho: true } : h) });
    },
    async eliminar(empleadoId, id) {
      const e = Empleados.buscar(empleadoId); if (!e) return;
      await Empleados.editarEmpleado(empleadoId, { pruebas: (e.pruebas || []).filter(x => x.id !== id) });
      quitarTareas(t => t.auto === 'prueba' && t.pruebaId === id);
    }
  };

  /* ---------- Salidas ---------- */
  function sincronizarSalida(s, nombre) {
    const pr = MotorProcesos.progresoSalida(C.salida, s);
    const datos = !s.cerrada && pr.faltan.length && s.fechaBaja ? { titulo: `Salida de ${nombre}: falta${pr.faltan.length === 1 ? '' : 'n'} ${pr.faltan.length} paso${pr.faltan.length === 1 ? '' : 's'}`, fecha: MotorProcesos.sumarDias(s.fechaBaja, -2) < hoyISO() ? hoyISO() : MotorProcesos.sumarDias(s.fechaBaja, -2), nota: 'Tarea automática del proceso de salida.', auto: 'salida', salidaId: s.id } : null;
    tarea(t => t.auto === 'salida' && t.salidaId === s.id, datos);
  }
  const Salidas = {
    todas() {
      if (!Empleados.desbloqueado) return [];
      return Empleados.todos().filter(e => e.salida).map(e => ({ ...e.salida, empleadoId: e.id, empleado: e.nombreCompleto, puesto: e.puesto, sexo: e.sexo, centro: e.centro, codigo: e.codigo }));
    },
    async guardar(empleadoId, datos) {
      const e = Empleados.buscar(empleadoId); if (!e) throw new Error('Empleado no encontrado');
      const s = { check: {}, creada: hoyISO(), ...(e.salida || {}), ...datos, id: e.salida?.id || datos.id || nuevoId() };
      ['empleadoId', 'empleado', 'puesto', 'sexo', 'centro', 'codigo'].forEach(k => delete s[k]);
      const cambios = { salida: s };
      if (s.cerrada) { cambios.fechaBaja = s.fechaBaja; cambios.motivoBaja = s.motivo; }   // al cerrar, pasa a la ficha
      await Empleados.editarEmpleado(empleadoId, cambios);
      sincronizarSalida(s, e.nombreCompleto); return s;
    },
    async marcar(empleadoId, paso, valor) { const e = Empleados.buscar(empleadoId); if (!e?.salida) return; return Salidas.guardar(empleadoId, { check: { ...e.salida.check, [paso]: valor } }); },
    async eliminar(empleadoId) {
      const e = Empleados.buscar(empleadoId); if (!e?.salida) return;
      const id = e.salida.id; await Empleados.editarEmpleado(empleadoId, { salida: null });
      quitarTareas(t => t.auto === 'salida' && t.salidaId === id);
    }
  };

  /* ---------- Promociones (en la ficha: empleado.promociones) ---------- */
  const Promociones = {
    todas() {
      if (!Empleados.desbloqueado) return [];
      return Empleados.todos().flatMap(e => (e.promociones || []).map(p => ({ ...p, empleadoId: e.id, empleado: e.nombreCompleto, sexo: e.sexo })));
    },
    /* Registra el cambio y, si se pide, lo aplica a la ficha (puesto, departamento o salario). */
    async guardar(empleadoId, p, aplicar = true) {
      const e = Empleados.buscar(empleadoId); if (!e) throw new Error('Empleado no encontrado');
      const n = { ...p, id: p.id || nuevoId() };
      const l = e.promociones || [], i = l.findIndex(x => x.id === n.id);
      const cambios = { promociones: i >= 0 ? l.map(x => x.id === n.id ? n : x) : [...l, n] };
      if (aplicar && i < 0) {
        if (['Promoción de categoría', 'Cambio de puesto'].includes(n.tipo) && n.a) cambios.puesto = n.a;
        if (n.tipo === 'Cambio de departamento' && P.departamentos.includes(n.a)) cambios.departamento = n.a;
        if (n.tipo === 'Subida salarial' && n.salarioNuevo > 0) cambios.salario = n.salarioNuevo;
      }
      await Empleados.editarEmpleado(empleadoId, cambios); return n;
    },
    async eliminar(empleadoId, id) { const e = Empleados.buscar(empleadoId); if (!e) return; await Empleados.editarEmpleado(empleadoId, { promociones: (e.promociones || []).filter(x => x.id !== id) }); }
  };

  return { Vacantes, Pruebas, Salidas, Promociones };
})();
