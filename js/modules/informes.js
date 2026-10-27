/* Informes de igualdad por sexo: vista previa, Excel (.xlsx) y PDF (imprimir). Motor: engines/informes.js · Excel: engines/xlsx.js */
const ModInformes = (() => {
  const P = window.RRHH_PARAMS;
  const hoyISO = () => Fecha.iso(Fecha.hoy());
  let actual = 'plantilla', anio = new Date().getFullYear(), fecha = hoyISO();
  const LISTA = [
    { id: 'plantilla', nombre: 'Composición de la plantilla', desc: 'A una fecha: centro, departamento, grupo, puesto y antigüedad', ico: 'empleados', porFecha: true },
    { id: 'movimientos', nombre: 'Incorporaciones y bajas', desc: 'Del año, con el motivo de cada baja', ico: 'altas' },
    { id: 'ausencias', nombre: 'Ausencias y conciliación', desc: 'Personas y días por tipo: bajas, nacimiento, excedencias, reducciones', ico: 'ausencias' },
    { id: 'seleccion', nombre: 'Selección y contratación', desc: 'Candidaturas, entrevistas y personas seleccionadas por sexo', ico: 'reclutamiento' },
    { id: 'altas', nombre: 'Procesos de alta', desc: 'Estado, centro, puesto y días de la oferta a la incorporación', ico: 'documentos' },
    { id: 'promociones', nombre: 'Promociones', desc: 'Cambios de categoría o puesto y tasa de promoción', ico: 'salarios' }
  ];

  function generar() {
    const emps = Empleados.todos(), hoy = hoyISO();
    switch (actual) {
      case 'plantilla': return MotorInformes.plantilla(emps, { fecha, P });
      case 'movimientos': return MotorInformes.movimientos(emps, { anio, hoy, P });
      case 'ausencias': return MotorInformes.ausencias(emps, { anio, hoy, tipos: P.ausencias.tipos });
      case 'seleccion': return MotorInformes.seleccion(Procesos.Vacantes.todas(), { anio, hoy });
      case 'altas': return MotorInformes.altas(Altas.todas(), { anio, estado: MotorAltas.estado, progreso: MotorAltas.progreso, P });
      case 'promociones': return MotorInformes.promociones(emps, { anio, P });
    }
  }
  const pct = x => `${dec(x * 100).replace(/,0+$/, '').replace(/(,\d)0$/, '$1')} %`;
  const num = (x, u) => u === 'porcentaje' ? `${dec(x).replace(/,00$/, '')} %` : u === 'media' ? dec(x).replace(/,00$/, '') : String(x);

  function render(main) {
    if (!Empleados.configurado() || !Empleados.desbloqueado) {
      main.innerHTML = `<div class="view"><div class="page-h"><a class="crumb" href="#inicio">← Inicio</a><h1>Informes</h1><p>Informes de igualdad desagregados por sexo, en Excel y PDF.</p></div>
        <div class="card lock-card"><div class="lock-ico">${icon('empleados')}</div><h2>${Empleados.configurado() ? 'Datos protegidos' : 'Falta la base de empleados'}</h2><p class="muted">Los informes usan la base cifrada de empleados.</p>
        ${Empleados.configurado() ? '<button class="btn" id="infUnlock">Desbloquear</button>' : '<a class="btn" href="#empleados">Ir a Empleados</a>'}</div></div>`;
      $('#infUnlock') && ($('#infUnlock').onclick = async () => { if (await ModAltas.pedirPassword()) render(main); });
      return;
    }
    const anios = [...new Set([new Date().getFullYear(), ...Empleados.todos().flatMap(e => [e.fechaContratacion, e.fechaBaja].filter(Boolean).map(f => Number(f.slice(0, 4))))])].filter(y => y >= 2000).sort((a, b) => b - a);
    main.innerHTML = `<div class="view">
      <div class="page-h no-print"><a class="crumb" href="#inicio">← Inicio</a><h1>Informes</h1><p>Para el plan de igualdad: todo desagregado por mujeres y hombres. Descárgalos en Excel o guárdalos en PDF.</p></div>
      <div class="inf-sel no-print" role="tablist" aria-label="Informes">${LISTA.map((x, i) => `<button class="plant-card${x.id === actual ? ' on' : ''}" role="tab" aria-selected="${x.id === actual}" data-inf="${x.id}" style="--i:${i}"><span class="pc-ico">${icon(x.ico)}</span><b>${x.nombre}</b><small>${x.desc}</small></button>`).join('')}</div>
      <div class="inf-bar no-print">
        <div class="field sel" id="infPeriodo"></div>
        <span class="grow"></span>
        <button class="btn ghost" id="infPdf"><svg class="i" viewBox="0 0 24 24"><path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M7 14h10v7H7z"/></svg>Imprimir / PDF</button>
        <button class="btn" id="infXlsx"><svg class="i" viewBox="0 0 24 24"><path d="M12 4v12M7 11l5 5 5-5M4 20h16"/></svg>Descargar Excel</button>
      </div>
      <div id="informe" class="informe live"></div>
    </div>`;
    const periodo = () => {
      const caja = $('#infPeriodo'), def = LISTA.find(x => x.id === actual);
      caja.innerHTML = def.porFecha ? `<label for="infFecha">A fecha</label><input type="date" id="infFecha" value="${fecha}">`
        : `<label for="infAnio">Año</label><select id="infAnio">${anios.map(y => `<option ${y === anio ? 'selected' : ''}>${y}</option>`).join('')}</select>`;
      $('#infFecha') && ($('#infFecha').onchange = e => { fecha = e.target.value || hoyISO(); pintar(); });
      $('#infAnio') && ($('#infAnio').onchange = e => { anio = Number(e.target.value); pintar(); });
    };
    $$('[data-inf]').forEach(b => b.onclick = () => { actual = b.dataset.inf; $$('[data-inf]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); }); periodo(); pintar(); });
    $('#infXlsx').onclick = descargarExcel;
    $('#infPdf').onclick = () => { $$('#informe details').forEach(d => d.open = true); window.print(); };
    periodo(); pintar();
  }

  function pintar() {
    const inf = generar(), generado = new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
    const tabla = sec => {
      const s = MotorInformes.conTotales(sec), sin = s.conSin, p = s.sumable;
      const fila = (f, tot) => `<tr class="${tot ? 'tot' : ''}"><td>${esc(f.etiqueta)}</td><td>${num(f.m, s.unidad)}</td><td>${num(f.h, s.unidad)}</td>${sin ? `<td>${num(f.s, s.unidad)}</td>` : ''}${p ? `<td>${f.t}</td><td>${pct(f.pm)}</td><td>${pct(f.ph)}</td><td class="barra no-xs"><span class="sx-bar" title="${pct(f.pm)} mujeres · ${pct(f.ph)} hombres"><i class="m" style="width:${f.pm * 100}%"></i><i class="h" style="width:${f.ph * 100}%"></i></span></td>` : ''}</tr>`;
      return `<section class="inf-sec"><h3>${esc(s.titulo)} <span>${esc(s.unidad)}</span></h3><div class="tbl-wrap"><table class="tbl inf-tbl"><thead><tr><th>Concepto</th><th>Mujeres</th><th>Hombres</th>${sin ? '<th>Sin indicar</th>' : ''}${p ? '<th>Total</th><th>% M</th><th>% H</th><th class="no-xs"></th>' : ''}</tr></thead>
        <tbody>${s.filas.length ? s.filas.map(f => fila(f)).join('') : `<tr><td colspan="8" class="muted">Sin datos en este periodo.</td></tr>`}${s.total ? fila(s.total, true) : ''}</tbody></table></div></section>`;
    };
    $('#informe').innerHTML = `<div class="card inf-doc">
      <header class="inf-h"><div><small>${esc(P.empresa.nombre)} · Informe de igualdad</small><h2>${esc(inf.titulo)}</h2><p>${esc(inf.periodo)}</p></div>
        <div class="inf-meta"><span>Generado el ${generado}</span><span>${esc(inf.norma)}</span></div></header>
      <div class="sx-ley"><span><i class="m"></i>Mujeres</span><span><i class="h"></i>Hombres</span></div>
      ${inf.secciones.map(tabla).join('')}
      ${inf.notas.length ? `<div class="notes">${inf.notas.map(n => `<div class="note${/sin sexo|sin motivo/.test(n) ? ' warn' : ''}">${icon('info')}<div>${esc(n)}</div></div>`).join('')}</div>` : ''}
      <details class="inf-det"><summary>Detalle nominal (${inf.detalle.filas.length})<svg class="i" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></summary>
        <div class="tbl-wrap"><table class="tbl inf-tbl det"><thead><tr>${inf.detalle.columnas.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${inf.detalle.filas.map(f => `<tr>${f.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${inf.detalle.columnas.length}" class="muted">Sin registros.</td></tr>`}</tbody></table></div>
        <p class="muted small">Contiene datos personales: compártelo solo con quien lo necesite (comisión negociadora del plan, con su deber de sigilo).</p></details>
    </div>`;
  }

  function descargarExcel() {
    const inf = generar(), generado = new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
    const bin = Xlsx.crear(MotorInformes.aHojas(inf, { empresa: P.empresa.nombre, generado }));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([bin], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    a.download = `informe-${inf.id}-${inf.periodo.replace(/[^0-9]+/g, '-').replace(/^-|-$/g, '')}.xlsx`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Excel descargado'); Ficus.decir('Informe listo. Contiene nombres: guárdalo en un sitio seguro.', 'yay');
  }

  return { render };
})();
