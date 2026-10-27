/* Finiquito (liquidación) con indemnización opcional. Motores: finiquito.js, vacaciones.js, indemnizacion.js */
const ModFiniquito = (() => {
  const P = window.RRHH_PARAMS;
  let voluntaria = false, empSel = null, pendiente = null;
  const cfg = () => ({ pagasExtra: P.pagasExtra, vacaciones: { diasLaborables: P.vacaciones.diasLaborables } });

  function render(main) {
    const cats = P.tablas.categorias;
    main.innerHTML = `<div class="view">
      <div class="page-h"><a class="crumb" href="#inicio">← Inicio</a><h1>Finiquito</h1><p>Liquidación de la baja: salario del mes, pagas, vacaciones, preaviso y, si corresponde, indemnización.</p></div>
      <div class="calc">
        <form class="card form" id="fF" autocomplete="off" onsubmit="return false">
          <div id="fEmp"></div>
          <div class="row2"><div class="field"><label for="fIni">Inicio del contrato</label><input type="date" id="fIni"></div>
            <div class="field"><label for="fFin">Último día de alta</label><input type="date" id="fFin" value="${Calc.hoyISO()}"></div></div>
          <div class="field"><label for="fSal">Salario bruto anual (€)</label><input id="fSal" inputmode="decimal" placeholder="p. ej. 32.000"><div class="hint">Con las 4 pagas. Cada paga = anual ÷ 16.</div></div>
          <div class="row2"><div class="field"><label for="fCons">Vacaciones disfrutadas este año</label><input type="number" id="fCons" min="0" value="0" inputmode="numeric"></div>
            <div class="field"><label for="fPrev">Pendientes del año anterior</label><input type="number" id="fPrev" min="0" value="0" inputmode="numeric"></div></div>
          <div class="field"><label for="fComp">Otros conceptos (€)</label><input id="fComp" inputmode="decimal" placeholder="Horas extra, prima de asistencia…"></div>
          <div><span class="flabel">Causa de la baja</span><div class="seg" id="fSeg"><span class="thumb"></span><button type="button" data-v="0" aria-pressed="true">Empresa / fin</button><button type="button" data-v="1" aria-pressed="false">Baja voluntaria</button></div></div>
          <div id="fVol" hidden class="vol-box">
            <div class="row2"><div class="field"><label for="fCom">Fecha en que avisó</label><input type="date" id="fCom"></div>
              <div class="field"><label for="fCat">Categoría</label><select id="fCat"><option value="">— Elige —</option>${cats.map(c => `<option value="${c.id}">${c.id} · ${esc(c.nombre)}</option>`).join('')}</select></div></div>
            <div class="hint" id="fPreTxt"></div>
          </div>
          <div id="fIndBox" class="field"><label for="fInd">Indemnización</label><select id="fInd"><option value="">Sin indemnización</option>${Object.entries(P.indemnizacion.tipos).map(([k, t]) => `<option value="${k}">${esc(t.nombre)}</option>`).join('')}</select></div>
        </form>
        <div class="result" aria-live="polite">
          <div id="fVacio" class="note">${icon('info')}<div>Introduce las fechas y el salario para ver el finiquito.</div></div>
          <div id="fOut" class="live" hidden></div>
          ${Calc.legal('Cómo se calcula y base legal', `
            <p><b>Paga</b> = bruto anual ÷ 16 (12 meses + 4 pagas de 30 días, convenio art. 24). <b>Salario diario</b> = bruto anual ÷ 365.</p>
            <p><b>Salario del mes:</b> paga ÷ 30 × días trabajados (si la baja es el último día del mes, 30 días). Se suma la prorrata del mes de las ${P.pagasExtra.prorrateadas} pagas prorrateadas.</p>
            <p><b>Paga de junio</b> (se genera de enero a junio) o <b>de diciembre</b> (de julio a diciembre): parte proporcional por meses; la fracción de mes cuenta como mes completo (convenio art. 24).</p>
            <p><b>Vacaciones (convenio art. 12 · ET 38):</b> días laborables pendientes × 30/22 = días naturales × salario diario. Los generados se redondean al alza.</p>
            <p><b>Preaviso en la baja voluntaria (convenio art. 29):</b> un mes para personal técnico, auxiliar de laboratorio, informática, administración, comercial y encargados de producción (y jefe de fábrica, por criterio de empresa); ocho días para el resto. Se descuenta un día de salario por cada día de retraso.</p>
            <p style="margin:0">La empresa debe entregar una copia de la liquidación 2 días antes de la baja (convenio art. 29.2). Importes brutos: no incluye IRPF ni cotizaciones.</p>`)}
        </div>
      </div>
    </div>`;
    $('#fF').addEventListener('input', pintar);
    $('#fSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; voluntaria = b.dataset.v === '1'; $$('#fSeg button').forEach(x => x.setAttribute('aria-pressed', x === b)); $('#fSeg .thumb').style.transform = voluntaria ? 'translateX(100%)' : 'none'; $('#fVol').hidden = !voluntaria; $('#fIndBox').hidden = voluntaria; pintar(); };
    Calc.empleado($('#fEmp'), e => {
      empSel = e; if (!e) return;
      $('#fIni').value = e.fechaContratacion || ''; if (e.fechaBaja) $('#fFin').value = e.fechaBaja;
      $('#fSal').value = e.salario ? String(e.salario).replace('.', ',') : '';
      const anio = ($('#fFin').value || Calc.hoyISO()).slice(0, 4); $('#fCons').value = e.vacaciones?.[anio] ?? 0;
      const cat = Calc.categoriaDePuesto(e.puesto); if (cat) $('#fCat').value = cat.id;
      pintar();
    });
    // Llegada desde una salida: empleado, fecha de baja y preaviso ya rellenos.
    if (pendiente && $('#cEmp')) {
      const x = pendiente; pendiente = null;
      $('#cEmp').value = String(x.id); $('#cEmp').dispatchEvent(new Event('change'));
      if (x.fin) $('#fFin').value = x.fin;
      if (x.voluntaria) $('#fSeg [data-v="1"]').click();
      if (x.comunicacion) $('#fCom').value = x.comunicacion;
      const e = Empleados.buscar(x.id); if (e) { const anio = ($('#fFin').value).slice(0, 4); $('#fCons').value = e.vacaciones?.[anio] ?? 0; }
    }
    pintar();
  }

  function pintar() {
    const ini = $('#fIni').value, fin = $('#fFin').value, sal = Calc.num($('#fSal').value);
    const out = $('#fOut');
    const listo = ini && fin && sal > 0;
    $('#fVacio').hidden = listo; out.hidden = !listo; if (!listo) return;
    // Vacaciones pendientes a la fecha de baja.
    const sinDev = empSel ? Ausencias.sinDevengo(empSel, Number(fin.slice(0, 4)), fin) : 0;
    const v = MotorVacaciones.calcular({ inicio: ini, anio: Number(fin.slice(0, 4)), fin, hoy: fin, consumidos: Calc.ent($('#fCons').value), pendAnterior: Calc.ent($('#fPrev').value), sinDevengo: sinDev, diasConvenio: P.vacaciones.diasLaborables });
    const catId = $('#fCat').value, pre = MotorFiniquito.preavisoDe(catId, P.preavisoBajaVoluntaria);
    $('#fPreTxt').textContent = voluntaria ? (pre ? `Preaviso exigido: ${pre.texto}.` : 'Elige la categoría para saber el preaviso exigido.') : '';
    const tipoInd = voluntaria ? '' : $('#fInd').value;
    const ind = tipoInd ? MotorIndemnizacion.calcular({ inicio: ini, fin, salarioAnual: sal, tipo: tipoInd }, P.indemnizacion) : null;
    const r = MotorFiniquito.calcular({ inicio: ini, fin, salarioAnual: sal, vacacionesPendientes: v ? v.pendFin : 0, complementos: Calc.num($('#fComp').value) || 0,
      voluntaria, comunicacion: $('#fCom').value, preaviso: pre, indemnizacion: ind && !ind.error ? ind.importe : 0 }, cfg());
    if (r.error) { out.innerHTML = Calc.notas([['warn', r.error]]); return; }
    out.innerHTML = `
      <div class="big">
        <div class="stat hl"><small>${ind ? 'Total a percibir' : 'Finiquito'}</small><b class="eur">${euros(r.total)}</b><span class="sub">${ind ? `Finiquito ${euros(r.finiquito)} + indemnización` : 'Importe bruto'}</span></div>
        <div class="stat"><small>Vacaciones pendientes</small><b>${v ? v.pendFin : 0}<em>${v && Math.abs(v.pendFin) === 1 ? 'día' : 'días'}</em></b><span class="sub">${v ? `${v.genFin} generados + ${Calc.ent($('#fPrev').value)} anteriores − ${Calc.ent($('#fCons').value)} disfrutados${sinDev ? ` · ${sinDev} días sin devengo` : ''}` : ''}</span></div>
        <div class="stat"><small>Paga · salario diario</small><b class="eur sm">${euros(r.paga)}</b><span class="sub">${euros(r.salarioDiario)} al día</span></div>
      </div>
      <div class="card"><div class="card-h"><h3>Liquidación</h3><span class="ex">Baja el ${Calc.f(fin)}</span></div>
        ${Calc.tabla([...r.lineas, ...(ind && !ind.error ? [{ concepto: `Indemnización · ${ind.nombre}`, detalle: `${dec(ind.dias)} días × ${euros(ind.salarioDiario)}${ind.topeAplicado ? ' (con tope)' : ''} · ${ind.art}`, importe: ind.importe }] : [])], ['Total bruto', r.total])}
      </div>
      ${Calc.notas([
        r.preaviso && r.preaviso.retraso > 0 && ['warn', `Avisó el ${Calc.f(r.preaviso.comunicacion)}: con preaviso de ${pre.texto}, el último día debía ser como pronto el ${Calc.f(r.preaviso.fechaMinima)}. Faltan <b>${r.preaviso.retraso} días</b>.`],
        r.preaviso && r.preaviso.retraso === 0 && ['', `Preaviso cumplido (${pre.texto}).`],
        voluntaria && !$('#fCom').value && ['', 'Indica la fecha en que avisó para comprobar el preaviso.'],
        v && v.pendFin < 0 && ['warn', `Ha disfrutado ${-v.pendFin} días de vacaciones más de los generados: se descuentan.`],
        r.negativo && ['warn', 'El resultado es negativo: los descuentos superan lo que se debe.'],
        ['', 'Revisa si hay conceptos variables del mes (horas extra, prima de asistencia, nocturnidad) e inclúyelos en “Otros conceptos”.']
      ])}`;
  }

  function paraEmpleado(id, o = {}) { pendiente = { id, ...o }; if (location.hash === '#finiquito') Shell.refrescar(); else location.hash = '#finiquito'; }
  return { render, paraEmpleado };
})();
