/* Panel de inicio con bloques personalizables (orden, ancho y qué se muestra). */
const ModInicio = (() => {
  const P = window.RRHH_PARAMS;
  const BLOQUES = {
    saludo:     { nombre: 'Saludo', desc: 'La fecha y tu resumen del día', span: 12 },
    tickets:    { nombre: 'Tickets', desc: 'Tus tareas de la semana o del mes, con lo vencido y lo fijado, y los avisos', span: 7 },
    calendario: { nombre: 'Calendario', desc: 'Semana o mes (va con el selector de Tickets): festivos, recordatorios y fin de ausencias', span: 5 },
    recordatorios: { nombre: 'Recordatorios', desc: 'Los próximos recordatorios en una sola línea', span: 12 },
    ausencias:  { nombre: 'Ausencias', desc: 'Quién falta hoy y quién vuelve pronto', span: 4 },
    procesos:   { nombre: 'Procesos en curso', desc: 'Vacantes, altas, periodos de prueba y salidas', span: 4 },
    plantilla:  { nombre: 'Plantilla de un vistazo', desc: 'Mujeres y hombres, incorporaciones y bajas del año', span: 4 },
    cae:        { nombre: 'Empresas externas (CAE)', desc: 'Próximas visitas y su documentación', span: 5 },
    webs:       { nombre: 'Herramientas web', desc: 'netTime One, Remote, Vitaly, Claude… en una línea', span: 12 },
    altas:      { nombre: 'Altas en curso', desc: 'Estado de cada incorporación', span: 12 },
    festivos:   { nombre: 'Próximos festivos', desc: 'Los siguientes festivos de tus capas', span: 5 },
    anio:       { nombre: 'El año en vacaciones', desc: 'Cuánto del año ha pasado y días generados', span: 4 },
    copia:      { nombre: 'Copia de seguridad', desc: 'Cuándo se guardó la última copia', span: 4 },
    accesos:    { nombre: 'Accesos rápidos', desc: 'Atajos a todas las páginas de la plataforma', span: 12 }
  };
  const POR_DEFECTO = ['saludo', 'tickets', 'calendario', 'recordatorios', 'ausencias', 'procesos', 'plantilla'];
  let editando = false, calVista = null, semOff = 0;
  const rango = () => Datos.get('_panelRango', 'semana');
  const hoyISO = () => Fecha.iso(Fecha.hoy());
  const base = () => Empleados.configurado() && Empleados.desbloqueado;
  const layout = () => {
    let l = Datos.get('panel', POR_DEFECTO);
    if (!Datos.get('_panelFase3') && !l.includes('altas')) { const i = l.indexOf('accesos'); l.splice(i < 0 ? l.length : i, 0, 'altas'); }
    if (!Datos.get('_panelFase3')) Datos.set('_panelFase3', true);
    // Panel renovado: "Tareas" pasa a "Esta semana" + "Pendientes"; se añaden "Requiere tu atención" y el calendario (una vez).
    const it = l.indexOf('tareas'); if (it >= 0) { l = [...l]; l.splice(it, 1, ...['semana', 'pendientes'].filter(k => !l.includes(k))); Datos.set('panel', l); }
    if (!Datos.get('_panel2')) {
      if (!l.includes('atencion')) l.splice(l.includes('saludo') ? l.indexOf('saludo') + 1 : 0, 0, 'atencion');
      if (!l.includes('calendario')) l.splice(l.indexOf('atencion') + 1, 0, 'calendario');
      Datos.set('_panel2', true); Datos.set('panel', l);
    }
    // Tickets (oct. 2026): "Requiere tu atención" pasa a "Tickets"; "Esta semana" y "Pendientes" se integran; se añaden los recordatorios.
    if (!Datos.get('_panel3')) {
      l = [...l]; const ia = l.indexOf('atencion');
      if (ia >= 0) l.splice(ia, 1, 'tickets'); else if (!l.includes('tickets')) l.splice(l.includes('saludo') ? l.indexOf('saludo') + 1 : 0, 0, 'tickets');
      l = l.filter(k => k !== 'semana' && k !== 'pendientes');
      if (!l.includes('calendario')) l.splice(l.indexOf('tickets') + 1, 0, 'calendario');
      if (!l.includes('recordatorios')) l.splice(Math.max(l.indexOf('tickets'), l.indexOf('calendario')) + 1, 0, 'recordatorios');
      Datos.set('_panel3', true); Datos.set('panel', l);
    }
    return l.filter(k => k in BLOQUES);
  };
  const setLayout = l => Datos.set('panel', l);
  const anchos = () => Datos.get('panelAncho', {});
  const span = k => anchos()[k] ? 12 : BLOQUES[k].span;
  const bloqueado = txt => `<div class="mini-lock">${icon('empleados')}<span>${txt}</span><button class="btn ghost sm" data-unlock>Desbloquear</button></div>`;

  /* Semana de lunes a domingo (desplazada n semanas). */
  function semana(n = 0) {
    const h = Fecha.hoy() + n * 7 * DAY, dow = (new Date(h).getUTCDay() + 6) % 7, L = h - dow * DAY;
    return { L: Fecha.iso(L), D: Fecha.iso(L + 6 * DAY), dias: Array.from({ length: 7 }, (_, i) => Fecha.iso(L + i * DAY)) };
  }
  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const segRango = () => `<div class="seg3 mini-seg" role="group" aria-label="Periodo"><button data-rango="semana" aria-pressed="${rango() === 'semana'}">Semana</button><button data-rango="mes" aria-pressed="${rango() === 'mes'}">Mes</button></div>`;

  /* ---------- Bloques ---------- */
  function bSaludo() {
    const now = new Date(), h = now.getHours(), l = Tareas.vista('semana').filter(t => !t.hecha && t.tipo !== 'recordatorio'), f = ModCalendario.proximos(1)[0];
    const venc = l.filter(t => MotorTareas.vencido(t, hoyISO())).length;
    const aus = base() ? MotorAusencias.ausentesEn(Ausencias.todas(), hoyISO(), P.ausencias.tipos, hoyISO()).length : null;
    return `<div class="hello">
      <div class="orb o1"></div><div class="orb o2"></div><div class="orb o3"></div>
      <div style="position:relative">
        <div class="kicker">${now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        <h1>${h < 14 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches'}, <span>Fer</span></h1>
      </div>
      <div class="sum">
        <a class="pillstat" href="#tareas" data-ir-vista="semana"><b>${l.length}</b><span>tareas<br>esta semana</span></a>
        <a class="pillstat${venc ? ' alerta' : ''}" href="#tareas" data-ir-vista="semana"><b>${venc}</b><span>tareas<br>vencidas</span></a>
        ${aus !== null ? `<a class="pillstat" href="#ausencias"><b>${aus}</b><span>ausentes<br>hoy</span></a>` : ''}
        <a class="pillstat" href="#calendario"><b>${f ? Fecha.corta(Fecha.parse(f.fecha)) : '—'}</b><span>próximo<br>festivo</span></a>
      </div></div>`;
  }

  /* Avisos que no son tickets (altas bloqueadas, fichas sin sexo, copia): una línea de chips. */
  function avisosSueltos() {
    const n = Shell.avisos(), it = [];
    const add = (c, ico, txt, href, extra = '') => { if (c) it.push(`<a class="at-chip" href="${href}" ${extra}>${icon(ico)}${txt}</a>`); };
    add(n.altas, 'altas', `${n.altas} alta${n.altas === 1 ? '' : 's'} bloqueada${n.altas === 1 ? '' : 's'}`, '#altas');
    if (base()) {
      add(n.ausencias, 'ausencias', `${n.ausencias} vuelta${n.ausencias === 1 ? '' : 's'} sin confirmar`, '#ausencias');
      add(n.pruebas, 'pruebas', `${n.pruebas} prueba${n.pruebas === 1 ? '' : 's'} sin resolver`, '#pruebas');
      add(n.salidas, 'salidas', `${n.salidas} salida${n.salidas === 1 ? '' : 's'} con retraso`, '#salidas');
      const sinSexo = Empleados.todos().filter(e => !e.sexo).length;
      add(sinSexo, 'empleados', `${sinSexo} ficha${sinSexo === 1 ? '' : 's'} sin sexo`, '#empleados');
    }
    const d = Datos.estado.ultimaCopia ? Math.floor((Date.now() - Datos.estado.ultimaCopia) / DAY) : null;
    add(d === null || d >= 7, 'ajustes', d === null ? 'Sin copia de seguridad' : `Copia de hace ${d} días`, '#inicio', 'data-save');
    return it.length ? `<div class="at-chips">${it.join('')}</div>` : '';
  }
  function filaTk(t) {
    const h = hoyISO(), venc = MotorTareas.vencido(t, h), hecha = t.estado === 'terminado';
    return `<li class="tk-row mini p-${t.prioridad}${hecha ? ' done' : ''}" data-tk="${t.id}">
      <button class="tk-st st-${t.estado}" data-st aria-label="Estado: ${Tareas.estadoTxt(t)}. Pulsa para avanzar" title="${Tareas.estadoTxt(t)} · pulsa para avanzar"><i></i></button>
      <button class="tk-main" data-open><span class="tk-key">${MotorTareas.clave(t.clave)}</span>${Tareas.chipCat(t.categoria, true)}<b class="tk-tt">${esc(t.titulo)}</b></button>
      <span class="tk-side">${t.fijada ? `<span class="tk-pinned" title="Fijada">${icon('pin')}</span>` : ''}<i class="prio ${t.prioridad}" title="Importancia ${t.prioridad}"></i><span class="tk-f${venc ? ' late-txt' : ''}${t.fecha === h && !hecha ? ' hoy' : ''}">${Tareas.cuando(t.fecha)}</span></span></li>`;
  }
  function bTickets() {
    const r = rango(), l = Tareas.vista(r).filter(t => t.tipo !== 'recordatorio'), pend = l.filter(t => !t.hecha), hechas = l.filter(t => t.hecha);
    const MAX = 6, venc = pend.filter(t => MotorTareas.vencido(t, hoyISO())).length;
    return `<div class="card tkb"><div class="card-h"><h3>Tickets</h3>${segRango()}<span class="grow"></span>${pend.length ? `<span class="ex${venc ? ' bad' : ''}">${pend.length}${venc ? ` · ${venc} vencida${venc === 1 ? '' : 's'}` : ''}</span>` : ''}</div>
      ${avisosSueltos()}
      ${pend.length ? `<ul class="tk-list">${pend.slice(0, MAX).map(filaTk).join('')}</ul>` : `<div class="at-ok"><span>✓</span><p><b>${r === 'semana' ? 'Semana despejada.' : 'Mes despejado.'}</b> No hay tareas pendientes ${r === 'semana' ? 'esta semana' : 'este mes'}.</p></div>`}
      <div class="tkb-f">${pend.length > MAX ? `<a href="#tareas" data-ir-vista="${r}">Ver ${pend.length - MAX} más</a>` : `<a href="#tareas" data-ir-vista="${r}">Ver en Tareas</a>`}
        ${hechas.length ? `<span class="muted small">✓ ${hechas.length} hecha${hechas.length === 1 ? '' : 's'}</span>` : ''}<span class="grow"></span>
        ${pend.length > 1 ? `<button class="linkbtn" data-foco>${icon('foco')}Una a una</button>` : ''}<button class="linkbtn" data-new-task>+ Nueva</button></div></div>`;
  }

  function bCalendario() { return rango() === 'semana' ? calSemana() : calMes(); }
  const navCal = (tipo, txt) => `<span class="mc-nav"><button class="icon-act" data-${tipo}="-1" aria-label="${txt} anterior"><svg class="i" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button><button class="icon-act" data-${tipo}="0" aria-label="${txt} actual" title="Hoy"><svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/></svg></button><button class="icon-act" data-${tipo}="1" aria-label="${txt} siguiente"><svg class="i" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button></span>`;
  const ley = '<div class="mc-ley"><span><i class="f"></i>Festivo</span><span><i class="t"></i>Recordatorio o aviso</span><span><i class="a"></i>Fin de ausencia</span><a href="#calendario">Abrir calendario</a></div>';
  function calSemana() {
    const s = semana(semOff), h = hoyISO(), anios = [...new Set(s.dias.map(f => Number(f.slice(0, 4))))], D = anios.map(y => ModCalendario.datosDe(y));
    const de = (k, f) => D.flatMap(x => x[k].get(f) || []);
    const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    return `<div class="card mc wk-cal"><div class="card-h"><h3>${Fecha.corta(Fecha.parse(s.L))} – ${Fecha.corta(Fecha.parse(s.D))}</h3>${segRango()}<span class="grow"></span>${navCal('wc', 'Semana')}</div>
      <div class="wkc">${s.dias.map((f, i) => { const fs = de('fest', f), ts = de('tareas', f).filter(t => !t.hecha), as = de('aus', f);
        return `<button class="wkc-d${i > 4 ? ' finde' : ''}${fs.length ? ' fest tag-' + fs[0].capa : ''}${f === h ? ' hoy' : ''}${f < h ? ' pasado' : ''}" data-ir="${f}" aria-label="${Fecha.diaSemana(Fecha.parse(f))} ${Number(f.slice(8))}${fs.length ? ': ' + esc(fs.map(x => x.nombre).join(', ')) : ''}${ts.length ? `, ${ts.length} recordatorio${ts.length > 1 ? 's' : ''}` : ''}${as.length ? `, fin de ${as.length} ausencia${as.length > 1 ? 's' : ''}` : ''}">
          <small>${DIAS[i]}</small><b>${Number(f.slice(8))}</b>
          <span class="wkc-ev">${fs.slice(0, 1).map(x => `<em class="f" title="${esc(x.nombre)}">${esc(x.nombre)}</em>`).join('')}${ts.slice(0, 2).map(t => `<em class="t" title="${esc(t.titulo)}">${esc(t.titulo)}</em>`).join('')}${ts.length > 2 ? `<em class="t">+${ts.length - 2}</em>` : ''}${as.length ? `<em class="a">${as.length > 1 ? `Fin ${as.length} aus.` : 'Fin: ' + esc(as[0].corto)}</em>` : ''}</span></button>`; }).join('')}</div>${ley}</div>`;
  }
  function calMes() {
    const hoy = new Date(), v = calVista || { anio: hoy.getFullYear(), mes: hoy.getMonth() };
    const D = ModCalendario.datosDe(v.anio), h = hoyISO();
    const n = new Date(Date.UTC(v.anio, v.mes + 1, 0)).getUTCDate(), off = (new Date(Date.UTC(v.anio, v.mes, 1)).getUTCDay() + 6) % 7;
    let celdas = '';
    for (let i = 0; i < off; i++) celdas += '<span class="mc-v"></span>';
    for (let d = 1; d <= n; d++) {
      const f = `${v.anio}-${String(v.mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, fs = D.fest.get(f) || [], ts = (D.tareas.get(f) || []).filter(t => !t.hecha), as = D.aus.get(f) || [], dow = (off + d - 1) % 7;
      const tit = [...fs.map(x => x.nombre), ...ts.map(t => t.titulo), as.length ? `Termina${as.length > 1 ? 'n' : ''} ${as.length} ausencia${as.length > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ');
      celdas += `<button class="mc-d${dow > 4 ? ' finde' : ''}${fs.length ? ' fest tag-' + fs[0].capa : ''}${f === h ? ' hoy' : ''}" data-ir="${f}" title="${esc(tit)}" aria-label="${d}${tit ? ': ' + esc(tit) : ''}"><span>${d}</span><em>${ts.length ? '<i class="t"></i>' : ''}${as.length ? '<i class="a"></i>' : ''}</em></button>`;
    }
    return `<div class="card mc"><div class="card-h"><h3>${MESES[v.mes]} ${v.anio}</h3>${segRango()}<span class="grow"></span>${navCal('mc', 'Mes')}</div>
      <div class="mc-g">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((x, i) => `<span class="mc-h${i > 4 ? ' finde' : ''}">${x}</span>`).join('')}${celdas}</div>${ley}</div>`;
  }

  /* Recordatorios en una sola línea: los próximos (y los vencidos sin marcar), con "+N" si no caben. */
  function bRecordatorios() {
    const h = hoyISO(), l = Tareas.recordatorios(), MAX = 6;
    const chip = t => { const d = Fecha.parse(t.fecha), venc = t.fecha < h, pronto = !venc && MotorTareas.avisando(t, h);
      return `<button class="rc-chip${venc ? ' late' : pronto ? ' pronto' : ''}" data-rc="${t.id}" style="--cc:${Tareas.cat(t.categoria).color}" title="${esc(t.titulo)} · ${Fecha.larga(d)}${venc ? ' · vencido' : ''}"><span class="rc-d"><b>${new Date(d).getUTCDate()}</b><small>${Fecha.mesCorto(d)}</small></span><span class="rc-t">${esc(t.titulo)}</span></button>`; };
    return `<div class="card rcb"><span class="rcb-h">${icon('campana')}<b>Recordatorios</b></span>
      <div class="rc-row">${l.length ? l.slice(0, MAX).map(chip).join('') + (l.length > MAX ? `<a class="rc-more" href="#tareas" data-ir-vista="recordatorios">+${l.length - MAX}</a>` : '') : '<span class="muted small">No hay recordatorios pendientes.</span>'}</div>
      <button class="icon-act" data-nuevo-rc aria-label="Nuevo recordatorio" title="Nuevo recordatorio"><svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button></div>`;
  }
  function bCae() {
    if (!base()) return `<div class="card"><div class="card-h"><h3>Empresas externas</h3></div>${Empleados.configurado() ? bloqueado('Datos cifrados') : '<p class="muted">Crea la base de empleados para usarlo.</p>'}</div>`;
    const lim = Fecha.iso(Fecha.hoy() + 14 * DAY), l = Cae.visitas().filter(v => !v.cerrada).map(v => ({ v, e: Cae.empresa(v.empresaId), est: Cae.estado(v) })).filter(x => x.est && !x.est.terminada && x.est.fecha <= lim).sort((a, b) => a.est.fecha.localeCompare(b.est.fecha));
    return `<div class="card"><div class="card-h"><h3>Empresas externas</h3><a href="#cae">Ver</a></div>
      ${l.length ? `<ul class="alta-list">${l.slice(0, 4).map(x => `<li data-cae-v="${x.v.id}"><span class="avatar">${icon('cae')}</span><span>${esc(x.e.nombre)}<span class="meta">${MotorCae.continuo(x.v) ? esc(MotorCae.textoFecha(x.v)) : Fecha.corta(Fecha.parse(x.est.fecha))} · ${x.est.trabajadores.length} persona${x.est.trabajadores.length === 1 ? '' : 's'}</span></span><span class="when${x.est.total ? ' block' : ''}">${x.est.total ? `${MotorCae.continuo(x.v) ? 'Pedir' : 'Faltan'} ${x.est.total}` : 'Al día'}</span></li>`).join('')}</ul>` : '<p class="muted" style="margin:0">Sin visitas en los próximos 14 días.</p>'}</div>`;
  }
  function bWebs() {
    const l = Herramientas.todas();
    return `<div class="card rcb"><span class="rcb-h">${icon('herramientas')}<b>Herramientas</b></span>
      <div class="rc-row">${l.map(x => `<a class="web-chip" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer" style="--hc:${x.color}">${icon(x.icono || 'enlace')}${esc(x.nombre)}<span class="sr"> (pestaña nueva)</span></a>`).join('') || '<span class="muted small">Sin accesos.</span>'}</div>
      <a class="icon-act" href="#herramientas" aria-label="Editar los accesos" title="Editar los accesos"><svg class="i" viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/></svg></a></div>`;
  }

  function bAusencias() {
    if (!base()) return `<div class="card"><div class="card-h"><h3>Ausencias</h3></div>${Empleados.configurado() ? bloqueado('Datos cifrados') : '<p class="muted">Crea la base de empleados para usarlas.</p>'}</div>`;
    const h = hoyISO(), l = Ausencias.todas(), hoyL = MotorAusencias.ausentesEn(l, h, P.ausencias.tipos, h), vuel = MotorAusencias.proximasVueltas(l, h, 14);
    const fila = (a, txt) => `<li><span class="avatar" style="background:color-mix(in srgb,${Ausencias.tipo(a.tipo).color} 25%,var(--surface-2))">${esc(a.empleado.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase())}</span><span>${esc(a.empleado)}<span class="meta">${txt}</span></span></li>`;
    return `<div class="card"><div class="card-h"><h3>Ausencias</h3><a href="#ausencias">Ver</a></div>
      <div class="mini-n"><b>${hoyL.length}</b><span>${hoyL.length === 1 ? 'persona ausente' : 'personas ausentes'} hoy</span></div>
      ${hoyL.length ? `<ul class="alta-list">${hoyL.slice(0, 3).map(a => fila(a, esc(Ausencias.tipo(a.tipo).nombre))).join('')}</ul>` : ''}
      ${vuel.length ? `<div class="tgroup">Vuelven pronto</div><ul class="alta-list">${vuel.slice(0, 3).map(a => fila(a, `Vuelve el ${Fecha.corta(Fecha.parse(MotorAusencias.vueltaPrevista(a)))}`)).join('')}</ul>` : ''}</div>`;
  }

  function bProcesos() {
    const vac = Procesos.Vacantes.todas().filter(v => (v.estado || 'abierta') === 'abierta'), alt = Altas.enCurso(), h = hoyISO();
    const fila = (href, ico, n, txt, sub = '') => `<li><a href="${href}"><span class="at-ico">${icon(ico)}</span><b>${n}</b><span>${txt}${sub ? `<small>${sub}</small>` : ''}</span></a></li>`;
    let pr = null, sa = null;
    if (base()) { const l = Procesos.Pruebas.todas().filter(p => !p.resultado); pr = { n: l.length, t: l.filter(p => MotorProcesos.diasEntre(h, p.fin) <= 15).length }; sa = Procesos.Salidas.todas().filter(x => !x.cerrada).length; }
    return `<div class="card"><div class="card-h"><h3>Procesos en curso</h3><a href="#procesos">Resumen</a></div><ul class="pr-list">
      ${fila('#reclutamiento', 'reclutamiento', vac.length, vac.length === 1 ? 'vacante abierta' : 'vacantes abiertas', vac.slice(0, 2).map(v => esc(v.puesto)).join(', '))}
      ${fila('#altas', 'altas', alt.length, alt.length === 1 ? 'alta en curso' : 'altas en curso')}
      ${pr ? fila('#pruebas', 'pruebas', pr.n, pr.n === 1 ? 'periodo de prueba' : 'periodos de prueba', pr.t ? `${pr.t} termina${pr.t === 1 ? '' : 'n'} en 15 días` : '') : ''}
      ${sa !== null ? fila('#salidas', 'salidas', sa, sa === 1 ? 'salida en marcha' : 'salidas en marcha') : ''}
    </ul>${!base() && Empleados.configurado() ? bloqueado('Pruebas y salidas, cifradas') : ''}</div>`;
  }

  function bPlantilla() {
    if (!base()) return `<div class="card"><div class="card-h"><h3>Plantilla</h3></div>${Empleados.configurado() ? bloqueado('Datos cifrados') : '<p class="muted">Crea la base de empleados para verla.</p>'}</div>`;
    const h = hoyISO(), y = h.slice(0, 4), todos = Empleados.todos(), act = MotorEmpleados.filtrar(todos, { estado: 'activos', hoy: h });
    const m = act.filter(e => e.sexo === 'mujer').length, hh = act.filter(e => e.sexo === 'hombre').length, t = act.length || 1;
    const inc = todos.filter(e => e.fechaContratacion?.startsWith(y)), baj = todos.filter(e => e.fechaBaja?.startsWith(y));
    const mh = l => `${l.filter(e => e.sexo === 'mujer').length} M · ${l.filter(e => e.sexo === 'hombre').length} H`;
    return `<div class="card"><div class="card-h"><h3>Plantilla</h3><a href="#informes">Informes</a></div>
      <div class="mini-n"><b>${act.length}</b><span>personas en plantilla</span></div>
      <span class="sx-bar wide big"><i class="m" style="width:${m / t * 100}%"></i><i class="h" style="width:${hh / t * 100}%"></i></span>
      <div class="sx-ley"><span><i class="m"></i>${m} mujeres · ${Math.round(m / t * 100)} %</span><span><i class="h"></i>${hh} hombres · ${Math.round(hh / t * 100)} %</span></div>
      <div class="pl-mov"><span><small>Incorporaciones ${y}</small><b>${inc.length}</b><em>${mh(inc)}</em></span><span><small>Bajas ${y}</small><b>${baj.length}</b><em>${mh(baj)}</em></span></div></div>`;
  }

  function bAltas() {
    const l = Altas.enCurso(), est = l.map(a => MotorAltas.estado(a)), n = k => est.filter(e => e === k).length;
    const seg = [['en-proceso', 'En proceso'], ['pendiente-docs', 'Pendiente docs'], ['bloqueada', 'Bloqueadas'], ['sin-iniciar', 'Sin iniciar'], ['completada', 'Completadas']].filter(([k]) => n(k));
    const prox = l.filter(a => a.fechaIncorporacion).sort((a, b) => a.fechaIncorporacion.localeCompare(b.fechaIncorporacion)).slice(0, 3);
    return `<div class="card"><div class="card-h"><h3>Altas en curso</h3><a href="#altas">Ver todas</a></div>
      ${l.length ? `<div class="altas-w"><div><div class="status-bar">${seg.map(([k], i) => `<i class="ae-${k}" style="width:${n(k) / l.length * 100}%;animation-delay:${i * 80}ms"></i>`).join('')}</div>
      <div class="legend">${seg.map(([k, nom]) => `<span><i class="ae-${k}"></i>${nom}<b>${n(k)}</b></span>`).join('')}</div>
      </div><ul class="alta-list">${(est.includes('bloqueada') ? l.filter(a => MotorAltas.estado(a) === 'bloqueada').slice(0, 2) : prox).map(a => { const e = MotorAltas.estado(a);
        return `<li data-alta="${a.id}"><span class="avatar">${esc((a.nombre || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join(''))}</span><span>${esc(a.nombre)}<span class="meta">${esc(a.puesto || '')} · ${esc(a.centro)}</span></span><span class="when${e === 'bloqueada' ? ' block' : ''}">${e === 'bloqueada' ? esc(a.bloqueante) : a.fechaIncorporacion ? Fecha.corta(Fecha.parse(a.fechaIncorporacion)) : Math.round(MotorAltas.progreso(a).pct * 100) + ' %'}</span></li>`; }).join('')}</ul></div>`
      : '<p class="muted" style="margin:0">No hay altas en curso.</p>'}</div>`;
  }
  function bFestivos() {
    const l = ModCalendario.proximos(4);
    return `<div class="card"><div class="card-h"><h3>Próximos festivos</h3><a href="#calendario">Calendario</a></div><ul class="fest">` +
      l.map(x => { const t = Fecha.parse(x.fecha); return `<li><div class="cal"><small>${Fecha.mesCorto(t)}</small><b>${new Date(t).getUTCDate()}</b></div><div class="t">${esc(x.items[0].nombre)}<span>${Fecha.diaSemana(t)}</span>${x.items.map(i => `<span class="chip-c tag-${i.capa}">${ModCalendario.etiquetaCapa(i.capa, i.ambito)}</span>`).join(' ')}</div></li>`; }).join('') +
      `</ul>${l.length ? '' : '<p class="muted">Sin datos de festivos para las próximas fechas.</p>'}</div>`;
  }
  function bAnio() {
    const y = new Date().getFullYear(), hoy = Fecha.hoy(), pct = (hoy - Date.UTC(y, 0, 1) + DAY) / (Date.UTC(y + 1, 0, 1) - Date.UTC(y, 0, 1));
    const gen = MotorVacaciones.calcular({ inicio: `${y}-01-01`, anio: y, hoy: Fecha.iso(hoy) }).genHoy;
    return `<div class="card"><div class="card-h"><h3>El año en vacaciones</h3></div><div class="yr">
      <div class="ring"><svg viewBox="0 0 120 120"><circle class="track" cx="60" cy="60" r="52" fill="none" stroke-width="11"/><circle class="bar" data-pct="${pct}" cx="60" cy="60" r="52" fill="none" stroke-width="11" stroke-dasharray="326.7" stroke-dashoffset="326.7"/></svg><div class="center"><div><b>${Math.round(pct * 100)}%</b><small>de ${y}</small></div></div></div>
      <p>Con contrato todo el año, hoy se llevan <b class="strong">${gen} de ${P.vacaciones.diasLaborables}</b> días generados.</p></div></div>`;
  }
  function bCopia() {
    const e = Datos.estado, d = e.ultimaCopia ? Math.floor((Date.now() - e.ultimaCopia) / DAY) : null;
    return `<div class="card"><div class="card-h"><h3>Copia de seguridad</h3></div>
      <p class="muted" style="margin:0;font-size:14px">${d === null ? 'Aún no hay ninguna copia guardada.' : d === 0 ? 'Copia al día.' : `Última copia hace <b class="strong">${d} día${d > 1 ? 's' : ''}</b>. Se recomienda una por semana.`}
      ${e.archivo ? `<br>Guardado automático en <b class="strong">${esc(e.archivo)}</b>.` : ''}</p>
      <div class="meter"><i style="transform:scaleX(${d === null ? 1 : Math.min(1, d / 14)})"></i></div><button class="btn sm" data-save>Guardar copia ahora</button></div>`;
  }
  function bAccesos() {
    return `<div class="card"><div class="card-h"><h3>Accesos rápidos</h3></div>${Shell.SECCIONES.map(s => `<div class="tgroup">${esc(s.nombre)}</div><div class="tools">${s.items.map(([r, l], i) => `<a class="tool" href="#${r}" style="--i:${i}"><span class="ico">${icon(r, '')}</span><b>${esc(l)}</b></a>`).join('')}</div>`).join('')}</div>`;
  }
  const PINTAR = { saludo: bSaludo, tickets: bTickets, calendario: bCalendario, recordatorios: bRecordatorios, webs: bWebs, cae: bCae, ausencias: bAusencias, procesos: bProcesos, plantilla: bPlantilla, altas: bAltas, festivos: bFestivos, anio: bAnio, copia: bCopia, accesos: bAccesos };

  function render(main) {
    const L = layout(), ocultos = Object.keys(BLOQUES).filter(k => !L.includes(k));
    main.innerHTML = `<div class="view ${editando ? 'editing' : ''}" id="home">
      <div class="ph"><h2 class="sr">Panel de inicio</h2><span></span><div class="actions"><button class="btn ${editando ? '' : 'ghost'} sm" id="editBtn" aria-pressed="${editando}"><svg class="i" viewBox="0 0 24 24" style="width:16px;height:16px"><path d="M4 6h10M4 12h16M4 18h7M18 4v4M15 6h6"/></svg>${editando ? 'Listo' : 'Personalizar'}</button></div></div>
      <div class="edit-bar"><p>Arrastra los bloques para ordenarlos, cambia su ancho con <b>⇔</b> o quítalos con <b>×</b>. ${ocultos.length ? 'Añade los que quieras:' : ''}</p>
        ${ocultos.length ? `<div class="add-grid">${ocultos.map(k => `<button class="add-w" data-add="${k}"><b>+ ${BLOQUES[k].nombre}</b><small>${BLOQUES[k].desc}</small></button>`).join('')}</div>` : '<span class="ex">Todos los bloques están en el panel</span>'}
        <button class="linkbtn" id="resetPanel" style="margin-top:10px">Volver al panel por defecto</button></div>
      <div class="widgets">${L.map((k, i) => `<section class="w" data-w="${k}" style="--span:${span(k)}" ${editando ? 'draggable="true"' : ''} aria-label="${BLOQUES[k].nombre}">
        <div class="w-tools"><button data-move="-1" aria-label="Subir ${BLOQUES[k].nombre}" ${i === 0 ? 'disabled' : ''}><svg class="i" viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button><button data-move="1" aria-label="Bajar ${BLOQUES[k].nombre}" ${i === L.length - 1 ? 'disabled' : ''}><svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12l7 7 7-7"/></svg></button>${BLOQUES[k].span < 12 ? `<button data-ancho aria-pressed="${!!anchos()[k]}" aria-label="${anchos()[k] ? 'Hacer estrecho' : 'Hacer ancho'} ${BLOQUES[k].nombre}" title="${anchos()[k] ? 'Estrecho' : 'Ancho'}"><svg class="i" viewBox="0 0 24 24"><path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/></svg></button>` : ''}<button data-remove aria-label="Quitar ${BLOQUES[k].nombre}"><svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
        ${PINTAR[k]()}</section>`).join('')}</div></div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => $$('.ring .bar', main).forEach(b => b.style.strokeDashoffset = 326.7 * (1 - Number(b.dataset.pct)))));
    enlazar(main);
  }

  /* Repinta solo un bloque (sin animación de pantalla). */
  function repintarBloque(k) { const w = $(`.w[data-w="${k}"]`); if (!w) return; const tools = $('.w-tools', w).outerHTML; w.innerHTML = tools + PINTAR[k](); }

  function enlazar(main) {
    const home = $('#home', main), L = layout();
    $('#editBtn').onclick = () => { editando = !editando; render(main); if (!editando) Ficus.decir('Panel guardado a tu gusto. Como yo con mi maceta.', 'yay'); };
    $('#resetPanel').onclick = () => { setLayout(POR_DEFECTO); Datos.set('panelAncho', {}); render(main); };
    home.addEventListener('click', async e => {
      const add = e.target.closest('[data-add]'); if (add) { setLayout([...L, add.dataset.add]); render(main); return; }
      if (e.target.closest('[data-unlock]')) { if (await ModAltas.pedirPassword()) { Shell.pintarNav(); render(main); } return; }
      const st = e.target.closest('[data-st]'); if (st) { avanzar(Number(st.closest('[data-tk]').dataset.tk)); return; }
      const op = e.target.closest('[data-open]'); if (op) { Tareas.detalle(Number(op.closest('[data-tk]').dataset.tk)); return; }
      const rc = e.target.closest('[data-rc]'); if (rc) { Tareas.detalle(Number(rc.dataset.rc)); return; }
      if (e.target.closest('[data-nuevo-rc]')) { Tareas.abrir({ tipo: 'recordatorio' }); return; }
      const iv = e.target.closest('[data-ir-vista]'); if (iv) { e.preventDefault(); ModTareas.irA(iv.dataset.irVista); return; }
      if (e.target.closest('[data-foco]')) { Tareas.unaAUna(Tareas.vista(rango()).filter(t => !t.hecha && t.tipo !== 'recordatorio').map(t => t.id), rango() === 'semana' ? 'Mi semana' : 'Este mes'); return; }
      const rg = e.target.closest('[data-rango]'); if (rg) { const bw = rg.closest('.w')?.dataset.w; Datos.set('_panelRango', rg.dataset.rango); semOff = 0; calVista = null; repintarBloque('tickets'); repintarBloque('calendario'); $(`.w[data-w="${bw}"] [data-rango="${rg.dataset.rango}"]`)?.focus(); return; }
      const cv = e.target.closest('[data-cae-v]'); if (cv) { ModCae.abrirVisita(Number(cv.dataset.caeV)); return; }
      const al = e.target.closest('[data-alta]'); if (al) { ModAltas.abrir(Number(al.dataset.alta)); location.hash = '#altas'; return; }
      const ir = e.target.closest('[data-ir]'); if (ir) { ModCalendario.irA(ir.dataset.ir); return; }
      const wc = e.target.closest('[data-wc]'); if (wc) { const d = Number(wc.dataset.wc); semOff = d === 0 ? 0 : semOff + d; repintarBloque('calendario'); $(`[data-wc="${d}"]`)?.focus(); return; }
      const mc = e.target.closest('[data-mc]'); if (mc) { const d = Number(mc.dataset.mc), now = new Date(); let v = calVista || { anio: now.getFullYear(), mes: now.getMonth() };
        v = d === 0 ? { anio: now.getFullYear(), mes: now.getMonth() } : { anio: v.anio + Math.floor((v.mes + d) / 12), mes: ((v.mes + d) % 12 + 12) % 12 }; calVista = v; repintarBloque('calendario'); $(`[data-mc="${d}"]`)?.focus(); return; }
      const w = e.target.closest('.w'); if (!w) return;
      if (e.target.closest('[data-remove]')) { setLayout(L.filter(k => k !== w.dataset.w)); render(main); return; }
      if (e.target.closest('[data-ancho]')) { const a = anchos(); a[w.dataset.w] = !a[w.dataset.w]; Datos.set('panelAncho', a); render(main); return; }
      const mv = e.target.closest('[data-move]');
      if (mv) { const l = [...L], i = l.indexOf(w.dataset.w), j = i + Number(mv.dataset.move); [l[i], l[j]] = [l[j], l[i]]; setLayout(l); render(main); $(`.w[data-w="${w.dataset.w}"] [data-move="${mv.dataset.move}"]`)?.focus(); }
    });
    let arr = null;
    $$('.w', home).forEach(w => {
      w.addEventListener('dragstart', e => { arr = w.dataset.w; w.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
      w.addEventListener('dragend', () => { w.classList.remove('dragging'); $$('.w.over').forEach(x => x.classList.remove('over')); });
      w.addEventListener('dragover', e => { if (!editando || !arr) return; e.preventDefault(); w.classList.add('over'); });
      w.addEventListener('dragleave', () => w.classList.remove('over'));
      w.addEventListener('drop', e => {
        e.preventDefault(); const dest = w.dataset.w;
        if (arr && dest !== arr) { const l = L.filter(k => k !== arr); l.splice(l.indexOf(dest) + (L.indexOf(arr) < L.indexOf(dest) ? 1 : 0), 0, arr); setLayout(l); render(main); }
        arr = null;
      });
    });
  }

  /* Círculo de estado en el panel: avanza el ticket; si queda hecho, se ve tachado un momento y después sale de la lista. */
  function avanzar(id) {
    const t = Tareas.avanzar(id); if (!t) return;
    Shell.pintarNav();
    if (t.hecha) {
      const quedan = Tareas.vista('semana').filter(x => !x.hecha && x.tipo !== 'recordatorio').length;
      Ficus.decir(quedan ? `¡Hecha! Te quedan ${quedan} esta semana.` : '¡Semana despejada! Me voy a hacer la fotosíntesis tranquilo.', 'yay');
      if (t.siguiente) toast(`Siguiente repetición creada: ${Fecha.corta(Fecha.parse(t.siguiente))}`);
    } else Tareas.celebrar(t);
    $$(`.w [data-tk="${id}"]`).forEach(li => { li.classList.toggle('done', t.hecha); const b = $('[data-st]', li); b.className = `tk-st st-${t.estado}`; b.setAttribute('aria-label', `Estado: ${Tareas.estadoTxt(t)}. Pulsa para avanzar`); b.title = `${Tareas.estadoTxt(t)} · pulsa para avanzar`; });
    clearTimeout(avanzar._t); avanzar._t = setTimeout(() => { if (location.hash.slice(1) !== 'inicio' && location.hash) return; ['tickets', 'calendario', 'saludo'].forEach(repintarBloque); }, t.hecha ? 900 : 0);
  }

  return { render, reset: () => setLayout(POR_DEFECTO) };
})();
