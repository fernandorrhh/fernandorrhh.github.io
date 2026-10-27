/* Permisos: convenio frente a ET (se aplica el más favorable) y reducción de jornada. Motor: js/engines/permisos.js */
const ModPermisos = (() => {
  const P = window.RRHH_PARAMS;
  let actual = 'enfermedad', opt = { desplazamiento: false, lejos: false }, red = { horasSemana: 40, salarioAnual: '', fraccion: 0.125 };
  const APLICA = { convenio: 'Convenio, más favorable', et: 'Estatuto de los Trabajadores', igual: 'Convenio y ET coinciden', ambos: 'Convenio y ET' };

  function render(main) {
    main.innerHTML = `<div class="view">
      <div class="page-h"><a class="crumb" href="#inicio">← Inicio</a><h1>Permisos</h1><p>Días que corresponden en cada caso, comparando el convenio con el Estatuto y aplicando siempre el más favorable.</p></div>
      <div class="calc perm-layout">
        <div class="card perm-list" role="listbox" aria-label="Permisos">${P.permisos.map(p => `<button type="button" role="option" class="perm-item${p.id === actual ? ' on' : ''}" aria-selected="${p.id === actual}" data-perm="${p.id}"><span>${esc(p.nombre)}</span><b>${resumen(p)}</b></button>`).join('')}</div>
        <div class="result" aria-live="polite"><div id="pOut" class="live"></div></div>
      </div>
      <section class="card red-card" style="margin-top:22px">
        <div class="card-h"><h3>Reducción de jornada por guarda legal</h3><span class="ex">ET 37.6 · Convenio 14.1.h</span></div>
        <p class="muted" style="margin:0 0 14px">Cuidado directo de un menor de ${P.reduccionJornada.edadMenor} años, de una persona con discapacidad sin actividad retribuida o del cónyuge, la pareja de hecho o un familiar hasta 2.º grado que no pueda valerse por sí mismo. Entre 1/8 y la mitad de la jornada, con reducción proporcional del salario.</p>
        <div class="red-grid">
          <form class="form" id="rF" autocomplete="off" onsubmit="return false">
            <div id="rEmp"></div>
            <div class="row2"><div class="field"><label for="rH">Jornada actual (h/semana)</label><input id="rH" inputmode="decimal" value="${red.horasSemana}"></div>
              <div class="field"><label for="rS">Salario bruto anual (€)</label><input id="rS" inputmode="decimal" value="${esc(red.salarioAnual)}" placeholder="Opcional"></div></div>
            <div class="field"><label for="rF2">Reducción: <b id="rFv"></b></label><input type="range" id="rF2" min="12.5" max="50" step="0.5" value="${red.fraccion * 100}">
              <div class="red-marks"><button type="button" data-fr="0.125">1/8</button><button type="button" data-fr="0.25">1/4</button><button type="button" data-fr="0.3333">1/3</button><button type="button" data-fr="0.5">1/2</button></div></div>
          </form>
          <div class="state-grid red-out" id="rOut"></div>
        </div>
        <p class="muted small" style="margin:12px 0 0">Redacción vigente desde el 23/10/2026 (RDL 31/2026, que sustituye a la de la Ley 4/2026): se mantienen el menor de 12 años y la reducción entre 1/8 y la mitad; vuelve a incluir el cuidado del cónyuge o pareja de hecho; en menores con cáncer o enfermedad grave, al menos la mitad, y ambos progenitores pueden ejercerla a la vez. La empresa ya no puede limitar el ejercicio simultáneo de dos personas de la plantilla por el mismo sujeto causante.</p>
      </section>
    </div>`;
    $$('[data-perm]').forEach(b => b.onclick = () => {
      actual = b.dataset.perm; opt = { desplazamiento: false, lejos: false }; $$('[data-perm]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
      pintar(); if (matchMedia('(max-width:760px)').matches) $('#pOut').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
    $('#rF').addEventListener('input', reduccion);
    $$('[data-fr]').forEach(b => b.onclick = () => { $('#rF2').value = Number(b.dataset.fr) * 100; reduccion(); });
    Calc.empleado($('#rEmp'), e => { if (!e) return; $('#rS').value = e.salario ? String(e.salario).replace('.', ',') : ''; reduccion(); });
    pintar(); reduccion();
  }

  function resumen(def) {
    const r = MotorPermisos.calcular(def);
    if (r.dias === null) return def.resumen || 'Tiempo necesario';
    if (def.unidad === 'opciones') return `1 h/día o ${r.dias} días`;
    return `${r.dias}${def.desplazamiento || def.lejos ? '+' : ''} ${r.unidad === 'días naturales' ? 'días' : r.unidad}`;
  }

  function pintar() {
    const def = P.permisos.find(p => p.id === actual), r = MotorPermisos.calcular(def, opt);
    const col = (k, f, nombre) => f ? `<div class="pcol${r.aplica === k ? ' win' : ''}${r.aplica === 'igual' ? ' tie' : ''}"><small>${esc(f.art)}</small><b>${f.total !== null && f.total !== undefined ? `${f.total} ${esc(r.unidad === 'opciones' ? 'días' : r.unidad)}` : '—'}</b>${f.texto ? `<p>${esc(f.texto)}</p>` : ''}${f.quien ? `<p class="muted small">${esc(f.quien)}</p>` : ''}${r.aplica === k ? '<span class="win-b">Se aplica</span>' : ''}</div>` : `<div class="pcol off"><small>${nombre}</small><b>—</b><p class="muted small">No lo regula.</p></div>`;
    $('#pOut').innerHTML = `
      <div class="card perm-head"><h2>${esc(def.nombre)}</h2>
        <div class="perm-big"><b>${r.dias !== null ? r.dias : `<span>${esc(def.resumen || 'Tiempo necesario')}</span>`}</b>${r.dias !== null ? `<em>${esc(r.unidad === 'opciones' ? 'días acumulados' : r.unidad)}</em>` : ''}</div>
        <p class="muted" style="margin:0">${APLICA[r.aplica]} · ${/sin retribución|parental/.test(def.unidad + def.id) ? 'no retribuido' : def.id === 'consulta' ? 'retribuido hasta 6 h al año' : 'retribuido'}</p>
        ${def.desplazamiento || def.lejos ? `<div class="perm-opts">${def.desplazamiento ? `<label class="check"><input type="checkbox" id="oDes" ${opt.desplazamiento ? 'checked' : ''}> Necesita desplazamiento</label>` : ''}${def.lejos ? `<label class="check"><input type="checkbox" id="oLej" ${opt.lejos ? 'checked' : ''}> A más de 100 km</label>` : ''}</div>` : ''}
      </div>
      <div class="pcols">${col('convenio', r.conv, 'Convenio')}${col('et', r.et, 'Estatuto')}</div>
      ${Calc.notas([def.nota && ['', esc(def.nota)], ['', 'Hay que avisar con la antelación posible y justificarlo (convenio 14.1). Si el convenio y la ley difieren, se aplica lo más favorable para la persona trabajadora.']])}`;
    const des = $('#oDes'), lej = $('#oLej');
    if (des) des.onchange = () => { opt.desplazamiento = des.checked; pintar(); };
    if (lej) lej.onchange = () => { opt.lejos = lej.checked; pintar(); };
  }

  function reduccion() {
    red = { horasSemana: Calc.num($('#rH').value) || 0, salarioAnual: $('#rS').value, fraccion: Number($('#rF2').value) / 100 };
    const r = MotorPermisos.reduccion({ ...red, salarioAnual: Calc.num(red.salarioAnual) || 0 }, P.reduccionJornada);
    $('#rFv').textContent = `${dec(red.fraccion * 100).replace(',00', '')} % de la jornada`;
    $('#rOut').innerHTML = r ? `
      <div><small>Nueva jornada</small><b>${dec(r.horasSemana).replace(',00', '')} h/semana</b></div>
      <div><small>Al día (5 días)</small><b>${horasMin(r.horasDia)} <span class="muted">antes ${horasMin(r.horasDiaAntes)}</span></b></div>
      <div><small>Horas que reduce</small><b>${dec(r.horasMenos).replace(',00', '')} h/semana</b></div>
      <div><small>Nuevo salario anual</small><b>${r.salarioAnual !== null ? euros(r.salarioAnual) : '—'}</b></div>` : '<p class="muted">Indica la jornada actual.</p>';
  }
  const horasMin = h => { const H = Math.floor(h + 1e-9), m = Math.round((h - H) * 60); return `${H} h${m ? ` ${m} min` : ''}`; };

  return { render };
})();
