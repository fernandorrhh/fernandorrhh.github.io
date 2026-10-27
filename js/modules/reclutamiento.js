/* Reclutamiento: vacantes con canales, cribado y entrevistas por sexo, selección y enlace con Altas. */
const ModReclutamiento = (() => {
  const P = window.RRHH_PARAMS, C = P.procesos;
  let filtro = 'abiertas', pendienteAbrir = null;
  const hoyISO = () => Fecha.iso(Fecha.hoy());
  const f = s => s ? Fecha.larga(Fecha.parse(s)) : '—';
  const V = () => Procesos.Vacantes;
  const FASE_CLS = { publicada: 'ae-sin-iniciar', cribado: 'ae-pendiente-docs', entrevistas: 'ae-en-proceso', seleccion: 'ae-completada', cerrada: 'ae-cerrada' };
  const nombreFase = (v) => { const fa = MotorProcesos.faseVacante(v); return fa === 'cerrada' ? MotorProcesos.CIERRES[v.estado] : Object.fromEntries(MotorProcesos.FASES)[fa]; };
  const abrir = id => { pendienteAbrir = id; location.hash = '#reclutamiento'; };

  function render(main) {
    const l = V().todas(), anio = String(new Date().getFullYear());
    const abiertas = l.filter(v => (v.estado || 'abierta') === 'abierta');
    const delAnio = l.filter(v => v.apertura?.startsWith(anio));
    const sum = (k, s) => delAnio.reduce((a, v) => a + (Number(v[k]?.[s]) || 0), 0);
    main.innerHTML = `<div class="view">
      <div class="page-h page-h-row"><div><a class="crumb" href="#inicio">← Inicio</a><h1>Reclutamiento</h1><p>Vacantes: dónde se publican, cuántas mujeres y hombres se presentan y se entrevistan, y a quién se contrata.</p></div>
        <button class="btn" id="vNueva"><svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Nueva vacante</button></div>
      <div class="aus-stats">
        <div class="stat hl"><small>Vacantes abiertas</small><b>${abiertas.length}</b><span class="sub">${abiertas.slice(0, 2).map(v => esc(v.puesto)).join(', ') || 'Ninguna'}</span></div>
        <div class="stat"><small>Candidaturas ${anio}</small><b>${sum('candidaturas', 'm') + sum('candidaturas', 'h')}</b><span class="sub sx-txt"><i class="m"></i>${sum('candidaturas', 'm')} mujeres · <i class="h"></i>${sum('candidaturas', 'h')} hombres</span></div>
        <div class="stat"><small>Entrevistas ${anio}</small><b>${sum('entrevistas', 'm') + sum('entrevistas', 'h')}</b><span class="sub sx-txt"><i class="m"></i>${sum('entrevistas', 'm')} mujeres · <i class="h"></i>${sum('entrevistas', 'h')} hombres</span></div>
        <div class="stat"><small>Cubiertas ${anio}</small><b>${delAnio.filter(v => v.estado === 'cubierta').length}</b><span class="sub">de ${delAnio.length} abiertas este año</span></div>
      </div>
      <div class="toolbar"><div class="seg3" role="group" aria-label="Mostrar">${[['abiertas', 'Abiertas'], ['cerradas', 'Cerradas'], ['todas', 'Todas']].map(([k, n]) => `<button data-vf="${k}" aria-pressed="${filtro === k}">${n}</button>`).join('')}</div></div>
      <div id="vList" class="aus-list"></div>
      ${Calc.legal('Cómo funciona', `<p>Cada vacante avanza sola por las fases: <b>publicada → cribado</b> (al anotar candidaturas) <b>→ entrevistas → selección</b> (al anotar a la persona elegida) <b>→ cerrada</b> (cubierta, desierta o cancelada).</p>
        <p>Solo se guardan <b>recuentos por sexo</b>, sin datos de las candidaturas. De la persona seleccionada, el nombre y el sexo, para crear su alta con un clic.</p>
        <p style="margin:0">Los datos alimentan el informe <b>Selección y contratación</b> (Informes), que pide el plan de igualdad (RD 901/2020, anexo: proceso de selección y contratación).</p>`)}
    </div>`;
    pintarLista(main);
    $('#vNueva').onclick = () => formulario(main, {});
    $$('[data-vf]').forEach(b => b.onclick = () => { filtro = b.dataset.vf; $$('[data-vf]').forEach(x => x.setAttribute('aria-pressed', x === b)); pintarLista(main); });
    if (pendienteAbrir) { const v = V().buscar(pendienteAbrir); pendienteAbrir = null; if (v) formulario(main, v); }
  }

  function pintarLista(main) {
    const hoy = hoyISO();
    let l = V().todas();
    if (filtro === 'abiertas') l = l.filter(v => (v.estado || 'abierta') === 'abierta'); else if (filtro === 'cerradas') l = l.filter(v => v.estado && v.estado !== 'abierta');
    l.sort((a, b) => b.apertura.localeCompare(a.apertura));
    const box = $('#vList');
    if (!l.length) { box.innerHTML = `<div class="empty-mini"><p class="muted">${filtro === 'abiertas' ? 'No hay vacantes abiertas.' : 'No hay vacantes con este filtro.'}</p></div>`; return; }
    box.innerHTML = l.map((v, i) => {
      const fa = MotorProcesos.faseVacante(v), idx = MotorProcesos.FASES.findIndex(x => x[0] === fa), e = MotorProcesos.embudo(v);
      const barra = (o) => { const t = o.m + o.h; return t ? `<span class="sx-bar wide"><i class="m" style="width:${o.m / t * 100}%"></i><i class="h" style="width:${o.h / t * 100}%"></i></span>` : '<span class="sx-bar wide"></span>'; };
      return `<button class="aus-card vac-card" data-v="${v.id}" style="--tc:var(--brand);--i:${Math.min(i, 8)}">
        <span class="aus-top"><span class="aus-who"><b>${esc(v.puesto)}${v.plazas > 1 ? ` · ${v.plazas} plazas` : ''}</b><small>${esc(v.centro || '')}${v.departamento ? ' · ' + esc(v.departamento) : ''}</small></span><span class="achip ${FASE_CLS[fa]}">${esc(nombreFase(v))}</span></span>
        <span class="fases">${MotorProcesos.FASES.map((x, j) => `<i class="${j <= idx ? 'on' : ''}" title="${x[1]}"></i>`).join('')}</span>
        <span class="vac-nums"><span><small>Candidaturas</small><b>${e.candidaturas.m + e.candidaturas.h}</b>${barra(e.candidaturas)}<em>${e.candidaturas.m} M · ${e.candidaturas.h} H</em></span>
          <span><small>Entrevistas</small><b>${e.entrevistas.m + e.entrevistas.h}</b>${barra(e.entrevistas)}<em>${e.entrevistas.m} M · ${e.entrevistas.h} H</em></span></span>
        <span class="aus-dates"><span class="muted">Abierta el ${f(v.apertura)} · ${MotorProcesos.diasAbierta(v, hoy)} días${v.cierre ? ` · cerrada el ${f(v.cierre)}` : ''}</span></span>
        <span class="aus-foot">${(v.canales || []).map(c => `<span class="tag">${esc(c === 'Otro' && v.otroCanal ? v.otroCanal : c)}</span>`).join('')}${(v.seleccionados || []).map(s => `<span class="tag nom">${esc(s.nombre)}${s.altaId ? ' · alta creada' : ''}</span>`).join('')}</span>
      </button>`;
    }).join('');
    $$('[data-v]', box).forEach(b => b.onclick = () => formulario(main, V().buscar(Number(b.dataset.v))));
  }

  /* Ventana de la vacante: datos, cribado, entrevistas, selección y cierre. */
  function formulario(main, v0) {
    const editando = !!v0.id;
    let v = { apertura: Fecha.iso(Fecha.hoy()), puesto: '', departamento: '', centro: P.centros[0], plazas: 1, responsable: '', canales: [], otroCanal: '', notas: '', candidaturas: { m: 0, h: 0 }, entrevistas: { m: 0, h: 0 }, seleccionados: [], estado: 'abierta', cierre: '', ...structuredClone(v0) };
    const puestos = P.puestos.map(p => p.puesto);
    const resp = Empleados.desbloqueado ? MotorEmpleados.valores(Empleados.todos(), 'responsable') : [];
    const num = (id, val, lbl) => `<div class="field num-field"><label for="${id}">${lbl}</label><div class="stepper"><button type="button" data-step="${id}" data-d="-1" aria-label="Restar">−</button><input id="${id}" type="number" min="0" inputmode="numeric" value="${val}"><button type="button" data-step="${id}" data-d="1" aria-label="Sumar">+</button></div></div>`;
    const d = abrirModal(`<form id="vF" novalidate><div class="dlg-b vac-dlg">
      <h2 style="font-size:20px;font-weight:600;margin:0 0 4px">${editando ? esc(v.puesto) : 'Nueva vacante'}</h2>
      <div class="vac-steps">${MotorProcesos.FASES.slice(0, 4).map((x, j) => `<span data-paso-v="${j}">${j + 1}. ${x[1]}</span>`).join('')}</div>
      <section class="vac-sec"><h3>1 · Vacante y publicación</h3>
        <div class="row2"><div class="field"><label for="vPue">Puesto</label><input id="vPue" list="vPues" value="${esc(v.puesto)}" required><datalist id="vPues">${puestos.map(p => `<option value="${esc(p)}">`).join('')}</datalist></div>
          <div class="field"><label for="vApe">Fecha de apertura</label><input type="date" id="vApe" value="${v.apertura}"></div></div>
        <div class="row3"><div class="field"><label for="vCen">Centro</label><select id="vCen">${P.centros.map(c => `<option ${v.centro === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
          <div class="field"><label for="vDep">Departamento</label><select id="vDep"><option value="">—</option>${P.departamentos.map(x => `<option ${v.departamento === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div>
          <div class="field"><label for="vPla">Plazas</label><input id="vPla" type="number" min="1" value="${v.plazas || 1}"></div></div>
        <div class="field"><label for="vRes">Responsable de la vacante</label><input id="vRes" list="vResL" value="${esc(v.responsable || '')}"><datalist id="vResL">${resp.map(x => `<option value="${esc(x)}">`).join('')}</datalist></div>
        <div><span class="flabel">Dónde se publica</span><div class="chips-sel" id="vCan">${C.canales.map(c => `<button type="button" role="checkbox" data-can="${esc(c)}" aria-checked="${v.canales.includes(c)}">${esc(c)}</button>`).join('')}</div>
          <div class="field" id="vOtroBox" style="margin-top:8px" ${v.canales.includes('Otro') ? '' : 'hidden'}><label for="vOtro" class="sr">Otro canal</label><input id="vOtro" value="${esc(v.otroCanal || '')}" placeholder="¿Cuál?"></div></div>
      </section>
      <section class="vac-sec"><h3>2 · Cribado: candidaturas recibidas</h3><div class="row2">${num('vCm', v.candidaturas.m, '<i class="sxd m"></i>Mujeres')}${num('vCh', v.candidaturas.h, '<i class="sxd h"></i>Hombres')}</div></section>
      <section class="vac-sec"><h3>3 · Entrevistas</h3><div class="row2">${num('vEm', v.entrevistas.m, '<i class="sxd m"></i>Mujeres entrevistadas')}${num('vEh', v.entrevistas.h, '<i class="sxd h"></i>Hombres entrevistados')}</div></section>
      <section class="vac-sec"><h3>4 · Selección</h3>
        <ul class="sel-list" id="vSel"></ul>
        <div class="sel-add"><div class="field"><label for="vSn">Persona seleccionada</label><input id="vSn" placeholder="Nombre y apellidos"></div>
          <div class="field"><label for="vSs">Sexo</label><select id="vSs"><option value="">—</option><option value="mujer">Mujer</option><option value="hombre">Hombre</option></select></div>
          <button type="button" class="btn ghost sm" id="vSadd">Añadir</button></div>
      </section>
      <section class="vac-sec"><h3>Cierre</h3>
        <div class="row2"><div class="field"><label for="vEst">Estado</label><select id="vEst"><option value="abierta">Abierta</option>${Object.entries(MotorProcesos.CIERRES).map(([k, n]) => `<option value="${k}" ${v.estado === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          <div class="field"><label for="vCie">Fecha de cierre</label><input type="date" id="vCie" value="${v.cierre || ''}"></div></div>
        <div class="field"><label for="vNot">Notas <span class="muted" style="font-weight:400">(sin datos de las candidaturas)</span></label><input id="vNot" maxlength="160" value="${esc(v.notas || '')}"></div>
      </section>
      <p class="form-err" id="vErr" role="alert"></p>
    </div><div class="dlg-f">${editando ? '<button type="button" class="btn ghost danger" id="vDel" style="margin-right:auto">Eliminar</button>' : ''}<button type="button" class="btn ghost" id="vCancel">Cancelar</button><button class="btn">${editando ? 'Guardar' : 'Abrir vacante'}</button></div></form>`, { ancho: 720 });

    const leer = () => ({ ...v, puesto: $('#vPue', d).value.trim(), apertura: $('#vApe', d).value, centro: $('#vCen', d).value, departamento: $('#vDep', d).value, plazas: Math.max(1, Calc.ent($('#vPla', d).value) || 1),
      responsable: $('#vRes', d).value.trim(), otroCanal: $('#vOtro', d).value.trim(), notas: $('#vNot', d).value.trim(),
      candidaturas: { m: Calc.ent($('#vCm', d).value), h: Calc.ent($('#vCh', d).value) }, entrevistas: { m: Calc.ent($('#vEm', d).value), h: Calc.ent($('#vEh', d).value) },
      estado: $('#vEst', d).value, cierre: $('#vEst', d).value === 'abierta' ? '' : ($('#vCie', d).value || Fecha.iso(Fecha.hoy())) });
    function pasos() { const fa = MotorProcesos.faseVacante({ ...leer(), estado: 'abierta' }), idx = MotorProcesos.FASES.findIndex(x => x[0] === fa); $$('[data-paso-v]', d).forEach(s => s.classList.toggle('on', Number(s.dataset.pasoV) <= idx)); }
    function pintarSel() {
      $('#vSel', d).innerHTML = v.seleccionados.length ? v.seleccionados.map((s, i) => `<li><span class="avatar">${esc(s.nombre.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase())}</span><span><b>${esc(s.nombre)}</b><small>${s.sexo === 'mujer' ? 'Mujer' : s.sexo === 'hombre' ? 'Hombre' : 'Sexo sin indicar'}</small></span>
        ${s.altaId && Altas.todas().some(a => a.id === s.altaId) ? `<button type="button" class="btn ghost sm" data-ver-alta="${s.altaId}">Ver alta</button>` : `<button type="button" class="btn sm" data-crear-alta="${i}">Crear alta</button>`}
        <button type="button" class="icon-act" data-quitar="${i}" aria-label="Quitar"><svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></li>`).join('') : '<li class="muted small">Aún no hay nadie seleccionado.</li>';
      $$('[data-quitar]', d).forEach(b => b.onclick = () => { v.seleccionados.splice(Number(b.dataset.quitar), 1); pintarSel(); pasos(); });
      $$('[data-ver-alta]', d).forEach(b => b.onclick = () => { guardar(true); d.close('ok'); ModAltas.abrir(Number(b.dataset.verAlta)); location.hash = '#altas'; });
      $$('[data-crear-alta]', d).forEach(b => b.onclick = () => {
        const s = v.seleccionados[Number(b.dataset.crearAlta)], g = guardar(true); if (!g) return;
        d.close('ok'); ModAltas.nueva(null, { nombre: s.nombre, sexo: s.sexo, puesto: g.puesto, centro: g.centro, departamento: g.departamento, vacanteId: g.id, ofertaEnviada: true });
      });
    }
    function guardar(silencio = false) {
      const n = leer(), err = MotorProcesos.validarVacante(n);
      if (err.length) { $('#vErr', d).textContent = err.join(' · '); return null; }
      v = V().guardar(n); if (!silencio) toast(editando ? 'Vacante guardada' : 'Vacante abierta'); pintarLista(main); return v;
    }
    $$('[data-can]', d).forEach(b => b.onclick = () => { const c = b.dataset.can, on = !v.canales.includes(c); v.canales = on ? [...v.canales, c] : v.canales.filter(x => x !== c); b.setAttribute('aria-checked', on); $('#vOtroBox', d).hidden = !v.canales.includes('Otro'); });
    $$('[data-step]', d).forEach(b => b.onclick = () => { const i = $('#' + b.dataset.step, d); i.value = Math.max(0, Calc.ent(i.value) + Number(b.dataset.d)); pasos(); });
    $('#vF', d).addEventListener('input', pasos);
    $('#vSadd', d).onclick = () => { const n = $('#vSn', d).value.trim(), s = $('#vSs', d).value; if (!n) { $('#vSn', d).focus(); return; } if (!s) { $('#vErr', d).textContent = 'Indica el sexo de la persona seleccionada.'; return; } $('#vErr', d).textContent = ''; v.seleccionados = [...v.seleccionados, { nombre: n, sexo: s }]; $('#vSn', d).value = ''; $('#vSs', d).value = ''; pintarSel(); pasos(); };
    $('#vEst', d).onchange = e => { if (e.target.value !== 'abierta' && !$('#vCie', d).value) $('#vCie', d).value = Fecha.iso(Fecha.hoy()); };
    $('#vCancel', d).onclick = () => d.close('cancel');
    $('#vDel', d) && ($('#vDel', d).onclick = () => { const q = V().eliminar(v.id); d.close('ok'); render(main); toast('Vacante eliminada', { texto: 'Deshacer', fn: () => { V().restaurar(q); render(main); } }); });
    $('#vF', d).onsubmit = e => { e.preventDefault(); if (guardar()) { d.close('ok'); render(main); } };
    pintarSel(); pasos();
  }

  return { render, abrir };
})();
