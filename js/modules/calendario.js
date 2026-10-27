/*
 * Calendario (informativo): festivos nacionales, capas de Madrid / Talavera / Valencia,
 * festivos de empresa por año y tareas. No lo usa ninguna calculadora.
 */
const ModCalendario = (() => {
  const P = window.RRHH_PARAMS;
  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const AMBITO = { nacional: 'Nacional', autonomico: 'Autonómico', local: 'Local', empresa: 'Empresa' };
  const hoyISO = () => Fecha.iso(Fecha.hoy());

  const cfg = () => {
    const d = new Date();
    return Object.assign({ capas: ['madrid'], empresa: true, tareas: true, ausencias: true, vista: 'mes', anio: d.getFullYear(), mes: d.getMonth(), sel: hoyISO() }, Datos.get('calendario', {}));
  };
  const setCfg = c => Datos.set('calendario', c);
  const empresa = () => Datos.get('festivosEmpresa', []);
  const etiquetaCapa = (capa, ambito) => capa === 'nac' ? 'Nacional' : capa === 'empresa' ? 'Empresa'
    : ambito === 'local' ? P.capasFestivos[capa].municipio : P.capasFestivos[capa].comunidad;

  function datos(c) {
    const fest = MotorFestivos.delAnio(P.festivos, c.anio, c.capas, c.empresa ? empresa() : []);
    const tareas = new Map();
    if (c.tareas) { const ahora = Date.now(); Tareas.todas().filter(t => MotorTareas.enCalendario(t) && !MotorTareas.archivado(t, ahora) && t.fecha.startsWith(c.anio + '-')).forEach(t => { if (!tareas.has(t.fecha)) tareas.set(t.fecha, []); tareas.get(t.fecha).push(t); }); }
    return { fest, tareas, aus: c.ausencias ? ausenciasDelAnio(c.anio) : new Map() };
  }
  /* Ausencias: solo se marca el día en que terminan (fin real o previsto). Sin fecha de fin, no se marcan.
     Con la base desbloqueada, con nombre y tipo; bloqueada, solo "Fin de ausencia". */
  function ausenciasDelAnio(anio) {
    const m = new Map(), y = String(anio);
    const lista = Empleados.desbloqueado
      ? Ausencias.todas().filter(a => Ausencias.tipo(a.tipo).ausencia !== false).map(a => { const t = Ausencias.tipo(a.tipo), n = (a.empleado || '').split(' '); return { id: a.id, fin: a.finReal || a.hastaPrevista, corto: (() => { const ap = n.slice(1).find(w => !/^(de|del|la|las|los|y)$/i.test(w)); return `${n[0]} ${ap ? ap[0].toUpperCase() + '.' : ''}`.trim(); })(), nombre: a.empleado, tipo: t.nombre, color: t.color }; })
      : Ausencias.publico().map(a => ({ id: a.id, fin: a.hasta, corto: 'Ausencia', nombre: 'Ausencia', tipo: '', color: 'var(--brand-2)' }));
    lista.filter(a => a.fin && a.fin.startsWith(y)).forEach(a => { if (!m.has(a.fin)) m.set(a.fin, []); m.get(a.fin).push(a); });
    return m;
  }
  const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const lunes0 = (y, m) => (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;     // 0 = lunes
  const diasMes = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

  /* ---------- Vistas ---------- */
  function vMes(c, D) {
    const n = diasMes(c.anio, c.mes), off = lunes0(c.anio, c.mes), hoy = hoyISO();
    let celdas = '';
    for (let i = 0; i < off; i++) celdas += '<div class="cd vacio" aria-hidden="true"></div>';
    for (let d = 1; d <= n; d++) {
      const f = iso(c.anio, c.mes, d), fs = D.fest.get(f) || [], ts = (D.tareas.get(f) || []).filter(t => !t.hecha), as = D.aus.get(f) || [], dow = (off + d - 1) % 7;
      const etiquetas = fs.slice(0, 2).map(x => `<span class="ev tag-${x.capa}" title="${esc(x.nombre)} · ${etiquetaCapa(x.capa, x.ambito)}">${esc(x.nombre)}</span>`).join('') + (fs.length > 2 ? `<span class="ev more">+${fs.length - 2}</span>` : '');
      const puntos = fs.map(x => `<i class="dot tag-${x.capa}"></i>`).join('') + ((D.aus.get(f) || []).length ? `<i class="dot" style="--c:${D.aus.get(f)[0].color}"></i>` : '');
      const aria = `${d} de ${MESES[c.mes].toLowerCase()}${fs.length ? ': ' + fs.map(x => x.nombre).join(', ') : ''}${ts.length ? `, ${ts.length} recordatorio${ts.length > 1 ? 's' : ''} o aviso${ts.length > 1 ? 's' : ''}` : ''}`;
      celdas += `<button class="cd${dow > 4 ? ' finde' : ''}${fs.length ? ' fest' : ''}${f === hoy ? ' hoy' : ''}${f === c.sel ? ' sel' : ''}" data-f="${f}" aria-label="${esc(aria)}" aria-pressed="${f === c.sel}">
        <span class="num">${d}</span>${ts.length ? `<span class="tcount" title="${ts.length} recordatorio(s) o aviso(s)">${ts.length}</span>` : ''}
        <span class="evs">${etiquetas}${as.length ? `<span class="ev aus" style="--tc:${as[0].color}" title="${esc('Termina la ausencia: ' + as.map(x => x.nombre + (x.tipo ? ' · ' + x.tipo : '')).join(', '))}">${as.length > 1 ? `Fin de ${as.length} ausencias` : 'Fin: ' + esc(as[0].corto)}</span>` : ''}</span><span class="dots">${puntos}</span></button>`;
    }
    return `<div class="mes-nav"><button class="icon-btn" data-nav="-1" aria-label="Mes anterior"><svg class="i" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button>
      <h2>${MESES[c.mes]} ${c.anio}</h2><button class="icon-btn" data-nav="1" aria-label="Mes siguiente"><svg class="i" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>
      <button class="btn ghost sm" data-hoy style="margin-left:auto">Hoy</button></div>
      <div class="grid-mes" role="group" aria-label="${MESES[c.mes]} ${c.anio}">${DIAS.map((x, i) => `<div class="dh${i > 4 ? ' finde' : ''}">${x}</div>`).join('')}${celdas}</div>`;
  }

  function vAnio(c, D) {
    const hoy = hoyISO();
    return `<div class="mes-nav"><button class="icon-btn" data-navy="-1" aria-label="Año anterior"><svg class="i" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button><h2>${c.anio}</h2><button class="icon-btn" data-navy="1" aria-label="Año siguiente"><svg class="i" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button></div>
    <div class="anio-grid">${MESES.map((nm, m) => {
      const n = diasMes(c.anio, m), off = lunes0(c.anio, m); let cells = '';
      for (let i = 0; i < off; i++) cells += '<span></span>';
      for (let d = 1; d <= n; d++) {
        const f = iso(c.anio, m, d), fs = D.fest.get(f), dow = (off + d - 1) % 7;
        cells += `<button class="md${fs ? ' tag-' + fs[0].capa : ''}${dow > 4 ? ' finde' : ''}${f === hoy ? ' hoy' : ''}" data-ir="${f}" title="${fs ? esc(fs.map(x => x.nombre).join(' · ')) : ''}" aria-label="${d} de ${nm.toLowerCase()}${fs ? ': ' + esc(fs.map(x => x.nombre).join(', ')) : ''}">${d}</button>`;
      }
      return `<div class="mini"><button class="mini-h" data-mes="${m}">${nm}</button><div class="mini-g">${DIAS.map(x => `<span class="mdh">${x}</span>`).join('')}${cells}</div></div>`;
    }).join('')}</div>`;
  }

  function vLista(c, D) {
    if (!D.fest.size) return '<p class="muted">No hay festivos cargados para este año.</p>';
    let mesAct = -1, html = '';
    for (const [f, l] of D.fest) {
      const t = Fecha.parse(f), m = new Date(t).getUTCMonth();
      if (m !== mesAct) { html += `${mesAct >= 0 ? '</ul>' : ''}<h3 class="lista-mes">${MESES[m]}</h3><ul class="fest-list">`; mesAct = m; }
      html += `<li><div class="cal"><small>${Fecha.mesCorto(t)}</small><b>${new Date(t).getUTCDate()}</b></div><div class="fl-t"><span class="fl-dia">${Fecha.diaSemana(t)}</span>${l.map(x => `<span class="fl-row"><b>${esc(x.nombre)}</b><span class="chip-c tag-${x.capa}">${etiquetaCapa(x.capa, x.ambito)}</span></span>`).join('')}</div></li>`;
    }
    return html + '</ul>';
  }

  function panelDia(c, D) {
    const f = c.sel; if (!f || !f.startsWith(c.anio + '-')) return '<div class="card dia-panel"><p class="muted" style="margin:0">Selecciona un día para ver sus festivos y tareas.</p></div>';
    const t = Fecha.parse(f), fs = D.fest.get(f) || [], ts = D.tareas.get(f) || [], emp = empresa().find(e => e.fecha === f);
    return `<div class="card dia-panel">
      <div class="dp-h"><div class="cal lg"><small>${Fecha.mesCorto(t)}</small><b>${new Date(t).getUTCDate()}</b></div><div><b class="dp-dia">${Fecha.diaSemana(t)}</b><span class="muted">${Fecha.larga(t)}</span></div></div>
      ${fs.length ? `<ul class="dp-list">${fs.map(x => `<li><span class="chip-c tag-${x.capa}">${etiquetaCapa(x.capa, x.ambito)}</span>${esc(x.nombre)}</li>`).join('')}</ul>` : '<p class="muted small">Día laborable (con las capas activas).</p>'}
      ${c.ausencias && (D.aus.get(f) || []).length ? `<h4>Terminan ausencias</h4><ul class="dp-aus">${D.aus.get(f).map(x => `<li style="--tc:${x.color}"><i></i>${Empleados.desbloqueado ? `<button class="linkbtn" data-aus-dia="${x.id}">${esc(x.nombre)}</button><span class="muted small">${esc(x.tipo)}</span>` : 'Ausencia <span class="muted small">(desbloquea Empleados para ver quién)</span>'}</li>`).join('')}</ul>` : ''}
      ${c.tareas ? `<h4>Recordatorios y avisos</h4>${ts.length ? `<ul class="dp-tasks">${ts.map(x => `<li class="${x.hecha ? 'done' : ''}"><i class="est ${x.estado}" title="${Tareas.estadoTxt(x)}"></i>${Tareas.chipCat(x.categoria, true)}<button class="linkbtn" data-tarea="${x.id}">${esc(x.titulo)}</button><span class="tk-key">${MotorTareas.clave(x.clave)}</span></li>`).join('')}</ul>` : '<p class="muted small">Nada este día.</p>'}` : ''}
      <div class="dp-acts"><button class="btn sm" data-tarea-dia="recordatorio">+ Recordatorio</button><button class="btn ghost sm" data-tarea-dia="tarea">+ Tarea con aviso</button>
      ${emp ? `<button class="btn ghost sm" data-quitar-emp>Quitar festivo de empresa</button>` : `<button class="btn ghost sm" data-add-emp>Marcar festivo de empresa</button>`}</div>
    </div>`;
  }

  function cardEmpresa(c) {
    const l = empresa().filter(e => e.fecha.startsWith(c.anio + '-')).sort((a, b) => a.fecha.localeCompare(b.fecha));
    return `<section class="card empcard"><div class="card-h"><h3>Festivos de empresa ${c.anio}</h3><span class="ex">${l.length}</span></div>
      ${l.length ? `<ul class="emp-list">${l.map(e => `<li><span class="chip-c tag-empresa">${Fecha.corta(Fecha.parse(e.fecha))}</span>${esc(e.nombre)}<button class="icon-act" data-del-emp="${e.fecha}" aria-label="Quitar ${esc(e.nombre)}" title="Quitar"><svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></li>`).join('')}</ul>` : '<p class="muted small">Aún no hay festivos de empresa para este año.</p>'}
      <form class="emp-form" id="empForm"><input type="date" id="empF" required aria-label="Fecha" min="${c.anio}-01-01" max="${c.anio}-12-31"><input id="empN" required maxlength="60" placeholder="Nombre, p. ej. Nochebuena" aria-label="Nombre del festivo"><button class="btn sm">Añadir</button></form>
    </section>`;
  }

  function fuentes(c) {
    const a = P.festivos[c.anio]; if (!a) return '';
    return `<details class="legal"><summary>Fuentes oficiales ${c.anio}<svg class="i" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></summary><div class="body">
      <p><b>Nacionales:</b> ${esc(a.fuente)}${a.nota ? `<br><span>${esc(a.nota)}</span>` : ''}</p>
      ${Object.entries(P.capasFestivos).map(([k, v]) => a.capas?.[k] ? `<p><b>${v.comunidad}:</b> ${esc(a.capas[k].fuente)}<br><b>${v.municipio}:</b> ${esc(a.capas[k].local?.fuente || '—')}</p>` : '').join('')}
      <p style="margin:0">Los festivos locales se publican a lo largo del año anterior. Se actualizan en <code>js/params.js</code>.</p></div></details>`;
  }

  /* ---------- Render ---------- */
  function render(main) {
    const c = cfg(), D = datos(c), sinDatos = !P.festivos[c.anio];
    const capasBtn = Object.entries(P.capasFestivos).map(([k, v]) => `<button class="layer tag-${k}" data-capa="${k}" aria-pressed="${c.capas.includes(k)}" title="${v.comunidad} + ${v.municipio}"><i></i>${v.nombre}</button>`).join('');
    const localPend = c.capas.some(k => P.festivos[c.anio]?.capas?.[k] && !P.festivos[c.anio].capas[k].local?.dias.length);
    main.innerHTML = `<div class="view">
      <div class="page-h page-h-row"><div><a class="crumb" href="#inicio">← Inicio</a><h1>Calendario</h1><p>Festivos, recordatorios, tareas con aviso y fin de ausencias. Es informativo: las calculadoras no lo usan.</p></div>
        <div class="seg3" role="group" aria-label="Vista">${[['mes', 'Mes'], ['anio', 'Año'], ['lista', 'Lista']].map(([k, l]) => `<button data-vista="${k}" aria-pressed="${c.vista === k}">${l}</button>`).join('')}</div></div>
      <div class="layers" role="group" aria-label="Qué mostrar">
        <span class="layer fixed tag-nac"><i></i>Nacionales</span>${capasBtn}
        <button class="layer tag-empresa" data-emp aria-pressed="${c.empresa}"><i></i>Empresa</button>
        <button class="layer tag-tarea" data-tar aria-pressed="${c.tareas}"><i></i>Recordatorios y avisos</button>
        <button class="layer tag-aus" data-aus aria-pressed="${c.ausencias}"><i></i>Fin de ausencias${c.ausencias && !Empleados.desbloqueado && Empleados.configurado() ? ' (sin nombres)' : ''}</button>
      </div>
      ${sinDatos ? `<div class="note warn">${icon('info')}<div>No hay calendario oficial cargado para ${c.anio}. Solo se muestran tus festivos de empresa y tareas.</div></div>` : localPend ? `<div class="note">${icon('info')}<div>Los festivos locales de ${c.anio} aún no están publicados para alguna de las capas activas.</div></div>` : ''}
      <div class="cal-layout${c.vista === 'mes' ? '' : ' full'}">
        <div class="card cal-main">${c.vista === 'mes' ? vMes(c, D) : c.vista === 'anio' ? vAnio(c, D) : `<div class="mes-nav"><button class="icon-btn" data-navy="-1" aria-label="Año anterior"><svg class="i" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button><h2>Festivos ${c.anio}</h2><button class="icon-btn" data-navy="1" aria-label="Año siguiente"><svg class="i" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button><span class="ex" style="margin-left:auto">${D.fest.size} días</span></div>${vLista(c, D)}`}</div>
        ${c.vista === 'mes' ? `<aside class="cal-side">${panelDia(c, D)}${cardEmpresa(c)}</aside>` : ''}
      </div>
      ${c.vista !== 'mes' ? cardEmpresa(c) : ''}
      ${fuentes(c)}
    </div>`;
    enlazar(main);
  }

  function enlazar(main) {
    const upd = (cambio, mantenerScroll = true) => { const y = scrollY; setCfg({ ...cfg(), ...cambio }); render(main); if (mantenerScroll) scrollTo(0, y); };
    $$('[data-vista]', main).forEach(b => b.onclick = () => upd({ vista: b.dataset.vista }));
    $$('[data-capa]', main).forEach(b => b.onclick = () => { const c = cfg(), k = b.dataset.capa; upd({ capas: c.capas.includes(k) ? c.capas.filter(x => x !== k) : [...c.capas, k] }); });
    $('[data-emp]', main).onclick = () => upd({ empresa: !cfg().empresa });
    $('[data-tar]', main).onclick = () => upd({ tareas: !cfg().tareas });
    $('[data-aus]', main).onclick = () => upd({ ausencias: !cfg().ausencias });
    $$('[data-aus-dia]', main).forEach(b => b.onclick = () => ModAusencias.abrir(Number(b.dataset.ausDia)));
    $$('[data-nav]', main).forEach(b => b.onclick = () => { const c = cfg(); let m = c.mes + Number(b.dataset.nav), y = c.anio; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } upd({ mes: m, anio: y }); });
    $$('[data-navy]', main).forEach(b => b.onclick = () => upd({ anio: cfg().anio + Number(b.dataset.navy) }));
    $('[data-hoy]', main) && ($('[data-hoy]', main).onclick = () => { const d = new Date(); upd({ anio: d.getFullYear(), mes: d.getMonth(), sel: hoyISO() }); });
    $$('.cd[data-f]', main).forEach(b => b.onclick = () => upd({ sel: b.dataset.f }));
    $$('[data-ir]', main).forEach(b => b.onclick = () => { const f = b.dataset.ir; upd({ vista: 'mes', mes: Number(f.slice(5, 7)) - 1, sel: f }, false); });
    $$('[data-mes]', main).forEach(b => b.onclick = () => upd({ vista: 'mes', mes: Number(b.dataset.mes) }, false));
    $$('[data-tarea-dia]', main).forEach(b => b.onclick = () => Tareas.abrir({ fecha: cfg().sel, tipo: b.dataset.tareaDia, aviso: true }));
    $$('[data-tarea]', main).forEach(b => b.onclick = () => { const t = Tareas.todas().find(x => String(x.id) === b.dataset.tarea); if (t) Tareas.abrir({ tarea: t }); });
    $('[data-add-emp]', main) && ($('[data-add-emp]', main).onclick = () => { $('#empF').value = cfg().sel; $('#empN').focus(); $('#empN').scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' }); });
    $('[data-quitar-emp]', main) && ($('[data-quitar-emp]', main).onclick = () => quitarEmp(cfg().sel, main));
    $$('[data-del-emp]', main).forEach(b => b.onclick = () => quitarEmp(b.dataset.delEmp, main));
    $('#empForm').onsubmit = e => {
      e.preventDefault();
      const fecha = $('#empF').value, nombre = $('#empN').value.trim(); if (!fecha || !nombre) return;
      Datos.set('festivosEmpresa', [...empresa().filter(x => x.fecha !== fecha), { fecha, nombre }]);
      toast('Festivo de empresa añadido'); upd({ empresa: true, sel: fecha });
    };
  }
  function quitarEmp(fecha, main) {
    const quitado = empresa().find(x => x.fecha === fecha); if (!quitado) return;
    Datos.set('festivosEmpresa', empresa().filter(x => x.fecha !== fecha)); render(main);
    toast('Festivo de empresa quitado', { texto: 'Deshacer', fn: () => { Datos.set('festivosEmpresa', [...empresa(), quitado]); render(main); } });
  }

  /* Próximos festivos para el panel de inicio (usa las capas activas del calendario). */
  function proximos(n = 4) { const c = cfg(); return MotorFestivos.proximos(P.festivos, hoyISO(), c.capas, c.empresa ? empresa() : [], n); }
  /* Para el mini calendario del panel: datos del año con las capas activas, e ir a un día. */
  const datosDe = anio => { const c = { ...cfg(), anio }; return { ...datos(c), capas: c.capas }; };
  const irA = f => { setCfg({ ...cfg(), vista: 'mes', anio: Number(f.slice(0, 4)), mes: Number(f.slice(5, 7)) - 1, sel: f }); location.hash = '#calendario'; };
  return { render, proximos, etiquetaCapa, datosDe, irA };
})();
