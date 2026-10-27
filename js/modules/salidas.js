/* Bajas y salidas: lista de pasos de salida, preaviso, finiquito y cierre (pasa la fecha y el motivo a la ficha). */
const ModSalidas = (() => {
  const P = window.RRHH_PARAMS, PASOS = P.procesos.salida;
  let filtro = 'curso';
  const hoyISO = () => Fecha.iso(Fecha.hoy());
  const f = s => s ? Fecha.larga(Fecha.parse(s)) : '—';
  const EST = { 'en-curso': ['En curso', 'ae-en-proceso'], atrasada: ['Baja pasada con pasos pendientes', 'ae-bloqueada'], completada: ['Lista para cerrar', 'ae-completada'], cerrada: ['Cerrada', 'ae-cerrada'] };

  function render(main) {
    if (!Empleados.configurado() || !Empleados.desbloqueado) return pantallaBloqueo(main, 'Bajas y salidas', 'Los pasos de cada salida: comunicación, preaviso, liquidación, finiquito, Seguridad Social y material.', () => render(main));
    const hoy = hoyISO(), l = Procesos.Salidas.todas().map(s => ({ ...s, est: MotorProcesos.estadoSalida(PASOS, s, hoy) })), mes = hoy.slice(0, 7), anio = hoy.slice(0, 4);
    main.innerHTML = `<div class="view">
      <div class="page-h page-h-row"><div><a class="crumb" href="#inicio">← Inicio</a><h1>Bajas y salidas</h1><p>Todo lo que hay que hacer cuando alguien se va, en orden. Al cerrar, la fecha y el motivo pasan a su ficha.</p></div>
        <button class="btn" id="sNueva"><svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Nueva salida</button></div>
      <div class="aus-stats">
        <div class="stat hl"><small>Salidas en curso</small><b>${l.filter(s => !s.cerrada).length}</b><span class="sub">${l.filter(s => !s.cerrada).slice(0, 2).map(s => esc(s.empleado.split(' ')[0])).join(', ') || 'Ninguna'}</span></div>
        <div class="stat${l.some(s => s.est === 'atrasada') ? ' warn' : ''}"><small>Con pasos atrasados</small><b>${l.filter(s => s.est === 'atrasada').length}</b><span class="sub">Baja ya pasada</span></div>
        <div class="stat"><small>Bajas este mes</small><b>${l.filter(s => s.fechaBaja?.startsWith(mes)).length}</b><span class="sub">Previstas o hechas</span></div>
        <div class="stat"><small>Cerradas ${anio}</small><b>${l.filter(s => s.cerrada && s.fechaBaja?.startsWith(anio)).length}</b><span class="sub">Con ficha actualizada</span></div>
      </div>
      <div class="toolbar"><div class="seg3" role="group" aria-label="Mostrar">${[['curso', 'En curso'], ['cerradas', 'Cerradas'], ['todas', 'Todas']].map(([k, n]) => `<button data-sf="${k}" aria-pressed="${filtro === k}">${n}</button>`).join('')}</div></div>
      <div id="sList" class="aus-list"></div>
      ${Calc.legal('Plazos y base legal', `<p><b>Preaviso de la baja voluntaria (convenio art. 29):</b> un mes para técnicos, auxiliares de laboratorio, informática, administración, comerciales y encargados; ocho días para el resto. Si falta, se descuenta un día de salario por día.</p>
        <p><b>Despido objetivo (ET 53.1.c):</b> 15 días de preaviso o su pago, y la indemnización a disposición con la carta.</p>
        <p><b>Liquidación (convenio art. 29.2):</b> copia a la persona trabajadora 2 días antes de la baja.</p>
        <p style="margin:0"><b>Seguridad Social:</b> la baja se comunica en los 6 días naturales siguientes al cese (RD 84/1996, art. 32, en la redacción del RD 643/2026, desde el 01/08/2026).</p>`)}
    </div>`;
    pintar(main);
    $('#sNueva').onclick = () => formulario(main, {});
    $$('[data-sf]').forEach(b => b.onclick = () => { filtro = b.dataset.sf; $$('[data-sf]').forEach(x => x.setAttribute('aria-pressed', x === b)); pintar(main); });
  }

  function pintar(main) {
    const hoy = hoyISO(); let l = Procesos.Salidas.todas().map(s => ({ ...s, est: MotorProcesos.estadoSalida(PASOS, s, hoy) }));
    if (filtro === 'curso') l = l.filter(s => !s.cerrada); else if (filtro === 'cerradas') l = l.filter(s => s.cerrada);
    l.sort((a, b) => (a.fechaBaja || '9').localeCompare(b.fechaBaja || '9'));
    const box = $('#sList');
    if (!l.length) { box.innerHTML = `<div class="empty-mini"><p class="muted">${filtro === 'curso' ? 'No hay salidas en curso.' : 'No hay salidas con este filtro.'}</p></div>`; return; }
    box.innerHTML = l.map((s, i) => { const pr = MotorProcesos.progresoSalida(PASOS, s); return `<button class="aus-card" data-s="${s.empleadoId}" style="--tc:${s.est === 'atrasada' ? 'var(--danger)' : 'var(--brand-2)'};--i:${Math.min(i, 8)}">
      <span class="aus-top"><span class="avatar">${esc(s.empleado.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase())}</span><span class="aus-who"><b>${esc(s.empleado)}</b><small>${esc(s.motivo || 'Motivo sin indicar')} · ${esc(s.puesto || '')}</small></span><span class="achip ${EST[s.est][1]}">${EST[s.est][0]}</span></span>
      <span class="aus-dates"><span>Último día: ${f(s.fechaBaja)}</span><span class="muted">${s.fechaComunicacion ? `Comunicada el ${f(s.fechaComunicacion)}` : 'Sin fecha de comunicación'}</span></span>
      <span class="ac-bar"><i style="transform:scaleX(${pr.pct})"></i></span>
      <span class="aus-foot"><span class="tag">${pr.hechos}/${pr.total} pasos</span>${pr.faltan.slice(0, 2).map(p => `<span class="tag">${esc(p.nombre.split(' (')[0])}</span>`).join('')}</span>
    </button>`; }).join('');
    $$('[data-s]', box).forEach(b => b.onclick = () => formulario(main, { empleadoId: Number(b.dataset.s) }));
  }

  /* Ventana de la salida. o: { empleadoId, motivo, fechaBaja } */
  function formulario(main, o = {}) {
    if (!Empleados.desbloqueado) { toast('Desbloquea la base de empleados'); return; }
    const hoy = hoyISO(), todos = MotorEmpleados.filtrar(Empleados.todos(), { estado: 'todos', hoy });
    const existente = o.empleadoId ? Empleados.buscar(o.empleadoId)?.salida : null;
    const lista = existente ? todos.filter(e => e.id === o.empleadoId) : todos.filter(e => !e.salida && MotorEmpleados.activo(e, hoy));
    if (!lista.length) { toast('No hay empleados activos sin una salida abierta'); return; }
    let s = { check: {}, motivo: o.motivo || '', fechaBaja: o.fechaBaja || '', fechaComunicacion: '', ...(existente || {}) };
    const d = abrirModal(`<form id="sF" novalidate><div class="dlg-b">
      <h2 style="font-size:20px;font-weight:600;margin:0 0 14px">${existente ? 'Salida' : 'Nueva salida'}</h2>
      ${SelPersona.campo('sEmp', 'Persona', { valor: o.empleadoId, ids: lista.map(e => e.id), disabled: !!existente })}
      <div class="field"><label for="sMot">Motivo</label><select id="sMot"><option value="">— Elige —</option>${P.motivosBaja.map(m => `<option ${s.motivo === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></div>
      <div class="row2"><div class="field"><label for="sCom">Fecha de comunicación</label><input type="date" id="sCom" value="${s.fechaComunicacion || ''}"></div>
        <div class="field"><label for="sFb">Último día de alta</label><input type="date" id="sFb" value="${s.fechaBaja || ''}"></div></div>
      <div id="sPre" class="hint"></div>
      <div class="aus-acc" style="margin-top:12px"><span class="flabel">Pasos de la salida</span><ul class="pasos" id="sPasos"></ul></div>
      <p class="form-err" id="sErr" role="alert"></p>
    </div><div class="dlg-f">${existente ? '<button type="button" class="btn ghost danger" id="sDel" style="margin-right:auto">Eliminar</button>' : ''}
      <button type="button" class="btn ghost" id="sFin">${icon('finiquito')}Calcular finiquito</button>
      ${existente && !s.cerrada ? '<button type="button" class="btn ghost" id="sCerrar">Cerrar salida</button>' : ''}
      <button type="button" class="btn ghost" id="sC">Cancelar</button><button class="btn">${existente ? 'Guardar' : 'Iniciar salida'}</button></div></form>`, { ancho: 640 });
    SelPersona.enlazar(d);
    const emp = () => Empleados.buscar(Number($('#sEmp', d).value));
    function preaviso() {
      const e = emp(), mot = $('#sMot', d).value, com = $('#sCom', d).value, fb = $('#sFb', d).value, box = $('#sPre', d);
      if (mot === 'Baja voluntaria') {
        const cat = Calc.categoriaDePuesto(e?.puesto), pre = MotorFiniquito.preavisoDe(cat?.id, P.preavisoBajaVoluntaria);
        if (!pre) { box.innerHTML = 'Puesto sin categoría: revisa el preaviso del convenio (art. 29).'; return; }
        if (!com) { box.innerHTML = `Preaviso exigido: <b>${pre.texto}</b>. Indica la fecha de comunicación para comprobarlo.`; return; }
        const min = pre.tipo === 'mes' ? MotorProcesos.sumarMeses(com, 1) : MotorProcesos.sumarDias(com, pre.dias);
        box.innerHTML = fb && fb < min ? `<span class="warn-t">Preaviso de ${pre.texto} incumplido: el último día debería ser como pronto el ${f(min)} (faltan ${MotorProcesos.diasEntre(fb, min)} días). Se descuenta en el finiquito.</span>` : `Preaviso de ${pre.texto}: correcto${fb ? '' : ` si el último día es el ${f(min)} o después`}.`;
      } else if (mot === 'Despido objetivo') box.innerHTML = 'Despido objetivo: 15 días de preaviso (o su pago) e indemnización con la carta (ET 53).';
      else box.innerHTML = '';
    }
    function pasos() {
      $('#sPasos', d).innerHTML = PASOS.map(p => `<li>${casilla(`data-paso-s="${p.id}"`, s.check[p.id], esc(p.nombre))}</li>`).join('');
      $$('[data-paso-s]', d).forEach(b => b.onclick = () => { const on = !b.classList.contains('on'); s.check = { ...s.check, [b.dataset.pasoS]: on }; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); if (on) burbuja(b); });
    }
    const leer = () => ({ motivo: $('#sMot', d).value, fechaComunicacion: $('#sCom', d).value, fechaBaja: $('#sFb', d).value, check: s.check });
    async function guardar(extra = {}) {
      const datos = { ...leer(), ...extra };
      if (!emp()) { $('#sErr', d).textContent = 'Elige a la persona.'; $('#sEmp-q', d).focus(); return false; }
      if (!datos.fechaBaja) { $('#sErr', d).textContent = 'Indica el último día de alta.'; return false; }
      if (extra.cerrada && !datos.motivo) { $('#sErr', d).textContent = 'Indica el motivo antes de cerrar.'; return false; }
      await Procesos.Salidas.guardar(emp().id, datos); return true;
    }
    ['sMot', 'sCom', 'sFb'].forEach(id => $('#' + id, d).addEventListener('input', preaviso));
    $('#sC', d).onclick = () => d.close('cancel');
    $('#sFin', d).onclick = async () => { const e = emp(), x = leer(); if (e && await guardar()) { d.close('ok'); ModFiniquito.paraEmpleado(e.id, { fin: x.fechaBaja, voluntaria: x.motivo === 'Baja voluntaria', comunicacion: x.fechaComunicacion }); } };
    $('#sCerrar', d) && ($('#sCerrar', d).onclick = async () => {
      const pr = MotorProcesos.progresoSalida(PASOS, s);
      if (pr.faltan.length && !confirmarSuave()) return;
      if (await guardar({ cerrada: true })) { d.close('ok'); toast('Salida cerrada · fecha y motivo en la ficha'); Shell.pintarNav(); if (main) render(main); }
    });
    // Cerrar con pasos pendientes: segundo clic para confirmar (sin diálogos del navegador).
    let aviso = false;
    function confirmarSuave() { if (aviso) return true; aviso = true; $('#sErr', d).textContent = `Quedan ${MotorProcesos.progresoSalida(PASOS, s).faltan.length} pasos sin marcar. Pulsa otra vez «Cerrar salida» para cerrarla igualmente.`; return false; }
    $('#sDel', d) && ($('#sDel', d).onclick = async () => { await Procesos.Salidas.eliminar(o.empleadoId); d.close('ok'); toast('Salida eliminada'); if (main) render(main); });
    $('#sF', d).onsubmit = async ev => { ev.preventDefault(); if (await guardar()) { d.close('ok'); toast(existente ? 'Salida guardada' : 'Salida iniciada · tarea de pasos pendientes creada'); Shell.pintarNav(); if (main && location.hash === '#salidas') render(main); else if (!existente) location.hash = '#salidas'; } };
    pasos(); preaviso();
  }

  return { render, formulario };
})();
