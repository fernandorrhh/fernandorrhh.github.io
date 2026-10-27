/* Buscador de salarios del convenio. El cálculo está en js/engines/salarios.js. */
const ModSalarios = (() => {
  const P = window.RRHH_PARAMS, T = P.tablas;
  let sel = null, q = '', horas = 40;   // sel = { catId, puesto }

  function render(main) {
    main.innerHTML = `<div class="view">
      <div class="page-h"><a class="crumb" href="#inicio">← Inicio</a><h1>Salarios</h1><p>Busca un puesto de la empresa o una categoría del convenio y mira lo que corresponde, también a jornada parcial.</p></div>
      <div class="calc sal-layout">
        <div class="card form">
          <div id="salEmp"></div>
          <div class="field"><label for="sQ">Buscar puesto o categoría</label><input id="sQ" type="search" value="${esc(q)}" placeholder="p. ej. producción, oficial, técnico…" autocomplete="off"></div>
          <div class="sal-list" id="sList" role="listbox" aria-label="Resultados"></div>
        </div>
        <div class="result" aria-live="polite">
          <div id="sOut"></div>
          ${Calc.legal('De dónde salen estas cifras', `
            <p><b>Tablas salariales ${T.anio}:</b> ${esc(T.fuente)}. ${esc(T.nota)}</p>
            <p><b>Salario anual</b> = salario mensual × ${T.pagasSalarioMensual} pagas, o salario diario × ${T.diasAbonadosSalarioDiario} días (365 + 4 pagas de 30 días).</p>
            <p><b>Pagas extra (convenio art. 24):</b> 4 de 30 días de salario base y antigüedad. En la empresa, 2 se prorratean en la nómina y las otras 2 se cobran en junio y diciembre.</p>
            <p><b>Jornada:</b> ${P.jornada.horasAnuales} horas al año (convenio art. 10). A tiempo parcial, todo en proporción a las horas.</p>
            <p style="margin:0"><b>Prima de asistencia (art. 23):</b> ${euros(T.primaAsistenciaDia)} por día efectivamente trabajado, aparte del salario de tablas (importe provisional ${T.anio}).</p>
            <p style="margin:8px 0 0"><b>Gastos de desplazamiento (art. 42):</b> comida ${euros(T.dietas.comida)}, cena ${euros(T.dietas.cena)}, alojamiento ${euros(T.dietas.alojamiento)} y desayuno ${euros(T.dietas.desayuno)}. <b>Quebranto de moneda (art. 43):</b> ${euros(T.quebrantoMoneda.importe)}. Importes provisionales ${T.anio}.</p>`)}
        </div>
      </div>
    </div>`;
    $('#sQ').addEventListener('input', e => { q = e.target.value; lista(); });
    Calc.empleado($('#salEmp'), e => {
      if (!e) return;
      const cat = Calc.categoriaDePuesto(e.puesto);
      if (!cat) { toast(`El puesto de ${e.nombreCompleto} (${e.puesto || 'sin puesto'}) no tiene categoría asignada: búscala en la lista`); return; }
      sel = { catId: cat.id, puesto: e.puesto }; q = ''; $('#sQ').value = ''; lista(); detalle();
      if (e.salario) toast(`${e.nombreCompleto}: ${euros(e.salario)} brutos/año en su ficha · tablas ${euros(cat.anual)}`);
    });
    lista(); detalle();
  }

  function lista() {
    const r = MotorSalarios.buscar(q, P), box = $('#sList');
    const item = (catId, puesto, titulo, sub) => `<button type="button" role="option" class="sal-item${sel && sel.catId === catId && (sel.puesto || '') === (puesto || '') ? ' on' : ''}" data-cat="${catId}" data-puesto="${esc(puesto || '')}"><span><b>${esc(titulo)}</b><small>${esc(sub)}</small></span><span class="sal-amt">${euros(P.tablas.categorias.find(c => c.id === catId).anual)}</span></button>`;
    box.innerHTML = (r.puestos.length ? `<div class="sal-h">Puestos de la empresa</div>` + r.puestos.map(p => item(p.categoria.id, p.puesto, p.puesto, `${p.categoria.id} · ${p.categoria.nombre}`)).join('') : '')
      + (r.categorias.length ? `<div class="sal-h">Categorías del convenio</div>` + r.categorias.map(c => item(c.categoria.id, '', c.categoria.nombre, `${c.categoria.id} · ${c.categoria.grupo}`)).join('') : '')
      || `<p class="muted small">Sin resultados para “${esc(q)}”.</p>`;
    $$('[data-cat]', box).forEach(b => b.onclick = () => { sel = { catId: b.dataset.cat, puesto: b.dataset.puesto }; $$('.sal-item', box).forEach(x => x.classList.toggle('on', x === b)); detalle(); if (matchMedia('(max-width:760px)').matches) $('#sOut').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); });
  }

  function detalle() {
    const out = $('#sOut');
    if (!sel) { out.innerHTML = `<div class="note">${icon('info')}<div>Elige un puesto o una categoría de la lista.</div></div>`; return; }
    const cat = T.categorias.find(c => c.id === sel.catId), r = MotorSalarios.calcular(cat, { horas, P });
    const puesto = sel.puesto ? P.puestos.find(p => p.puesto === sel.puesto) : null;
    const alts = puesto?.alternativas?.map(id => T.categorias.find(c => c.id === id)).filter(Boolean) || [];
    out.innerHTML = `
      <div class="card sal-head"><div><small class="muted">${esc(cat.grupo)} · ${cat.id}</small><h2>${esc(sel.puesto || cat.nombre)}</h2>${sel.puesto ? `<p class="muted" style="margin:0">Categoría: ${esc(cat.nombre)}</p>` : ''}</div>
        ${alts.length ? `<div class="alts"><span class="muted small">También según funciones:</span>${alts.map(a => `<button type="button" class="tag-btn" data-alt="${a.id}">${esc(a.nombre)} · ${euros(a.anual)}</button>`).join('')}</div>` : ''}
        <div class="field" style="margin:14px 0 0"><label for="sH">Jornada: <b id="sHv">${horas} h/semana${horas < 40 ? ` (${Math.round(r.factor * 100)} %)` : ' (completa)'}</b></label>
          <input type="range" id="sH" min="4" max="40" step="1" value="${horas}"></div>
      </div>
      <div class="big">
        <div class="stat hl"><small id="sAnL">Bruto anual${r.parcial ? ' (parcial)' : ''}</small><b class="eur" id="sAn">${euros(r.anual)}</b><span class="sub" id="sAnS">${r.horasAnuales} horas al año</span></div>
        <div class="stat"><small>Nómina mensual</small><b class="eur sm" id="sNom">${euros(r.nominaMensual)}</b><span class="sub" id="sNomS">Con 2 pagas prorrateadas (${euros(r.prorrataMensual)})</span></div>
        <div class="stat"><small>Cada paga extra</small><b class="eur sm" id="sPag">${euros(r.paga)}</b><span class="sub">30 días · junio y diciembre</span></div>
      </div>
      <div class="card"><div class="state-grid">
        <div><small>Salario base de tablas</small><b id="sBase">${euros(r.base)} / ${r.tipo === 'mensual' ? 'mes' : 'día'}</b></div>
        <div><small>Precio por hora</small><b>${euros(r.precioHora)}</b></div>
        <div><small>Prima de asistencia</small><b>${euros(r.primaAsistencia)} / día trabajado</b></div>
        <div><small>Tipo de salario</small><b>${r.tipo === 'mensual' ? `Mensual × ${T.pagasSalarioMensual} pagas` : `Diario × ${T.diasAbonadosSalarioDiario} días`}</b></div>
      </div></div>
      ${Calc.notas([
        ['', `Tablas de ${T.anio}. Para ${new Date().getFullYear()} aún no hay tablas publicadas: puede haber atrasos cuando se publiquen.`],
        r.tipo === 'diario' && ['', 'Salario diario: la nómina mensual varía según los días del mes; aquí se muestra la media.'],
        ['', 'Son mínimos de convenio. No incluyen antigüedad consolidada, nocturnidad, guardias ni la prima de asistencia.']
      ])}`;
    // Al mover la jornada solo cambian las cifras (sin repintar la pantalla).
    $('#sH').oninput = e => {
      horas = Number(e.target.value); const x = MotorSalarios.calcular(cat, { horas, P });
      $('#sHv').textContent = `${horas} h/semana${horas < 40 ? ` (${Math.round(x.factor * 100)} %)` : ' (completa)'}`;
      $('#sAnL').textContent = `Bruto anual${x.parcial ? ' (parcial)' : ''}`; $('#sAn').textContent = euros(x.anual); $('#sAnS').textContent = `${x.horasAnuales} horas al año`;
      $('#sNom').textContent = euros(x.nominaMensual); $('#sNomS').textContent = `Con 2 pagas prorrateadas (${euros(x.prorrataMensual)})`;
      $('#sPag').textContent = euros(x.paga); $('#sBase').textContent = `${euros(x.base)} / ${x.tipo === 'mensual' ? 'mes' : 'día'}`;
    };
    $$('[data-alt]', out).forEach(b => b.onclick = () => { sel = { catId: b.dataset.alt, puesto: '' }; lista(); detalle(); });
  }

  return { render };
})();
