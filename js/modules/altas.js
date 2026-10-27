/*
 * Seguimiento de altas: de la oferta al primer día.
 * Lista de altas con progreso y estado automáticos; ficha de cada alta con el checklist por fases según el centro.
 * Al cerrarla se crea la ficha del empleado en la base cifrada.
 */
const ModAltas = (() => {
  const P = window.RRHH_PARAMS;
  let abierta = null, filtro = 'curso', fCentro = '';
  const ESTADO = { 'sin-iniciar': 'Sin iniciar', 'pendiente-docs': 'Pendiente de documentos', 'en-proceso': 'En proceso', bloqueada: 'Bloqueada', completada: 'Completada', cerrada: 'Cerrada' };
  const hoyISO = () => Fecha.iso(Fecha.hoy());
  const ini = n => (n || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const relativo = f => { if (!f) return ''; const dif = Math.round((Fecha.parse(f) - Fecha.hoy()) / DAY); return dif === 0 ? 'hoy' : dif === 1 ? 'mañana' : dif === -1 ? 'ayer' : dif > 0 ? `en ${dif} días` : `hace ${-dif} días`; };
  const chip = e => `<span class="achip ae-${e}">${ESTADO[e]}</span>`;

  /* Notas de la guía (referencias revisadas respecto al Excel). */
  const GUIA = {
    oferta: 'Enviar la carta de oferta (Documentos) y guardar la aceptación por escrito en el expediente.',
    docs: 'Si el domicilio no coincide con el del DNI/NIE, pedir la dirección actual. El Nº SS debe venir en un documento oficial. Modelo 145: art. 88 del Reglamento del IRPF.',
    gestoria: 'Enviar el formulario con al menos 2 días de margen: el alta en la Seguridad Social debe solicitarse antes del inicio de la actividad (RD 84/1996, art. 32).',
    firma: 'Contrato por escrito (ET art. 8). Copia básica a la representación legal en 10 días desde la firma (ET art. 8.4). Informar de la videovigilancia antes de empezar (LOPDGDD art. 89). Fábrica sin correo corporativo: autorización de correo personal.',
    sistemas: 'Vitaly es necesario para programar el reconocimiento médico (vigilancia de la salud, LPRL art. 22).',
    comunicaciones: 'El correo de bienvenida incluye el Plan de Igualdad. Plan de emergencias: LPRL art. 20. En fábrica, avisar a PRL y Calidad con las tallas.'
  };

  /* ---------- Lista ---------- */
  function tarjeta(a) {
    const e = MotorAltas.estado(a), p = MotorAltas.progreso(a), dOf = MotorAltas.diasDesdeOferta(a, hoyISO());
    return `<button class="alta-card ae-${e}" data-id="${a.id}">
      <span class="ac-h"><span class="avatar">${esc(ini(a.nombre))}</span><span class="ac-t"><b>${esc(a.nombre || 'Sin nombre')}</b><small>${esc(a.puesto || 'Puesto sin indicar')} · ${esc(a.centro)}</small></span>${chip(e)}</span>
      <span class="ac-bar"><i style="transform:scaleX(${p.pct})"></i></span>
      <span class="ac-m"><span>${p.hechos}/${p.total} pasos · ${Math.round(p.pct * 100)} %</span>
        ${a.fechaIncorporacion ? `<span>Incorporación ${Fecha.corta(Fecha.parse(a.fechaIncorporacion))} (${relativo(a.fechaIncorporacion)})</span>` : '<span>Sin fecha de incorporación</span>'}
        ${dOf !== null && !a.cerrada ? `<span>Oferta hace ${dOf} día${dOf === 1 ? '' : 's'}</span>` : ''}</span>
      ${a.bloqueante && !a.cerrada ? `<span class="ac-bloq">${icon('info')}${esc(a.bloqueante)}</span>` : ''}
    </button>`;
  }
  function lista(main) {
    const todas = Altas.todas(), curso = todas.filter(a => !a.cerrada), y = String(new Date().getFullYear());
    const l = todas.filter(a => (filtro === 'todas' || (filtro === 'curso') === !a.cerrada) && (!fCentro || a.centro === fCentro))
      .sort((a, b) => a.cerrada - b.cerrada || (a.fechaIncorporacion || '9999').localeCompare(b.fechaIncorporacion || '9999'));
    const prox = curso.filter(a => a.fechaIncorporacion && Fecha.parse(a.fechaIncorporacion) >= Fecha.hoy() && Fecha.parse(a.fechaIncorporacion) - Fecha.hoy() <= 7 * DAY).length;
    main.innerHTML = `<div class="view">
      <div class="page-h page-h-row"><div><a class="crumb" href="#inicio">← Inicio</a><h1>Seguimiento de altas</h1><p>De la oferta al primer día. Los pasos cambian según el centro, y el estado y el progreso se calculan solos.</p></div>
        <div class="page-acts"><button class="btn" id="nuevaAlta"><svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Nueva alta</button></div></div>
      <div class="kpis">
        <div class="kpi"><b>${curso.length}</b><span>en curso</span></div>
        <div class="kpi ${curso.some(a => MotorAltas.estado(a) === 'bloqueada') ? 'bad' : ''}"><b>${curso.filter(a => MotorAltas.estado(a) === 'bloqueada').length}</b><span>bloqueadas</span></div>
        <div class="kpi"><b>${prox}</b><span>se incorporan en 7 días</span></div>
        <div class="kpi"><b>${todas.filter(a => a.cerrada && (a.fechaCierre || '').startsWith(y)).length}</b><span>cerradas en ${y}</span></div>
      </div>
      <div class="toolbar">
        <div class="seg3" role="group" aria-label="Mostrar">${[['curso', 'En curso'], ['cerradas', 'Cerradas'], ['todas', 'Todas']].map(([k, n]) => `<button data-f="${k}" aria-pressed="${filtro === k}">${n}</button>`).join('')}</div>
        <label class="sel"><span class="sr">Centro</span><select id="aCentro"><option value="">Todos los centros</option>${P.centros.map(c => `<option ${fCentro === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
      </div>
      <div class="altas-grid">${l.map(tarjeta).join('') || `<div class="card empty-card"><p><b>${filtro === 'cerradas' ? 'Aún no has cerrado ninguna alta.' : 'No hay altas en curso.'}</b></p><p class="muted">Pulsa “Nueva alta” cuando un candidato reciba la oferta.</p></div>`}</div>
      ${guia()}
    </div>`;
    $$('[data-f]', main).forEach(b => b.onclick = () => { filtro = b.dataset.f; lista(main); });
    $('#aCentro').onchange = e => { fCentro = e.target.value; lista(main); };
    $('#nuevaAlta').onclick = () => nueva(main);
    $$('.alta-card', main).forEach(c => c.onclick = () => { abierta = Number(c.dataset.id); detalle(main); scrollTo(0, 0); });
  }

  function guia() {
    return `<details class="legal" style="margin-top:20px"><summary>Guía del proceso de alta<svg class="i" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></summary><div class="body">
      ${MotorAltas.FASES.map((f, i) => `<p><b>${i + 1}. ${f.nombre}.</b> ${GUIA[f.id]}</p>`).join('')}
      <p style="margin:0"><b>Además:</b> registro diario de jornada desde el primer día (ET art. 34.9) y periodo de prueba según el ET (art. 14) y el convenio.</p></div></details>`;
  }

  /* ---------- Nueva alta ---------- */
  function nueva(main, prefill = {}) {
    const puestos = P.puestos.map(p => p.puesto);
    const d = abrirModal(`<form id="naForm"><div class="dlg-b"><h2 style="font-size:20px;font-weight:600">Nueva alta</h2>
      <div class="row2"><div class="field"><label for="naNom">Nombre y apellidos</label><input id="naNom" required value="${esc(prefill.nombre || '')}"></div>
        <div class="field"><label for="naSx">Sexo</label><select id="naSx" required><option value="">— Elige —</option><option value="mujer" ${prefill.sexo === 'mujer' ? 'selected' : ''}>Mujer</option><option value="hombre" ${prefill.sexo === 'hombre' ? 'selected' : ''}>Hombre</option></select></div></div>
      <div class="row2"><div class="field"><label for="naCen">Centro</label><select id="naCen">${P.centros.map(c => `<option ${prefill.centro === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
        <div class="field"><label for="naPue">Puesto</label><input id="naPue" list="naPues" value="${esc(prefill.puesto || '')}"><datalist id="naPues">${puestos.map(p => `<option value="${esc(p)}">`).join('')}</datalist></div></div>
      <div class="row2"><div class="field"><label for="naDep">Departamento</label><select id="naDep"><option value="">Sin indicar</option>${P.departamentos.map(x => `<option ${prefill.departamento === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div>
        <div class="field"><label for="naSal">Salario bruto anual (€)</label><input id="naSal" inputmode="decimal" value="${esc(prefill.salario ?? '')}"></div></div>
      <div class="row2"><div class="field"><label for="naInc">Incorporación prevista</label><input type="date" id="naInc"></div>
        <div class="field"><label class="check" style="margin-top:30px"><input type="checkbox" id="naOf" ${prefill.ofertaEnviada ? 'checked' : ''}> Oferta ya enviada hoy</label></div></div>
      <p class="muted small">Los pasos de fábrica (talla de uniforme, correo personal y aviso a PRL y Calidad) se añaden solos si el centro es la fábrica.</p>
      </div><div class="dlg-f"><button type="button" class="btn ghost" id="naC">Cancelar</button><button class="btn">Crear alta</button></div></form>`);
    $('#naC', d).onclick = () => d.close('cancel');
    $('#naNom', d).focus();
    $('#naForm', d).onsubmit = e => {
      e.preventDefault();
      const sal = MotorEmpleados.importe($('#naSal', d).value), of = $('#naOf', d).checked;
      const a = Altas.crear({ nombre: $('#naNom', d).value.trim(), sexo: $('#naSx', d).value, centro: $('#naCen', d).value, puesto: $('#naPue', d).value.trim(), departamento: $('#naDep', d).value,
        salario: sal === null ? '' : sal, fechaIncorporacion: $('#naInc', d).value, ...(prefill.vacanteId ? { vacanteId: prefill.vacanteId } : {}), ...(of ? { check: { ofertaEnviada: true }, fechaOferta: hoyISO() } : {}) });
      if (prefill.vacanteId) Procesos.Vacantes.vincularAlta(prefill.vacanteId, prefill.nombre, a.id);
      d.close('ok'); Shell.pintarNav(); toast('Alta creada · tarea automática de documentación añadida');
      Ficus.decir('Alta en marcha. Te he apuntado una tarea con los documentos que faltan.', 'yay');
      abierta = a.id; if (main && location.hash === '#altas') detalle(main); else { location.hash = '#altas'; }
    };
  }

  /* ---------- Detalle de un alta ---------- */
  function detalle(main) {
    const a = Altas.todas().find(x => x.id === abierta); if (!a) { abierta = null; return lista(main); }
    const e = MotorAltas.estado(a), p = MotorAltas.progreso(a), fases = MotorAltas.fasesDe(a.centro), dOf = MotorAltas.diasDesdeOferta(a, hoyISO());
    const t = Altas.tareaDe(a.id);
    main.innerHTML = `<div class="view">
      <div class="page-h"><button class="crumb linkbtn" id="volver">← Altas</button>
        <div class="alta-top"><span class="avatar lg">${esc(ini(a.nombre))}</span><div><h1>${esc(a.nombre || 'Sin nombre')}</h1><p>${esc(a.puesto || 'Puesto sin indicar')} · ${esc(a.centro)}${a.departamento ? ' · ' + esc(a.departamento) : ''}</p></div>${chip(e)}</div></div>
      <div class="alta-layout">
        <div class="alta-main">
          <div class="card prog-card"><div class="prog-n"><b>${Math.round(p.pct * 100)} %</b><span>${p.hechos} de ${p.total} pasos</span></div><div class="ac-bar big"><i style="transform:scaleX(${p.pct})"></i></div>
            <div class="ac-m">${dOf !== null ? `<span>Oferta enviada hace ${dOf} día${dOf === 1 ? '' : 's'}</span>` : '<span>Oferta sin enviar</span>'}${a.fechaIncorporacion ? `<span>Incorporación ${Fecha.larga(Fecha.parse(a.fechaIncorporacion))} (${relativo(a.fechaIncorporacion)})</span>` : ''}${t && t.estado !== 'terminado' ? `<span>Tarea automática: ${esc(t.titulo.split(': ')[1] || '')}</span>` : ''}</div></div>
          ${fases.map(f => { const h = f.pasos.filter(x => a.check[x.id]).length; return `<section class="card fase"><div class="fase-h"><h3>${f.nombre}</h3><span class="ex ${h === f.pasos.length ? 'ok' : ''}">${h}/${f.pasos.length}</span></div>
            <ul class="pasos">${f.pasos.map(x => `<li><button class="paso${a.check[x.id] ? ' on' : ''}" role="checkbox" aria-checked="${!!a.check[x.id]}" data-paso="${x.id}" ${a.cerrada ? 'disabled' : ''}><span class="box"><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg></span>${esc(x.nombre)}${x.soloFabrica ? '<span class="tag">fábrica</span>' : ''}</button></li>`).join('')}</ul></section>`; }).join('')}
        </div>
        <aside class="alta-side">
          <section class="card"><h3 class="side-t">Datos del alta</h3>
            <div class="field"><label for="dNom">Nombre y apellidos</label><input id="dNom" data-campo="nombre" value="${esc(a.nombre)}"></div>
            <div class="field"><label for="dSx">Sexo</label><select id="dSx" data-campo="sexo"><option value="">Sin indicar</option><option value="mujer" ${a.sexo === 'mujer' ? 'selected' : ''}>Mujer</option><option value="hombre" ${a.sexo === 'hombre' ? 'selected' : ''}>Hombre</option></select></div>
            <div class="field"><label for="dCen">Centro</label><select id="dCen" data-campo="centro">${P.centros.map(c => `<option ${a.centro === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
            <div class="field"><label for="dPue">Puesto</label><input id="dPue" data-campo="puesto" list="dPues" value="${esc(a.puesto)}"><datalist id="dPues">${P.puestos.map(x => `<option value="${esc(x.puesto)}">`).join('')}</datalist></div>
            <div class="field"><label for="dDep">Departamento</label><select id="dDep" data-campo="departamento"><option value="">Sin indicar</option>${[...P.departamentos, ...(a.departamento && !P.departamentos.includes(a.departamento) ? [a.departamento] : [])].map(x => `<option ${a.departamento === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div>
            <div class="field"><label for="dSal">Salario bruto anual (€)</label><input id="dSal" data-campo="salario" inputmode="decimal" value="${a.salario === '' || a.salario == null ? '' : String(a.salario).replace('.', ',')}"></div>
            <div class="row2"><div class="field"><label for="dInc">Incorporación</label><input type="date" id="dInc" data-campo="fechaIncorporacion" value="${a.fechaIncorporacion || ''}"></div>
              <div class="field"><label for="dOf">Oferta enviada</label><input type="date" id="dOf" data-campo="fechaOferta" value="${a.fechaOferta || ''}"></div></div>
          </section>
          <section class="card"><h3 class="side-t">Bloqueante</h3>
            <div class="field"><label for="dBloq" class="sr">Bloqueante</label><input id="dBloq" data-campo="bloqueante" class="${a.bloqueante ? 'bloq-on' : ''}" value="${esc(a.bloqueante)}" placeholder="p. ej. Falta el Nº de la Seguridad Social"><div class="hint">Si escribes algo, el alta pasa a “Bloqueada”.</div></div>
            <div class="field"><label for="dObs">Observaciones</label><textarea id="dObs" data-campo="observaciones" rows="3">${esc(a.observaciones)}</textarea></div>
          </section>
          <section class="card acts-card">
            ${a.cerrada ? `<p class="muted" style="margin:0 0 10px">Alta cerrada el ${Fecha.larga(Fecha.parse(a.fechaCierre))}.</p>${a.empleadoId ? '<button class="btn ghost" id="verFicha">Ver ficha del empleado</button>' : ''}<button class="btn ghost" id="reabrir">Reabrir alta</button>`
              : `<button class="btn${e === 'completada' ? '' : ' ghost'}" id="cerrar">Cerrar alta y crear ficha de empleado</button>${e === 'completada' ? '' : `<p class="muted small" style="margin:6px 0 0">Faltan ${p.total - p.hechos} pasos; puedes cerrarla igualmente.</p>`}`}
            <button class="btn ghost danger" id="borrarAlta">Eliminar alta</button>
          </section>
        </aside>
      </div>
      ${guia()}
    </div>`;
    enlazarDetalle(main, a);
  }

  /* Marcar un paso sin repintar la pantalla: se actualiza solo lo que cambia (sin parpadeo). */
  function actualizar(main, a, b, on) {
    b.classList.toggle('on', on); b.setAttribute('aria-checked', on);
    if (on) burbuja(b);
    const e = MotorAltas.estado(a), p = MotorAltas.progreso(a), dOf = MotorAltas.diasDesdeOferta(a, hoyISO()), t = Altas.tareaDe(a.id);
    $('.prog-n', main).innerHTML = `<b>${Math.round(p.pct * 100)} %</b><span>${p.hechos} de ${p.total} pasos</span>`;
    $('.prog-card .ac-bar i', main).style.transform = `scaleX(${p.pct})`;
    $('.prog-card .ac-m', main).innerHTML = `${dOf !== null ? `<span>Oferta enviada hace ${dOf} día${dOf === 1 ? '' : 's'}</span>` : '<span>Oferta sin enviar</span>'}${a.fechaIncorporacion ? `<span>Incorporación ${Fecha.larga(Fecha.parse(a.fechaIncorporacion))} (${relativo(a.fechaIncorporacion)})</span>` : ''}${t && t.estado !== 'terminado' ? `<span>Tarea automática: ${esc(t.titulo.split(': ')[1] || '')}</span>` : ''}`;
    $$('.fase', main).forEach(sec => { const bs = $$('.paso', sec), h = bs.filter(x => x.classList.contains('on')).length, ex = $('.fase-h .ex', sec); ex.textContent = `${h}/${bs.length}`; ex.classList.toggle('ok', h === bs.length); });
    const ch = $('.alta-top .achip', main); if (ch) { ch.className = `achip ae-${e}`; ch.textContent = ESTADO[e]; }
    const dOfIn = $('#dOf', main); if (dOfIn && a.fechaOferta && dOfIn.value !== a.fechaOferta) dOfIn.value = a.fechaOferta;
    const c = $('#cerrar', main);
    if (c) { c.classList.toggle('ghost', e !== 'completada'); const nota = c.nextElementSibling?.matches('p') ? c.nextElementSibling : null;
      if (e === 'completada') nota?.remove();
      else if (nota) nota.textContent = `Faltan ${p.total - p.hechos} pasos; puedes cerrarla igualmente.`;
      else c.insertAdjacentHTML('afterend', `<p class="muted small" style="margin:6px 0 0">Faltan ${p.total - p.hechos} pasos; puedes cerrarla igualmente.</p>`); }
  }
  /* Efecto burbuja: la casilla se infla, estalla y suelta unas gotas. */
  function burbuja(b) {
    if (reduceMotion) return;
    const box = $('.box', b);
    box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
    const w = document.createElement('span'); w.className = 'burst'; w.setAttribute('aria-hidden', 'true');
    w.innerHTML = '<i class="bring"></i>' + Array.from({ length: 8 }, (_, i) => `<i class="dot" style="--a:${i * 45 + (Math.random() * 16 - 8)}deg;--d:${18 + Math.random() * 8}px"></i>`).join('');
    box.append(w); setTimeout(() => { w.remove(); box.classList.remove('pop'); }, 700);
  }

  function enlazarDetalle(main, a) {
    $('#volver').onclick = () => { abierta = null; lista(main); scrollTo(0, 0); };
    $$('.paso', main).forEach(b => b.onclick = () => {
      if (!b.isConnected) return;
      const on = !b.classList.contains('on');
      const nueva = Altas.marcar(a.id, b.dataset.paso, on); Shell.pintarNav();
      if (on && MotorAltas.estado(nueva) === 'completada') Ficus.decir('¡Alta completa! Ya puedes cerrarla y crear su ficha.', 'yay');
      else if (on && b.dataset.paso === 'ofertaEnviada') toast('Fecha de oferta guardada: hoy');
      actualizar(main, nueva, b, on);
    });
    $$('[data-campo]', main).forEach(inp => inp.onchange = () => {
      let v = inp.value.trim();
      if (inp.dataset.campo === 'salario') { const n = MotorEmpleados.importe(v); if (n === null) { toast('Salario no válido'); return; } v = n; }
      Altas.editar(a.id, { [inp.dataset.campo]: v }); Shell.pintarNav();
      // Se repinta después del evento (el cambio puede venir de perder el foco al pulsar otro elemento).
      if (['centro', 'bloqueante', 'nombre', 'fechaIncorporacion', 'fechaOferta'].includes(inp.dataset.campo)) setTimeout(() => { if (abierta === a.id) { const y = scrollY; detalle(main); scrollTo(0, y); } }, 0);
      else toast('Guardado');
    });
    $('#borrarAlta').onclick = () => {
      const q = Altas.eliminar(a.id); abierta = null; lista(main); Shell.pintarNav();
      toast('Alta eliminada', { texto: 'Deshacer', fn: () => { Altas.restaurar(q); lista(main); Shell.pintarNav(); } });
    };
    $('#reabrir') && ($('#reabrir').onclick = () => { Altas.editar(a.id, { cerrada: false, fechaCierre: '' }); detalle(main); });
    $('#verFicha') && ($('#verFicha').onclick = () => { ModEmpleados.abrir(a.empleadoId); location.hash = '#empleados'; });
    $('#cerrar') && ($('#cerrar').onclick = () => cerrar(main, a));
  }

  /* Cerrar el alta: crea la ficha en la base de empleados (pide la contraseña si está bloqueada). */
  async function cerrar(main, a) {
    if (!Empleados.configurado()) {
      const d = abrirModal(`<div class="dlg-b"><h2 style="font-size:20px;font-weight:600">Primero crea la base de empleados</h2><p>Para crear la ficha hace falta la base de empleados, protegida con contraseña. Solo se hace una vez.</p></div>
        <div class="dlg-f"><button class="btn ghost" id="x">Ahora no</button><a class="btn" href="#empleados" id="ir">Ir a Empleados</a></div>`);
      $('#x', d).onclick = () => d.close(); $('#ir', d).onclick = () => d.close(); return;
    }
    if (!Empleados.desbloqueado && !(await pedirPassword())) return;
    ModEmpleados.ficha(null, null, {
      prefill: { ...MotorEmpleados.partirNombre(a.nombre), sexo: a.sexo || '', centro: a.centro, puesto: a.puesto, departamento: a.departamento, salario: a.salario, fechaContratacion: a.fechaIncorporacion },
      alGuardar: emp => { Altas.editar(a.id, { cerrada: true, fechaCierre: hoyISO(), empleadoId: emp.id }); Shell.pintarNav(); detalle(main); Ficus.decir(`¡Bienvenida a ${emp.nombre.split(' ')[0]}! Alta cerrada y ficha creada.`, 'yay'); setTimeout(() => ModPruebas.formulario(null, { empleadoId: emp.id, inicio: emp.fechaContratacion, desdeAlta: true }), 400); }
    });
  }
  function pedirPassword() {
    return new Promise(res => {
      let ok = false;
      const d = abrirModal(`<form id="pp"><div class="dlg-b"><h2 style="font-size:20px;font-weight:600">Desbloquear empleados</h2>
        <div class="field"><label for="ppw">Contraseña de la base de empleados</label><input type="password" id="ppw" required autocomplete="current-password"></div><p class="form-err" id="ppErr" role="alert"></p></div>
        <div class="dlg-f"><button type="button" class="btn ghost" id="ppC">Cancelar</button><button class="btn">Desbloquear</button></div></form>`, { alCerrar: () => res(ok) });
      $('#ppw', d).focus();
      $('#ppC', d).onclick = () => d.close('cancel');
      $('#pp', d).onsubmit = async e => { e.preventDefault(); if (await Empleados.desbloquear($('#ppw', d).value)) { ok = true; d.close('ok'); } else { $('#ppErr', d).textContent = 'Contraseña incorrecta.'; } };
    });
  }

  function render(main) { if (abierta) detalle(main); else lista(main); }
  return { render, nueva, abrir: id => { abierta = id; }, ESTADO, pedirPassword };
})();
