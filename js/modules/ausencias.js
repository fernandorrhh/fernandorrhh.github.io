/* Seguimiento de ausencias (bajas, nacimiento, excedencias, reducciones, permisos). Motor: engines/ausencias.js · datos: core/ausencias.js */
const ModAusencias = (() => {
  const P = window.RRHH_PARAMS, C = P.ausencias;
  let filtro = 'curso', fTipo = '', fEmp = null, pendienteAbrir = null;
  const hoyISO = () => Fecha.iso(Fecha.hoy());
  const f = s => s ? Fecha.larga(Fecha.parse(s)) : '—';
  const EST_CLS = { 'en-curso': 'ae-en-proceso', programada: 'ae-sin-iniciar', 'sin-confirmar': 'ae-bloqueada', finalizada: 'ae-cerrada' };
  const chip = e => `<span class="achip ${EST_CLS[e]}">${MotorAusencias.ESTADOS[e]}</span>`;

  /* Abre la pantalla filtrada por un empleado (desde su ficha) o con una ausencia abierta. */
  function deEmpleado(id) { fEmp = id; filtro = 'todas'; if (location.hash === '#ausencias') Shell.refrescar(); else location.hash = '#ausencias'; }
  function abrir(id) { pendienteAbrir = id; location.hash = '#ausencias'; }

  async function render(main) {
    if (!Empleados.configurado()) {
      main.innerHTML = `<div class="view"><div class="page-h"><a class="crumb" href="#inicio">← Inicio</a><h1>Ausencias</h1></div>
        <div class="note">${icon('info')}<div>Las ausencias se guardan dentro de la base cifrada de empleados. <a href="#empleados">Crea primero la base de empleados</a>.</div></div></div>`;
      return;
    }
    if (!Empleados.desbloqueado) {
      main.innerHTML = `<div class="view"><div class="page-h"><a class="crumb" href="#inicio">← Inicio</a><h1>Ausencias</h1><p>Bajas, permisos por nacimiento, excedencias, reducciones de jornada y otros permisos largos.</p></div>
        <div class="card lock-card"><div class="lock-ico">${icon('empleados')}</div><h2>Datos protegidos</h2><p class="muted">Las ausencias van cifradas junto a la base de empleados.</p><button class="btn" id="ausUnlock">Desbloquear</button></div></div>`;
      $('#ausUnlock').onclick = async () => { if (await ModAltas.pedirPassword()) render(main); };
      return;
    }
    const hoy = hoyISO(), todas = Ausencias.todas();
    const ausentes = MotorAusencias.ausentesEn(todas, hoy, C.tipos, hoy);
    const vuelven = MotorAusencias.proximasVueltas(todas, hoy, 30);
    const sinConf = todas.filter(a => MotorAusencias.estado(a, hoy) === 'sin-confirmar');
    const reducciones = todas.filter(a => Ausencias.tipo(a.tipo).ausencia === false && MotorAusencias.estado(a, hoy) === 'en-curso');
    const emp = fEmp ? Empleados.buscar(fEmp) : null;
    main.innerHTML = `<div class="view">
      <div class="page-h page-h-row"><div><a class="crumb" href="#inicio">← Inicio</a><h1>Ausencias</h1><p>Bajas, nacimiento, excedencias, reducciones y permisos largos: quién falta, cuándo vuelve y qué te toca hacer.</p></div>
        <button class="btn" id="ausNueva"><svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Nueva ausencia</button></div>
      <div class="aus-stats">
        <div class="stat hl"><small>Ausentes hoy</small><b>${ausentes.length}</b><span class="sub">${ausentes.slice(0, 3).map(a => esc(a.empleado.split(' ')[0])).join(', ') || 'Nadie'}${ausentes.length > 3 ? '…' : ''}</span></div>
        <div class="stat"><small>Vuelven en 30 días</small><b>${vuelven.length}</b><span class="sub">${vuelven[0] ? `Próxima: ${esc(vuelven[0].empleado.split(' ')[0])}, ${Fecha.corta(Fecha.parse(MotorAusencias.vueltaPrevista(vuelven[0])))}` : '—'}</span></div>
        <div class="stat${sinConf.length ? ' warn' : ''}"><small>Vuelta sin confirmar</small><b>${sinConf.length}</b><span class="sub">${sinConf.length ? 'Confirma si ya han vuelto' : 'Todo al día'}</span></div>
        <div class="stat"><small>Reducciones activas</small><b>${reducciones.length}</b><span class="sub">De jornada</span></div>
      </div>
      <div class="toolbar aus-tools">
        <div class="seg3" role="group" aria-label="Mostrar">${[['curso', 'Activas'], ['finalizadas', 'Finalizadas'], ['todas', 'Todas']].map(([k, n]) => `<button data-af="${k}" aria-pressed="${filtro === k}">${n}</button>`).join('')}</div>
        <div class="field sel"><label for="ausTipo" class="sr">Tipo</label><select id="ausTipo"><option value="">Todos los tipos</option>${C.tipos.map(t => `<option value="${t.id}" ${fTipo === t.id ? 'selected' : ''}>${esc(t.nombre)}</option>`).join('')}</select></div>
        ${emp ? `<span class="emp-filtro">${esc(emp.nombreCompleto)}<button class="icon-act" id="ausQuitarEmp" aria-label="Quitar filtro de persona" title="Quitar filtro"><svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></span>` : ''}
      </div>
      <div id="ausList" class="aus-list"></div>
      ${Calc.legal('Cómo funciona', `
        <p><b>Privacidad:</b> las ausencias se guardan cifradas dentro de la ficha de cada persona. Solo el tipo, las fechas y una nota breve: <b>nunca el diagnóstico</b>. Con la base bloqueada, el calendario muestra "Ausencia" sin nombre.</p>
        <p><b>Aviso de reincorporación:</b> se crea una tarea ${C.avisoDias} días antes de la vuelta prevista (el día siguiente al último día previsto). Si pasa la fecha y no confirmas la vuelta, la ausencia queda en "Vuelta sin confirmar".</p>
        <p style="margin:0"><b>Vacaciones:</b> las excedencias y los permisos no retribuidos no generan vacaciones: se restan solos en las calculadoras de vacaciones y finiquito.</p>`)}
    </div>`;
    pintarLista(main);
    $('#ausNueva').onclick = () => formulario(main, { empleadoId: fEmp });
    $$('[data-af]', main).forEach(b => b.onclick = () => { filtro = b.dataset.af; $$('[data-af]', main).forEach(x => x.setAttribute('aria-pressed', x === b)); pintarLista(main); });
    $('#ausTipo').onchange = e => { fTipo = e.target.value; pintarLista(main); };
    $('#ausQuitarEmp') && ($('#ausQuitarEmp').onclick = () => { fEmp = null; render(main); });
    if (pendienteAbrir) { const a = Ausencias.buscar(pendienteAbrir); pendienteAbrir = null; if (a) formulario(main, a); }
  }

  function pintarLista(main) {
    const hoy = hoyISO();
    let l = Ausencias.todas().map(a => ({ ...a, est: MotorAusencias.estado(a, hoy) }));
    if (filtro === 'curso') l = l.filter(a => a.est !== 'finalizada'); else if (filtro === 'finalizadas') l = l.filter(a => a.est === 'finalizada');
    if (fTipo) l = l.filter(a => a.tipo === fTipo);
    if (fEmp) l = l.filter(a => a.empleadoId === fEmp);
    const ord = { 'sin-confirmar': 0, 'en-curso': 1, programada: 2, finalizada: 3 };
    l.sort((a, b) => ord[a.est] - ord[b.est] || (a.est === 'finalizada' ? b.desde.localeCompare(a.desde) : a.desde.localeCompare(b.desde)));
    const box = $('#ausList', main);
    if (!l.length) { box.innerHTML = `<div class="empty-mini"><p class="muted">${filtro === 'curso' ? 'No hay ausencias activas. ¡Plantilla completa!' : 'No hay ausencias con estos filtros.'}</p></div>`; return; }
    box.innerHTML = l.map((a, i) => {
      const t = Ausencias.tipo(a.tipo), d = MotorAusencias.dias(a, hoy), vuelta = MotorAusencias.vueltaPrevista(a);
      const pct = d.previstos ? Math.min(1, d.transcurridos / d.previstos) : null;
      const acc = t.acciones || [], hechas = acc.filter((_, j) => a.acciones?.[j]).length;
      return `<button class="aus-card" data-aus="${a.id}" style="--tc:${t.color};--i:${Math.min(i, 8)}">
        <span class="aus-top"><span class="avatar">${esc(((a.empleado || '?').split(' ').map(x => x[0]).slice(0, 2).join('')).toUpperCase())}</span>
          <span class="aus-who"><b>${esc(a.empleado)}</b><small>${esc(t.nombre)}${a.subtipo ? ' · ' + esc(a.subtipo) : ''}${a.porcentaje ? ` · ${String(a.porcentaje).replace('.', ',')} %` : ''}</small></span>${chip(a.est)}</span>
        <span class="aus-dates"><span>${f(a.desde)} → ${a.finReal ? f(a.finReal) : a.hastaPrevista ? f(a.hastaPrevista) : 'sin fecha de fin'}</span>
          <span class="muted">${a.finReal ? `${d.transcurridos} días` : vuelta ? (t.ausencia === false ? `Termina el ${f(a.hastaPrevista)}` : `Vuelve el ${f(vuelta)}`) : `${d.transcurridos} días hasta hoy`}</span></span>
        ${pct !== null && a.est !== 'programada' ? `<span class="ac-bar"><i style="transform:scaleX(${pct});--a:var(--tc)"></i></span>` : ''}
        <span class="aus-foot">${t.nomina ? '<span class="tag nom">Afecta a nómina</span>' : ''}${acc.length ? `<span class="tag">${hechas}/${acc.length} acciones</span>` : ''}${Ausencias.tareaDe(a.id) && a.est !== 'finalizada' ? '<span class="tag">Aviso creado</span>' : ''}</span>
      </button>`;
    }).join('');
    $$('[data-aus]', box).forEach(b => b.onclick = () => { const a = Ausencias.buscar(Number(b.dataset.aus)); if (a) formulario(main, a); });
  }

  /* Alta y edición de una ausencia (ventana). */
  function formulario(main, a0 = {}) {
    const editando = !!a0.id, hoy = hoyISO();
    const lista = MotorEmpleados.filtrar(Empleados.todos(), { estado: editando ? 'todos' : 'activos', hoy });
    if (!lista.length) { toast('Primero añade empleados'); return; }
    let a = { tipo: 'it', desde: hoy, hastaPrevista: '', finReal: '', subtipo: '', porcentaje: '', nota: '', acciones: {}, ...a0 };
    const tipoSel = () => Ausencias.tipo(a.tipo);
    const d = abrirModal(`<form id="ausF" novalidate><div class="dlg-b">
      <h2 style="font-size:20px;font-weight:600;margin:0 0 14px">${editando ? 'Ausencia' : 'Nueva ausencia'}</h2>
      ${SelPersona.campo('aEmp', 'Persona', { valor: a.empleadoId, ids: lista.map(e => e.id) })}
      <div class="row2"><div class="field"><label for="aTipo">Tipo</label><select id="aTipo">${C.tipos.map(t => `<option value="${t.id}" ${a.tipo === t.id ? 'selected' : ''}>${esc(t.nombre)}</option>`).join('')}</select></div>
        <div class="field" id="aSubBox"></div></div>
      <div class="row2"><div class="field"><label for="aDesde">Primer día</label><input type="date" id="aDesde" value="${a.desde}"></div>
        <div class="field"><label for="aHasta">Último día previsto <span class="muted" style="font-weight:400">(si se sabe)</span></label><input type="date" id="aHasta" value="${a.hastaPrevista || ''}"><div class="hint" id="aVuelta"></div></div></div>
      <div class="field" id="aPctBox"><label for="aPct">Reducción (%)</label><input id="aPct" inputmode="decimal" value="${a.porcentaje || ''}" placeholder="p. ej. 12,5"></div>
      <div class="field"><label for="aNota">Nota <span class="muted" style="font-weight:400">(sin datos de salud)</span></label><input id="aNota" maxlength="140" value="${esc(a.nota || '')}" placeholder="p. ej. Parte de baja recibido el lunes"></div>
      <div id="aAcc"></div>
      ${editando ? `<div class="vuelta-box"><div class="field" style="margin:0"><label for="aFin">${tipoSel().ausencia === false ? 'Último día real' : 'Ha vuelto: último día de ausencia'}</label><input type="date" id="aFin" value="${a.finReal || ''}"></div>
        ${a.finReal ? '' : `<button type="button" class="btn ghost sm" id="aVolvio">${a.hastaPrevista && a.hastaPrevista < hoy ? (tipoSel().ausencia === false ? 'Terminó en la fecha prevista' : 'Volvió en la fecha prevista') : (tipoSel().ausencia === false ? 'Terminó ayer' : 'Vuelve hoy')}</button>`}</div>` : ''}
      <p class="form-err" id="aErr" role="alert"></p>
    </div>
    <div class="dlg-f">${editando ? '<button type="button" class="btn ghost danger" id="aDel" style="margin-right:auto">Eliminar</button>' : ''}<button type="button" class="btn ghost" id="aCancel">Cancelar</button><button class="btn">${editando ? 'Guardar' : 'Crear ausencia'}</button></div></form>`, { ancho: 620 });

    SelPersona.enlazar(d);
    function pintarTipo() {
      const t = tipoSel();
      $('#aSubBox', d).innerHTML = t.subtipos ? `<label for="aSub">Detalle</label><select id="aSub"><option value="">—</option>${t.subtipos.map(s => `<option ${a.subtipo === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>` : '';
      $('#aPctBox', d).hidden = !t.conPorcentaje;
      $('#aAcc', d).innerHTML = `<div class="aus-acc"><span class="flabel">Qué te toca hacer${t.nomina ? ' <span class="tag nom">Afecta a nómina</span>' : ''}</span>
        <ul class="pasos">${t.acciones.map((x, j) => `<li><button type="button" class="paso${a.acciones?.[j] ? ' on' : ''}" role="checkbox" aria-checked="${!!a.acciones?.[j]}" data-acc="${j}"><span class="box"><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg></span>${esc(x)}</button></li>`).join('')}</ul>
        ${t.nota ? `<p class="muted small" style="margin:8px 0 0">${esc(t.nota)}</p>` : ''}</div>`;
      $$('[data-acc]', d).forEach(b => b.onclick = () => {
        const j = b.dataset.acc, on = !b.classList.contains('on'); a.acciones = { ...(a.acciones || {}), [j]: on };
        b.classList.toggle('on', on); b.setAttribute('aria-checked', on); if (on) burbuja(b);
      });
      vuelta();
    }
    function vuelta() { const h = $('#aHasta', d).value; $('#aVuelta', d).textContent = h ? `${tipoSel().ausencia === false ? `Termina el ${f(h)}` : `Vuelve el ${f(MotorAusencias.sumar(h, 1))}`} · aviso el ${f(MotorAusencias.sumar(h, 1 - C.avisoDias))}` : 'Sin fecha: no se crea aviso.'; }
    $('#aTipo', d).onchange = e => { a.tipo = e.target.value; a.subtipo = ''; a.acciones = {}; pintarTipo(); };
    $('#aHasta', d).oninput = vuelta;
    $('#aCancel', d).onclick = () => d.close('cancel');
    $('#aVolvio', d) && ($('#aVolvio', d).onclick = () => { const h = $('#aHasta', d).value, ayer = MotorAusencias.sumar(hoy, -1); $('#aFin', d).value = h && h < hoy ? h : (ayer < $('#aDesde', d).value ? $('#aDesde', d).value : ayer); });
    $('#aDel', d) && ($('#aDel', d).onclick = async () => {
      const q = await Ausencias.eliminar(a.empleadoId, a.id); d.close('ok'); render(main); Shell.pintarNav();
      toast('Ausencia eliminada', { texto: 'Deshacer', fn: async () => { await Ausencias.restaurar(q); render(main); } });
    });
    $('#ausF', d).onsubmit = async ev => {
      ev.preventDefault();
      const datos = { id: a.id, empleadoId: Number($('#aEmp', d).value), tipo: a.tipo, subtipo: $('#aSub', d)?.value || '', desde: $('#aDesde', d).value, hastaPrevista: $('#aHasta', d).value,
        finReal: $('#aFin', d)?.value || '', porcentaje: tipoSel().conPorcentaje ? (Calc.num($('#aPct', d).value) ?? '') : '', nota: $('#aNota', d).value.trim(), acciones: a.acciones || {} };
      if (!datos.empleadoId) { $('#aErr', d).textContent = 'Elige a la persona.'; $('#aEmp-q', d).focus(); return; }
      const err = MotorAusencias.validar(datos); if (err.length) { $('#aErr', d).textContent = err.join(' · '); return; }
      const { empleadoId, ...resto } = datos;
      await Ausencias.guardar(empleadoId, { ...resto, _antes: editando ? a0.empleadoId : null });
      d.close('ok'); toast(editando ? 'Ausencia actualizada' : `Ausencia creada${datos.hastaPrevista && !datos.finReal ? ' · aviso de vuelta en tareas' : ''}`);
      Shell.pintarNav(); render(main);
    };
    pintarTipo();
  }

  /* Efecto burbuja (mismo que en las altas). */
  function burbuja(b) {
    if (reduceMotion) return;
    const box = $('.box', b); box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
    const w = document.createElement('span'); w.className = 'burst'; w.setAttribute('aria-hidden', 'true');
    w.innerHTML = '<i class="bring"></i>' + Array.from({ length: 8 }, (_, i) => `<i class="dot" style="--a:${i * 45}deg;--d:${18 + Math.random() * 8}px"></i>`).join('');
    box.append(w); setTimeout(() => { w.remove(); box.classList.remove('pop'); }, 700);
  }

  return { render, deEmpleado, abrir };
})();
