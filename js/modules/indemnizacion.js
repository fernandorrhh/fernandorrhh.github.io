/* Calculadora de indemnización por extinción del contrato. El cálculo está en js/engines/indemnizacion.js. */
const ModIndemnizacion = (() => {
  const P = window.RRHH_PARAMS, C = P.indemnizacion;
  let tipo = 'improcedente';

  function render(main) {
    main.innerHTML = `<div class="view">
      <div class="page-h"><a class="crumb" href="#inicio">← Inicio</a><h1>Indemnización</h1><p>Despido improcedente, objetivo, fin de contrato temporal y otras extinciones, con los topes legales.</p></div>
      <div class="calc">
        <form class="card form" id="inF" autocomplete="off" onsubmit="return false">
          <div id="inEmp"></div>
          <div class="row2"><div class="field"><label for="inIni">Inicio de la relación</label><input type="date" id="inIni"></div>
            <div class="field"><label for="inFin">Fecha de extinción</label><input type="date" id="inFin" value="${Calc.hoyISO()}"></div></div>
          <div class="field"><label for="inSal">Salario bruto anual (€)</label><input id="inSal" inputmode="decimal" placeholder="p. ej. 28.000"><div class="hint">Todo lo que cobra en un año: salario, pagas extra, complementos y antigüedad consolidada.</div></div>
          <div><span class="flabel">Tipo de extinción</span><div class="chips-sel" id="inTipo" role="radiogroup">${Object.entries(C.tipos).map(([k, t]) => `<button type="button" role="radio" data-t="${k}" aria-checked="${k === tipo}">${esc(t.nombre)}</button>`).join('')}</div></div>
        </form>
        <div class="result" aria-live="polite">
          <div id="inVacio" class="note">${icon('info')}<div>Introduce las fechas y el salario para ver la indemnización.</div></div>
          <div id="inOut" class="live" hidden></div>
          ${Calc.legal('Cómo se calcula y base legal', `
            <p><b>Salario diario</b> = bruto anual ÷ 365. <b>Mensualidad</b> = bruto anual ÷ 12.</p>
            <p><b>Antigüedad:</b> se prorratea por meses los periodos inferiores al año y la fracción de mes cuenta como mes completo.</p>
            <p><b>Improcedente (ET 56.1):</b> 33 días por año, máximo 24 mensualidades. Si hay servicios anteriores al 12/02/2012 (DT 11.ª ET): 45 días por año por ese periodo y 33 después, con un máximo de 720 días; si el periodo anterior ya supera 720 días, se aplica ese importe con un máximo de 42 mensualidades.</p>
            <p><b>Objetivo y colectivo (ET 53.1.b y 51.4):</b> 20 días por año, máximo 12 mensualidades.</p>
            <p><b>Fin de contrato temporal (ET 49.1.c):</b> 12 días por año, sin tope. No se aplica a contratos formativos ni de sustitución.</p>
            <p><b>Modificación sustancial (ET 41.3):</b> 20 días por año, máximo 9 mensualidades. <b>Traslado (ET 40.1):</b> 20 días por año, máximo 12.</p>
            <p style="margin:0">El convenio no mejora estas indemnizaciones. Parámetros verificados el ${Calc.f(C.verificado)}.</p>`)}
        </div>
      </div>
    </div>`;
    const upd = () => pintar();
    $('#inF').addEventListener('input', upd);
    $('#inTipo').onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; tipo = b.dataset.t; $$('#inTipo [data-t]').forEach(x => x.setAttribute('aria-checked', x === b)); pintar(); };
    Calc.empleado($('#inEmp'), e => {
      if (!e) return;
      $('#inIni').value = e.fechaContratacion || ''; $('#inFin').value = e.fechaBaja || Calc.hoyISO();
      $('#inSal').value = e.salario ? String(e.salario).replace('.', ',') : ''; pintar();
    });
    pintar();
  }

  function pintar() {
    const datos = { inicio: $('#inIni').value, fin: $('#inFin').value, salarioAnual: Calc.num($('#inSal').value) };
    const r = MotorIndemnizacion.calcular({ ...datos, tipo }, C);
    $('#inVacio').hidden = !!r; const out = $('#inOut'); out.hidden = !r;
    if (!r) return;
    if (r.error) { out.innerHTML = Calc.notas([['warn', r.error]]); return; }
    const todos = MotorIndemnizacion.todos(datos, C), a = r.antiguedad;
    const antig = [a.anios && `${a.anios} año${a.anios === 1 ? '' : 's'}`, a.meses && `${a.meses} mes${a.meses === 1 ? '' : 'es'}`, a.dias && `${a.dias} día${a.dias === 1 ? '' : 's'}`].filter(Boolean).join(', ') || '0 días';
    out.innerHTML = `
      <div class="big">
        <div class="stat hl"><small>${esc(r.nombre)}</small><b class="eur" data-eur="${r.importe}">${euros(r.importe)}</b><span class="sub">${r.topeAplicado ? 'Con el tope aplicado' : `${dec(r.dias)} días de salario`}</span></div>
        <div class="stat"><small>Antigüedad</small><b class="eur sm">${antig}</b><span class="sub">${a.mesesComputables} meses computables</span></div>
        <div class="stat"><small>Salario diario</small><b class="eur sm">${euros(r.salarioDiario)}</b><span class="sub">Mensualidad ${euros(r.mensualidad)}</span></div>
      </div>
      <div class="card"><div class="card-h"><h3>Cálculo</h3><span class="ex">${esc(r.art)}</span></div>
        ${Calc.tabla(r.tramos.map(t => ({ concepto: `${Calc.f(t.desde)} – ${Calc.f(t.hasta)}${t.excluido ? ' (no suma: el periodo anterior ya supera 720 días)' : ''}`, detalle: `${t.diasPorAnio} días/año × ${t.meses} meses ÷ 12 = ${dec(t.dias)} días × ${euros(r.salarioDiario)}`, importe: t.importe })),
          r.tope ? [r.topeAplicado ? `Total con el tope aplicado: ${r.tope.texto} (${euros(r.tope.importe)})` : `Total <small>Tope: ${r.tope.texto} (${euros(r.tope.importe)}), no se alcanza</small>`, r.importe] : ['Total', r.importe])}
      </div>
      <div class="card"><div class="card-h"><h3>Comparativa por tipo de extinción</h3></div>
        <div class="cmp">${todos.map(x => `<button type="button" class="cmp-r${x.tipo === tipo ? ' on' : ''}" data-ct="${x.tipo}"><span>${esc(x.nombre)}<small>${x.diasPorAnio} días/año${C.tipos[x.tipo].topeMensualidades ? ` · tope ${C.tipos[x.tipo].topeMensualidades} mens.` : ''}</small></span><b>${euros(x.importe)}</b><i style="transform:scaleX(${Math.max(...todos.map(y => y.importe)) ? x.importe / Math.max(...todos.map(y => y.importe)) : 0})"></i></button>`).join('')}</div>
      </div>
      <div class="notes">${Calc.notas([
        r.topeAplicado && ['', `Se aplica el tope legal: <b>${esc(r.tope.texto)}</b>.`],
        tipo === 'improcedente' && ['', 'Si la empresa opta por la readmisión no hay indemnización, sino salarios de tramitación.'],
        tipo === 'temporal' && ['', 'No corresponde en contratos formativos ni de sustitución (ET 49.1.c).'],
        tipo === 'objetivo' && ['', 'En el despido objetivo hay que dar 15 días de preaviso o abonarlos (ET 53.1.c), y poner la indemnización a disposición al entregar la carta.'],
        ['', 'Importe bruto. La indemnización legal está exenta de IRPF en la cuantía obligatoria, con un máximo de 180.000 € (art. 7.e LIRPF); lo pactado por encima tributa.']
      ])}</div>`;
    $$('[data-ct]', out).forEach(b => b.onclick = () => { tipo = b.dataset.ct; $$('#inTipo [data-t]').forEach(x => x.setAttribute('aria-checked', x.dataset.t === tipo)); pintar(); });
  }

  return { render };
})();
