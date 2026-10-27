/*
 * PRL → Empresas externas (CAE): empresas proveedoras, sus trabajadores y cada servicio (un día, diario, semanal o mensual),
 * con el correo de solicitud, lo que falta, la recepción y la ruta propuesta en la carpeta de PRL.
 * Datos: js/core/cae.js · Motor: js/engines/cae.js
 */
const ModCae = (() => {
  const P = window.RRHH_PARAMS, C = P.cae;
  let vista = 'visitas', pendienteVisita = null, verTerminadas = false;
  const hoyISO = () => Fecha.iso(Fecha.hoy());
  const f = s => s ? Fecha.larga(Fecha.parse(s)) : '';
  const docT = id => C.docsTrabajador.find(d => d.id === id);
  const FREC = [['puntual', 'Un día'], ['diaria', 'De lunes a viernes'], ['semanal', 'Cada semana'], ['mensual', 'Cada mes']];
  const vigTxt = d => d.vigencia === 'mes' ? 'Cada mes' : d.vigencia === 'trimestre' ? 'Cada trimestre' : d.vigencia === 'vence' ? 'Hasta su vencimiento' : 'Cada año';
  const ICO_X = '<svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const ICO_COPY = '<svg class="i" viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>';

  /* Estado de un documento: vigente (hasta…), caducado o sin aportar. */
  function chipDoc(fecha, def, vence = '', en = hoyISO()) {
    if (!fecha) return `<span class="cae-st falta">Falta</span>`;
    const ok = MotorCae.vigente(fecha, def.vigencia, en, vence), p = MotorCae.periodo(fecha, def.vigencia, vence);
    return ok ? `<span class="cae-st ok" title="Vigente hasta el ${f(p.hasta)}">${MotorCae.etiquetaPeriodo(fecha, def.vigencia, vence)}</span>` : `<span class="cae-st cad" title="Caducó el ${f(p.hasta)}">Caducado</span>`;
  }
  const copiarTexto = async (t, msg = 'Copiado') => { try { await navigator.clipboard.writeText(t); } catch (e) { const x = document.createElement('textarea'); x.value = t; document.body.append(x); x.select(); document.execCommand('copy'); x.remove(); } toast(msg); };

  /* ---------- Página ---------- */
  function render(main) {
    if (!Empleados.configurado() || !Empleados.desbloqueado) return pantallaBloqueo(main, 'Empresas externas (CAE)', 'Coordinación de actividades empresariales: los datos de los trabajadores externos se guardan cifrados con la base de empleados.', () => render(main));
    const emps = Cae.empresas(), vs = Cae.visitas();
    main.innerHTML = `<div class="view">
      <div class="page-h page-h-row"><div><a class="crumb" href="#prl">← PRL</a><h1>Empresas externas</h1><p>Coordinación de actividades empresariales (CAE): qué documentación pedir a cada empresa y a cada persona antes de que trabajen en Liptosa.</p></div>
        <div class="page-acts"><button class="btn ghost" id="cNuevaE"><svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Nueva empresa</button><button class="btn" id="cNuevaV"><svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Nueva visita</button></div></div>
      <div class="toolbar"><div class="seg3" role="group" aria-label="Ver"><button data-v="visitas" aria-pressed="${vista === 'visitas'}">${icon('calendario')}Visitas<span class="cnt">${vs.filter(v => !v.cerrada).length}</span></button><button data-v="empresas" aria-pressed="${vista === 'empresas'}">${icon('cae')}Empresas<span class="cnt">${emps.length}</span></button></div></div>
      <div id="cCont" class="live">${vista === 'visitas' ? lVisitas() : lEmpresas()}</div>
      ${Calc.legal('Qué se pide y cuánto vale', `
        <p><b>Una vez al año por empresa:</b> la solicitud CAE con los anexos II y III firmados y sellados, el justificante de Hacienda y, si usan productos químicos (limpieza), sus fichas de datos de seguridad. <b>Cada mes o trimestre</b> (según la empresa): el justificante de estar al corriente con la Seguridad Social. <b>La póliza de RC</b>, hasta su vencimiento.</p>
        <p><b>A cada persona:</b> ${C.docsTrabajador.map(d => d.corto).join(', ')}, cada año natural. Quien ya lo aportó este año solo tiene que confirmar el día, sus datos y que no ha cambiado nada.</p>
        <p><b>Servicios continuos</b> (limpieza diaria, cristales cada mes…): se registran una vez y la plataforma avisa ${C.renovarDias} días antes de que caduque algo (mes, trimestre o año nuevo) con el correo para pedirlo.</p>
        <p><b>Los PDF</b> se archivan en la carpeta del servidor: <code>carpeta base\EMPRESA\año</code>. El navegador no puede abrir rutas de red: copia la ruta y pégala en el Explorador de archivos. Los nombres y DNI de los trabajadores externos se guardan cifrados.</p>
        <div class="field" style="margin:10px 0"><label for="cBase">Carpeta base en el servidor</label><input id="cBase" value="${esc(Cae.carpetaBase())}" spellcheck="false"><div class="hint">Se guarda al salir del campo. Dentro: una carpeta por empresa y, dentro, una por año.</div></div>
        <p style="margin:0">${esc(C.fuente)}.</p>`)}
    </div>`;
    $$('[data-v]', main).forEach(b => b.onclick = () => { vista = b.dataset.v; render(main); });
    $('#cBase', main).onchange = ev => { const s = ev.target.value.trim(); Cae.setCarpetaBase(s === C.carpetaBase ? '' : s); ev.target.value = Cae.carpetaBase(); toast('Carpeta base guardada'); };
    $('#cNuevaE').onclick = () => fEmpresa(main);
    $('#cNuevaV').onclick = () => Cae.empresas().length ? fVisita(main) : (toast('Primero da de alta la empresa'), fEmpresa(main, null, true));
    $('#cCont').onclick = e => {
      const v = e.target.closest('[data-vis]'); if (v) { fVisita(main, Cae.visita(Number(v.dataset.vis))); return; }
      const em = e.target.closest('[data-emp]'); if (em) { fEmpresa(main, Cae.empresa(Number(em.dataset.emp))); return; }
      if (e.target.closest('#cTerm')) { verTerminadas = !verTerminadas; $('#cCont').innerHTML = lVisitas(); }
      if (e.target.closest('[data-nueva-v]')) $('#cNuevaV').click();
      if (e.target.closest('[data-nueva-e]')) fEmpresa(main);
    };
    if (pendienteVisita) { const v = Cae.visita(pendienteVisita); pendienteVisita = null; if (v) fVisita(main, v); }
  }

  function filaVisita(v, i) {
    const e = Cae.empresa(v.empresaId), est = Cae.estado(v); if (!e || !est) return '';
    const d = est.fecha ? Fecha.parse(est.fecha) : null;
    const chip = v.cerrada || est.terminada ? '<span class="cae-st">Terminada</span>' : est.completa ? '<span class="cae-st ok">Documentación completa</span>'
      : !est.trabajadores.length ? '<span class="cae-st cad">Sin personas</span>' : `<span class="cae-st falta">${MotorCae.continuo(v) ? 'Pedir' : 'Faltan'} ${est.total}</span>`;
    return `<button class="cae-vis${v.cerrada || est.terminada ? ' fin' : ''}" data-vis="${v.id}" style="--i:${i}">
      <span class="cal${MotorCae.continuo(v) ? ' sem' : ''}">${{ diaria: '<small>diario</small><b>L-V</b>', semanal: `<small>cada</small><b>${MotorCae.DIAS[Number(v.dia)].slice(0, 3)}</b>`, mensual: `<small>mes</small><b>${Number(v.diaMes) || 1}</b>` }[MotorCae.frec(v)] || (d ? `<small>${Fecha.mesCorto(d)}</small><b>${new Date(d).getUTCDate()}</b>` : '<b>—</b>')}</span>
      <span class="cae-vt"><b>${esc(e.nombre)}</b><small>${esc([e.servicio, v.descripcion].filter(Boolean).join(' · '))}</small>
        <small>${MotorCae.continuo(v) ? `${MotorCae.textoFecha(v)}${est.fecha ? ` · próxima el ${Fecha.corta(Fecha.parse(est.fecha))}` : ''}` : f(v.fecha)} · ${est.trabajadores.length} persona${est.trabajadores.length === 1 ? '' : 's'}${v.enviadoEl ? ` · correo enviado el ${Fecha.corta(Fecha.parse(v.enviadoEl))}` : ''}${v.confirmada ? ' · confirmada' : ''}</small></span>
      ${chip}<svg class="i sc-go" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>`;
  }
  function lVisitas() {
    const h = hoyISO(), l = Cae.visitas().map(v => ({ v, est: Cae.estado(v) })).filter(x => x.est);
    const act = l.filter(x => !x.v.cerrada && !x.est.terminada).sort((a, b) => (a.est.fecha || '').localeCompare(b.est.fecha || ''));
    const fin = l.filter(x => x.v.cerrada || x.est.terminada).sort((a, b) => (b.v.fecha || '').localeCompare(a.v.fecha || ''));
    if (!l.length) return `<div class="card empty-card"><p><b>Aún no hay visitas.</b></p><p class="muted">Registra una visita de un día o un servicio continuo (la limpieza diaria, los cristales cada mes…) y la plataforma te dirá qué pedir y cuándo renovarlo. <button class="linkbtn" data-nueva-v>Nueva visita</button></p></div>`;
    return `${act.length ? `<div class="cae-list">${act.map((x, i) => filaVisita(x.v, i)).join('')}</div>` : '<p class="muted">No hay visitas en curso.</p>'}
      ${fin.length ? `<button class="linkbtn" id="cTerm" style="margin-top:14px">${verTerminadas ? 'Ocultar' : 'Ver'} terminadas (${fin.length})</button>${verTerminadas ? `<div class="cae-list" style="margin-top:10px">${fin.map((x, i) => filaVisita(x.v, i)).join('')}</div>` : ''}` : ''}`;
  }
  function lEmpresas() {
    const l = Cae.empresas(), h = hoyISO();
    if (!l.length) return `<div class="card empty-card"><p><b>Aún no hay empresas.</b></p><p class="muted">Da de alta la empresa (limpieza, mantenimiento…) y sus trabajadores. <button class="linkbtn" data-nueva-e>Nueva empresa</button></p></div>`;
    return `<div class="cae-grid">${l.map((e, i) => {
      const ts = Cae.trabajadores(e.id), al = ts.filter(t => !MotorCae.faltanTrabajador(t, h, C).length).length, fe = MotorCae.faltanEmpresa(e, h, C), dd = MotorCae.docsDe(e, C);
      return `<button class="card cae-emp" data-emp="${e.id}" style="--i:${i}">
        <span class="cae-eh"><span class="cae-ico">${icon('cae')}</span><span><b>${esc(e.nombre)}</b><small>${esc([e.servicio, e.cif].filter(Boolean).join(' · ') || 'Sin servicio indicado')}</small></span></span>
        <span class="cae-docs">${dd.map(d => `<span class="cae-d ${!e.docs[d.id] ? 'falta' : fe.some(x => x.id === d.id) ? 'cad' : 'ok'}" title="${esc(d.nombre)} · ${vigTxt(d).toLowerCase()}">${esc(d.corto)}</span>`).join('')}</span>
        <span class="cae-ef"><span>${ts.length} persona${ts.length === 1 ? '' : 's'}${ts.length ? ` · ${al} al día este año` : ''}</span>${fe.length ? `<span class="cae-st falta">${fe.length} doc. de empresa</span>` : '<span class="cae-st ok">Empresa al día</span>'}</span>
      </button>`; }).join('')}</div>`;
  }

  /* ---------- Ficha de empresa: datos, documentos y trabajadores ---------- */
  function fEmpresa(main, e0 = null, luegoVisita = false) {
    const e = e0 ? { ...e0, docs: { ...e0.docs } } : { nombre: '', cif: '', servicio: '', carpetaNombre: '', ssPeriodo: 'trimestre', productos: false, docs: {} };
    const ct = e0 ? Cae.contacto(e0.id) : { persona: '', email: '', telefono: '' };
    let ts = e0 ? Cae.trabajadores(e0.id) : [];
    const anio = hoyISO().slice(0, 4);
    const d = abrirModal(`<form id="ceF" novalidate><div class="dlg-b">
      <h2 style="font-size:20px;font-weight:600;margin:0">${e0 ? esc(e0.nombre) : 'Nueva empresa'}</h2>
      <div class="row2"><div class="field"><label for="ceN">Empresa</label><input id="ceN" value="${esc(e.nombre)}" maxlength="80" required></div>
        <div class="field"><label for="ceC">CIF</label><input id="ceC" value="${esc(e.cif || '')}" maxlength="15"></div></div>
      <div class="row2"><div class="field"><label for="ceS">Servicio</label><input id="ceS" list="ceSL" value="${esc(e.servicio || '')}" maxlength="40"><datalist id="ceSL">${C.servicios.map(s => `<option value="${esc(s)}">`).join('')}</datalist></div>
        <div class="field"><label for="ceP">Persona de contacto</label><input id="ceP" value="${esc(ct.persona || '')}" maxlength="80"></div></div>
      <div class="row2"><div class="field"><label for="ceE">Correo</label><input id="ceE" type="email" value="${esc(ct.email || '')}" maxlength="120"></div>
        <div class="field"><label for="ceT">Teléfono</label><input id="ceT" value="${esc(ct.telefono || '')}" maxlength="20"></div></div>
      <div class="field"><label for="ceK">Carpeta de la empresa en el servidor</label><input id="ceK" value="${esc(e.carpetaNombre || '')}" placeholder="${esc((e.nombre || 'NOMBRE DE LA EMPRESA').toUpperCase())}" maxlength="120" spellcheck="false">
        <div class="hint cae-ruta-h"><code id="ceRuta"></code><button type="button" class="linkbtn" id="ceCopy">${ICO_COPY}Copiar ruta</button></div></div>
      <div class="row2"><div class="field"><label for="ceSS">Justificante de la Seguridad Social</label><select id="ceSS"><option value="trimestre" ${e.ssPeriodo !== 'mes' ? 'selected' : ''}>Cada trimestre</option><option value="mes" ${e.ssPeriodo === 'mes' ? 'selected' : ''}>Cada mes</option></select></div>
        <label class="check" style="align-self:end;margin-bottom:12px"><input type="checkbox" id="cePQ" ${e.productos ? 'checked' : ''}> Usa productos químicos (pedir fichas de seguridad)</label></div>
      <div class="cae-sec"><span class="flabel">Documentación de la empresa</span><div class="cae-dt" id="ceDocs"></div></div>
      <div class="cae-sec"><span class="flabel">Personas que trabajan en Liptosa <span class="muted" style="font-weight:400">· documentos de ${anio}</span></span>
        <div id="ceTs"></div>
        <div class="cae-add" id="ceAdd"><input id="ceAN" placeholder="Nombre" maxlength="40" aria-label="Nombre"><input id="ceAA" placeholder="Apellidos" maxlength="60" aria-label="Apellidos"><input id="ceAD" placeholder="DNI/NIE" maxlength="12" aria-label="DNI o NIE"><button type="button" class="btn ghost sm" id="ceAB">Añadir</button></div></div>
      <p class="form-err" id="ceErr" role="alert"></p>
    </div><div class="dlg-f">${e0 ? '<button type="button" class="btn ghost danger" id="ceDel" style="margin-right:auto">Eliminar</button>' : ''}<button type="button" class="btn ghost" id="ceX">Cancelar</button><button class="btn">Guardar</button></div></form>`, { ancho: 860 });

    function pintarDocs() {
      $('#ceDocs', d).innerHTML = MotorCae.docsDe(e, C).map(x => `<div class="cae-dr" data-de="${x.id}"><span class="cae-dn"><b>${esc(x.corto)}</b><small>${vigTxt(x)}</small></span>
          <label class="sr" for="ced-${x.id}">${esc(x.corto)}: fecha de entrega</label><input type="date" id="ced-${x.id}" data-doc-e="${x.id}" value="${e.docs[x.id] || ''}" title="Fecha de entrega">
          ${x.id === 'rc' ? `<label class="cae-vence"><span>Vence</span><input type="date" id="ced-rcVence" data-doc-e="rcVence" value="${e.docs.rcVence || ''}"></label>` : '<span></span>'}
          <span class="cae-std">${chipDoc(e.docs[x.id], x, x.id === 'rc' ? e.docs.rcVence : '')}</span></div>`).join('');
    }
    const rutaE = () => MotorCae.carpeta(Cae.carpetaBase(), $('#ceK', d).value.trim() || ($('#ceN', d).value.trim() || 'EMPRESA').toUpperCase(), anio);
    const pintarRuta = () => { $('#ceRuta', d).textContent = rutaE(); $('#ceK', d).placeholder = ($('#ceN', d).value.trim() || 'NOMBRE DE LA EMPRESA').toUpperCase(); };
    pintarDocs(); pintarRuta();
    ['#ceK', '#ceN'].forEach(s => $(s, d).addEventListener('input', pintarRuta));
    $('#ceCopy', d).onclick = () => copiarTexto(rutaE(), 'Ruta copiada: pégala en el Explorador de archivos');
    $('#ceSS', d).onchange = ev => { e.ssPeriodo = ev.target.value; pintarDocs(); };
    $('#cePQ', d).onchange = ev => { e.productos = ev.target.checked; pintarDocs(); };
    function pintarTs() {
      $('#ceTs', d).innerHTML = ts.length ? `<div class="tbl-wrap"><table class="tbl cae-tt"><thead><tr><th>Persona</th><th>DNI/NIE</th>${C.docsTrabajador.map(x => `<th>${esc(x.corto)}</th>`).join('')}<th></th></tr></thead><tbody>
        ${ts.map((t, i) => `<tr data-ti="${i}"><td><b>${esc(Cae.nombre(t))}</b>${MotorCae.trabajadorNuevo(t) ? ' <span class="tag">nueva</span>' : ''}</td><td>${esc(t.dni || '—')}</td>
          ${C.docsTrabajador.map(x => `<td><input type="date" data-doc-t="${x.id}" value="${t.docs[x.id] || ''}" aria-label="${esc(x.corto)} de ${esc(Cae.nombre(t))}"><span class="cae-mini">${chipDoc(t.docs[x.id], x)}</span></td>`).join('')}
          <td><button type="button" class="icon-act" data-quitar-t="${i}" aria-label="Quitar a ${esc(Cae.nombre(t))}" title="Quitar">${ICO_X}</button></td></tr>`).join('')}</tbody></table></div>`
        : '<p class="muted small" style="margin:0 0 8px">Aún no hay personas. Añádelas aquí o al registrar la visita.</p>';
    }
    pintarTs();
    $('#ceTs', d).addEventListener('input', ev => { const el = ev.target.closest('[data-doc-t]'); if (!el) return; const i = Number(el.closest('tr').dataset.ti); ts[i] = { ...ts[i], docs: { ...ts[i].docs, [el.dataset.docT]: el.value } }; el.nextElementSibling.innerHTML = chipDoc(el.value, docT(el.dataset.docT)); });
    const quitados = [];
    $('#ceTs', d).addEventListener('click', ev => { const b = ev.target.closest('[data-quitar-t]'); if (!b) return; const [q] = ts.splice(Number(b.dataset.quitarT), 1); if (q.id) quitados.push(q); pintarTs(); });
    $('#ceDocs', d).addEventListener('input', ev => { const el = ev.target.closest('[data-doc-e]'); if (!el) return; e.docs[el.dataset.docE] = el.value; MotorCae.docsDe(e, C).forEach(x => { $(`[data-de="${x.id}"] .cae-std`, d).innerHTML = chipDoc(e.docs[x.id], x, x.id === 'rc' ? e.docs.rcVence : ''); }); });
    $('#ceAB', d).onclick = () => {
      const n = $('#ceAN', d).value.trim(), a = $('#ceAA', d).value.trim(), dni = $('#ceAD', d).value.trim().toUpperCase();
      if (!n || !a) { $('#ceErr', d).textContent = 'Escribe el nombre y los apellidos de la persona.'; $(n ? '#ceAA' : '#ceAN', d).focus(); return; }
      ts.push({ nombre: n, apellidos: a, dni, docs: {} }); ['#ceAN', '#ceAA', '#ceAD'].forEach(s => $(s, d).value = ''); $('#ceErr', d).textContent = ''; pintarTs(); $('#ceAN', d).focus();
    };
    $('#ceAdd', d).addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); $('#ceAB', d).click(); } });
    $('#ceX', d).onclick = () => d.close('cancel');
    $('#ceDel', d) && ($('#ceDel', d).onclick = async ev => {
      const b = ev.currentTarget; if (!b.dataset.ok) { b.dataset.ok = 1; b.textContent = 'Pulsa otra vez para eliminar todo'; return; }
      const q = await Cae.eliminarEmpresa(e0.id); d.close('ok'); render(main); Shell.pintarNav();
      toast(`${e0.nombre} eliminada con sus visitas y personas`, { texto: 'Deshacer', fn: async () => { await Cae.restaurarEmpresa(q); render(main); Shell.pintarNav(); } });
    });
    $('#ceF', d).onsubmit = async ev => {
      ev.preventDefault();
      const nombre = $('#ceN', d).value.trim(); if (!nombre) { $('#ceErr', d).textContent = 'Escribe el nombre de la empresa.'; $('#ceN', d).focus(); return; }
      if (e.docs.rc && e.docs.rcVence && e.docs.rcVence < e.docs.rc) { $('#ceErr', d).textContent = 'La póliza no puede vencer antes de la fecha de entrega.'; return; }
      const n = Cae.guardarEmpresa({ id: e0?.id, nombre, cif: $('#ceC', d).value.trim().toUpperCase(), servicio: $('#ceS', d).value.trim(), carpetaNombre: $('#ceK', d).value.trim(), ssPeriodo: e.ssPeriodo || 'trimestre', productos: !!e.productos, docs: e.docs });
      await Cae.guardarContacto(n.id, { persona: $('#ceP', d).value.trim(), email: $('#ceE', d).value.trim(), telefono: $('#ceT', d).value.trim() });
      for (const t of ts) await Cae.guardarTrabajador({ ...t, empresaId: n.id });
      for (const t of quitados) if (t.id) await Cae.eliminarTrabajador(t.id);
      d.close('ok'); toast(e0 ? 'Empresa guardada' : 'Empresa creada'); Shell.pintarNav();
      if (luegoVisita) fVisita(main, { empresaId: n.id }); else render(main);
    };
    $(e0 ? '#ceP' : '#ceN', d).focus();
  }

  /* ---------- Visita: personas, qué falta, correo y recepción ---------- */
  function fVisita(main, v0 = null) {
    const edit = !!v0?.id, emps = Cae.empresas();
    let v = { dia: 0, diaMes: 1, fecha: '', desde: '', hasta: '', descripcion: '', trabajadores: [], empresaId: emps[0]?.id, ...(v0 || {}) };
    v.frec = MotorCae.frec(v); delete v.semanal;
    v.trabajadores = [...(v.trabajadores || [])];
    const d = abrirModal(`<form id="cvF" novalidate><div class="dlg-b">
      <h2 style="font-size:20px;font-weight:600;margin:0">${edit ? 'Visita de empresa externa' : 'Nueva visita'}</h2>
      <div class="row2"><div class="field"><label for="cvE">Empresa</label><select id="cvE" ${edit ? 'disabled' : ''}>${emps.map(e => `<option value="${e.id}" ${e.id === v.empresaId ? 'selected' : ''}>${esc(e.nombre)}${e.servicio ? ' · ' + esc(e.servicio) : ''}</option>`).join('')}</select></div>
        <div class="field"><label for="cvFr">Cuándo</label><select id="cvFr">${FREC.map(([k, l]) => `<option value="${k}" ${v.frec === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
      <div class="row2" id="cvPunt"><div class="field"><label for="cvF1">Día de entrada</label><input type="date" id="cvF1" value="${v.fecha}"></div><div class="field"><label for="cvD">Trabajos <span class="muted" style="font-weight:400">(opcional)</span></label><input id="cvD" value="${esc(v.descripcion)}" maxlength="80" placeholder="p. ej. Limpieza diaria de oficinas"></div></div>
      <div class="cae-sem" id="cvSem"><div class="field" id="cvDiaBox"><label for="cvDia">Día</label><select id="cvDia">${MotorCae.DIAS.map((x, i) => `<option value="${i}" ${Number(v.dia) === i ? 'selected' : ''}>${x.charAt(0).toUpperCase() + x.slice(1)}</option>`).join('')}</select></div>
        <div class="field" id="cvDMBox"><label for="cvDM">Día del mes</label><input type="number" id="cvDM" min="1" max="31" value="${Number(v.diaMes) || 1}" inputmode="numeric"></div>
        <div class="field"><label for="cvDe">Desde</label><input type="date" id="cvDe" value="${v.desde}"></div><div class="field"><label for="cvHa">Hasta <span class="muted" style="font-weight:400">(opcional)</span></label><input type="date" id="cvHa" value="${v.hasta}"></div></div>
      <p class="muted small cae-cont" id="cvCont">Servicio continuo: la solicitud CAE se hace una vez al año y la plataforma te avisa ${C.renovarDias} días antes de que caduque algo.</p>
      <div class="cae-sec"><span class="flabel">Personas que vienen</span><div id="cvPs"></div>
        <div class="cae-add" id="cvAdd"><input id="cvAN" placeholder="Nombre" maxlength="40" aria-label="Nombre de la persona nueva"><input id="cvAA" placeholder="Apellidos" maxlength="60" aria-label="Apellidos"><input id="cvAD" placeholder="DNI/NIE" maxlength="12" aria-label="DNI o NIE"><button type="button" class="btn ghost sm" id="cvAB">Añadir persona</button></div></div>
      <div id="cvFalta"></div>
      <div class="cae-sec cae-mail"><div class="card-h" style="margin:0 0 8px"><span class="flabel" style="margin:0">Correo para la empresa</span><span class="ex" id="cvTipo"></span></div>
        <div class="mail-body" id="cvMail"></div>
        <div class="doc-acts"><button type="button" class="btn sm" data-copy="txt">${icon('documentos')}Copiar texto</button><button type="button" class="btn ghost sm" data-copy="html">Copiar con formato</button><a class="btn ghost sm" id="cvMailto">Abrir en el correo</a>
          <label class="check" style="margin-left:auto"><input type="checkbox" id="cvEnv" ${v.enviadoEl ? 'checked' : ''}> Enviado${v.enviadoEl ? ` el ${Fecha.corta(Fecha.parse(v.enviadoEl))}` : ''}</label></div></div>
      <div class="cae-sec"><span class="flabel">Recepción y archivo en la carpeta de PRL</span>
        <label class="check" style="margin-bottom:8px"><input type="checkbox" id="cvConf" ${v.confirmada ? 'checked' : ''}> Han confirmado el día, las personas y que no ha cambiado nada</label>
        <div id="cvRec"></div></div>
      <p class="form-err" id="cvErr" role="alert"></p>
    </div><div class="dlg-f">${edit ? `<button type="button" class="btn ghost danger" id="cvDel" style="margin-right:auto">Eliminar</button>${MotorCae.continuo(v) && !v.cerrada ? '<button type="button" class="btn ghost" id="cvFin">Terminar el servicio</button>' : ''}` : ''}<button type="button" class="btn ghost" id="cvX">Cancelar</button><button class="btn">${edit ? 'Guardar' : 'Crear visita'}</button></div></form>`, { ancho: 860 });

    const leer = () => { v.empresaId = Number($('#cvE', d).value); v.frec = $('#cvFr', d).value; v.fecha = $('#cvF1', d).value; v.descripcion = $('#cvD', d).value.trim(); v.dia = Number($('#cvDia', d).value); v.diaMes = Math.min(31, Math.max(1, Number($('#cvDM', d).value) || 1)); v.desde = $('#cvDe', d).value; v.hasta = $('#cvHa', d).value; };
    function pintarModo() {
      const c = v.frec !== 'puntual';
      $('#cvSem', d).hidden = !c; $('#cvCont', d).hidden = !c; $('#cvF1', d).closest('.field').hidden = c;
      $('#cvDiaBox', d).hidden = v.frec !== 'semanal'; $('#cvDMBox', d).hidden = v.frec !== 'mensual';
    }
    function pintar() {
      leer();
      const emp = Cae.empresa(v.empresaId); if (!emp) return;
      const ts = Cae.trabajadores(emp.id), est = MotorCae.estadoVisita(v, emp, ts, hoyISO(), C), en = est.en, anio = en.slice(0, 4);
      $('#cvPs', d).innerHTML = ts.length ? `<div class="cae-ps">${ts.map(t => { const fl = MotorCae.faltanTrabajador(t, en, C), on = v.trabajadores.includes(t.id);
        return casilla(`data-tp="${t.id}"`, on, `<b>${esc(Cae.nombre(t))}</b> <small class="muted">${esc(t.dni || 'sin DNI')}</small>`, `<span class="cae-st ${fl.length ? (MotorCae.trabajadorNuevo(t) ? 'falta' : 'cad') : 'ok'}">${fl.length ? (MotorCae.trabajadorNuevo(t) ? 'Nueva' : `Faltan ${fl.length}`) : `Al día ${anio}`}</span>`); }).join('')}</div>`
        : '<p class="muted small" style="margin:0 0 8px">Esta empresa aún no tiene personas registradas: añade quién viene.</p>';
      $('#cvFalta', d).innerHTML = !est.trabajadores.length ? `<div class="note">${icon('info')}<div>Marca o añade las personas que vienen para saber qué pedir.</div></div>`
        : est.total ? `<div class="note warn">${icon('info')}<div><b>${MotorCae.continuo(v) ? `Hay que pedir ${est.total} documento${est.total === 1 ? '' : 's'} antes del ${f(en)}` : `Faltan ${est.total} documento${est.total === 1 ? '' : 's'} para el ${f(est.fecha || en)}`}:</b> ${[...est.faltanEmpresa.map(x => esc(x.corto) + ' (empresa)'), ...est.trabajadores.filter(x => x.faltan.length).map(x => `${esc(Cae.nombre(x.t))}: ${x.faltan.map(z => esc(z.corto)).join(', ')}`)].join(' · ')}.</div></div>`
        : `<div class="note ok">${icon('info')}<div><b>Documentación completa</b> ${MotorCae.continuo(v) ? `y vigente al menos hasta el ${f(en)}` : `para el ${f(est.fecha || en)}`}. Basta con que confirmen el día, las personas y que no ha cambiado nada.</div></div>`;
      const c = MotorCae.correo({ v, emp, est, nombre: Cae.nombre, cfg: C, hoy: hoyISO() });
      $('#cvMail', d).textContent = c.texto; $('#cvTipo', d).textContent = { completo: 'Primera solicitud: correo completo', pendientes: 'Confirmar y pedir lo que falta', confirmar: 'Solo confirmar' }[c.tipo];
      const ct = Cae.contacto(emp.id); $('#cvMailto', d).href = MotorDocumentos.mailto(c.asunto, c.texto, ct.email || '');
      d._correo = c;
      // Recepción: lo que falta, con casilla "recibido" y ruta propuesta en la carpeta.
      const base = Cae.carpetaBase(), cn = Cae.nombreCarpeta(emp);
      const sufijo = x => x.vigencia === 'trimestre' ? ` ${MotorCae.trimestre(en) + 1}T` : x.vigencia === 'mes' ? ` ${en.slice(5, 7)}-${anio}` : '';
      const items = [...est.faltanEmpresa.map(x => ({ tipo: 'empresa', id: emp.id, doc: x, ruta: MotorCae.ruta(base, anio, cn, x.corto + sufijo(x)) })),
        ...est.trabajadores.flatMap(x => x.faltan.map(z => ({ tipo: 'trabajador', id: x.t.id, doc: z, quien: Cae.nombre(x.t), ruta: MotorCae.ruta(base, anio, cn, z.corto, Cae.nombre(x.t)) })))];
      $('#cvRec', d).innerHTML = items.length ? `<ul class="pasos cae-rec">${items.map((x, i) => `<li>${casilla(`data-rec="${i}"`, false, `${x.quien ? `<b>${esc(x.quien)}</b> · ` : '<b>Empresa</b> · '}${esc(x.doc.corto)}`)}<button type="button" class="cae-ruta" data-ruta="${esc(x.ruta)}" title="Copiar la ruta propuesta">${ICO_COPY}<code>${esc(x.ruta)}</code></button></li>`).join('')}</ul>
        <p class="muted small" style="margin:6px 0 0">Al marcar «recibido» se anota en la ficha de la empresa o de la persona con fecha ${en > hoyISO() ? `del ${f(en)} (el periodo que se pide)` : 'de hoy'}. Pulsa una ruta para copiarla y pegarla en el Explorador.</p>`
        : (est.trabajadores.length ? '<p class="muted small" style="margin:0">Todo recibido y vigente. Guarda los PDF en la carpeta de la empresa si aún no lo has hecho.</p>' : '');
      d._rec = items;
    }
    pintarModo(); pintar();
    ['#cvE', '#cvF1', '#cvDia', '#cvDM', '#cvDe', '#cvHa'].forEach(s => $(s, d).addEventListener('change', () => { if (s === '#cvE') v.trabajadores = []; pintar(); }));
    $('#cvFr', d).onchange = () => { v.frec = $('#cvFr', d).value; pintarModo(); pintar(); };
    $('#cvPs', d).onclick = ev => { const b = ev.target.closest('[data-tp]'); if (!b) return; const id = Number(b.dataset.tp), on = !v.trabajadores.includes(id); v.trabajadores = on ? [...v.trabajadores, id] : v.trabajadores.filter(x => x !== id); if (on) burbuja(b); setTimeout(pintar, on && !reduceMotion ? 220 : 0); };
    $('#cvAB', d).onclick = async () => {
      const n = $('#cvAN', d).value.trim(), a = $('#cvAA', d).value.trim(), dni = $('#cvAD', d).value.trim().toUpperCase();
      if (!n || !a) { $('#cvErr', d).textContent = 'Escribe el nombre y los apellidos de la persona.'; $(n ? '#cvAA' : '#cvAN', d).focus(); return; }
      const t = await Cae.guardarTrabajador({ empresaId: Number($('#cvE', d).value), nombre: n, apellidos: a, dni, docs: {} });
      v.trabajadores.push(t.id); ['#cvAN', '#cvAA', '#cvAD'].forEach(s => $(s, d).value = ''); $('#cvErr', d).textContent = ''; pintar(); $('#cvAN', d).focus();
    };
    $('#cvAdd', d).addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); $('#cvAB', d).click(); } });
    $('#cvRec', d).onclick = async ev => {
      const r = ev.target.closest('[data-ruta]'); if (r) { copiarTexto(r.dataset.ruta, 'Ruta copiada'); return; }
      const b = ev.target.closest('[data-rec]'); if (!b) return;
      const x = d._rec[Number(b.dataset.rec)]; b.classList.add('on'); b.setAttribute('aria-checked', 'true'); burbuja(b);
      const est0 = MotorCae.estadoVisita(v, Cae.empresa(v.empresaId), Cae.trabajadores(v.empresaId), hoyISO(), C);
      await Cae.marcarDoc(x.tipo, x.id, x.doc.id, est0.en > hoyISO() ? est0.en : hoyISO());
      if (x.tipo === 'empresa' && x.doc.id === 'rc') toast('Póliza recibida: indica su fecha de vencimiento en la ficha de la empresa');
      setTimeout(pintar, reduceMotion ? 0 : 300);
    };
    $$('[data-copy]', d).forEach(b => b.onclick = async () => {
      const c = d._correo;
      try { if (b.dataset.copy === 'html' && window.ClipboardItem) await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([MotorCae.html(c.texto)], { type: 'text/html' }), 'text/plain': new Blob([c.texto], { type: 'text/plain' }) })]); else await navigator.clipboard.writeText(c.texto); }
      catch (e) { copiarTexto(c.texto); return; }
      toast(b.dataset.copy === 'html' ? 'Copiado con formato: pégalo en Outlook' : 'Correo copiado');
    });
    $('#cvX', d).onclick = () => d.close('cancel');
    $('#cvDel', d) && ($('#cvDel', d).onclick = () => { const q = Cae.eliminarVisita(v0.id); d.close('ok'); render(main); Shell.pintarNav(); toast('Visita eliminada', { texto: 'Deshacer', fn: () => { Cae.restaurarVisita(q); render(main); } }); });
    $('#cvFin', d) && ($('#cvFin', d).onclick = () => { Cae.guardarVisita({ id: v0.id, cerrada: true, hasta: hoyISO() }); d.close('ok'); render(main); Shell.pintarNav(); toast('Servicio terminado'); });
    $('#cvF', d).onsubmit = ev => {
      ev.preventDefault(); leer();
      if (v.frec === 'puntual' && !v.fecha) { $('#cvErr', d).textContent = 'Indica el día de entrada.'; $('#cvF1', d).focus(); return; }
      if (v.frec !== 'puntual' && v.hasta && v.desde && v.hasta < v.desde) { $('#cvErr', d).textContent = '«Hasta» no puede ser anterior a «desde».'; return; }
      const env = $('#cvEnv', d).checked;
      const n = Cae.guardarVisita({ ...v, id: v0?.id, enviadoEl: env ? (v.enviadoEl || hoyISO()) : '', confirmada: $('#cvConf', d).checked });
      d.close('ok'); Shell.pintarNav(); render(main);
      const est = Cae.estado(n); toast(edit ? 'Visita guardada' : `Visita creada${est?.total ? ' · ticket de seguimiento en Tareas' : ''}`);
    };
  }

  /* Desde un ticket o el panel: abrir una visita. */
  function abrirVisita(id) { pendienteVisita = id; vista = 'visitas'; if (location.hash === '#cae') Shell.refrescar(); else location.hash = '#cae'; }
  return { render, abrirVisita };
})();
