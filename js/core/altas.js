/*
 * Altas: datos y tareas automáticas.
 * Modelo: { id, nombre, centro, puesto, departamento, salario, fechaIncorporacion, fechaOferta,
 *           check: {idPaso: true}, bloqueante, observaciones, cerrada, fechaCierre, empleadoId, creada }
 * Mientras falten documentos del empleado, existe una tarea automática "Alta de X: faltan N documentos".
 */
const Altas = (() => {
  const todas = () => Datos.get('altas', []);
  const guardar = l => Datos.set('altas', l);
  const nuevoId = () => Date.now() + Math.random();

  function crear(datos) {
    const a = { id: nuevoId(), nombre: '', centro: window.RRHH_PARAMS.centros[0], puesto: '', departamento: '', salario: '', fechaIncorporacion: '', fechaOferta: '', check: {}, bloqueante: '', observaciones: '', cerrada: false, creada: Date.now(), ...datos };
    guardar([...todas(), a]); sincronizarTarea(a); return a;
  }
  function editar(id, cambios) {
    const l = todas(), a = l.find(x => x.id === id); if (!a) return null;
    Object.assign(a, cambios); guardar(l); sincronizarTarea(a); return a;
  }
  function marcar(id, paso, valor) {
    const a = todas().find(x => x.id === id); if (!a) return null;
    const cambios = { check: { ...a.check, [paso]: valor } };
    if (paso === 'ofertaEnviada' && valor && !a.fechaOferta) cambios.fechaOferta = Fecha.iso(Fecha.hoy());
    return editar(id, cambios);
  }
  function eliminar(id) {
    const l = todas(), i = l.findIndex(x => x.id === id); if (i < 0) return null;
    const [a] = l.splice(i, 1); guardar(l);
    const t = tareaDe(id); if (t) Tareas.eliminar(t.id);
    return { alta: a, tarea: t };
  }
  function restaurar({ alta, tarea }) { guardar([...todas(), alta]); if (tarea) Tareas.restaurar(tarea); }

  /* ---------- Tarea automática de documentación ---------- */
  const tareaDe = altaId => Tareas.todas().find(t => t.altaId === altaId && t.auto === 'docs');
  function sincronizarTarea(a) {
    const faltan = MotorAltas.docsPendientes(a).length, t = tareaDe(a.id);
    const titulo = `Alta de ${a.nombre || 'nueva incorporación'}: falta${faltan === 1 ? '' : 'n'} ${faltan} documento${faltan === 1 ? '' : 's'}`;
    const fecha = a.fechaIncorporacion ? Fecha.iso(Math.max(Fecha.hoy(), Fecha.parse(a.fechaIncorporacion) - 3 * DAY)) : '';
    if (faltan && !a.cerrada) {
      if (!t) {
        const l = Tareas.todas();
        l.push({ id: nuevoId(), titulo, nota: 'Tarea automática del seguimiento de altas.', prioridad: 'alta', fecha, repite: '', estado: 'pendiente', hecha: false, auto: 'docs', altaId: a.id });
        Datos.set('tareas', l);
      } else {
        const cambios = { titulo };
        if (t.estado === 'terminado') { cambios.estado = 'pendiente'; cambios.hecha = false; cambios.hechaEl = null; }
        if (!t.fechaManual) cambios.fecha = fecha;
        Tareas.editar(t.id, cambios);
      }
    } else if (t && t.estado !== 'terminado') Tareas.setEstado(t.id, 'terminado');
  }

  function enCurso() { return todas().filter(a => !a.cerrada); }
  return { todas, crear, editar, marcar, eliminar, restaurar, enCurso, tareaDe };
})();
