/*
 * Pantalla de Tareas: tickets tipo Jira (tareas y recordatorios).
 * - Vistas: Mi semana · Este mes · Todas · Fijadas · Recordatorios · Archivo (por meses).
 * - Lista (filas con estado, clave, categoría, importancia y fecha) o tablero por estados (arrastrar entre columnas).
 * - Filtros rápidos: categoría, importancia, estado, tipo y "con aviso". Clic en un ticket: panel de detalle.
 * - "Una a una": revisa los pendientes de la vista de uno en uno.
 */
const ModTareas = (() => {
  const VISTAS = [['semana', 'Mi semana'], ['mes', 'Este mes'], ['todas', 'Todas'], ['fijadas', 'Fijadas'], ['recordatorios', 'Recordatorios'], ['archivo', 'Archivo']];
  const tactil = matchMedia('(pointer:coarse)').matches;
  let vista = null, modo = null, f = { categoria: '', prioridad: '', estado: '', tipo: '', aviso: false, q: '' }, mesArch = null, recien = null;
  const hoyISO = () => Fecha.iso(Fecha.hoy());
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const nombreMes = k => k === 'sin-fecha' ? 'Sin fecha de cierre' : `${MESES[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}`;
  const capital = s => s.charAt(0).toUpperCase() + s.slice(1);

  function rango() {
    const h = hoyISO();
    if (vista === 'semana') { const r = MotorTareas.semanaDe(h); return `Semana del ${Fecha.corta(Fecha.parse(r.desde))} al ${Fecha.corta(Fecha.parse(r.hasta))} · más lo vencido y lo fijado`; }
    if (vista === 'mes') return `${capital(MESES[Number(h.slice(5, 7)) - 1])} ${h.slice(0, 4)} · más lo vencido y lo fijado`;
    if (vista === 'todas') return 'Todo lo que no está archivado, también lo que no tiene fecha';
    if (vista === 'fijadas') return 'Lo que quieres tener siempre a la vista';
    if (vista === 'recordatorios') return 'Fechas a vigilar: salen siempre en el calendario';
    return `Los tickets hechos pasan aquí a los ${MotorTareas.ARCHIVAR_DIAS} días de completarse`;
  }

  /* ---------- Piezas ---------- */
  const botonEstado = t => `<button class="tk-st st-${t.estado}" data-st aria-label="Estado: ${Tareas.estadoTxt(t)}. Pulsa para avanzar" title="${Tareas.estadoTxt(t)} · pulsa para pasar a ${(t.tipo === 'recordatorio' ? Tareas.ESTADO_R : Tareas.ESTADO)[MotorTareas.siguienteEstado(t.estado, t.tipo)].toLowerCase()}"><i></i></button>`;
  function meta(t) {
    const per = Tareas.persona(t), hechos = t.pasos.filter(p => p.ok).length;
    return [Tareas.chipCat(t.categoria),
      t.tipo === 'recordatorio' ? `<span class="tk-m">${icon('campana')}Recordatorio</span>` : t.aviso ? `<span class="tk-m" title="Avisa en el calendario">${icon('campana')}</span>` : '',
      per ? `<span class="tk-m">${icon('empleados')}${per.bloqueada ? 'Persona vinculada' : esc(per.nombre)}</span>` : '',
      t.pasos.length ? `<span class="tk-m${hechos === t.pasos.length ? ' ok' : ''}">${icon('altas')}${hechos}/${t.pasos.length}</span>` : '',
      t.repite ? `<span class="tk-m" title="${Tareas.REPITE[t.repite]}">${icon('repite')}</span>` : '',
      t.auto ? '<span class="tag">automática</span>' : ''].join('');
  }
  function fila(t) {
    const h = hoyISO(), venc = MotorTareas.vencido(t, h), hecha = t.estado === 'terminado';
    return `<li class="tk-row p-${t.prioridad}${hecha ? ' done' : ''}${recien === t.id ? ' just' : ''}${Tareas.abierto === t.id ? ' sel' : ''}" data-tk="${t.id}">
      ${botonEstado(t)}
      <button class="tk-main" data-open><span class="tk-key">${MotorTareas.clave(t.clave)}</span><span class="tk-t"><b>${esc(t.titulo)}</b><span class="tk-meta">${meta(t)}</span></span></button>
      <span class="tk-side">${t.fijada ? `<span class="tk-pinned" title="Fijada">${icon('pin')}</span>` : ''}<i class="prio ${t.prioridad}" title="Importancia ${t.prioridad}"></i>
        <span class="tk-f${venc ? ' late-txt' : ''}${t.fecha === h && !hecha ? ' hoy' : ''}">${hecha && t.hechaEl ? `Hecha ${new Date(t.hechaEl).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}` : Tareas.cuando(t.fecha)}</span>
        <span class="tk-est est-${t.estado}">${Tareas.estadoTxt(t)}</span></span></li>`;
  }
  /* Grupos de la lista: fijadas sin fecha, vencidas, con fecha, sin fecha y hechas (los 7 últimos días). */
  function grupos(l) {
    const h = hoyISO(), g = { fij: [], venc: [], fecha: [], aviso: [], sin: [], hechas: [] };
    const r = vista === 'semana' ? MotorTareas.semanaDe(h) : vista === 'mes' ? MotorTareas.mesDe(h) : null;
    l.forEach(t => t.estado === 'terminado' ? g.hechas.push(t) : t.fijada && (!t.fecha || (r && t.fecha > r.hasta)) ? g.fij.push(t) : MotorTareas.vencido(t, h) ? g.venc.push(t)
      : t.fecha && r && t.fecha > r.hasta ? g.aviso.push(t) : t.fecha ? g.fecha.push(t) : g.sin.push(t));
    return [['fij', 'Fijadas', '', g.fij], ['venc', 'Vencidas', 'late', g.venc], ['fecha', vista === 'semana' ? 'Esta semana' : vista === 'mes' ? 'Este mes' : 'Con fecha', '', g.fecha],
      ['aviso', 'Avisos por adelantado · vencen más adelante', 'aviso-g', g.aviso], ['sin', 'Sin fecha', '', g.sin], ['hechas', `Hechas · se archivan a los ${MotorTareas.ARCHIVAR_DIAS} días`, 'done-g', g.hechas]].filter(x => x[3].length);
  }
  function lista(l) {
    if (!l.length) return vacio();
    return grupos(l).map(([k, n, c, li]) => `<section class="tk-grp" data-g="${k}"><h2 class="tgroup ${c}">${n} <span>${li.length}</span></h2><ul class="tk-list">${li.map(fila).join('')}</ul></section>`).join('');
  }
  function vacio() {
    const filtrado = f.categoria || f.prioridad || f.estado || f.tipo || f.aviso || f.q;
    const txt = filtrado ? 'Ningún ticket coincide con los filtros.' : { semana: 'Semana despejada.', mes: 'Nada pendiente este mes.', fijadas: 'No tienes nada fijado.', recordatorios: 'No hay recordatorios.', todas: 'No hay tickets.' }[vista];
    return `<div class="card empty-card"><p><b>${txt}</b></p><p class="muted">${filtrado ? '<button class="linkbtn" data-limpiar>Quitar los filtros</button>' : vista === 'fijadas' ? 'Fija un ticket desde su detalle (icono de chincheta) para tenerlo siempre a la vista.' : 'Usa «Nueva tarea» o el botón amarillo <b>+</b>.'}</p></div>`;
  }

  /* ---------- Tablero ---------- */
  function tarjeta(t) {
    const venc = MotorTareas.vencido(t, hoyISO());
    return `<div class="kcard p-${t.prioridad}${recien === t.id ? ' just' : ''}${Tareas.abierto === t.id ? ' sel' : ''}${t.estado === 'terminado' ? ' done' : ''}" draggable="${!tactil}" tabindex="0" data-tk="${t.id}" style="--cc:${Tareas.cat(t.categoria).color}" aria-label="${MotorTareas.clave(t.clave)} ${esc(t.titulo)}. ${tactil ? 'Pulsa para abrir.' : 'Arrastra para cambiar de estado; Intro para abrir; flechas para moverlo.'}">
      <span class="kc-top"><span class="tk-key">${MotorTareas.clave(t.clave)}</span>${Tareas.chipCat(t.categoria, true)}${t.tipo === 'recordatorio' ? `<span class="tk-m">${icon('campana')}</span>` : ''}${t.fijada ? `<span class="tk-pinned">${icon('pin')}</span>` : ''}</span>
      <span class="kt">${esc(t.titulo)}</span>
      <span class="kf"><i class="prio ${t.prioridad}" title="Importancia ${t.prioridad}"></i><span class="${venc ? 'late-txt' : ''}">${t.fecha ? Tareas.cuando(t.fecha) : ''}</span>${t.pasos.length ? `<span class="tk-m">${t.pasos.filter(p => p.ok).length}/${t.pasos.length}</span>` : ''}</span>
    </div>`;
  }
  function tablero(l) {
    return `<div class="board b4">${MotorTareas.ESTADOS.map(e => {
      const col = l.filter(t => t.estado === e);
      return `<section class="kcol st-${e}" data-col="${e}" aria-label="${Tareas.ESTADO[e]}">
        <h2 class="kcol-h"><i></i>${Tareas.ESTADO[e]}<span>${col.length}</span>${e === 'pendiente' ? '<button class="kadd" data-new-task aria-label="Nueva tarea" title="Nueva tarea"><svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>' : ''}</h2>
        <div class="kcards">${col.map(tarjeta).join('') || `<p class="kempty">${tactil ? 'Sin tickets' : 'Arrastra aquí'}</p>`}</div></section>`;
    }).join('')}</div>
    <p class="muted small" style="margin-top:12px">${tactil ? 'Pulsa un ticket para abrirlo y cambiar su estado.' : 'Arrastra los tickets entre columnas. Clic para abrir el detalle. Con el teclado: flechas ← → para moverlo e Intro para abrirlo.'} Los recordatorios solo pasan entre «Por hacer» y «Hecha».</p>`;
  }

  /* ---------- Archivo ---------- */
  function archivo(l) {
    const meses = MotorTareas.archivoPorMes(l);
    if (!meses.length) return `<div class="card empty-card"><p><b>${f.q || f.categoria || f.prioridad || f.tipo ? 'Nada en el archivo coincide con los filtros.' : 'El archivo está vacío.'}</b></p><p class="muted">Cuando completes un ticket, seguirá a la vista ${MotorTareas.ARCHIVAR_DIAS} días y después pasará aquí, ordenado por meses.</p></div>`;
    if (!mesArch || !meses.some(m => m.mes === mesArch)) mesArch = meses[0].mes;
    const i = meses.findIndex(m => m.mes === mesArch), m = meses[i], cats = Object.entries(MotorTareas.porCategoria(m.items)).sort((a, b) => b[1] - a[1]), max = Math.max(...cats.map(c => c[1]));
    return `<div class="arch">
      <div class="arch-nav"><button class="icon-btn" data-arch="${i + 1}" ${i >= meses.length - 1 ? 'disabled' : ''} aria-label="Mes anterior"><svg class="i" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button>
        <h2>${capital(nombreMes(m.mes))}</h2><button class="icon-btn" data-arch="${i - 1}" ${i <= 0 ? 'disabled' : ''} aria-label="Mes siguiente"><svg class="i" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>
        <div class="arch-meses" role="group" aria-label="Meses">${meses.map((x, j) => `<button data-arch="${j}" aria-pressed="${j === i}">${x.mes === 'sin-fecha' ? 'Sin fecha' : capital(MESES[Number(x.mes.slice(5, 7)) - 1].slice(0, 3)) + ' ' + x.mes.slice(2, 4)}<b>${x.items.length}</b></button>`).join('')}</div></div>
      <div class="arch-layout">
        <aside class="card arch-res"><div class="mini-n"><b>${m.items.length}</b><span>ticket${m.items.length === 1 ? '' : 's'} cerrado${m.items.length === 1 ? '' : 's'}</span></div>
          <ul class="arch-cats">${cats.map(([c, n]) => { const x = Tareas.cat(c); return `<li style="--cc:${x.color}"><span>${icon(x.icono)}${esc(x.nombre)}</span><b>${n}</b><i style="width:${n / max * 100}%"></i></li>`; }).join('')}</ul>
          <p class="muted small" style="margin:10px 0 0">${m.items.filter(t => t.tipo === 'recordatorio').length} recordatorios · ${m.items.filter(t => t.tipo !== 'recordatorio').length} tareas</p></aside>
        <ul class="tk-list arch-list">${m.items.map(t => `<li class="tk-row done p-${t.prioridad}" data-tk="${t.id}">
          <span class="tk-st st-terminado" aria-hidden="true"><i></i></span>
          <button class="tk-main" data-open><span class="tk-key">${MotorTareas.clave(t.clave)}</span><span class="tk-t"><b>${esc(t.titulo)}</b><span class="tk-meta">${meta(t)}</span></span></button>
          <span class="tk-side"><span class="tk-f">${t.hechaEl ? new Date(t.hechaEl).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '—'}</span><button class="linkbtn" data-reabrir>Reabrir</button></span></li>`).join('')}</ul>
      </div></div>`;
  }

  /* ---------- Página ---------- */
  function render(main) {
    vista = vista || Datos.get('_vistaTareas', 'semana'); if (!VISTAS.some(v => v[0] === vista)) vista = 'semana';
    modo = modo || Datos.get('_modoTareas', 'lista');
    const cuenta = k => k === 'archivo' ? Tareas.vista('archivo').length : Tareas.vista(k).filter(t => t.estado !== 'terminado').length;
    const avisos = Tareas.avisosActivos, cats = Tareas.categorias();
    const selF = (id, campo, label, opts) => `<label class="sel tk-sel${f[campo] ? ' on' : ''}"><span class="sr">${label}</span><select id="${id}"><option value="">${label}</option>${opts.map(([v, l]) => `<option value="${v}" ${f[campo] === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
    main.innerHTML = `<div class="view tk-view">
      <div class="page-h page-h-row">
        <div><a class="crumb" href="#inicio">← Inicio</a><h1>Tareas</h1><p>Tareas y recordatorios como tickets. Pulsa uno para ver su detalle; el círculo de la izquierda lo avanza de estado.</p></div>
        <div class="page-acts">
          <button class="btn ghost" id="focoBtn">${icon('foco')}Una a una</button>
          <button class="btn" data-new-task><svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Nueva tarea</button>
        </div>
      </div>
      <nav class="tk-tabs" aria-label="Vistas">${VISTAS.map(([k, l]) => { const n = cuenta(k); return `<button data-vista="${k}" aria-pressed="${vista === k}">${k === 'archivo' ? icon('archivo') : k === 'fijadas' ? icon('pin') : k === 'recordatorios' ? icon('campana') : ''}${l}${n ? `<span>${n}</span>` : ''}</button>`; }).join('')}</nav>
      <p class="tk-rango muted small">${rango()}</p>
      <div class="toolbar tk-tools">
        ${vista === 'archivo' ? '' : `<div class="seg3" role="group" aria-label="Ver como"><button data-modo="lista" aria-pressed="${modo === 'lista'}"><svg class="i" viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>Lista</button><button data-modo="tablero" aria-pressed="${modo === 'tablero'}"><svg class="i" viewBox="0 0 24 24"><path d="M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v13h-4z"/></svg>Tablero</button></div>`}
        ${selF('fCat', 'categoria', 'Categoría', cats.map(c => [c.id, c.nombre]))}
        ${selF('fPrio', 'prioridad', 'Importancia', [['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']])}
        ${vista === 'archivo' ? '' : selF('fEst', 'estado', 'Estado', MotorTareas.ESTADOS.map(e => [e, Tareas.ESTADO[e]]))}
        ${vista === 'recordatorios' ? '' : selF('fTipo', 'tipo', 'Tipo', [['tarea', 'Tareas'], ['recordatorio', 'Recordatorios']])}
        ${vista === 'archivo' ? '' : `<button class="chip-f" id="fAv" aria-pressed="${f.aviso}">${icon('campana')}Con aviso</button>`}
        <label class="search-in"><svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><span class="sr">Buscar en tickets</span><input id="tq" type="search" placeholder="Buscar: título, clave, notas…" value="${esc(f.q)}"></label>
      </div>
      <div class="tlist" id="tkCont"></div>
      <div class="tk-foot muted small">
        <button class="linkbtn" id="avisosBtn" aria-pressed="${avisos}">${avisos ? 'Avisos de Windows activos · desactivar' : 'Activar avisos de Windows'}</button> ·
        <button class="linkbtn" id="icsAll">Exportar los pendientes con fecha a mi calendario (.ics)</button>
        ${avisos ? '' : '<br>Los avisos de Windows solo aparecen con la plataforma abierta. Para recibirlos aunque esté cerrada, exporta al calendario.'}
      </div>
    </div>`;
    pintarLista(main);
    enlazar(main);
  }
  const datosVista = () => Tareas.vista(vista, vista === 'recordatorios' ? { ...f, tipo: '' } : f);
  function pintarLista(main) {
    const l = datosVista(), cont = $('#tkCont', main);
    cont.innerHTML = vista === 'archivo' ? archivo(l) : modo === 'tablero' ? tablero(l) : lista(l);
    recien = null; enlazarLista(main);
  }

  function enlazar(main) {
    $$('[data-vista]', main).forEach(b => b.onclick = () => { vista = b.dataset.vista; Datos.set('_vistaTareas', vista); if (vista === 'archivo') f.estado = ''; render(main); });
    $$('[data-modo]', main).forEach(b => b.onclick = () => { modo = b.dataset.modo; Datos.set('_modoTareas', modo); render(main); });
    const sf = (id, campo) => { const el = $('#' + id, main); if (el) el.onchange = () => { f[campo] = el.value; el.closest('.tk-sel').classList.toggle('on', !!el.value); pintarLista(main); }; };
    sf('fCat', 'categoria'); sf('fPrio', 'prioridad'); sf('fEst', 'estado'); sf('fTipo', 'tipo');
    $('#fAv', main) && ($('#fAv', main).onclick = e => { f.aviso = !f.aviso; e.currentTarget.setAttribute('aria-pressed', f.aviso); pintarLista(main); });
    $('#tq', main).oninput = e => { f.q = e.target.value; pintarLista(main); };
    $('#focoBtn', main).onclick = () => {
      const l = (vista === 'archivo' ? Tareas.vista('semana') : datosVista()).filter(t => t.estado !== 'terminado');
      Tareas.unaAUna(l.map(t => t.id), VISTAS.find(v => v[0] === (vista === 'archivo' ? 'semana' : vista))[1]);
    };
    $('#avisosBtn', main).onclick = async () => { if (Tareas.avisosActivos) Tareas.desactivarAvisos(); else await Tareas.activarAvisos(); render(main); };
    $('#icsAll', main).onclick = () => Tareas.descargarIcs(Tareas.todas().filter(t => !t.hecha && t.fecha), 'tickets-pendientes');
  }

  function cambiar(main, id, estado) {
    const t = Tareas.buscar(id); if (!t) return;
    if (t.tipo === 'recordatorio' && estado && !['pendiente', 'terminado'].includes(estado)) { toast('Los recordatorios solo pueden estar pendientes o hechos'); return; }
    recien = id; Tareas.cambiarEstado(id, estado); Shell.pintarNav();
  }

  function enlazarLista(main) {
    const cont = $('#tkCont', main);
    cont.onclick = e => {
      if (e.target.closest('[data-limpiar]')) { f = { categoria: '', prioridad: '', estado: '', tipo: '', aviso: false, q: '' }; render(main); return; }
      const ar = e.target.closest('[data-arch]'); if (ar) { const meses = MotorTareas.archivoPorMes(datosVista()); mesArch = meses[Number(ar.dataset.arch)]?.mes || mesArch; pintarLista(main); return; }
      const el = e.target.closest('[data-tk]'); if (!el) return;
      const id = Number(el.dataset.tk);
      if (e.target.closest('[data-st]')) { cambiar(main, id); return; }
      if (e.target.closest('[data-reabrir]')) { Tareas.cambiarEstado(id, 'pendiente'); toast('Reabierta: vuelve a tus vistas'); return; }
      if (e.target.closest('[data-open]') || el.classList.contains('kcard')) Tareas.detalle(id);
    };
    if (modo !== 'tablero' || vista === 'archivo') return;
    cont.onkeydown = e => {
      const c = e.target.closest('.kcard'); if (!c) return;
      const id = Number(c.dataset.tk), t = Tareas.buscar(id); if (!t) return;
      const E = t.tipo === 'recordatorio' ? ['pendiente', 'terminado'] : MotorTareas.ESTADOS, i = E.indexOf(t.estado);
      if (e.key === 'Enter') { e.preventDefault(); Tareas.detalle(id); }
      else if ((e.key === 'ArrowRight' && i < E.length - 1) || (e.key === 'ArrowLeft' && i > 0)) {
        e.preventDefault(); cambiar(main, id, E[i + (e.key === 'ArrowRight' ? 1 : -1)]);
        $(`.kcard[data-tk="${id}"]`)?.focus();
      }
    };
    let arrastrado = null;
    $$('.kcard', cont).forEach(c => {
      c.addEventListener('dragstart', e => { arrastrado = Number(c.dataset.tk); c.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', c.dataset.tk); });
      c.addEventListener('dragend', () => { c.classList.remove('dragging'); $$('.kcol.over', cont).forEach(x => x.classList.remove('over')); });
    });
    $$('.kcol', cont).forEach(col => {
      col.addEventListener('dragover', e => { if (arrastrado === null) return; e.preventDefault(); col.classList.add('over'); });
      col.addEventListener('dragleave', e => { if (!col.contains(e.relatedTarget)) col.classList.remove('over'); });
      col.addEventListener('drop', e => { e.preventDefault(); col.classList.remove('over'); if (arrastrado !== null) cambiar(main, arrastrado, col.dataset.col); arrastrado = null; });
    });
  }
  /* Abre Tareas en una vista concreta (desde el panel de inicio). */
  function irA(v) { vista = v; Datos.set('_vistaTareas', v); if (location.hash === '#tareas') Shell.refrescar(); else location.hash = '#tareas'; }
  return { render, irA };
})();
