/*
 * Estructura común: navegación, rutas, tema, buscador (Ctrl + K), nueva tarea,
 * botón de copia y menú móvil. Arranca la plataforma.
 */
const Shell = (() => {
  const VERSION = '0.11 · PRL y CAE';
  /* Secciones de la barra lateral (acordeón) y su página de resumen. */
  const SECCIONES = [
    { id: 'trabajo', nombre: 'Trabajo diario', desc: 'Tus tickets, documentos listos para enviar, el calendario y los accesos a las webs de trabajo.', items: [['tareas', 'Tareas'], ['documentos', 'Documentos'], ['calendario', 'Calendario'], ['herramientas', 'Herramientas']] },
    { id: 'personas', nombre: 'Personas', desc: 'La plantilla, sus ausencias y los informes de igualdad.', items: [['empleados', 'Empleados'], ['ausencias', 'Ausencias'], ['informes', 'Informes']] },
    { id: 'procesos', nombre: 'Procesos', desc: 'Del reclutamiento a la salida: cada etapa de la vida laboral, con sus pasos y avisos.', items: [['reclutamiento', 'Reclutamiento'], ['altas', 'Altas'], ['pruebas', 'Periodos de prueba'], ['promociones', 'Promociones'], ['salidas', 'Bajas y salidas'], ['nominas', 'Nóminas']] },
    { id: 'prl', nombre: 'PRL', desc: 'Prevención de riesgos laborales: coordinación con empresas externas. Más adelante, reconocimientos médicos y formación de la plantilla.', items: [['cae', 'Empresas externas']] },
    { id: 'calculadoras', nombre: 'Calculadoras', desc: 'Cálculos del convenio y del Estatuto, con su base legal.', items: [['salarios', 'Salarios'], ['vacaciones', 'Vacaciones'], ['permisos', 'Permisos'], ['nacimiento', 'Nacimiento'], ['indemnizacion', 'Indemnización'], ['finiquito', 'Finiquito']] }
  ];
  const NAV = [['', [['inicio', 'Inicio']]], ...SECCIONES.map(x => [x.nombre, [[x.id, x.nombre], ...x.items]]), ['', [['ajustes', 'Ajustes']]]];
  const ETIQ = Object.fromEntries(NAV.flatMap(g => g[1]));
  const MODULOS = { inicio: ModInicio, empleados: ModEmpleados, altas: ModAltas, ausencias: ModAusencias, informes: ModInformes, reclutamiento: ModReclutamiento, pruebas: ModPruebas, promociones: ModPromociones, salidas: ModSalidas, nominas: ModNominas, tareas: ModTareas, herramientas: ModHerramientas, cae: ModCae, calendario: ModCalendario, vacaciones: ModVacaciones, documentos: ModDocumentos, salarios: ModSalarios, permisos: ModPermisos, nacimiento: ModNacimiento, indemnizacion: ModIndemnizacion, finiquito: ModFiniquito, ajustes: ModAjustes };
  SECCIONES.forEach(x => { MODULOS[x.id] = { render: m => ModSecciones.render(m, x) }; });
  const FASE = {};
  const main = $('#main');
  const ruta = () => { const r = location.hash.slice(1); return r in ETIQ ? r : 'inicio'; };

  /* ---------- Navegación ---------- */
  /* Avisos por herramienta (contadores rojos). */
  function avisos() {
    const hoyN = Fecha.iso(Fecha.hoy()), n = {};
    n.tareas = Tareas.pendientes().vencidas.length;
    n.altas = Altas.enCurso().filter(a => MotorAltas.estado(a) === 'bloqueada').length;
    n.ausencias = Ausencias.todas().filter(a => MotorAusencias.estado(a, hoyN) === 'sin-confirmar').length;
    n.pruebas = Procesos.Pruebas.todas().filter(p => MotorProcesos.estadoPrueba(p, hoyN) === 'sin-resolver').length;
    n.cae = Cae.pendientes().length;
    n.salidas = Procesos.Salidas.todas().filter(x => MotorProcesos.estadoSalida(RRHH_PARAMS.procesos.salida, x, hoyN) === 'atrasada').length;
    return n;
  }
  const TXT_AVISO = { tareas: 'vencidas', altas: 'bloqueadas', ausencias: 'sin confirmar', pruebas: 'sin resolver', salidas: 'atrasadas', cae: 'visitas con documentación pendiente' };
  /* Sección abierta del acordeón (una cada vez; se recuerda). */
  let abierta = (() => { try { return localStorage.getItem('rrhh.nav'); } catch (e) { return null; } })();
  const guardarAbierta = () => { try { localStorage.setItem('rrhh.nav', abierta || ''); } catch (e) {} };
  const seccionDe = r => SECCIONES.find(x => x.id === r || x.items.some(i => i[0] === r));
  const LOCK = '<span class="soon lock" title="Bloqueada"><svg class="i" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></span>';
  function enlace(r, l, n) {
    const extra = n[r] ? `<span class="badge" aria-label="${n[r]} ${TXT_AVISO[r]}">${n[r]}</span>` : r === 'empleados' && Empleados.configurado() && !Empleados.desbloqueado ? LOCK : '';
    return `<a href="#${r}" data-r="${r}">${icon(r)}<span class="nl">${l}</span>${extra}</a>`;
  }
  function pintarNav() {
    const n = avisos();
    const pillPrev = $('#pill');
    $('#nav').innerHTML = '<div class="nav-pill" id="pill" aria-hidden="true"></div>' + enlace('inicio', 'Inicio', n) +
      SECCIONES.map(x => { const suma = x.items.reduce((a, [r]) => a + (n[r] || 0), 0), op = abierta === x.id;
        return `<div class="nav-sec${op ? ' open' : ''}" data-sec="${x.id}">
          <div class="nav-sec-h"><a href="#${x.id}" data-r="${x.id}" class="nav-sec-t" title="Resumen de ${x.nombre}">${icon(x.id)}<span class="nl">${x.nombre}</span>${suma ? `<span class="badge sec-badge" aria-label="${suma} avisos">${suma}</span>` : ''}</a>
            <button type="button" class="nav-tog" data-tog="${x.id}" aria-expanded="${op}" aria-controls="ns-${x.id}" aria-label="${op ? 'Ocultar' : 'Mostrar'} ${x.nombre}"><svg class="i" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button></div>
          <div class="nav-items" id="ns-${x.id}" ${op ? '' : 'inert'}><div>${x.items.map(([r, l]) => enlace(r, l, n)).join('')}</div></div></div>`; }).join('') +
      enlace('ajustes', 'Ajustes', n);
    if (pillPrev) $('#pill').replaceWith(pillPrev);   // conserva la píldora para que se deslice en vez de saltar
    $$('#nav [data-tog]').forEach(b => b.onclick = () => abrir(abierta === b.dataset.tog ? null : b.dataset.tog));
    marcar();
  }
  /* Abre una sección (y cierra las demás) sin repintar: animación suave. */
  function abrir(id) {
    abierta = id; guardarAbierta();
    $$('#nav .nav-sec').forEach(sec => {
      const op = sec.dataset.sec === id, items = $('.nav-items', sec), t = $('.nav-tog', sec);
      sec.classList.toggle('open', op); t.setAttribute('aria-expanded', op); t.setAttribute('aria-label', `${op ? 'Ocultar' : 'Mostrar'} ${SECCIONES.find(x => x.id === sec.dataset.sec).nombre}`);
      if (op) items.removeAttribute('inert'); else items.setAttribute('inert', '');
    });
    marcar(); setTimeout(marcar, reduceMotion ? 0 : 300);
  }
  function marcar() {
    const r = ruta();
    $$('#nav a').forEach(a => a.dataset.r === r ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
    const a = $('#nav a[aria-current=page]'), pill = $('#pill'); if (!pill) return;
    if (!a || a.closest('.nav-sec:not(.open) .nav-items')) { pill.style.opacity = 0; return; }
    const top = a.getBoundingClientRect().top - $('#nav').getBoundingClientRect().top;
    pill.style.opacity = 1; pill.style.height = a.offsetHeight + 'px'; pill.style.transform = `translateY(${top}px)`;
  }
  /* La animación de entrada solo se ve al cambiar de pantalla, nunca al repintar la misma (sin "reinicio"). */
  let animT;
  function animarEntrada() { main.setAttribute('data-anim', ''); clearTimeout(animT); animT = setTimeout(() => main.removeAttribute('data-anim'), 700); }
  function render() {
    const r = ruta(), sec = seccionDe(r); if (sec && abierta !== sec.id) { abierta = sec.id; guardarAbierta(); } pintarNav(); animarEntrada();
    if (MODULOS[r]) MODULOS[r].render(main);
    else main.innerHTML = `<div class="view empty"><div><div class="ico">${icon(r)}</div><h1 style="font-size:30px;font-weight:600">${esc(ETIQ[r])}</h1>
      <p>Ya está definida y llega en la <b>fase ${FASE[r]}</b>.</p>
      <a class="btn" href="#inicio">Volver al inicio</a></div></div>`;
    document.title = `${ETIQ[r]} · RRHH Simple`;
    window.scrollTo({ top: 0 }); cerrarMenu(); Ficus.ruta(r);
  }
  const ir = () => (document.startViewTransition && !reduceMotion) ? document.startViewTransition(render) : render();

  /* ---------- Tema ---------- */
  const tema = () => document.documentElement.dataset.theme || 'auto';
  function setTema(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('rrhh.theme', t); } catch (e) {}
    const i = ['light', 'dark', 'auto'].indexOf(t);
    $$('.theme button').forEach((b, j) => b.setAttribute('aria-pressed', j === i));
    $('#themeThumb').style.transform = `translateX(${i * 100}%)`;
  }

  /* ---------- Copia ---------- */
  function pintarCopia() {
    const e = Datos.estado, u = e.ultimaCopia, d = u ? Math.floor((Date.now() - u) / DAY) : null;
    $('#saveTxt').textContent = e.estadoArchivo === 'sin-permiso' ? 'Pulsa para reactivar el guardado' : d === null ? 'Aún no hay copias' : d === 0 ? (e.estadoArchivo === 'activo' ? 'Guardado automático activo' : 'Guardada hoy') : `Última hace ${d} día${d > 1 ? 's' : ''}`;
    $('#saveDot').classList.toggle('fresh', d !== null && d < 7 && e.estadoArchivo !== 'sin-permiso');
  }
  async function guardarCopia() {
    try {
      const r = await Datos.guardarCopia();
      toast(r.modo === 'archivo' ? `Copia guardada en ${r.nombre}` : 'Copia descargada');
      Ficus.decir('Copia guardada. Ahora sí puedes derramar el café tranquilo.', 'yay');
      if (ruta() === 'inicio' || ruta() === 'ajustes') render();
    } catch (e) { toast('No se pudo guardar la copia'); }
  }

  /* ---------- Tareas: al crear, editar o borrar se refresca la vista ---------- */
  function abrirTarea() { cerrarMenu(); Tareas.abrir(); }
  Tareas.alCambiar(() => {
    pintarNav();
    if (!['inicio', 'tareas', 'calendario', 'trabajo'].includes(ruta())) return;
    // Repinta sin perder la posición ni el foco (si estaba en un ticket, vuelve a él).
    const y = scrollY, a = document.activeElement, tk = main.contains(a) && a.closest('[data-tk]');
    const sel = tk ? `[data-tk="${tk.dataset.tk}"] ${a.matches('[data-st]') ? '[data-st]' : a.matches('[data-open]') ? '[data-open]' : ''}`.trim() : null;
    MODULOS[ruta()].render(main); scrollTo(0, y);
    if (sel) $(sel, main)?.focus({ preventScroll: true });
  });

  /* ---------- Buscador Ctrl + K (sin animación: se abre con teclado) ---------- */
  const cmdk = $('#cmdk'), cIn = $('#cmdIn'), cList = $('#cmdList');
  let items = [], sel = 0;
  const ACCIONES = [
    { l: 'Nueva tarea', h: 'Acción', run: abrirTarea },
    { l: 'Nuevo recordatorio', h: 'Acción', run: () => { cerrarMenu(); Tareas.abrir({ tipo: 'recordatorio' }); } },
    { l: 'Revisar mis tickets una a una', h: 'Acción', run: () => Tareas.unaAUna(Tareas.vista('semana').filter(t => !t.hecha).map(t => t.id), 'Mi semana') },
    { l: 'Nueva alta', h: 'Acción', run: () => ModAltas.nueva(null) },
    { l: 'Nueva visita de empresa externa (CAE)', h: 'Acción', run: () => { location.hash = '#cae'; setTimeout(() => $('#cNuevaV')?.click(), 120); } },
    { l: 'Nuevo empleado', h: 'Acción', run: () => { location.hash = '#empleados'; setTimeout(() => $('#nuevo')?.click(), 80); } },
    { l: 'Bloquear empleados', h: 'Acción', run: () => { Empleados.bloquear(); toast('Empleados bloqueados'); } },
    { l: 'Guardar copia de seguridad', h: 'Acción', run: guardarCopia },
    { l: 'Exportar tickets al calendario (.ics)', h: 'Acción', run: () => Tareas.descargarIcs(Tareas.todas().filter(t => !t.hecha && t.fecha), 'tickets-pendientes') },
    { l: 'Añadir festivo de empresa', h: 'Acción', run: () => { location.hash = '#calendario'; setTimeout(() => $('#empF')?.focus(), 80); } },
    { l: 'Modo oscuro', h: 'Acción', run: () => setTema('dark') },
    { l: 'Modo claro', h: 'Acción', run: () => setTema('light') },
    { l: 'Personalizar el panel', h: 'Acción', run: () => { location.hash = '#inicio'; setTimeout(() => $('#editBtn')?.click(), 50); } }
  ];
  function llenar() {
    const q = norm(cIn.value.trim());
    const herramientas = Object.entries(ETIQ).map(([r, l]) => ({ l, h: MODULOS[r] ? 'Página' : `Fase ${FASE[r]}`, r, run: () => location.hash = '#' + r }));
    const f = l => q ? l.filter(x => norm(x.l + ' ' + x.h).includes(q)) : l;
    const emps = Empleados.desbloqueado ? Empleados.todos().map(e => ({ l: e.nombreCompleto, h: `${e.codigo} · ${e.departamento || e.centro || ''}`, r: 'empleados', run: () => { ModEmpleados.abrir(e.id); if (location.hash === '#empleados') render(); else location.hash = '#empleados'; } })) : [];
    const altas = Altas.enCurso().map(a => ({ l: `Alta de ${a.nombre}`, h: `${Math.round(MotorAltas.progreso(a).pct * 100)} % · ${a.centro}`, r: 'altas', run: () => { ModAltas.abrir(a.id); if (location.hash === '#altas') render(); else location.hash = '#altas'; } }));
    const webs = Herramientas.todas().map(h => ({ l: h.nombre, h: `${h.desc || 'Web'} · se abre en una pestaña nueva`, r: 'herramientas', run: () => Herramientas.abrir(h) }));
    const tickets = q ? Tareas.todas().filter(t => !MotorTareas.archivado(t, Date.now())).map(t => ({ l: `${MotorTareas.clave(t.clave)} · ${t.titulo}`, h: `${Tareas.estadoTxt(t)} · ${Tareas.cat(t.categoria).nombre}`, r: 'tareas', run: () => Tareas.detalle(t.id) })) : [];
    const secs = [['Páginas', f(herramientas).slice(0, q ? 8 : 6)], ['Accesos web', f(webs).slice(0, q ? 6 : 4)], ['Tickets', f(tickets).slice(0, 6)], ['Empleados', q ? f(emps).slice(0, 6) : []], ['Altas en curso', f(altas).slice(0, q ? 6 : 3)], ['Acciones', f(ACCIONES)]];
    items = secs.flatMap(s => s[1]); sel = Math.min(sel, Math.max(0, items.length - 1));
    let i = 0;
    cList.innerHTML = items.length ? secs.filter(s => s[1].length).map(([n, l]) => `<li class="cmd-sec" role="presentation">${n}</li>` + l.map(x => { const k = i++;
      return `<li class="cmd-item" role="option" id="ci${k}" data-k="${k}" aria-selected="${k === sel}">${icon(x.r || 'accion')}${esc(x.l)}<small>${esc(x.h)}</small></li>`; }).join('')).join('')
      : '<li class="cmd-empty">Sin resultados. Prueba con “vac” o “copia”.</li>';
    cIn.setAttribute('aria-activedescendant', items.length ? 'ci' + sel : '');
    cIn.placeholder = Empleados.desbloqueado ? 'Busca una herramienta, un empleado, un alta o una acción…' : 'Busca una herramienta, un alta o una acción…';
  }
  function abrirBuscador() { cerrarMenu(); cIn.value = ''; sel = 0; llenar(); cmdk.showModal(); cIn.focus(); }
  function ejecutar(k) { const it = items[k]; cmdk.close(); it?.run(); }
  cIn.addEventListener('input', () => { sel = 0; llenar(); });
  cIn.addEventListener('keydown', e => {
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && items.length) { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; llenar(); $('#ci' + sel)?.scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'Enter') { e.preventDefault(); ejecutar(sel); }
  });
  cList.addEventListener('click', e => { const it = e.target.closest('.cmd-item'); if (it) ejecutar(Number(it.dataset.k)); });
  cmdk.addEventListener('click', e => { if (e.target === cmdk) cmdk.close(); });
  addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); cmdk.open ? cmdk.close() : abrirBuscador(); } });

  /* ---------- Menú móvil ---------- */
  const side = $('#side'), scrim = $('#scrim'), mb = $('#menuBtn');
  function cerrarMenu() { side.classList.remove('open'); scrim.classList.remove('on'); mb.setAttribute('aria-expanded', 'false'); }
  mb.onclick = () => { const o = !side.classList.contains('open'); side.classList.toggle('open', o); scrim.classList.toggle('on', o); mb.setAttribute('aria-expanded', String(o)); if (o) requestAnimationFrame(marcar); };
  scrim.onclick = cerrarMenu;

  /* ---------- Delegación global ---------- */
  document.addEventListener('click', e => {
    if (e.target.closest('[data-new-task]')) abrirTarea();
    else if (e.target.closest('[data-open-search]')) abrirBuscador();
    else if (e.target.closest('[data-save]')) guardarCopia();
  });
  $('#saveBtn').onclick = guardarCopia;
  $$('.theme button').forEach(b => b.onclick = () => setTema(b.dataset.t));
  addEventListener('hashchange', ir);
  addEventListener('resize', marcar);

  async function arrancar() {
    await Datos.init();
    Datos.on(k => { if (k === '_ultimaCopia' || k === '_estado') pintarCopia(); });
    setTema(tema()); Ficus.init(); pintarCopia(); pintarNav(); render(); Ficus.saludar(); Tareas.comprobarAvisos();
    if (Datos.estado.fallo) toast('Este navegador no permite guardar datos: los cambios se perderán al cerrar.');
  }
  Empleados.on(() => { pintarNav(); if (['empleados', 'vacaciones', 'ausencias', 'calendario', 'informes', 'pruebas', 'promociones', 'salidas', 'nominas', 'cae'].includes(ruta()) && !document.querySelector('dialog[open]')) { const y = scrollY; render(); scrollTo(0, y); } });
  return { VERSION, SECCIONES, avisos, etiqueta: r => ETIQ[r] || r, pintarNav, tema, setTema, arrancar, refrescar: () => render() };
})();

Shell.arrancar();
