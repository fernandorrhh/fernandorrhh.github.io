/* Páginas de resumen de cada sección: una tarjeta visual por herramienta, con datos vivos y avisos. */
const ModSecciones = (() => {
  const P = window.RRHH_PARAMS;
  const hoyISO = () => Fecha.iso(Fecha.hoy());
  const abierta = () => Empleados.configurado() && Empleados.desbloqueado;
  const cifr = 'Datos cifrados: desbloquea para verlos';
  const plural = (n, s, p = s + 's') => `${n} ${n === 1 ? s : p}`;

  /* Descripción y dato vivo de cada herramienta. */
  const INFO = {
    empleados: { d: 'Fichas cifradas, importación y exportación', v: () => { if (!abierta()) return cifr; const a = MotorEmpleados.filtrar(Empleados.todos(), { estado: 'activos', hoy: hoyISO() }); return `${plural(a.length, 'activo')} · ${a.filter(e => e.sexo === 'mujer').length} M · ${a.filter(e => e.sexo === 'hombre').length} H`; } },
    ausencias: { d: 'Bajas, nacimiento, excedencias y reducciones', v: () => { if (!abierta()) return cifr; const h = hoyISO(), l = Ausencias.todas(); const aus = MotorAusencias.ausentesEn(l, h, P.ausencias.tipos, h).length, v = MotorAusencias.proximasVueltas(l, h, 14).length; return `${aus ? plural(aus, 'persona ausente', 'personas ausentes') + ' hoy' : 'Nadie ausente hoy'}${v ? ` · ${plural(v, 'vuelta')} en 14 días` : ''}`; } },
    informes: { d: 'Igualdad por sexo, en Excel y PDF', v: () => '6 informes del plan de igualdad' },
    reclutamiento: { d: 'Vacantes, canales, cribado y entrevistas', v: () => { const n = Procesos.Vacantes.todas().filter(v => (v.estado || 'abierta') === 'abierta').length; return n ? plural(n, 'vacante abierta', 'vacantes abiertas') : 'Sin vacantes abiertas'; } },
    altas: { d: 'Checklist de incorporación por centro', v: () => { const n = Altas.enCurso().length; return n ? plural(n, 'alta en curso', 'altas en curso') : 'Sin altas en curso'; } },
    pruebas: { d: 'Duración por convenio, seguimiento y resultado', v: () => { if (!abierta()) return cifr; const h = hoyISO(), l = Procesos.Pruebas.todas().map(p => MotorProcesos.estadoPrueba(p, h)); const c = l.filter(e => e === 'en-curso' || e === 'termina-pronto').length, t = l.filter(e => e === 'termina-pronto').length; return c ? `${plural(c, 'periodo en curso', 'periodos en curso')}${t ? ` · ${t} termina${t === 1 ? '' : 'n'} pronto` : ''}` : 'Ningún periodo en curso'; } },
    promociones: { d: 'Categoría, puesto, salario y contrato', v: () => { if (!abierta()) return cifr; const y = hoyISO().slice(0, 4), n = Procesos.Promociones.todas().filter(p => p.fecha.startsWith(y)).length; return n ? `${plural(n, 'cambio')} en ${y}` : `Sin cambios en ${y}`; } },
    salidas: { d: 'Pasos de salida, preaviso y finiquito', v: () => { if (!abierta()) return cifr; const n = Procesos.Salidas.todas().filter(x => !x.cerrada).length; return n ? plural(n, 'salida en curso', 'salidas en curso') : 'Sin salidas en curso'; } },
    nominas: { d: 'Variables del mes para la gestoría', v: () => { if (!abierta()) return cifr; const h = new Date(), m = `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}`; const n = MotorNominas.resumen(Empleados.todos(), { mes: m, cfg: P.nomina, tipos: P.ausencias.tipos }).reduce((a, c) => a + c.lineas.length, 0); return `${plural(n, 'variable')} este mes${Datos.get('nominaEnviada', {})[m] ? ' · comunicada' : ''}`; } },
    tareas: { d: 'Tickets: tareas y recordatorios', v: () => { const l = Tareas.vista('semana').filter(t => !t.hecha), v = l.filter(t => MotorTareas.vencido(t, hoyISO())).length; return `${plural(l.length, 'ticket')} esta semana${v ? ` · ${v} vencido${v === 1 ? '' : 's'}` : ''}`; } },
    cae: { d: 'Documentación de empresas externas y sus trabajadores', v: () => { if (!abierta()) return cifr; const p = Cae.pendientes().length, n = Cae.visitas().filter(v => !v.cerrada).length; return p ? `${plural(p, 'visita')} con documentación pendiente` : `${plural(n, 'visita en curso', 'visitas en curso')} · ${plural(Cae.empresas().length, 'empresa')}`; } },
    herramientas: { d: 'Accesos directos a las webs de trabajo', v: () => { const l = Herramientas.todas(); return l.length ? l.slice(0, 3).map(h => h.nombre).join(' · ') + (l.length > 3 ? ` y ${l.length - 3} más` : '') : 'Sin accesos'; } },
    documentos: { d: 'Ofertas y correos listos para enviar', v: () => '6 plantillas' },
    calendario: { d: 'Festivos, tareas y ausencias', v: () => { const f = ModCalendario.proximos(1)[0]; return f ? `Próximo festivo: ${Fecha.corta(Fecha.parse(f.fecha))} · ${f.items[0].nombre}` : 'Sin festivos próximos cargados'; } },
    salarios: { d: 'Tablas del convenio y jornada parcial', v: () => `Tablas ${P.tablas.anio} · ${P.tablas.categorias.length} categorías` },
    vacaciones: { d: 'Días generados y pendientes', v: () => `${P.vacaciones.diasLaborables} días laborables al año` },
    permisos: { d: 'Convenio frente a Estatuto, el más favorable', v: () => `${P.permisos.length} permisos y reducción de jornada` },
    nacimiento: { d: 'Semanas, fechas y derechos', v: () => `${P.nacimiento.biparental.total} semanas · ${P.nacimiento.monoparental.total} en monoparental` },
    indemnizacion: { d: 'Despido, fin de contrato y otras extinciones', v: () => `${Object.keys(P.indemnizacion.tipos).length} tipos con sus topes` },
    finiquito: { d: 'Liquidación con preaviso e indemnización', v: () => 'Pagas, vacaciones y preaviso' }
  };

  function render(main, sec) {
    const n = Shell.avisos();
    main.innerHTML = `<div class="view">
      <div class="page-h sec-h"><a class="crumb" href="#inicio">← Inicio</a><div class="sec-tit"><span class="sec-ico">${icon(sec.id)}</span><div><h1>${esc(sec.nombre)}</h1><p>${esc(sec.desc)}</p></div></div></div>
      <div class="sec-grid">${sec.items.map(([r, l], i) => { const inf = INFO[r] || { d: '', v: () => '' }; let v = ''; try { v = inf.v(); } catch (e) { v = ''; }
        return `<a class="sec-card" href="#${r}" style="--i:${i}" data-tool="${r}">
          <span class="sc-ico">${icon(r)}</span>
          <span class="sc-txt"><b>${esc(l)}</b><small>${esc(inf.d)}</small></span>
          <span class="sc-dato${v === cifr ? ' lock' : ''}">${esc(v)}</span>
          ${n[r] ? `<span class="badge sc-badge" aria-label="${n[r]} avisos">${n[r]}</span>` : ''}
          <svg class="i sc-go" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </a>`; }).join('')}</div>
    </div>`;
  }

  return { render };
})();
