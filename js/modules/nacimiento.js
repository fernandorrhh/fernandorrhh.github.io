/* Nacimiento y cuidado del menor (una persona progenitora cada vez). Motor: js/engines/nacimiento.js */
const ModNacimiento = (() => {
  const P = window.RRHH_PARAMS, C = P.nacimiento;
  let mono = false;

  function render(main) {
    main.innerHTML = `<div class="view">
      <div class="page-h"><a class="crumb" href="#inicio">← Inicio</a><h1>Nacimiento y cuidado</h1><p>Semanas de permiso por nacimiento de una persona progenitora, hasta cuándo puede disfrutarlas y qué otros derechos tiene.</p></div>
      <div class="calc">
        <form class="card form" id="nF" autocomplete="off" onsubmit="return false">
          <div class="field"><label for="nFe">Fecha de nacimiento (o prevista)</label><input type="date" id="nFe"></div>
          <div><span class="flabel">Familia</span><div class="seg" id="nSeg"><span class="thumb"></span><button type="button" data-m="0" aria-pressed="true">Biparental</button><button type="button" data-m="1" aria-pressed="false">Monoparental</button></div></div>
          <div class="row2"><div class="field"><label for="nHi">Número de hijos</label><input type="number" id="nHi" min="1" max="6" value="1" inputmode="numeric"></div>
            <div class="field"><label for="nHo">Días hospitalizado tras el parto</label><input type="number" id="nHo" min="0" value="0" inputmode="numeric"><div class="hint">Cuenta si son más de 7.</div></div></div>
          <label class="check"><input type="checkbox" id="nDi"> Hijo o hija con discapacidad</label>
        </form>
        <div class="result" aria-live="polite">
          <div id="nVacio" class="note">${icon('info')}<div>Introduce la fecha de nacimiento para ver el resultado.</div></div>
          <div id="nOut" class="live" hidden></div>
          ${Calc.legal('Base legal', `
            <p><b>ET 48.4 (RDL 9/2025, en vigor desde el 31/07/2025):</b> 19 semanas por progenitor: 6 obligatorias, ininterrumpidas y a jornada completa tras el parto; 11 hasta los 12 meses; 2 hasta los 8 años. Familia monoparental: 32 (6 + 22 + 4). Las 2 semanas hasta los 8 años se reconocen para nacimientos desde el 02/08/2024.</p>
            <p><b>Ampliaciones:</b> hospitalización del neonato más de 7 días: tantos días como dure, hasta 13 semanas (ET 48.4). Discapacidad del hijo y parto múltiple (por cada hijo a partir del segundo): 2 semanas, una para cada progenitor (ET 48.6); en familia monoparental se cuentan las dos.</p>
            <p><b>Prestación:</b> la paga la Seguridad Social, al 100 % de la base reguladora. Preaviso a la empresa de 15 días para las semanas voluntarias.</p>
            <p><b>Lactancia (ET 37.4 · convenio 14.6):</b> 1 hora diaria hasta los 9 meses, media hora de reducción o 14 días laborables acumulados tras el permiso (avisar con 14 días de antelación). <b>Permiso parental (ET 48 bis):</b> 8 semanas hasta los 8 años, no retribuido.</p>
            <p style="margin:0">Parámetros verificados el ${Calc.f(C.verificado)}.</p>`)}
        </div>
      </div>
    </div>`;
    $('#nF').addEventListener('input', pintar);
    $('#nSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; mono = b.dataset.m === '1'; $$('#nSeg button').forEach(x => x.setAttribute('aria-pressed', x === b)); $('#nSeg .thumb').style.transform = mono ? 'translateX(100%)' : 'none'; pintar(); };
    pintar();
  }

  function pintar() {
    const r = MotorNacimiento.calcular({ fecha: $('#nFe').value, monoparental: mono, hijos: Calc.ent($('#nHi').value) || 1, discapacidad: $('#nDi').checked, hospitalizacionDias: Calc.ent($('#nHo').value) }, C);
    $('#nVacio').hidden = !!r; const out = $('#nOut'); out.hidden = !r; if (!r) return;
    const sem = x => `${x} semana${x === 1 ? '' : 's'}`, b = r.bloques;
    const amp = [r.semanasAmpliacion && `+${sem(r.semanasAmpliacion)}`, r.diasHospitalizacion && `+${r.diasHospitalizacion} días por hospitalización`].filter(Boolean).join(' · ');
    out.innerHTML = `
      <div class="big">
        <div class="stat hl"><small>Permiso total</small><b>${dec(r.totalSemanas).replace(',00', '')}<em>semanas</em></b><span class="sub">${r.totalDias} días${amp ? ' · ' + amp : ''}</span></div>
        <div class="stat"><small>Obligatorias hasta</small><b class="eur sm">${Calc.f(b[0].hasta)}</b><span class="sub">6 semanas desde el parto</span></div>
        <div class="stat"><small>Todo seguido, hasta</small><b class="eur sm">${Calc.f(r.seguidoHasta)}</b><span class="sub">Sin contar las ${sem(b[2].semanas)} hasta los 8 años</span></div>
      </div>
      <div class="card"><div class="card-h"><h3>Cómo se reparte</h3><span class="ex">${r.monoparental ? 'Monoparental' : 'Biparental'}</span></div>
        <ol class="naci">${b.map((x, i) => `<li style="--i:${i}"><span class="naci-n">${x.semanas}${x.dias ? `<small>+${x.dias} d</small>` : ''}</span><div><b>${sem(x.semanas)}${x.dias ? ` y ${x.dias} días` : ''}</b><p>${esc(x.texto)}</p><span class="tag">${x.desde ? `${Calc.f(x.desde)} – ` : 'Hasta el '}${Calc.f(x.hasta)}</span></div></li>`).join('')}</ol>
      </div>
      <div class="card"><div class="card-h"><h3>Otros derechos</h3></div><div class="state-grid">
        <div><small>Lactancia (hasta el ${Calc.f(r.lactancia.hasta)})</small><b>1 h al día · o ${r.lactancia.acumuladaDias} días laborables acumulados</b></div>
        <div><small>Permiso parental (hasta el ${Calc.f(r.parental.hasta)})</small><b>${sem(r.parental.semanas)} · no retribuido</b></div>
        <div><small>Reducción de jornada (hasta el ${Calc.f(r.guardaLegal.hasta)})</small><b>Entre 1/8 y 1/2 · salario proporcional</b></div>
        ${r.diasHospitalizacion ? `<div><small>Hospitalización del bebé</small><b>1 h retribuida al día + hasta 2 h de reducción</b></div>` : ''}
      </div></div>
      ${Calc.notas([
        $('#nFe').value < '2025-07-31' && ['warn', 'Para nacimientos anteriores al 31/07/2025 se aplicaba el régimen anterior (16 semanas; las 2 semanas hasta los 8 años, solo desde el 02/08/2024). Revisa este caso.'],
        ['', `La madre biológica puede adelantar hasta ${r.anticipoMaxSemanas} semanas de las voluntarias antes del parto.`],
        ['', 'Las semanas voluntarias se disfrutan por semanas, seguidas o no, avisando a la empresa con 15 días. A jornada parcial, solo con acuerdo.'],
        r.diasHospitalizacion && ['', 'Con hospitalización, las semanas voluntarias pueden empezar a contar desde el alta hospitalaria.']
      ])}`;
  }

  return { render };
})();
