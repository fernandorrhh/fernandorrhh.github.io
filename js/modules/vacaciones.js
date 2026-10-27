/* Calculadora de vacaciones (interfaz). El cálculo está en js/engines/vacaciones.js. */
const ModVacaciones = (() => {
  const P = window.RRHH_PARAMS;
  const HTML = () => `
<div class="view">
  <div class="page-h">
    <a class="crumb" href="#inicio">← Inicio</a>
    <h1>Vacaciones</h1>
    <p>Cuántos días ha generado una persona hasta hoy, cuántos tendrá a una fecha concreta y cuántos le quedan por disfrutar.</p>
  </div>
  <div class="calc">
    <form class="card form" id="vf" autocomplete="off" onsubmit="return false">
      <div id="empSel"></div>
      <div class="field"><label for="v-ini">Inicio del contrato</label><input type="date" id="v-ini" required></div>
      <div class="row2">
        <div class="field"><label for="v-anio">Año de cálculo</label><input type="number" id="v-anio" min="2000" max="2100"></div>
        <div class="field"><label for="v-cons">Días consumidos</label><input type="number" id="v-cons" min="0" step="1" value="0" inputmode="numeric"></div>
      </div>
      <div class="field"><label for="v-fin">Fecha de fin <span class="muted" style="font-weight:400">(opcional)</span></label><input type="date" id="v-fin"><div class="hint">Para bajas o finiquito. Si la dejas vacía, se calcula a 31 de diciembre.</div></div>
      <details class="opt">
        <summary><svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Más opciones</summary>
        <div class="inner">
          <div class="field"><label for="v-prev">Pendientes del año anterior</label><input type="number" id="v-prev" min="0" step="1" value="0" inputmode="numeric"><div class="hint">Solo si una IT impidió disfrutarlos (máx. 18 meses).</div></div>
          <div class="field"><label for="v-sin">Días sin devengo</label><input type="number" id="v-sin" min="0" step="1" value="0" inputmode="numeric"><div class="hint">Excedencia, permiso no retribuido… Días naturales.</div></div>
        </div>
      </details>
    </form>
    <div class="result" aria-live="polite">
      <div id="v-empty" class="note">${icon('info')}<div>Introduce la fecha de inicio del contrato para ver el resultado.</div></div>
      <div id="v-out" hidden>
        <div class="big">
          <div class="stat"><small>Generados a hoy</small><b><span data-n="genHoy">0</span><em>días</em></b><span class="sub" id="r-genHoyEx"></span></div>
          <div class="stat"><small id="r-finLabel">Generados a 31/12</small><b><span data-n="genFin">0</span><em>días</em></b><span class="sub" id="r-genFinEx"></span></div>
          <div class="stat hl"><small>Pendientes de disfrutar</small><b><span data-n="pendHoy">0</span><em>días</em></b><span class="sub" id="r-pendFin"></span></div>
        </div>
        <div class="card" style="margin-top:18px">
          <div class="card-h"><h3>Sus días, de un vistazo</h3><span class="ex" id="r-tot"></span></div>
          <div class="days" id="days"></div>
          <div class="keys">
            <span><i style="background:var(--brand)"></i>Disfrutados</span>
            <span><i style="background:var(--surface-3);border:1px solid var(--border-strong)"></i>Generados, sin disfrutar</span>
            <span><i style="border:1.5px dashed var(--border-strong)"></i>Por generar</span>
            <span><i style="background:repeating-linear-gradient(45deg,var(--surface-2) 0 3px,transparent 3px 6px);border:1px solid var(--brand-2)"></i>Año anterior</span>
            <span><i style="background:repeating-linear-gradient(45deg,var(--danger-bg) 0 3px,transparent 3px 6px);border:1px solid var(--danger)"></i>De más</span>
          </div>
        </div>
        <div class="card" style="margin-top:18px">
          <div class="card-h"><h3 id="r-tlTitle">Periodo de devengo</h3></div>
          <div class="tl"><div class="base"><div class="span" id="tlSpan"></div><div class="done" id="tlDone"></div></div>
            <div class="mk" id="mkIni" style="left:0"><span id="mkIniT"></span></div>
            <div class="mk today" id="mkHoy" style="left:0"><span>Hoy</span></div></div>
          <div class="months"><span>E</span><span>F</span><span>M</span><span>A</span><span>M</span><span>J</span><span>J</span><span>A</span><span>S</span><span>O</span><span>N</span><span>D</span></div>
        </div>
        <div class="notes" id="notes" style="margin-top:18px"></div>
      </div>
      <details class="legal">
        <summary>Cómo se calcula y base legal<svg class="i" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></summary>
        <div class="body">
          <p><code>${P.vacaciones.diasLaborables} × días de alta en el año ÷ días del año</code>, redondeado siempre al alza.</p>
          <p id="r-formula"></p>
          <p><b>Convenio, art. 12:</b> ${P.vacaciones.diasLaborables} jornadas laborables, en proporción al tiempo efectivamente trabajado. Cuentan como trabajado la IT, las licencias retribuidas, el accidente de trabajo y la suspensión por nacimiento y cuidado del menor.</p>
          <p><b>ET, art. 38:</b> mínimo de 30 días naturales; se aplica el convenio por ser más favorable.</p>
          <p style="margin:0">${P.convenio.boe} · ${esc(P.convenio.vigencia)}.</p>
        </div>
      </details>
    </div>
  </div>
</div>`;

  let pendienteEmp = null;
  /* Abre la calculadora con un empleado ya elegido (desde su ficha o el buscador). */
  function paraEmpleado(id) { pendienteEmp = id; if (location.hash === '#vacaciones') Shell.refrescar(); else location.hash = '#vacaciones'; }

  function render(main) {
    main.innerHTML = HTML();
    const hoy = Fecha.iso(Fecha.hoy()), days = $('#days');
    $('#v-anio').value = new Date().getFullYear();
    const num = id => Math.max(0, Math.floor(Number($(id).value) || 0));
    function update() {
      const anio = Number($('#v-anio').value) || new Date().getFullYear();
      const prev = num('#v-prev'), cons = num('#v-cons');
      const r = MotorVacaciones.calcular({ inicio: $('#v-ini').value, anio, fin: $('#v-fin').value || null, hoy, consumidos: cons, pendAnterior: prev, sinDevengo: num('#v-sin'), diasConvenio: P.vacaciones.diasLaborables });
      $('#v-empty').hidden = !!r; $('#v-out').hidden = !r;
      if (!r) return;
      countTo($('[data-n=genHoy]'), r.genHoy); countTo($('[data-n=genFin]'), r.genFin); countTo($('[data-n=pendHoy]'), Math.max(0, r.pendHoy));
      $('#r-genHoyEx').textContent = `${dec(r.exHoy)} exactos · ${r.altaHoy} días de alta`;
      $('#r-finLabel').textContent = r.conFin ? `Generados al ${Fecha.larga(r.hasta)}` : `Generados a 31/12/${anio}`;
      $('#r-genFinEx').textContent = `${dec(r.exFin)} exactos · ${r.altaFin} días de alta`;
      const fin = r.conFin ? 'fecha de fin' : 'final de año';
      $('#r-pendFin').textContent = (r.pendHoy < 0 ? `${-r.pendHoy} disfrutados por adelantado · ` : '') + (r.pendFin >= 0 ? `${r.pendFin} a ${fin}` : `${-r.pendFin} de más a ${fin}`);
      $('#r-tot').textContent = `${r.genFin + prev} días en ${anio}`;
      const total = Math.max(P.vacaciones.diasLaborables + prev, cons), cells = [];
      for (let i = 0; i < total; i++) {
        let c = 'd' + (i < prev ? ' prev' : '');
        if (i < cons) c = 'd ' + (i < r.genFin + prev ? 'used' : 'over');
        else if (i < r.genHoy + prev) c += ' gen';
        cells.push(c);
      }
      if (days.children.length !== total) days.innerHTML = cells.map((c, i) => `<div class="${c}" style="--i:${i}">${i + 1}</div>`).join('');
      else cells.forEach((c, i) => { if (days.children[i].className !== c) days.children[i].className = c; });
      const L = t => Math.min(100, Math.max(0, (t - r.yIni) / (r.yFin - r.yIni) * 100));
      const a = L(r.desde), b = L(r.hasta), c = L(r.corte), hoyT = Fecha.hoy();
      $('#tlSpan').style.transform = `translateX(${a}%) scaleX(${Math.max(0, (b - a) / 100)})`;
      $('#tlDone').style.transform = `translateX(${a}%) scaleX(${Math.max(0, (c - a) / 100)})`;
      $('#mkIni').style.left = a + '%'; $('#mkIniT').textContent = r.desde > r.yIni ? 'Alta ' + Fecha.larga(r.desde).slice(0, 5) : '1 ene';
      $('#mkHoy').style.left = c + '%'; $('#mkHoy').style.display = (hoyT >= r.yIni && hoyT <= r.yFin) ? '' : 'none';
      $('#r-tlTitle').textContent = `Periodo de devengo ${anio}` + (r.conFin ? ` · hasta el ${Fecha.larga(r.hasta)}` : '');
      const n = [];
      if (r.fueraDeAnio) n.push(['warn', 'El contrato no estuvo en vigor durante este año: no se generan vacaciones.']);
      if (r.pendFin < 0) n.push(['warn', `Ha disfrutado <b>${-r.pendFin} días más</b> de los que habrá generado${r.conFin ? ' a la fecha de fin' : ''}. Si finaliza la relación, se descuentan en el finiquito.`]);
      else if (r.conFin && r.pendFin > 0) n.push(['', `A la fecha de fin le quedarán <b>${r.pendFin} días</b> sin disfrutar: se abonan en el finiquito.`]);
      if (prev > 0) n.push(['', `Incluye ${prev} días del año anterior. Solo si una IT impidió disfrutarlos y dentro de los 18 meses siguientes al final de su año.`]);
      $('#notes').innerHTML = n.map(([k, t]) => `<div class="note ${k}">${icon('info')}<div>${t}</div></div>`).join('');
      $('#r-formula').innerHTML = `Este caso: <code>${P.vacaciones.diasLaborables} × ${r.altaFin} ÷ ${r.diasAnio} = ${dec(r.exFin)}</code> → <b>${r.genFin} días</b>.`;
    }
    $('#vf').addEventListener('input', update);
    selectorEmpleado(update);
    update();
  }

  /* "Calcular para: empleado / manual" (solo con la base de empleados abierta). */
  function selectorEmpleado(update) {
    const caja = $('#empSel');
    if (!Empleados.configurado()) return;
    if (!Empleados.desbloqueado) { caja.innerHTML = `<div class="note">${icon('info')}<div>Para elegir a una persona, <a href="#empleados">desbloquea la base de empleados</a>.</div></div>`; return; }
    const lista = MotorEmpleados.filtrar(Empleados.todos(), { estado: 'todos', hoy: Fecha.iso(Fecha.hoy()) });
    if (!lista.length) return;
    let modo = pendienteEmp ? 'emp' : 'man', empId = pendienteEmp || (SelPersona.candidatas()[0] || lista[0]).id; pendienteEmp = null;
    caja.innerHTML = `<span class="flabel">Calcular para</span>
      <div class="seg" id="modeSeg"><span class="thumb"></span><button type="button" data-m="emp">Empleado</button><button type="button" data-m="man">Manual</button></div>
      <div id="empField" style="margin-top:12px">${SelPersona.campo('v-emp', 'Persona', { valor: empId })}
        <div class="emp-card" id="empCard"></div><button type="button" class="linkbtn" id="guardarCons" style="margin-top:8px">Guardar los días consumidos en su ficha</button></div>`;
    SelPersona.enlazar(caja);
    const seg = $('#modeSeg'), sel = $('#v-emp');
    const pintarModo = () => { $$('button', seg).forEach(b => b.setAttribute('aria-pressed', b.dataset.m === modo)); seg.querySelector('.thumb').style.transform = modo === 'man' ? 'translateX(100%)' : 'none'; $('#empField').hidden = modo === 'man'; };
    const rellenar = () => {
      const e = Empleados.buscar(Number(sel.value)); if (!e) return;
      const anio = Number($('#v-anio').value) || new Date().getFullYear();
      $('#v-ini').value = e.fechaContratacion || ''; $('#v-fin').value = e.fechaBaja || ''; $('#v-cons').value = e.vacaciones?.[anio] ?? 0;
      const sd = Ausencias.sinDevengo(e, anio); $('#v-sin').value = sd; if (sd) { $('details.opt').open = true; toast(`${sd} días sin devengo por excedencias o permisos no retribuidos`); }
      $('#empCard').innerHTML = `<span class="avatar">${esc(((e.nombre[0] || '') + (e.apellido1[0] || '')).toUpperCase())}</span><span>${esc(e.departamento || '—')} · ${esc(e.centro || '—')}<span class="meta">Contratación ${e.fechaContratacion ? Fecha.larga(Fecha.parse(e.fechaContratacion)) : '—'}${e.fechaBaja ? ' · baja ' + Fecha.larga(Fecha.parse(e.fechaBaja)) : ''}</span></span>`;
      update();
    };
    seg.onclick = ev => { const b = ev.target.closest('button'); if (!b) return; modo = b.dataset.m; pintarModo(); if (modo === 'emp') rellenar(); };
    sel.onchange = rellenar;
    $('#v-anio').addEventListener('change', () => { if (modo === 'emp') rellenar(); });
    $('#v-ini').addEventListener('input', () => { if (modo === 'emp') { modo = 'man'; pintarModo(); } });
    $('#guardarCons').onclick = async () => {
      const id = Number(sel.value), e = Empleados.buscar(id), anio = Number($('#v-anio').value) || new Date().getFullYear();
      await Empleados.editarEmpleado(id, { vacaciones: { ...(e.vacaciones || {}), [anio]: Math.max(0, Math.floor(Number($('#v-cons').value) || 0)) } });
      toast(`Guardado en la ficha de ${e.nombreCompleto}: ${$('#v-cons').value} días en ${anio}`);
    };
    pintarModo(); if (modo === 'emp') rellenar();
  }
  return { render, paraEmpleado };
})();
