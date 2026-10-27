/*
 * Tickets: tareas y recordatorios (datos, crear, panel de detalle, modo "Una a una", avisos y .ics).
 * El modelo y la lógica pura (vistas, archivo, orden, filtros, repeticiones) están en js/engines/tareas.js.
 * Los tickets no llevan datos personales cifrados: la persona vinculada se guarda solo como id de empleado
 * y su nombre se muestra únicamente con la base de empleados desbloqueada.
 */
const Tareas = (() => {
  const P = window.RRHH_PARAMS;
  const REPITE = { '': 'No se repite', semana: 'Cada semana', mes: 'Cada mes', anio: 'Cada año' };
  const PRIO = { alta: 'Alta', media: 'Media', baja: 'Baja' };
  const ESTADO = { pendiente: 'Por hacer', proceso: 'En curso', espera: 'En espera', terminado: 'Hecha' };
  const ESTADO_R = { pendiente: 'Pendiente', terminado: 'Hecho' };
  const ANTELACION = [[0, 'El mismo día'], [1, '1 día antes'], [2, '2 días antes'], [3, '3 días antes'], [7, '1 semana antes'], [15, '15 días antes'], [30, '1 mes antes']];
  const nuevoId = () => Date.now() + Math.random();
  const hoyISO = () => Fecha.iso(Fecha.hoy());
  const estadoTxt = t => (t.tipo === 'recordatorio' ? ESTADO_R : ESTADO)[t.estado] || ESTADO[t.estado];
  let alCambiar = () => {};

  /* ---------- Categorías (editables en Ajustes) ---------- */
  const categorias = () => { const c = Datos.get('categoriasTickets', null); return Array.isArray(c) && c.length ? c : P.tareas.categorias; };
  const cat = id => categorias().find(c => c.id === id) || categorias().find(c => c.id === 'otras') || { id: 'otras', nombre: 'Otras tareas', color: '#77735c', icono: 'otras' };
  const setCategorias = l => Datos.set('categoriasTickets', l);
  const chipCat = (id, solo = false) => { const c = cat(id); return `<span class="tk-cat${solo ? ' solo' : ''}" style="--cc:${c.color}" title="${esc(c.nombre)}">${icon(c.icono)}${solo ? '' : `<span>${esc(c.nombre)}</span>`}</span>`; };

  /* ---------- Datos ---------- */
  function todas() {
    const crudo = Datos.get('tareas', []), l = crudo.map(MotorTareas.normalizar);
    // Clave T-001… para los tickets que aún no la tienen (antiguos o creados por otros módulos).
    let seq = Datos.get('_ticketSeq', 0), cambio = false;
    seq = Math.max(seq, ...l.map(t => t.clave || 0));
    [...l].sort((a, b) => a.id - b.id).forEach(t => { if (!t.clave) { t.clave = ++seq; cambio = true; } });
    if (cambio) { Datos.set('_ticketSeq', seq); Datos.set('tareas', l); }
    return l;
  }
  const guardar = l => Datos.set('tareas', l);
  const buscar = id => todas().find(x => x.id === id);
  const sigClave = () => { const s = Math.max(Datos.get('_ticketSeq', 0), ...todas().map(t => t.clave || 0)) + 1; Datos.set('_ticketSeq', s); return s; };
  const hist = (t, txt) => { t.historial = [...(t.historial || []), { f: Date.now(), t: txt }].slice(-50); };

  function crear(d) {
    const l = todas();
    const t = MotorTareas.normalizar({ tipo: 'tarea', titulo: '', nota: '', prioridad: 'media', fecha: '', repite: '', estado: 'pendiente', categoria: 'otras', ...d, id: nuevoId(), clave: sigClave(), historial: [] });
    hist(t, t.tipo === 'recordatorio' ? 'Recordatorio creado' : 'Tarea creada');
    l.push(t); guardar(l); return t;
  }
  function editar(id, cambios, txt = '') {
    const l = todas(), t = l.find(x => x.id === id); if (!t) return null;
    Object.assign(t, cambios);
    if (cambios.tipo === 'recordatorio') { t.aviso = true; if (t.estado !== 'terminado') t.estado = 'pendiente'; }
    if (txt) hist(t, txt);
    guardar(l); return t;
  }
  function eliminar(id) { const l = todas(), i = l.findIndex(x => x.id === id); if (i < 0) return null; const [t] = l.splice(i, 1); guardar(l); return t; }
  function restaurar(t) { const l = todas(); l.push(t); guardar(l); }

  /* Cambia el estado. Al pasar a "Hecha", si se repite y tiene fecha, crea la siguiente (solo una: la ocurrencia en curso). */
  function setEstado(id, estado) {
    const l = todas(), t = l.find(x => x.id === id); if (!t) return null;
    if (t.estado === estado) return { ...t, siguiente: null };
    t.estado = estado; t.hecha = estado === 'terminado'; t.hechaEl = t.hecha ? Date.now() : null;
    hist(t, `Estado: ${estadoTxt(t)}`);
    let siguiente = null;
    if (t.hecha && t.repite && t.fecha && !t.siguienteCreada) {
      siguiente = MotorTareas.siguienteFecha(t.fecha, t.repite);
      const n = { ...t, id: nuevoId(), clave: sigClave(), fecha: siguiente, estado: 'pendiente', hecha: false, hechaEl: null, siguienteCreada: false,
        pasos: (t.pasos || []).map(p => ({ ...p, ok: false })), historial: [] };
      hist(n, `Creada al completar ${MotorTareas.clave(t.clave)} (${REPITE[t.repite].toLowerCase()})`);
      l.push(n); t.siguienteCreada = true;
    }
    guardar(l); return { ...t, siguiente };
  }
  const avanzar = id => { const t = buscar(id); return t ? setEstado(id, MotorTareas.siguienteEstado(t.estado, t.tipo)) : null; };
  const alternar = id => { const t = buscar(id); return t ? setEstado(id, t.hecha ? 'pendiente' : 'terminado') : null; };
  function posponer(id, dias, fechaExacta = '') {
    const t = buscar(id); if (!t) return null;
    const f = fechaExacta || MotorTareas.posponer(t.fecha, dias, hoyISO());
    return editar(id, { fecha: f }, `Pospuesta al ${Fecha.corta(Fecha.parse(f))}`);
  }
  const fijar = (id, on) => editar(id, { fijada: on }, on ? 'Fijada' : 'Ya no está fijada');

  /* Vista ordenada (semana, mes, todas, fijadas, recordatorios, archivo) con filtros rápidos. */
  function vista(nombre, filtros = {}) {
    const l = MotorTareas.filtrar(MotorTareas.vista(todas(), nombre, { hoy: hoyISO(), ahora: Date.now() }), filtros);
    return nombre === 'archivo' ? l : MotorTareas.ordenar(l, hoyISO());
  }
  function pendientes() {
    const g = MotorTareas.agrupar(todas().filter(t => !t.hecha), hoyISO());
    return { vencidas: g.vencidas, hoy: g.hoy, proximas: [...g.manana, ...g.semana, ...g.despues], sinFecha: g.sinFecha };
  }
  /* Recordatorios próximos (pendientes, con fecha), para la franja del panel. */
  const recordatorios = () => todas().filter(t => t.tipo === 'recordatorio' && !t.hecha && t.fecha).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const persona = t => { if (!t.empleadoId) return null; if (typeof Empleados === 'undefined' || !Empleados.desbloqueado) return { bloqueada: true }; const e = Empleados.buscar(t.empleadoId); return e ? { nombre: e.nombreCompleto, codigo: e.codigo, e } : null; };

  /* Texto corto de la fecha: Hoy, Mañana, Ayer, lun 26 oct… */
  function cuando(f) {
    if (!f) return 'Sin fecha';
    const d = Fecha.parse(f), dif = Math.round((d - Fecha.hoy()) / DAY);
    return dif === 0 ? 'Hoy' : dif === 1 ? 'Mañana' : dif === -1 ? 'Ayer' : `${Fecha.diaSemana(d).slice(0, 3)} ${Fecha.corta(d)}`;
  }

  /* Mensaje de Ficus al cambiar de estado. */
  function celebrar(r) {
    if (!r) return;
    if (r.estado === 'terminado') Ficus.decir(r.siguiente ? `¡Hecha! La próxima queda para el ${Fecha.corta(Fecha.parse(r.siguiente))}.` : '¡Hecha! Una menos.', 'yay');
    else if (r.estado === 'proceso') Ficus.decir('En marcha. Ánimo, que tú puedes.', 'wave');
    else if (r.estado === 'espera') Ficus.decir('En espera. Yo también espero: a que me rieguen.', 'wave');
  }
  function cambiarEstado(id, estado) {
    const r = estado ? setEstado(id, estado) : avanzar(id); if (!r) return null;
    celebrar(r); if (r.siguiente) toast(`Siguiente repetición creada: ${Fecha.corta(Fecha.parse(r.siguiente))}`);
    alCambiar(); return r;
  }

  /* ---------- Diálogo "Nuevo" ---------- */
  const dlg = $('#taskDlg');
  let tipoNuevo = 'tarea';
  function abrir({ tarea = null, fecha = null, tipo = null, aviso = false } = {}) {
    if (tarea) { detalle(tarea.id); return; }
    tipoNuevo = tipo || 'tarea';
    $('#taskForm').reset();
    $('#tDate').value = fecha || '';
    $('#tCat').innerHTML = categorias().map(c => `<option value="${c.id}">${esc(c.nombre)}</option>`).join('');
    $('#tCat').value = 'otras';
    $('#tAviso').checked = !!aviso || !!fecha && tipoNuevo === 'recordatorio';
    $('#tAnt').innerHTML = ANTELACION.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
    const cajaP = $('#tPersona');
    cajaP.innerHTML = typeof Empleados !== 'undefined' && Empleados.desbloqueado && Empleados.todos().length
      ? SelPersona.campo('tEmp', 'Persona vinculada <span class="muted" style="font-weight:400">(opcional)</span>', { vacio: true, placeholder: 'Busca por código, nombre o departamento…' })
      : '';
    SelPersona.enlazar(cajaP);
    pintarTipo(); colorCat();
    dlg.showModal(); $('#tTitle').focus();
  }
  function pintarTipo() {
    const r = tipoNuevo === 'recordatorio';
    $$('#tTipo button').forEach(b => b.setAttribute('aria-pressed', b.dataset.tipo === tipoNuevo));
    $('#tTipo .thumb').style.transform = r ? 'translateX(100%)' : 'none';
    $('#tdT').textContent = r ? 'Nuevo recordatorio' : 'Nueva tarea';
    $('#tTitle').placeholder = r ? 'p. ej., Vence el contrato temporal de…' : 'p. ej., Enviar los TC a la gestoría';
    $('#tAvisoBox').hidden = r; $('#tAntBox').hidden = !r && !$('#tAviso').checked;
    $('#tDateLbl').innerHTML = r ? 'Fecha' : 'Fecha límite <span class="muted" style="font-weight:400">(opcional)</span>';
    $('#tOk').textContent = r ? 'Crear recordatorio' : 'Crear tarea';
  }
  const colorCat = () => { const c = cat($('#tCat').value); $('#tCatBox').style.setProperty('--cc', c.color); };
  $('#tTipo').addEventListener('click', e => { const b = e.target.closest('[data-tipo]'); if (!b) return; tipoNuevo = b.dataset.tipo; pintarTipo(); });
  $('#tAviso').addEventListener('change', pintarTipo);
  $('#tCat').addEventListener('change', colorCat);
  $$('[data-fecha-rapida]').forEach(b => b.onclick = () => {
    const v = b.dataset.fechaRapida, h = Fecha.hoy();
    $('#tDate').value = v === 'sin' ? '' : v === 'lunes' ? Fecha.iso(h + ((8 - new Date(h).getUTCDay()) % 7 || 7) * DAY) : Fecha.iso(h + Number(v) * DAY);
  });
  dlg.addEventListener('close', () => {
    const v = dlg.returnValue; if (v !== 'ok' && v !== 'abrir') return;
    const titulo = $('#tTitle').value.trim(); if (!titulo) return;
    let fecha = $('#tDate').value || '', repite = $('#tRep').value;
    const rec = tipoNuevo === 'recordatorio';
    if ((repite || rec) && !fecha) { fecha = hoyISO(); toast(rec ? 'Los recordatorios necesitan fecha: se ha puesto hoy' : 'Las tareas que se repiten necesitan fecha: se ha puesto hoy'); }
    const aviso = rec || $('#tAviso').checked;
    const t = crear({ tipo: tipoNuevo, titulo, nota: $('#tNota').value.trim(), prioridad: $('input[name=p]:checked').value, categoria: $('#tCat').value,
      fecha, repite, aviso, antelacion: aviso ? Number($('#tAnt').value) || 0 : 0, fijada: $('#tFij').checked, empleadoId: $('#tEmp')?.value ? Number($('#tEmp').value) : null });
    toast(rec ? 'Recordatorio creado' : `Tarea ${MotorTareas.clave(t.clave)} creada${!fecha && !t.fijada ? ': sin fecha, la verás en «Todas»' : ''}`);
    Ficus.decir('Apuntado. Yo no tengo memoria, pero tú ya lo tienes.', 'yay');
    alCambiar();
    if (v === 'abrir') detalle(t.id);
  });
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close('cancel'); });

  function borrarConDeshacer(id) {
    const t = eliminar(id); if (!t) return;
    if (abierto === id) cerrarDetalle();
    alCambiar();
    toast(`${MotorTareas.clave(t.clave)} eliminada`, { texto: 'Deshacer', fn: () => { restaurar(t); alCambiar(); } });
  }

  /* ---------- Panel de detalle (lateral) ---------- */
  const panel = document.createElement('aside');
  panel.className = 'tkp'; panel.id = 'tkPanel'; panel.setAttribute('aria-labelledby', 'tkpT'); panel.setAttribute('role', 'dialog'); panel.hidden = true;
  document.body.append(panel);
  let abierto = null, volverFoco = null;
  const ORIGEN = {
    docs: ['Alta', 'altas', t => { ModAltas.abrir(t.altaId); location.hash = '#altas'; }],
    reinc: ['Ausencia', 'ausencias', t => ModAusencias.abrir(t.ausenciaId)],
    prueba: ['Periodo de prueba', 'pruebas', t => ModPruebas.abrir(t.pruebaId)],
    salida: ['Salida', 'salidas', () => { location.hash = '#salidas'; }],
    cae: ['Visita de empresa externa', 'cae', t => ModCae.abrirVisita(t.caeVisitaId)]
  };
  function detalle(id) {
    const t = buscar(id); if (!t) return;
    if (abierto === null) volverFoco = document.activeElement;
    abierto = id; pintarDetalle(t);
    panel.hidden = false; requestAnimationFrame(() => panel.classList.add('on'));
    document.body.classList.add('tkp-open');
    $$('.tk-row.sel, .kcard.sel').forEach(x => x.classList.remove('sel'));
    $$(`[data-tk="${id}"]`).forEach(x => x.classList.add('sel'));
    setTimeout(() => $('.tkp-x', panel)?.focus({ preventScroll: true }), 30);
  }
  function cerrarDetalle() {
    if (abierto === null) return;
    abierto = null; panel.classList.remove('on'); document.body.classList.remove('tkp-open');
    $$('.tk-row.sel, .kcard.sel').forEach(x => x.classList.remove('sel'));
    setTimeout(() => { if (abierto === null) panel.hidden = true; }, reduceMotion ? 0 : 220);
    if (volverFoco && document.contains(volverFoco)) volverFoco.focus({ preventScroll: true });
  }
  const sel = (id, opts, val) => `<select id="${id}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  function pintarDetalle(t) {
    const r = t.tipo === 'recordatorio', venc = MotorTareas.vencido(t, hoyISO()), per = persona(t), o = ORIGEN[t.auto];
    const estados = r ? ['pendiente', 'terminado'] : MotorTareas.ESTADOS;
    const hechos = t.pasos.filter(p => p.ok).length;
    panel.innerHTML = `<div class="tkp-in">
      <div class="tkp-h"><span class="tk-key">${MotorTareas.clave(t.clave)}</span><span class="tk-tipo ${t.tipo}">${icon(r ? 'campana' : 'tareas')}${r ? 'Recordatorio' : 'Tarea'}</span>${t.auto ? '<span class="tag">automática</span>' : ''}
        <span class="grow"></span>
        <button class="icon-act tkp-pin" data-a="fijar" aria-pressed="${t.fijada}" title="${t.fijada ? 'Quitar de fijadas' : 'Fijar: siempre a la vista'}" aria-label="${t.fijada ? 'Quitar de fijadas' : 'Fijar'}">${icon('pin')}</button>
        <button class="icon-act tkp-x" data-a="cerrar" aria-label="Cerrar el detalle (Esc)" title="Cerrar (Esc)"><svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
      <label class="sr" for="tkpT">Título</label><textarea id="tkpT" class="tkp-tit" rows="1" maxlength="160">${esc(t.titulo)}</textarea>
      <div class="tkp-est${r ? ' dos' : ''}" role="radiogroup" aria-label="Estado">${estados.map(e => `<button type="button" role="radio" class="st-${e}" data-est="${e}" aria-checked="${t.estado === e}"><i class="est ${e}"></i>${(r ? ESTADO_R : ESTADO)[e]}</button>`).join('')}</div>
      <div class="tkp-acts">
        ${t.hecha ? `<button class="btn sm ghost" data-a="reabrir">${icon('repite')}Reabrir</button>` : `<button class="btn sm" data-a="hecha"><svg class="i" viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>${r ? 'Hecho' : 'Hecha'}</button>
        ${r ? '' : `<button class="btn sm ghost" data-a="sig">Siguiente estado<svg class="i" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>`}
        <span class="tkp-pos"><button class="btn sm ghost" data-a="pos1" title="Posponer 1 día">+1 día</button><button class="btn sm ghost" data-a="pos7" title="Posponer 1 semana">+1 semana</button></span>`}
      </div>
      ${venc ? `<div class="note warn tkp-venc">${icon('info')}<div>Vencida desde el ${Fecha.larga(Fecha.parse(t.fecha))}.</div></div>` : ''}
      <dl class="tkp-props">
        <dt><label for="tkpTipo">Tipo</label></dt><dd>${sel('tkpTipo', [['tarea', 'Tarea'], ['recordatorio', 'Recordatorio']], t.tipo)}</dd>
        <dt><label for="tkpCat">Categoría</label></dt><dd class="tkp-catdd" style="--cc:${cat(t.categoria).color}">${sel('tkpCat', categorias().map(c => [c.id, c.nombre]), t.categoria)}</dd>
        <dt>Importancia</dt><dd><div class="tkp-prio" role="radiogroup" aria-label="Importancia">${['alta', 'media', 'baja'].map(p => `<button type="button" role="radio" data-prio="${p}" aria-checked="${t.prioridad === p}"><i class="prio ${p}"></i>${PRIO[p]}</button>`).join('')}</div></dd>
        <dt><label for="tkpF">${r ? 'Fecha' : 'Fecha límite'}</label></dt><dd class="tkp-fecha"><input type="date" id="tkpF" value="${t.fecha}">${t.fecha && !r ? '<button class="linkbtn" data-a="sinfecha">Quitar</button>' : ''}</dd>
        <dt>Calendario</dt><dd>${r ? '<span class="muted small">Los recordatorios siempre salen en el calendario.</span>' : `<label class="check"><input type="checkbox" id="tkpAv" ${t.aviso ? 'checked' : ''}> Avisar en el calendario</label>`}
          ${t.aviso ? `<div class="tkp-ant"><label for="tkpAnt" class="sr">Antelación del aviso</label>${sel('tkpAnt', ANTELACION, t.antelacion)}</div>` : ''}</dd>
        <dt><label for="tkpRep">Se repite</label></dt><dd>${sel('tkpRep', Object.entries(REPITE), t.repite)}</dd>
        <dt>Persona</dt><dd id="tkpPer">${per?.bloqueada ? `<span class="muted small">Persona vinculada · <button class="linkbtn" data-a="desbloquear">desbloquea</button> para ver quién</span>`
          : typeof Empleados !== 'undefined' && Empleados.desbloqueado && Empleados.todos().length ? SelPersona.campo('tkpEmp', '', { valor: t.empleadoId, vacio: true, placeholder: 'Sin persona vinculada' })
          : '<span class="muted small">Desbloquea Empleados para vincular a una persona.</span>'}${per && !per.bloqueada ? `<button class="linkbtn" data-a="ficha">Ver ficha</button>` : ''}</dd>
        ${o ? `<dt>Origen</dt><dd><button class="linkbtn tkp-or" data-a="origen">${icon(o[1])}${o[0]}</button></dd>` : ''}
      </dl>
      <div class="tkp-sec"><label for="tkpN">Notas</label><textarea id="tkpN" rows="3" maxlength="2000" placeholder="Detalles, a quién afecta, enlaces…">${esc(t.nota)}</textarea></div>
      <div class="tkp-sec"><div class="tkp-sec-h"><span>Pasos</span>${t.pasos.length ? `<span class="muted small">${hechos} de ${t.pasos.length}</span>` : ''}</div>
        ${t.pasos.length ? `<div class="tkp-bar"><i style="width:${hechos / t.pasos.length * 100}%"></i></div>` : ''}
        <div class="tkp-pasos">${t.pasos.map((p, i) => `<div class="tkp-paso">${casilla(`data-paso="${i}"`, p.ok, esc(p.t))}<button class="icon-act" data-quitar-paso="${i}" aria-label="Quitar el paso ${esc(p.t)}" title="Quitar"><svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>`).join('')}</div>
        <form class="tkp-add" id="tkpAddPaso"><input id="tkpPaso" maxlength="140" placeholder="Añadir un paso y pulsar Intro" aria-label="Nuevo paso"><button class="btn sm ghost">Añadir</button></form></div>
      <details class="tkp-sec tkp-hist"><summary>Historial <span class="muted small">${t.historial.length}</span></summary>
        <ul>${[...t.historial].reverse().map(h => `<li><time>${new Date(h.f).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>${esc(h.t)}</li>`).join('') || '<li class="muted">Sin cambios registrados.</li>'}</ul></details>
      <div class="tkp-f"><button class="btn ghost sm danger" data-a="borrar">Eliminar</button>${t.fecha ? `<button class="btn ghost sm" data-a="ics">${icon('calendario')}Añadir a mi calendario</button>` : ''}</div>
    </div>`;
    const tit = $('#tkpT', panel); const ajustar = () => { if (panel.hidden) return; tit.style.height = 'auto'; tit.style.height = Math.max(tit.scrollHeight, 34) + 'px'; };
    ajustar(); requestAnimationFrame(ajustar);
    tit.addEventListener('input', ajustar);
    SelPersona.enlazar(panel);
  }
  /* Guarda un cambio desde el panel, repinta el panel y la pantalla de detrás. */
  const cambiarDesdePanel = (cambios, txt) => { editar(abierto, cambios, txt); const t = buscar(abierto); if (t) pintarDetalle(t); alCambiar(); };
  panel.addEventListener('click', async e => {
    const t = buscar(abierto); if (!t) return;
    const est = e.target.closest('[data-est]'); if (est) { cambiarEstado(t.id, est.dataset.est); repintarPanel(); return; }
    const pr = e.target.closest('[data-prio]'); if (pr) { cambiarDesdePanel({ prioridad: pr.dataset.prio }, `Importancia: ${PRIO[pr.dataset.prio].toLowerCase()}`); return; }
    const paso = e.target.closest('[data-paso]'); if (paso) { const i = Number(paso.dataset.paso), pasos = t.pasos.map((p, j) => j === i ? { ...p, ok: !p.ok } : p); if (pasos[i].ok) burbuja(paso); setTimeout(() => cambiarDesdePanel({ pasos }, `${pasos[i].ok ? 'Paso hecho' : 'Paso pendiente'}: ${pasos[i].t}`), pasos[i].ok && !reduceMotion ? 260 : 0); return; }
    const qp = e.target.closest('[data-quitar-paso]'); if (qp) { const i = Number(qp.dataset.quitarPaso); cambiarDesdePanel({ pasos: t.pasos.filter((_, j) => j !== i) }, `Paso quitado: ${t.pasos[i].t}`); return; }
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    if (a === 'cerrar') cerrarDetalle();
    else if (a === 'fijar') cambiarDesdePanel({ fijada: !t.fijada }, t.fijada ? 'Ya no está fijada' : 'Fijada');
    else if (a === 'hecha') { cambiarEstado(t.id, 'terminado'); repintarPanel(); }
    else if (a === 'reabrir') { cambiarEstado(t.id, 'pendiente'); repintarPanel(); }
    else if (a === 'sig') { cambiarEstado(t.id); repintarPanel(); }
    else if (a === 'pos1' || a === 'pos7') { posponer(t.id, a === 'pos1' ? 1 : 7); toast(`Pospuesta al ${Fecha.corta(Fecha.parse(buscar(t.id).fecha))}`); repintarPanel(); alCambiar(); }
    else if (a === 'sinfecha') cambiarDesdePanel({ fecha: '' }, 'Sin fecha');
    else if (a === 'borrar') borrarConDeshacer(t.id);
    else if (a === 'ics') descargarIcs([t], 'ticket-' + MotorTareas.clave(t.clave));
    else if (a === 'origen') { cerrarDetalle(); ORIGEN[t.auto]?.[2](t); }
    else if (a === 'ficha') { const id = t.empleadoId; cerrarDetalle(); ModEmpleados.abrir(id); if (location.hash === '#empleados') Shell.refrescar(); else location.hash = '#empleados'; }
    else if (a === 'desbloquear') { if (await ModAltas.pedirPassword()) { Shell.pintarNav(); repintarPanel(); alCambiar(); } }
  });
  panel.addEventListener('change', e => {
    const t = buscar(abierto); if (!t) return;
    const id = e.target.id;
    if (id === 'tkpT') { const v = e.target.value.trim(); if (v && v !== t.titulo) cambiarDesdePanel({ titulo: v }, 'Título cambiado'); else e.target.value = t.titulo; }
    else if (id === 'tkpN') { if (e.target.value.trim() !== t.nota) cambiarDesdePanel({ nota: e.target.value.trim() }, 'Notas editadas'); }
    else if (id === 'tkpTipo') { const r = e.target.value === 'recordatorio'; cambiarDesdePanel({ tipo: e.target.value, ...(r && !t.fecha ? { fecha: hoyISO() } : {}), ...(r ? { aviso: true } : {}) }, r ? 'Pasa a recordatorio' : 'Pasa a tarea'); }
    else if (id === 'tkpCat') cambiarDesdePanel({ categoria: e.target.value }, `Categoría: ${cat(e.target.value).nombre}`);
    else if (id === 'tkpF') { const f = e.target.value; if (!f && (t.tipo === 'recordatorio' || t.repite)) { e.target.value = t.fecha; toast('Necesita fecha'); return; } cambiarDesdePanel({ fecha: f }, f ? `Fecha: ${Fecha.corta(Fecha.parse(f))}` : 'Sin fecha'); }
    else if (id === 'tkpAv') cambiarDesdePanel({ aviso: e.target.checked }, e.target.checked ? 'Avisa en el calendario' : 'Sin aviso en el calendario');
    else if (id === 'tkpAnt') cambiarDesdePanel({ antelacion: Number(e.target.value) }, `Aviso: ${ANTELACION.find(x => x[0] === Number(e.target.value))?.[1].toLowerCase()}`);
    else if (id === 'tkpRep') { const v = e.target.value; cambiarDesdePanel({ repite: v, ...(v && !t.fecha ? { fecha: hoyISO() } : {}) }, v ? REPITE[v] : 'Ya no se repite'); }
    else if (id === 'tkpEmp') cambiarDesdePanel({ empleadoId: e.target.value ? Number(e.target.value) : null }, e.target.value ? 'Persona vinculada' : 'Sin persona vinculada');
  });
  panel.addEventListener('submit', e => {
    e.preventDefault(); const t = buscar(abierto), v = $('#tkpPaso', panel).value.trim(); if (!t || !v) return;
    cambiarDesdePanel({ pasos: [...t.pasos, { t: v, ok: false }] }, `Paso añadido: ${v}`); $('#tkpPaso', panel).focus();
  });
  panel.addEventListener('keydown', e => { if (e.key === 'Escape' && !e.target.closest('.selp')) { e.preventDefault(); cerrarDetalle(); } if (e.key === 'Enter' && e.target.id === 'tkpT') { e.preventDefault(); e.target.blur(); } });
  addEventListener('keydown', e => { if (e.key === 'Escape' && abierto !== null && !document.querySelector('dialog[open]') && !panel.contains(e.target)) cerrarDetalle(); });
  const repintarPanel = () => { const t = abierto !== null && buscar(abierto); if (t) pintarDetalle(t); else cerrarDetalle(); };
  addEventListener('hashchange', () => cerrarDetalle());

  /* ---------- Modo "Una a una" ---------- */
  const foco = document.createElement('dialog');
  foco.className = 'tkf'; foco.setAttribute('aria-label', 'Revisar una a una');
  document.body.append(foco);
  let cola = [], pos = 0, res = { hechas: 0, pospuestas: 0, saltadas: 0, avanzadas: 0 }, focoTitulo = '';
  function unaAUna(ids, titulo = 'Tus tickets') {
    if (!ids.length) { toast('No hay tickets pendientes en esta vista'); return; }
    cola = ids; pos = 0; res = { hechas: 0, pospuestas: 0, saltadas: 0, avanzadas: 0 }; focoTitulo = titulo;
    pintarFoco(); foco.showModal();
  }
  function pintarFoco(dir = 0) {
    if (pos >= cola.length) {
      foco.innerHTML = `<div class="tkf-in"><div class="tkf-fin"><span class="tkf-ok">✓</span><h2>Revisión terminada</h2>
        <p>${cola.length} ticket${cola.length === 1 ? '' : 's'} revisado${cola.length === 1 ? '' : 's'} de «${esc(focoTitulo)}».</p>
        <ul class="tkf-res"><li><b>${res.hechas}</b>hechos</li><li><b>${res.avanzadas}</b>avanzados</li><li><b>${res.pospuestas}</b>pospuestos</li><li><b>${res.saltadas}</b>saltados</li></ul>
        <button class="btn" data-f="cerrar">Cerrar</button></div></div>`;
      $('[data-f=cerrar]', foco).focus(); return;
    }
    const t = buscar(cola[pos]); if (!t) { pos++; pintarFoco(dir); return; }
    const r = t.tipo === 'recordatorio', venc = MotorTareas.vencido(t, hoyISO()), per = persona(t), hechos = t.pasos.filter(p => p.ok).length, c = cat(t.categoria);
    foco.innerHTML = `<div class="tkf-in">
      <div class="tkf-top"><span class="tkf-tit">${icon('foco')}Una a una · ${esc(focoTitulo)}</span><span class="tkf-n">${pos + 1} de ${cola.length}</span><button class="icon-act" data-f="cerrar" aria-label="Salir (Esc)" title="Salir (Esc)"><svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
      <div class="tkf-bar"><i style="width:${pos / cola.length * 100}%"></i></div>
      <article class="tkf-card${dir ? ' entra' : ''}" style="--cc:${c.color}">
        <div class="tkf-meta"><span class="tk-key">${MotorTareas.clave(t.clave)}</span>${chipCat(t.categoria)}<span class="tk-tipo ${t.tipo}">${icon(r ? 'campana' : 'tareas')}${r ? 'Recordatorio' : 'Tarea'}</span>${t.fijada ? `<span class="tk-pinned" title="Fijada">${icon('pin')}</span>` : ''}</div>
        <h2>${esc(t.titulo)}</h2>
        <div class="tkf-datos"><span class="${venc ? 'late-txt' : ''}">${icon('calendario')}${t.fecha ? `${cuando(t.fecha)}${venc ? ' · vencida' : ''}` : 'Sin fecha'}</span><span><i class="prio ${t.prioridad}"></i>Importancia ${t.prioridad}</span><span><i class="est ${t.estado}"></i>${estadoTxt(t)}</span>${per && !per.bloqueada ? `<span>${icon('empleados')}${esc(per.nombre)}</span>` : ''}${t.repite ? `<span>${icon('repite')}${REPITE[t.repite]}</span>` : ''}</div>
        ${t.nota ? `<p class="tkf-nota">${esc(t.nota)}</p>` : ''}
        ${t.pasos.length ? `<div class="tkf-pasos"><div class="tkp-bar"><i style="width:${hechos / t.pasos.length * 100}%"></i></div><span class="muted small">${hechos} de ${t.pasos.length} pasos</span></div>` : ''}
      </article>
      <div class="tkf-acts">
        <button class="btn tkf-main" data-f="hecha"><svg class="i" viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>${r ? 'Hecho' : 'Hecha'}<kbd>H</kbd></button>
        ${r ? '' : `<button class="btn ghost" data-f="sig">${t.estado === 'pendiente' ? 'Empezar' : t.estado === 'espera' ? 'Retomar' : 'Siguiente estado'}<kbd>E</kbd></button>${t.estado !== 'espera' ? '<button class="btn ghost" data-f="espera">En espera</button>' : ''}`}
        <button class="btn ghost" data-f="pos1">+1 día<kbd>P</kbd></button><button class="btn ghost" data-f="pos7">+1 semana</button>
        <button class="btn ghost" data-f="saltar">Saltar<kbd>→</kbd></button>
        <button class="linkbtn" data-f="detalle">Abrir el detalle</button>
      </div></div>`;
    $('[data-f=hecha]', foco).focus();
  }
  function accionFoco(a) {
    const t = buscar(cola[pos]);
    if (a === 'cerrar') { foco.close(); return; }
    if (!t) { pos++; pintarFoco(1); return; }
    if (a === 'detalle') { foco.close(); detalle(t.id); return; }
    if (a === 'hecha') { const r = setEstado(t.id, 'terminado'); res.hechas++; if (r?.siguiente) toast(`Siguiente repetición: ${Fecha.corta(Fecha.parse(r.siguiente))}`); }
    else if (a === 'sig') { setEstado(t.id, MotorTareas.siguienteEstado(t.estado, t.tipo)); res.avanzadas++; }
    else if (a === 'espera') { setEstado(t.id, 'espera'); res.avanzadas++; }
    else if (a === 'pos1' || a === 'pos7') { posponer(t.id, a === 'pos1' ? 1 : 7); res.pospuestas++; }
    else if (a === 'saltar') res.saltadas++;
    pos++; pintarFoco(1); alCambiar();
  }
  foco.addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) accionFoco(b.dataset.f); else if (e.target === foco) foco.close(); });
  foco.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey || pos >= cola.length) return;
    const k = e.key.toLowerCase(), t = buscar(cola[pos]);
    const m = { h: 'hecha', p: 'pos1', arrowright: 'saltar' }; if (t && t.tipo !== 'recordatorio') m.e = 'sig';
    if (m[k]) { e.preventDefault(); accionFoco(m[k]); }
  });
  foco.addEventListener('close', () => { alCambiar(); Shell.pintarNav(); });

  /* ---------- Exportar al calendario (.ics) ---------- */
  function descargarIcs(lista, nombre = 'tareas') {
    if (!lista.length) { toast('No hay tickets con fecha para exportar'); return; }
    const blob = new Blob([MotorTareas.ics(lista)], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${nombre}.ics`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Archivo de calendario descargado: ábrelo para añadirlo a Outlook o Google');
  }

  /* ---------- Avisos del sistema (solo con la plataforma abierta) ---------- */
  const avisosOn = () => Datos.get('avisosTareas', false) && 'Notification' in window && Notification.permission === 'granted';
  async function activarAvisos() {
    if (!('Notification' in window)) { toast('Este navegador no permite avisos'); return false; }
    const p = await Notification.requestPermission();
    Datos.set('avisosTareas', p === 'granted');
    toast(p === 'granted' ? 'Avisos activados' : 'El navegador no ha dado permiso para avisos');
    if (p === 'granted') comprobarAvisos(true);
    return p === 'granted';
  }
  function desactivarAvisos() { Datos.set('avisosTareas', false); toast('Avisos desactivados'); }
  function comprobarAvisos(forzar = false) {
    if (!avisosOn()) return;
    const hoy = hoyISO();
    if (!forzar && Datos.get('_avisoDia') === hoy) return;
    const l = todas(), p = pendientes(), av = l.filter(t => MotorTareas.avisando(t, hoy) && t.fecha > hoy).length, n = p.hoy.length + p.vencidas.length + av;
    if (!n) return;
    try {
      const notif = new Notification('Plataforma RRHH', { body: `${p.hoy.length} para hoy · ${p.vencidas.length} vencida${p.vencidas.length === 1 ? '' : 's'}${av ? ` · ${av} aviso${av === 1 ? '' : 's'} próximo${av === 1 ? '' : 's'}` : ''}`, tag: 'tareas-' + hoy });
      notif.onclick = () => { window.focus(); location.hash = '#tareas'; };
      Datos.set('_avisoDia', hoy);
    } catch (e) {}
  }
  setInterval(() => comprobarAvisos(), 30 * 60 * 1000);

  return {
    REPITE, PRIO, ESTADO, ESTADO_R, ANTELACION, estadoTxt, categorias, cat, setCategorias, chipCat, cuando, persona,
    todas, buscar, crear, editar, eliminar, restaurar, alternar, avanzar, setEstado, cambiarEstado, posponer, fijar, celebrar,
    vista, pendientes, recordatorios, abrir, detalle, cerrarDetalle, unaAUna, borrarConDeshacer,
    descargarIcs, activarAvisos, desactivarAvisos, comprobarAvisos,
    get abierto() { return abierto; },
    get avisosActivos() { return avisosOn(); },
    alCambiar(fn) { alCambiar = fn; }
  };
})();
