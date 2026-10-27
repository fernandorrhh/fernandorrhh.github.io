/* Promociones: cambios de categoría, puesto, departamento, salario o contrato, con fecha. Se guardan en la ficha cifrada. */
const ModPromociones = (() => {
  const P = window.RRHH_PARAMS;
  let anio = String(new Date().getFullYear()), fTipo = '';
  const f = s => s ? Fecha.larga(Fecha.parse(s)) : '—';
  const ICO_T = { 'Promoción de categoría': '↑', 'Cambio de puesto': '⇄', 'Cambio de departamento': '⇄', 'Subida salarial': '€', 'Cambio de contrato': '✎', 'Mejora salarial': '€' };
  const subida = p => p.salarioAnterior > 0 && p.salarioNuevo > 0 ? (p.salarioNuevo - p.salarioAnterior) / p.salarioAnterior : null;

  function render(main) {
    if (!Empleados.configurado() || !Empleados.desbloqueado) return pantallaBloqueo(main, 'Promociones', 'Ascensos, cambios de puesto, subidas de salario y cambios de contrato.', () => render(main));
    const todas = Procesos.Promociones.todas(), anios = [...new Set([anio, String(new Date().getFullYear()), ...todas.map(p => p.fecha.slice(0, 4))])].sort().reverse();
    const delAnio = todas.filter(p => p.fecha.startsWith(anio));
    const personas = sx => new Set(delAnio.filter(p => p.sexo === sx).map(p => p.empleadoId)).size;
    const sub = delAnio.filter(p => subida(p) !== null), media = sx => { const l = sub.filter(p => p.sexo === sx).map(subida); return l.length ? `${dec(l.reduce((a, b) => a + b, 0) / l.length * 100).replace(/,00$/, '')} %` : '—'; };
    main.innerHTML = `<div class="view">
      <div class="page-h page-h-row"><div><a class="crumb" href="#inicio">← Inicio</a><h1>Promociones</h1><p>Ascensos, cambios de puesto o departamento, subidas de salario y cambios de contrato. Al registrarlos se actualiza la ficha.</p></div>
        <button class="btn" id="prNuevo"><svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Registrar cambio</button></div>
      <div class="aus-stats">
        <div class="stat hl"><small>Cambios en ${anio}</small><b>${delAnio.length}</b><span class="sub">${new Set(delAnio.map(p => p.empleadoId)).size} personas</span></div>
        <div class="stat"><small>Personas con cambios</small><b>${personas('mujer')} · ${personas('hombre')}</b><span class="sub sx-txt"><i class="m"></i>mujeres · <i class="h"></i>hombres</span></div>
        <div class="stat"><small>Subidas salariales</small><b>${sub.length}</b><span class="sub">Media: M ${media('mujer')} · H ${media('hombre')}</span></div>
        <div class="stat"><small>Promociones de categoría</small><b>${delAnio.filter(p => p.tipo === 'Promoción de categoría').length}</b><span class="sub">En ${anio}</span></div>
      </div>
      <div class="toolbar">
        <label class="sel"><span class="sr">Año</span><select id="prAnio">${anios.map(y => `<option ${y === anio ? 'selected' : ''}>${y}</option>`).join('')}</select></label>
        <label class="sel"><span class="sr">Tipo</span><select id="prTipo"><option value="">Todos los tipos</option>${P.tiposPromocion.map(t => `<option ${fTipo === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
      </div>
      <div class="card"><ul class="pro-feed" id="prList"></ul></div>
      ${Calc.legal('Para qué sirve', '<p style="margin:0">El plan de igualdad analiza la <b>promoción profesional</b> y las <b>retribuciones</b> por sexo (RD 901/2020, anexo; RD 902/2020). Estos registros alimentan el informe de Promociones. Los ascensos siguen el convenio (art. 28).</p>')}
    </div>`;
    const lista = () => {
      const l = delAnio.filter(p => !fTipo || p.tipo === fTipo).sort((a, b) => b.fecha.localeCompare(a.fecha));
      $('#prList').innerHTML = l.length ? l.map(p => { const s = subida(p); return `<li>
        <span class="pf-ico">${ICO_T[p.tipo] || '•'}</span>
        <span class="pf-main"><b>${esc(p.empleado)}</b><small>${esc(p.tipo)} · ${f(p.fecha)}</small></span>
        <span class="pf-cambio">${p.tipo === 'Subida salarial' || p.tipo === 'Mejora salarial' ? `${p.salarioAnterior ? euros(p.salarioAnterior) : '—'} → <b>${p.salarioNuevo ? euros(p.salarioNuevo) : esc(p.a || '—')}</b>${s !== null ? ` <span class="tag nom">+${dec(s * 100).replace(/,00$/, '')} %</span>` : ''}` : `${esc(p.de || '—')} → <b>${esc(p.a || '—')}</b>`}</span>
        <button class="icon-act" data-del="${p.id}" data-e="${p.empleadoId}" aria-label="Quitar" title="Quitar"><svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></li>`; }).join('') : '<li class="muted">Sin cambios registrados en este periodo.</li>';
      $$('[data-del]').forEach(b => b.onclick = async () => { await Procesos.Promociones.eliminar(Number(b.dataset.e), Number(b.dataset.del)); toast('Registro quitado (la ficha no se modifica)'); render(main); });
    };
    lista();
    $('#prNuevo').onclick = () => formulario(main, {});
    $('#prAnio').onchange = e => { anio = e.target.value; render(main); };
    $('#prTipo').onchange = e => { fTipo = e.target.value; lista(); };
  }

  /* Registro de un cambio. o: { empleadoId } */
  function formulario(main, o = {}) {
    if (!Empleados.desbloqueado) { toast('Desbloquea la base de empleados'); return; }
    const hoy = Fecha.iso(Fecha.hoy()), lista = MotorEmpleados.filtrar(Empleados.todos(), { estado: 'activos', hoy });
    if (!lista.length) { toast('Primero añade empleados'); return; }
    const puestos = [...new Set([...P.puestos.map(p => p.puesto), ...MotorEmpleados.valores(Empleados.todos(), 'puesto')])];
    const d = abrirModal(`<form id="prF" novalidate><div class="dlg-b">
      <h2 style="font-size:20px;font-weight:600;margin:0 0 14px">Registrar un cambio</h2>
      ${SelPersona.campo('prE', 'Persona', { valor: o.empleadoId, ids: lista.map(e => e.id) })}
      <div class="row2"><div class="field"><label for="prFe">Fecha</label><input type="date" id="prFe" value="${hoy}"></div>
        <div class="field"><label for="prTi">Tipo de cambio</label><select id="prTi">${P.tiposPromocion.map(t => `<option>${esc(t)}</option>`).join('')}</select></div></div>
      <div id="prCampos"></div>
      <div class="field"><label for="prNo">Nota <span class="muted" style="font-weight:400">(opcional)</span></label><input id="prNo" maxlength="140" placeholder="p. ej. Por asumir la coordinación del turno"></div>
      <label class="check" id="prActBox"><input type="checkbox" id="prAct" checked> <span id="prActT">Actualizar la ficha</span></label>
      <p class="form-err" id="prErr" role="alert"></p>
    </div><div class="dlg-f"><button type="button" class="btn ghost" id="prC">Cancelar</button><button class="btn">Registrar</button></div></form>`, { ancho: 600 });
    SelPersona.enlazar(d);
    const emp = () => Empleados.buscar(Number($('#prE', d).value)) || {};
    function campos() {
      const e = emp(), t = $('#prTi', d).value;
      let h = '', act = '';
      if (t === 'Subida salarial') {
        h = `<div class="row2"><div class="field"><label for="prSa">Salario anual anterior (€)</label><input id="prSa" inputmode="decimal" value="${e.salario ? String(e.salario).replace('.', ',') : ''}"></div>
          <div class="field"><label for="prSn">Salario anual nuevo (€)</label><input id="prSn" inputmode="decimal"><div class="hint" id="prPct"></div></div></div>`;
        act = 'Actualizar el salario de la ficha';
      } else if (t === 'Cambio de departamento') {
        h = `<div class="row2"><div class="field"><label for="prDe">Antes</label><input id="prDe" value="${esc(e.departamento || '')}"></div>
          <div class="field"><label for="prA">Después</label><select id="prA"><option value="">—</option>${P.departamentos.map(x => `<option>${esc(x)}</option>`).join('')}</select></div></div>`;
        act = 'Actualizar el departamento de la ficha';
      } else if (t === 'Cambio de contrato') {
        h = `<div class="row2"><div class="field"><label for="prDe">Contrato anterior</label><select id="prDe"><option value="">—</option>${P.tiposContrato.map(x => `<option>${esc(x)}</option>`).join('')}</select></div>
          <div class="field"><label for="prA">Contrato nuevo</label><select id="prA"><option value="">—</option>${P.tiposContrato.map(x => `<option>${esc(x)}</option>`).join('')}</select></div></div>`;
      } else {
        h = `<div class="row2"><div class="field"><label for="prDe">Puesto anterior</label><input id="prDe" value="${esc(e.puesto || '')}"></div>
          <div class="field"><label for="prA">Puesto nuevo</label><input id="prA" list="prPu"><datalist id="prPu">${puestos.map(v => `<option value="${esc(v)}">`).join('')}</datalist><div class="hint" id="prCat"></div></div></div>`;
        act = 'Actualizar el puesto de la ficha';
      }
      $('#prCampos', d).innerHTML = h; $('#prActBox', d).hidden = !act; $('#prActT', d).textContent = act;
      const pct = () => { const a = Calc.num($('#prSa', d)?.value), n = Calc.num($('#prSn', d)?.value); if ($('#prPct', d)) $('#prPct', d).textContent = a > 0 && n > 0 ? `${n >= a ? '+' : ''}${dec((n - a) / a * 100).replace(/,00$/, '')} % (${n >= a ? '+' : ''}${euros(n - a)})` : ''; };
      $('#prSa', d) && ($('#prSa', d).oninput = pct); $('#prSn', d) && ($('#prSn', d).oninput = pct);
      $('#prA', d) && $('#prA', d).tagName === 'INPUT' && ($('#prA', d).oninput = () => { const c = Calc.categoriaDePuesto($('#prA', d).value); $('#prCat', d).textContent = c ? `${c.id} · ${c.nombre} · ${euros(c.anual)}/año en tablas` : ''; });
    }
    $('#prE', d).onchange = campos; $('#prTi', d).onchange = campos;
    $('#prC', d).onclick = () => d.close('cancel');
    $('#prF', d).onsubmit = async ev => {
      ev.preventDefault();
      const t = $('#prTi', d).value, p = { fecha: $('#prFe', d).value, tipo: t, nota: $('#prNo', d).value.trim() };
      if (t === 'Subida salarial') { p.salarioAnterior = Calc.num($('#prSa', d).value) || ''; p.salarioNuevo = Calc.num($('#prSn', d).value) || ''; p.de = p.salarioAnterior ? euros(p.salarioAnterior) : ''; p.a = p.salarioNuevo ? euros(p.salarioNuevo) : ''; if (!(p.salarioNuevo > 0)) { $('#prErr', d).textContent = 'Indica el salario nuevo.'; return; } }
      else { p.de = $('#prDe', d).value.trim(); p.a = $('#prA', d).value.trim(); if (!p.a) { $('#prErr', d).textContent = 'Indica la situación nueva.'; return; } }
      if (!p.fecha) { $('#prErr', d).textContent = 'Indica la fecha.'; return; }
      if (!$('#prE', d).value) { $('#prErr', d).textContent = 'Elige a la persona.'; $('#prE-q', d).focus(); return; }
      await Procesos.Promociones.guardar(Number($('#prE', d).value), p, $('#prAct', d).checked && !$('#prActBox', d).hidden);
      d.close('ok'); toast('Cambio registrado'); Ficus.decir('Anotado. Cuenta para el plan de igualdad.', 'yay');
      if (main && location.hash === '#promociones') render(main);
    };
    campos();
  }

  return { render, formulario };
})();
