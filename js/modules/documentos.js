/*
 * Generador de documentos: 6 plantillas, un formulario compartido y vista previa en vivo.
 * Los datos NO se guardan: viven solo mientras la pantalla está abierta en esta sesión.
 * Integración: rellenar desde un alta, marcar el paso del alta y crear un alta desde la oferta.
 */
const ModDocumentos = (() => {
  const P = window.RRHH_PARAMS;
  let plantilla = 'oferta-correo', d = nuevo(), altaId = null, comercialManual = false;
  function nuevo() { return { tratamiento: 'o', nombre: '', apellidos: '', centro: P.centros[0], puesto: '', departamento: '', contrato: 'indefinido', salario: '', jornada: 'completa (40 horas semanales)', comercial: false, noCompetencia: '', bono: '', comisiones: true, garantia: '', beneficios: 'seguro de viaje y de accidentes', fechaIncorporacion: '', tallaPie: '', tallaRopa: '', tallaPantalon: '' }; }
  const ctx = () => ({ empresa: P.empresa, planIgualdad: P.planIgualdad, anio: new Date().getFullYear(), hora: new Date().getHours() });
  const plant = () => MotorDocumentos.PLANTILLAS.find(p => p.id === plantilla);
  const ICO = {
    correo: '<svg class="i" viewBox="0 0 24 24"><path d="M3 5h18v14H3zM4 6l8 6 8-6"/></svg>',
    documento: '<svg class="i" viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6zM9 10h6M9 14h6M9 18h3"/></svg>',
    copiar: '<svg class="i" viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
    abrir: '<svg class="i" viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>'
  };
  const CONTRATOS = ['indefinido', 'indefinido a tiempo parcial', 'fijo discontinuo', 'temporal por circunstancias de la producción', 'temporal de sustitución', 'formativo'];
  const JORNADAS = ['completa (40 horas semanales)', 'parcial de 30 horas semanales', 'parcial de 20 horas semanales'];
  const TALLAS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'], PANT = ['36-38', '38-40', '40-42', '42-44', '44-46', '46-48', '48-50'];

  /* ---------- Formulario: solo los campos que usa la plantilla ---------- */
  function campo(c) {
    const val = k => esc(d[k] ?? '');
    switch (c) {
      case 'tratamiento': return `<div><span class="flabel">Tratamiento</span><div class="seg" id="segTrat"><span class="thumb" style="transform:${d.tratamiento === 'a' ? 'translateX(100%)' : 'none'}"></span><button type="button" data-trat="o" aria-pressed="${d.tratamiento === 'o'}">Estimado</button><button type="button" data-trat="a" aria-pressed="${d.tratamiento === 'a'}">Estimada</button></div></div>`;
      case 'nombre': return `<div class="field"><label for="dNombre">Nombre</label><input id="dNombre" data-k="nombre" value="${val('nombre')}" autocomplete="off"></div>`;
      case 'apellidos': return `<div class="field"><label for="dApe">Apellidos <span class="muted" style="font-weight:400">${plantilla === 'prl-calidad' ? '' : '(para crear el alta)'}</span></label><input id="dApe" data-k="apellidos" value="${val('apellidos')}" autocomplete="off"></div>`;
      case 'centro': return `<div class="field"><label for="dCentro">Centro</label><select id="dCentro" data-k="centro">${P.centros.map(c2 => `<option ${d.centro === c2 ? 'selected' : ''}>${esc(c2)}</option>`).join('')}</select></div>`;
      case 'puesto': return `<div class="field"><label for="dPuesto">Puesto</label><input id="dPuesto" data-k="puesto" list="dlPuestos" value="${val('puesto')}" autocomplete="off"><datalist id="dlPuestos">${P.puestos.map(p => `<option value="${esc(p.puesto)}">`).join('')}</datalist></div>`;
      case 'departamento': return `<div class="field"><label for="dDep2">Departamento</label><select id="dDep2" data-k="departamento"><option value="">Sin indicar</option>${P.departamentos.map(x => `<option ${d.departamento === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div>`;
      case 'contrato': return `<div class="field"><label for="dContrato">Contrato</label><input id="dContrato" data-k="contrato" list="dlCont" value="${val('contrato')}"><datalist id="dlCont">${CONTRATOS.map(x => `<option value="${x}">`).join('')}</datalist></div>`;
      case 'salario': return `<div class="field"><label for="dSalario">Salario bruto anual (€)</label><input id="dSalario" data-k="salario" data-num inputmode="decimal" value="${d.salario === '' ? '' : String(d.salario).replace('.', ',')}" placeholder="p. ej. 23.318,24"></div>`;
      case 'jornada': return `<div class="field"><label for="dJornada">Jornada</label><input id="dJornada" data-k="jornada" list="dlJor" value="${val('jornada')}"><datalist id="dlJor">${JORNADAS.map(x => `<option value="${x}">`).join('')}</datalist></div>`;
      case 'fechaIncorporacion': return `<div class="field"><label for="dInc">Fecha de incorporación</label><input type="date" id="dInc" data-k="fechaIncorporacion" value="${val('fechaIncorporacion')}"></div>`;
      case 'tallaPie': return `<div class="row3"><div class="field"><label for="dPie">Talla de pie</label><input id="dPie" data-k="tallaPie" inputmode="numeric" value="${val('tallaPie')}"></div>`;
      case 'tallaRopa': return `<div class="field"><label for="dRopa">Ropa</label><select id="dRopa" data-k="tallaRopa"><option value="">—</option>${TALLAS.map(x => `<option ${d.tallaRopa === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>`;
      case 'tallaPantalon': return `<div class="field"><label for="dPant">Pantalón</label><select id="dPant" data-k="tallaPantalon"><option value="">—</option>${PANT.map(x => `<option ${d.tallaPantalon === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div></div>`;
      case 'comercial': return `<div class="comercial ${d.comercial ? 'on' : ''}">
        <label class="check"><input type="checkbox" id="dCom" ${d.comercial ? 'checked' : ''}> Carta comercial (con conceptos variables)</label>
        ${d.comercial ? `<div class="com-campos">
          <div class="row2"><div class="field"><label for="dNoc">No competencia (€/año)</label><input id="dNoc" data-k="noCompetencia" data-num inputmode="decimal" value="${d.noCompetencia === '' ? '' : String(d.noCompetencia).replace('.', ',')}" placeholder="Vacío = no aparece"></div>
          <div class="field"><label for="dBono">Bono objetivos (€/año)</label><input id="dBono" data-k="bono" data-num inputmode="decimal" value="${d.bono === '' ? '' : String(d.bono).replace('.', ',')}" placeholder="Vacío = no aparece"></div></div>
          <div class="row2"><div class="field"><label for="dGar">Garantía 12 meses (€)</label><input id="dGar" data-k="garantia" data-num inputmode="decimal" value="${d.garantia === '' ? '' : String(d.garantia).replace('.', ',')}" placeholder="Vacío = no aparece"></div>
          <div class="field"><label class="check" style="margin-top:30px"><input type="checkbox" id="dComis" ${d.comisiones ? 'checked' : ''}> Comisiones por venta</label></div></div>
          <div class="field"><label for="dBen">Beneficios actuales</label><input id="dBen" data-k="beneficios" value="${val('beneficios')}" placeholder="Vacío = no aparece"></div>
        </div>` : ''}</div>`;
    }
    return '';
  }

  /* ---------- Vista previa ---------- */
  const resaltar = t => esc(t).replace(/\[([^\]\n]{1,40})\]/g, '<mark>[$1]</mark>');
  function vista() {
    const p = plant(), r = MotorDocumentos.generar(plantilla, d, ctx());
    const alta = altaId ? Altas.todas().find(a => a.id === altaId) : null;
    const noFabrica = p.soloFabrica && !/f[aá]brica/i.test(d.centro);
    return `<div class="doc-prev ${p.tipo}">
      ${r.faltan.length ? `<div class="note warn">${icon('info')}<div>Faltan: ${r.faltan.map(f => `<b>${esc(f)}</b>`).join(', ')}. Aparecen resaltados en el texto.</div></div>` : ''}
      ${noFabrica ? `<div class="note warn">${icon('info')}<div>Este aviso es solo para incorporaciones en fábrica.</div></div>` : ''}
      ${r.asunto ? `<div class="mail-row"><span class="mail-k">Asunto</span><span class="mail-v" id="prevAsunto">${resaltar(r.asunto)}</span><button class="icon-act" data-copy="asunto" title="Copiar asunto" aria-label="Copiar asunto">${ICO.copiar}</button></div>` : '<div class="mail-row"><span class="mail-k">Documento</span><span class="mail-v muted">Para pegar en la hoja oficial de la empresa</span></div>'}
      <div class="mail-body" id="prevCuerpo">${resaltar(r.cuerpo)}</div>
      ${p.adjuntos ? `<div class="adjuntos"><b>Recuerda adjuntar:</b> ${p.adjuntos.map(a => `<span class="tag">📎 ${esc(a)}</span>`).join(' ')}</div>` : ''}
      <div class="doc-acts">
        ${p.tipo === 'correo'
          ? `<button class="btn" data-copy="cuerpo">${ICO.copiar}Copiar texto</button><button class="btn ghost" data-copy="html">${ICO.copiar}Copiar con formato</button><a class="btn ghost" id="mailto" href="${MotorDocumentos.mailto(r.asunto, r.cuerpo)}">${ICO.abrir}Abrir en el correo</a>`
          : `<button class="btn" data-copy="html">${ICO.copiar}Copiar con formato</button><button class="btn ghost" data-copy="cuerpo">${ICO.copiar}Copiar texto</button>`}
      </div>
      <div class="doc-link">
        ${alta && p.pasoAlta ? (alta.check[p.pasoAlta] ? `<span class="muted small">✓ “${esc(MotorAltas.pasosDe(alta.centro).find(x => x.id === p.pasoAlta)?.nombre || '')}” ya está marcado en el alta de ${esc(alta.nombre)}.</span>`
            : MotorAltas.pasosDe(alta.centro).some(x => x.id === p.pasoAlta) ? `<button class="btn ghost sm" id="marcarPaso">${icon('altas')}Marcar “${esc(MotorAltas.pasosDe(alta.centro).find(x => x.id === p.pasoAlta).nombre)}” en el alta de ${esc(alta.nombre.split(' ')[0])}</button>` : '') : ''}
        ${!alta && p.pasoAlta === 'ofertaEnviada' ? `<button class="btn ghost sm" id="crearAlta">${icon('altas')}Crear alta con estos datos</button>` : ''}
      </div>
    </div>`;
  }

  function render(main) {
    const p = plant(), altas = Altas.enCurso();
    main.innerHTML = `<div class="view">
      <div class="page-h"><a class="crumb" href="#inicio">← Inicio</a><h1>Documentos</h1><p>Ofertas y correos listos para copiar o abrir en el correo. Los datos que escribes aquí no se guardan.</p></div>
      <div class="plantillas" role="tablist" aria-label="Plantillas">${MotorDocumentos.PLANTILLAS.map((x, i) => `<button class="plant-card ${x.id === plantilla ? 'on' : ''}" role="tab" aria-selected="${x.id === plantilla}" data-p="${x.id}" style="--i:${i}">
        <span class="pc-ico">${ICO[x.tipo]}</span><b>${esc(x.nombre)}</b><small>${x.tipo === 'correo' ? 'Correo' : 'Documento'}${x.soloFabrica ? ' · solo fábrica' : ''}</small></button>`).join('')}</div>
      <div class="calc doc-layout">
        <form class="card form" id="docForm" autocomplete="off" onsubmit="return false">
          ${altas.length ? `<div class="field"><label for="desdeAlta">Rellenar desde un alta</label><select id="desdeAlta"><option value="">— Escribir los datos a mano —</option>${altas.map(a => `<option value="${a.id}" ${altaId === a.id ? 'selected' : ''}>${esc(a.nombre)} · ${esc(a.puesto || a.centro)}</option>`).join('')}</select></div>` : ''}
          ${p.campos.map(campo).join('')}
          <button type="button" class="linkbtn" id="limpiarDoc" style="align-self:flex-start">Vaciar el formulario</button>
        </form>
        <div class="card live" id="prev">${vista()}</div>
      </div>
    </div>`;
    enlazar(main);
  }

  function repintarVista() { $('#prev').innerHTML = vista(); enlazarVista(); }

  function enlazar(main) {
    $$('[data-p]', main).forEach(b => b.onclick = () => { plantilla = b.dataset.p; render(main); });
    const f = $('#docForm', main);
    f.addEventListener('input', e => {
      const el = e.target, k = el.dataset.k; if (!k) return;
      if (el.hasAttribute('data-num')) { const n = MotorEmpleados.importe(el.value); d[k] = n === null ? el.value : n; }
      else d[k] = el.value;
      if (k === 'departamento' && !comercialManual && plantilla === 'oferta-carta') { const antes = d.comercial; d.comercial = d.departamento === 'Comercial'; if (antes !== d.comercial) { render(main); return; } }
      repintarVista();
    });
    $$('[data-trat]', main).forEach(b => b.onclick = () => { d.tratamiento = b.dataset.trat; render(main); });
    $('#dCom', main) && ($('#dCom', main).onchange = e => { d.comercial = e.target.checked; comercialManual = true; render(main); });
    $('#dComis', main) && ($('#dComis', main).onchange = e => { d.comisiones = e.target.checked; repintarVista(); });
    $('#limpiarDoc', main).onclick = () => { d = nuevo(); altaId = null; comercialManual = false; render(main); };
    $('#desdeAlta', main) && ($('#desdeAlta', main).onchange = e => {
      const a = Altas.todas().find(x => x.id === Number(e.target.value));
      altaId = a ? a.id : null;
      if (a) { const n = MotorEmpleados.partirNombre(a.nombre); Object.assign(d, { nombre: n.nombre, apellidos: [n.apellido1, n.apellido2].filter(Boolean).join(' '), centro: a.centro, puesto: a.puesto, departamento: a.departamento, salario: a.salario, fechaIncorporacion: a.fechaIncorporacion, comercial: a.departamento === 'Comercial', ...(a.sexo ? { tratamiento: a.sexo === 'mujer' ? 'a' : 'o' } : {}) }); }
      render(main);
    });
    enlazarVista();
  }

  async function copiar(tipo) {
    const r = MotorDocumentos.generar(plantilla, d, ctx());
    const texto = tipo === 'asunto' ? r.asunto : r.cuerpo;
    try {
      if (tipo === 'html' && window.ClipboardItem) await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([MotorDocumentos.aHtml(r.cuerpo)], { type: 'text/html' }), 'text/plain': new Blob([r.cuerpo], { type: 'text/plain' }) })]);
      else await navigator.clipboard.writeText(tipo === 'html' ? r.cuerpo : texto);
    } catch (e) {
      const t = document.createElement('textarea'); t.value = tipo === 'html' ? r.cuerpo : texto; document.body.append(t); t.select(); document.execCommand('copy'); t.remove();
    }
    toast(r.faltan.length && tipo !== 'asunto' ? `Copiado, pero faltan datos: ${r.faltan.join(', ')}` : tipo === 'asunto' ? 'Asunto copiado' : tipo === 'html' ? 'Copiado con formato: pégalo en Word u Outlook' : 'Texto copiado');
  }

  function enlazarVista() {
    $$('[data-copy]').forEach(b => b.onclick = () => copiar(b.dataset.copy));
    const m = $('#marcarPaso');
    if (m) m.onclick = () => {
      const p = plant(); Altas.marcar(altaId, p.pasoAlta, true); Shell.pintarNav();
      toast('Paso marcado en el alta'); Ficus.decir('Un paso menos en el alta. Así da gusto.', 'yay'); repintarVista();
    };
    const c = $('#crearAlta');
    if (c) c.onclick = () => ModAltas.nueva(null, { nombre: [d.nombre, d.apellidos].filter(x => String(x).trim()).join(' '), centro: d.centro, puesto: d.puesto, departamento: d.departamento, salario: d.salario, sexo: d.tratamiento === 'a' ? 'mujer' : 'hombre', ofertaEnviada: true });
  }

  return { render };
})();
