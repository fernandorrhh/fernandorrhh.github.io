/* Periodos de prueba: duración según convenio, responsable, avisos de seguimiento y resultado. Motor: engines/procesos.js */
const ModPruebas = (() => {
  const P = window.RRHH_PARAMS, C = P.procesos.prueba;
  let filtro = 'activos', pendienteAbrir = null;
  const hoyISO = () => Fecha.iso(Fecha.hoy());
  const f = s => s ? Fecha.larga(Fecha.parse(s)) : '—';
  const EST_CLS = { 'en-curso': 'ae-en-proceso', 'termina-pronto': 'ae-pendiente-docs', 'sin-resolver': 'ae-bloqueada', superado: 'ae-completada', 'no-superado': 'ae-cerrada' };
  const abrir = id => { pendienteAbrir = id; location.hash = '#pruebas'; };

  function render(main) {
    if (!Empleados.configurado() || !Empleados.desbloqueado) return pantallaBloqueo(main, 'Periodos de prueba', 'Duración según convenio, seguimiento con el responsable y resultado.', () => render(main));
    const hoy = hoyISO(), l = Procesos.Pruebas.todas().map(p => ({ ...p, est: MotorProcesos.estadoPrueba(p, hoy) })), anio = hoy.slice(0, 4);
    const c = k => l.filter(p => p.est === k).length;
    main.innerHTML = `<div class="view">
      <div class="page-h page-h-row"><div><a class="crumb" href="#inicio">← Inicio</a><h1>Periodos de prueba</h1><p>Duración según el convenio, avisos de seguimiento al responsable y el resultado de cada periodo.</p></div>
        <button class="btn" id="pNuevo"><svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Nuevo periodo de prueba</button></div>
      <div class="aus-stats">
        <div class="stat hl"><small>En curso</small><b>${c('en-curso') + c('termina-pronto')}</b><span class="sub">${c('termina-pronto')} terminan en 15 días</span></div>
        <div class="stat${c('sin-resolver') ? ' warn' : ''}"><small>Terminados sin resolver</small><b>${c('sin-resolver')}</b><span class="sub">${c('sin-resolver') ? 'Marca el resultado' : 'Todo al día'}</span></div>
        <div class="stat"><small>Superados ${anio}</small><b>${l.filter(p => p.est === 'superado' && (p.fechaResultado || p.fin).startsWith(anio)).length}</b><span class="sub">Favorables</span></div>
        <div class="stat"><small>No superados ${anio}</small><b>${l.filter(p => p.est === 'no-superado' && (p.fechaResultado || p.fin).startsWith(anio)).length}</b><span class="sub">Por la empresa o la persona</span></div>
      </div>
      <div class="toolbar"><div class="seg3" role="group" aria-label="Mostrar">${[['activos', 'Activos'], ['resueltos', 'Resueltos'], ['todos', 'Todos']].map(([k, n]) => `<button data-pf="${k}" aria-pressed="${filtro === k}">${n}</button>`).join('')}</div></div>
      <div id="pList" class="aus-list"></div>
      ${Calc.legal('Duración máxima y base legal', `<p><b>Convenio, art. 27:</b> personal técnico titulado (superior o medio) y personal comercial, 6 meses; personal técnico no titulado, 3 meses; resto de grupos profesionales, 2 meses; contratos formativos, 1 o 2 meses. Debe pactarse por escrito.</p>
        <p><b>ET, art. 14:</b> en contratos temporales de hasta 6 meses, el periodo de prueba no puede superar 1 mes. La baja médica solo interrumpe el periodo si así consta en el contrato (convenio art. 27).</p>
        <p style="margin:0"><b>Avisos:</b> 1 mes → valoración final 5 días antes del fin · 2 o 3 meses → a mitad y valoración final 7 días antes · 6 meses → a los 2 y a los 4 meses y valoración final 7 días antes. La decisión debe comunicarse antes de que termine el periodo.</p>`)}
    </div>`;
    pintar(main);
    $('#pNuevo').onclick = () => formulario(main, {});
    $$('[data-pf]').forEach(b => b.onclick = () => { filtro = b.dataset.pf; $$('[data-pf]').forEach(x => x.setAttribute('aria-pressed', x === b)); pintar(main); });
    if (pendienteAbrir) { const p = Procesos.Pruebas.todas().find(x => x.id === pendienteAbrir); pendienteAbrir = null; if (p) formulario(main, p); }
  }

  function pintar(main) {
    const hoy = hoyISO(); let l = Procesos.Pruebas.todas().map(p => ({ ...p, est: MotorProcesos.estadoPrueba(p, hoy) }));
    if (filtro === 'activos') l = l.filter(p => !p.resultado); else if (filtro === 'resueltos') l = l.filter(p => p.resultado);
    const ord = { 'sin-resolver': 0, 'termina-pronto': 1, 'en-curso': 2, superado: 3, 'no-superado': 4 };
    l.sort((a, b) => ord[a.est] - ord[b.est] || a.fin.localeCompare(b.fin));
    const box = $('#pList');
    if (!l.length) { box.innerHTML = `<div class="empty-mini"><p class="muted">${filtro === 'activos' ? 'No hay periodos de prueba en curso.' : 'No hay periodos con este filtro.'}</p></div>`; return; }
    box.innerHTML = l.map((p, i) => {
      const tot = MotorProcesos.diasEntre(p.inicio, p.fin) + 1, pas = Math.min(tot, Math.max(0, MotorProcesos.diasEntre(p.inicio, hoy) + 1));
      return `<button class="aus-card" data-p="${p.id}" data-e="${p.empleadoId}" style="--tc:${p.est === 'no-superado' ? 'var(--danger)' : p.est === 'superado' ? 'var(--ae-completada)' : 'var(--brand-2)'};--i:${Math.min(i, 8)}">
        <span class="aus-top"><span class="avatar">${esc(p.empleado.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase())}</span><span class="aus-who"><b>${esc(p.empleado)}</b><small>${esc(p.puesto || '')} · ${p.meses} mes${p.meses === 1 ? '' : 'es'}${p.responsable ? ' · resp. ' + esc(p.responsable) : ''}</small></span><span class="achip ${EST_CLS[p.est]}">${p.resultado ? esc(MotorProcesos.RESULTADOS[p.resultado]) : MotorProcesos.ESTADOS_PRUEBA[p.est]}</span></span>
        <span class="aus-dates"><span>${f(p.inicio)} → ${f(p.fin)}</span><span class="muted">${p.resultado ? `Resuelto el ${f(p.fechaResultado)}` : p.est === 'sin-resolver' ? `Terminó hace ${MotorProcesos.diasEntre(p.fin, hoy)} días` : `Quedan ${MotorProcesos.diasEntre(hoy, p.fin)} días`}</span></span>
        <span class="ac-bar"><i style="transform:scaleX(${p.resultado ? 1 : pas / tot})"></i></span>
        <span class="hitos">${p.hitos.map(h => `<span class="hito${h.hecho ? ' ok' : h.fecha < hoy ? ' tarde' : ''}" title="${esc(h.nombre)} · ${f(h.fecha)}">${h.hecho ? '✓' : Fecha.corta(Fecha.parse(h.fecha))}<small>${h.id === 'final' ? 'final' : h.id === 'mitad' ? 'mitad' : h.id.replace('m', '') + ' m'}</small></span>`).join('')}</span>
      </button>`;
    }).join('');
    $$('[data-p]', box).forEach(b => b.onclick = () => { const p = Procesos.Pruebas.todas().find(x => x.id === Number(b.dataset.p)); if (p) formulario(main, p); });
  }

  /* Alta o edición. p0: { empleadoId, inicio, desdeAlta } o un periodo existente. */
  function formulario(main, p0) {
    if (!Empleados.desbloqueado) { toast('Desbloquea la base de empleados'); return; }
    const editando = !!p0.id, hoy = hoyISO();
    const lista = MotorEmpleados.filtrar(Empleados.todos(), { estado: editando ? 'todos' : 'activos', hoy });
    if (!lista.length) { toast('Primero añade empleados'); return; }
    let empId = p0.empleadoId || '';
    const resp = MotorEmpleados.valores(Empleados.todos(), 'responsable');
    const d = abrirModal(`<form id="pF" novalidate><div class="dlg-b">
      <h2 style="font-size:20px;font-weight:600;margin:0 0 14px">${p0.desdeAlta ? 'Periodo de prueba de la nueva incorporación' : editando ? 'Periodo de prueba' : 'Nuevo periodo de prueba'}</h2>
      ${SelPersona.campo('pEmp', 'Persona', { valor: empId, ids: lista.map(e => e.id), disabled: editando })}
      <div class="row2"><div class="field"><label for="pIni">Inicio</label><input type="date" id="pIni" value="${p0.inicio || ''}"></div>
        <div class="field"><label for="pRes">Responsable</label><input id="pRes" list="pResL" value="${esc(p0.responsable || '')}" placeholder="Quién valora el periodo"><datalist id="pResL">${resp.map(x => `<option value="${esc(x)}">`).join('')}</datalist></div></div>
      <div><span class="flabel">Duración</span><div class="chips-sel" id="pMes">${C.opciones.map(m => `<button type="button" role="radio" data-m="${m}" aria-checked="false">${m} mes${m === 1 ? '' : 'es'}</button>`).join('')}</div><div class="hint" id="pMax"></div></div>
      <label class="check" style="margin-top:12px"><input type="checkbox" id="pIT" ${p0.interrumpeIT ? 'checked' : ''}> La baja médica interrumpe el periodo (consta en el contrato)</label>
      <div id="pHitos" class="aus-acc" style="margin-top:14px"></div>
      ${editando ? `<div class="res-box"><span class="flabel">Resultado</span>
        <div class="chips-sel" id="pResu">${Object.entries(MotorProcesos.RESULTADOS).map(([k, n]) => `<button type="button" role="radio" data-r="${k}" aria-checked="${p0.resultado === k}" class="r-${k}">${n}</button>`).join('')}${p0.resultado ? '<button type="button" data-r="" aria-checked="false">Sin resolver</button>' : ''}</div>
        <div class="row2" style="margin-top:10px"><div class="field"><label for="pFr">Fecha de la decisión</label><input type="date" id="pFr" value="${p0.fechaResultado || hoy}"></div>
          <div class="field"><label for="pNr">Nota</label><input id="pNr" maxlength="140" value="${esc(p0.notaResultado || '')}"></div></div></div>` : ''}
      <p class="form-err" id="pErr" role="alert"></p>
    </div><div class="dlg-f">${editando ? '<button type="button" class="btn ghost danger" id="pDel" style="margin-right:auto">Eliminar</button>' : ''}<button type="button" class="btn ghost" id="pC">${p0.desdeAlta ? 'Ahora no' : 'Cancelar'}</button><button class="btn">${editando ? 'Guardar' : 'Crear y programar avisos'}</button></div></form>`, { ancho: 620 });
    let meses = p0.meses || null, resultado = p0.resultado || '', hitosHechos = Object.fromEntries((p0.hitos || []).map(h => [h.id, !!h.hecho]));
    SelPersona.enlazar(d);
    const empleado = () => Empleados.buscar(Number($('#pEmp', d).value));
    function actualizar(primera = false) {
      const e = empleado(), cat = Calc.categoriaDePuesto(e?.puesto), max = MotorProcesos.maxMeses(cat?.id, C);
      if (primera && !$('#pIni', d).value) $('#pIni', d).value = e?.fechaContratacion || hoy;
      if (primera && !meses) meses = max || 2;
      if (primera && !$('#pRes', d).value && e?.responsable) $('#pRes', d).value = e.responsable;
      $$('[data-m]', d).forEach(b => b.setAttribute('aria-checked', Number(b.dataset.m) === meses));
      $('#pMax', d).innerHTML = cat ? `Máximo por convenio para <b>${esc(cat.nombre)}</b> (${cat.grupo.toLowerCase()}): <b>${max} meses</b>.${meses > max ? ` <span class="warn-t">${meses} meses supera el máximo del convenio.</span>` : ''}` : 'Puesto sin categoría asignada: comprueba el máximo del convenio (art. 27).';
      const ini = $('#pIni', d).value;
      if (!ini || !meses) { $('#pHitos', d).innerHTML = ''; return; }
      const hs = MotorProcesos.hitos(ini, meses, C), fin = MotorProcesos.finPrueba(ini, meses);
      $('#pHitos', d).innerHTML = `<span class="flabel">Seguimiento · termina el ${f(fin)}</span><ul class="pasos">${hs.map(h => `<li>${casilla(`data-h="${h.id}"`, hitosHechos[h.id], `${esc(h.nombre)} <small class="muted">· ${f(h.fecha)}</small>`)}</li>`).join('')}</ul>
        <p class="muted small" style="margin:8px 0 0">${editando ? 'Marca cada seguimiento cuando lo hagas con el responsable.' : 'Se creará una tarea para cada fecha.'}</p>`;
      $$('[data-h]', d).forEach(b => b.onclick = () => { const on = !b.classList.contains('on'); hitosHechos[b.dataset.h] = on; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); if (on) burbuja(b); });
    }
    $('#pEmp', d).onchange = () => { $('#pIni', d).value = ''; meses = null; $('#pRes', d).value = ''; actualizar(true); };
    $('#pIni', d).oninput = () => actualizar();
    $$('[data-m]', d).forEach(b => b.onclick = () => { meses = Number(b.dataset.m); actualizar(); });
    $$('[data-r]', d).forEach(b => b.onclick = () => { resultado = b.dataset.r; $$('[data-r]', d).forEach(x => x.setAttribute('aria-checked', x === b)); });
    $('#pC', d).onclick = () => d.close('cancel');
    $('#pDel', d) && ($('#pDel', d).onclick = async () => { await Procesos.Pruebas.eliminar(p0.empleadoId, p0.id); d.close('ok'); toast('Periodo de prueba eliminado'); if (main) render(main); });
    $('#pF', d).onsubmit = async ev => {
      ev.preventDefault();
      const ini = $('#pIni', d).value; if (!ini || !meses) { $('#pErr', d).textContent = 'Indica el inicio y la duración.'; return; }
      const id = Number($('#pEmp', d).value);
      if (!id) { $('#pErr', d).textContent = 'Elige a la persona.'; $('#pEmp-q', d).focus(); return; }
      let p = await Procesos.Pruebas.guardar(id, { id: p0.id, inicio: ini, meses, responsable: $('#pRes', d).value.trim(), interrumpeIT: $('#pIT', d).checked });
      p = await Procesos.Pruebas.guardar(id, { id: p.id, hitos: p.hitos.map(h => ({ ...h, hecho: !!hitosHechos[h.id] })) });
      if (editando && resultado !== (p0.resultado || '')) await Procesos.Pruebas.resolver(id, p.id, resultado, $('#pFr', d).value, $('#pNr', d).value.trim());
      d.close('ok'); Shell.pintarNav();
      toast(editando ? 'Periodo de prueba guardado' : `Periodo creado · ${p.hitos.length} aviso${p.hitos.length === 1 ? '' : 's'} en tareas`);
      if (resultado === 'favorable' && resultado !== p0.resultado) Ficus.decir('¡Periodo de prueba superado! Una incorporación consolidada.', 'yay');
      if ((resultado === 'no-favorable' || resultado === 'desiste') && resultado !== p0.resultado) {
        const q = abrirModal(`<div class="dlg-b"><h2 style="font-size:20px;font-weight:600">¿Inicio el proceso de salida?</h2><p>Se abrirá la salida con el motivo «No superación del periodo de prueba» y la fecha ${f($('#pFr', d)?.value || hoy)}.</p></div>
          <div class="dlg-f"><button class="btn ghost" id="qN">Ahora no</button><button class="btn" id="qS">Iniciar salida</button></div>`);
        $('#qN', q).onclick = () => q.close(); $('#qS', q).onclick = () => { q.close(); ModSalidas.formulario(null, { empleadoId: id, motivo: 'No superación del periodo de prueba', fechaBaja: $('#pFr', d)?.value || hoy }); };
      }
      if (main) render(main);
    };
    actualizar(true);
  }

  return { render, formulario, abrir };
})();
