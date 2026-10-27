/* Ajustes: apariencia, copias de seguridad, panel, asistente y parámetros legales. */
const ModAjustes = (() => {
  const P = window.RRHH_PARAMS;
  const ICONOS_CAT = [['altas', 'Alta'], ['pruebas', 'Reloj de arena'], ['promociones', 'Subida'], ['ausencias', 'Ausencia'], ['nominas', 'Recibo'], ['salidas', 'Salida'], ['gestoria', 'Edificio'], ['prl', 'Escudo'], ['legal', 'Balanza'], ['formacion', 'Formación'], ['documentos', 'Correo'], ['calendario', 'Calendario'], ['empleados', 'Personas'], ['reclutamiento', 'Lupa'], ['otras', 'Puntos']];

  function render(main) {
    const e = Datos.estado, f = Ficus.estado, tema = Shell.tema();
    const ultima = e.ultimaCopia ? new Date(e.ultimaCopia).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : 'nunca';
    const cats = P.tablas.categorias;
    main.innerHTML = `<div class="view">
      <div class="page-h"><a class="crumb" href="#inicio">← Inicio</a><h1>Ajustes</h1><p>Apariencia, copias de seguridad y los parámetros legales que usa la plataforma.</p></div>
      <div class="settings">

      <section class="card set">
        <h2>Apariencia</h2>
        <div class="set-row"><div><b>Tema</b><span>Claro, oscuro o según el sistema.</span></div>
          <div class="seg3" role="group" aria-label="Tema">${[['light', 'Claro'], ['dark', 'Oscuro'], ['auto', 'Automático']].map(([k, l]) => `<button data-tema="${k}" aria-pressed="${tema === k}">${l}</button>`).join('')}</div></div>
        <div class="set-row"><div><b>Panel de inicio</b><span>Vuelve a los bloques de partida.</span></div><button class="btn ghost sm" id="resetPanel">Restablecer panel</button></div>
        <div class="set-row"><div><b>Ficus</b><span>${f.mute ? 'Silenciado: solo habla si lo pulsas.' : 'Activo: saluda y da consejos.'}${f.mini ? ' Minimizado.' : ''}</span></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost sm" id="fMuteSet">${f.mute ? 'Activar avisos' : 'Silenciar'}</button><button class="btn ghost sm" id="fMiniSet">${f.mini ? 'Mostrar' : 'Minimizar'}</button></div></div>
      </section>

      <section class="card set" id="catSet">
        <h2>Categorías de tickets</h2>
        <p class="muted">Cada tarea o recordatorio lleva una categoría. Cambia el nombre, el color o el icono; las que quites pasan a «Otras tareas».</p>
        <ul class="cat-ed">${Tareas.categorias().map((c, i) => { const n = Tareas.todas().filter(t => t.categoria === c.id).length; return `<li data-i="${i}" style="--cc:${c.color}">
          <span class="cat-sw">${icon(c.icono)}</span>
          <label class="sr" for="cN${i}">Nombre</label><input id="cN${i}" data-k="nombre" value="${esc(c.nombre)}" maxlength="30" ${c.id === 'otras' ? '' : ''}>
          <label class="sr" for="cI${i}">Icono</label><select id="cI${i}" data-k="icono">${ICONOS_CAT.map(([k, l]) => `<option value="${k}" ${c.icono === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <label class="sr" for="cC${i}">Color</label><input type="color" id="cC${i}" data-k="color" value="${c.color}">
          <span class="muted small cat-n">${n} ticket${n === 1 ? '' : 's'}</span>
          ${c.id === 'otras' ? '<span class="cat-fija muted small">fija</span>' : `<button class="icon-act" data-del-cat="${i}" aria-label="Quitar ${esc(c.nombre)}" title="Quitar"><svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>`}</li>`; }).join('')}</ul>
        <div class="set-actions"><button class="btn ghost sm" id="addCat">+ Añadir categoría</button><button class="linkbtn" id="resetCat">Volver a las categorías de partida</button></div>
      </section>

      <section class="card set">
        <h2>Copias de seguridad</h2>
        <p class="muted">Los datos viven solo en este navegador. Guarda copias para no perderlos si se borra el historial o cambias de equipo.</p>
        <div class="state-grid">
          <div><small>Última copia</small><b>${ultima}</b></div>
          <div><small>Almacenamiento protegido</small><b>${e.fallo ? '⚠️ No disponible' : e.persistente ? 'Sí' : 'No (el navegador decide)'}</b></div>
          <div><small>Archivo vinculado</small><b>${e.archivo ? esc(e.archivo) : 'Ninguno'}</b></div>
          <div><small>Guardado automático</small><b>${e.estadoArchivo === 'activo' ? 'Activo' : e.estadoArchivo === 'sin-permiso' ? 'Pausado: pulsa “Guardar copia”' : 'Desactivado'}</b></div>
        </div>
        <div class="set-actions">
          <button class="btn" data-save>Guardar copia ahora</button>
          ${Datos.puedeVincular() ? (e.archivo ? '<button class="btn ghost" id="unlink">Desvincular archivo</button>' : '<button class="btn ghost" id="link">Vincular archivo (guardado automático)</button>') : ''}
          <button class="btn ghost" id="exp">Descargar copia</button>
          <label class="btn ghost" for="imp">Importar copia</label><input type="file" id="imp" accept="application/json,.json" hidden>
        </div>
        ${Datos.puedeVincular() ? '<p class="muted small">Consejo: guarda el archivo vinculado en una carpeta de OneDrive o similar para tener copia fuera del equipo. Al abrir la plataforma, Chrome puede pedirte permiso de nuevo: basta con pulsar “Guardar copia”.</p>' : ''}
      </section>

      <section class="card set">
        <h2>Parámetros legales</h2>
        <p class="muted">Un único archivo (<code>js/params.js</code>) con fuente y vigencia. Se revisan cuando se publica normativa nueva.</p>
        <dl class="params">
          <dt>Convenio</dt><dd>${esc(P.convenio.nombre)} · ${P.convenio.boe} · cód. ${P.convenio.codigo}<br><span class="muted">${esc(P.convenio.vigencia)} · verificado ${Fecha.larga(Fecha.parse(P.convenio.verificado))}</span></dd>
          <dt>Vacaciones</dt><dd>${P.vacaciones.diasLaborables} días laborables · <span class="muted">${P.vacaciones.fuente}</span></dd>
          <dt>Jornada</dt><dd>${P.jornada.horasAnuales.toLocaleString('es-ES')} h/año · <span class="muted">${P.jornada.fuente}</span></dd>
          <dt>Pagas extra</dt><dd>${P.pagasExtra.numero} de ${P.pagasExtra.diasCadaUna} días · ${P.pagasExtra.prorrateadas} prorrateadas · ${P.pagasExtra.noProrrateadas.map(p => p.nombre.toLowerCase()).join(' y ')} · <span class="muted">${P.pagasExtra.fuente}</span></dd>
          <dt>Tablas salariales</dt><dd>${P.tablas.anio} · <span class="muted">${esc(P.tablas.fuente)}</span><br><span class="muted">${esc(P.tablas.nota)}</span></dd>
          <dt>Dietas y quebranto</dt><dd>Comida ${euros(P.tablas.dietas.comida)} · cena ${euros(P.tablas.dietas.cena)} · alojamiento ${euros(P.tablas.dietas.alojamiento)} · desayuno ${euros(P.tablas.dietas.desayuno)} · quebranto de moneda ${euros(P.tablas.quebrantoMoneda.importe)} · prima de asistencia ${euros(P.tablas.primaAsistenciaDia)}/día<br><span class="muted">Convenio, arts. 23, 42 y 43 · importes provisionales ${P.tablas.anio}</span></dd>
          <dt>Festivos</dt><dd>${Object.entries(P.festivos).map(([y, a]) => `${y}: ${a.nacionales.length} nacionales · <span class="muted">${esc(a.fuente)}</span>`).join('<br>')}</dd>
        </dl>
        <details class="legal" style="margin-top:14px"><summary>Tabla salarial ${P.tablas.anio} (${cats.length} categorías)<svg class="i" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></summary>
          <div class="body"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Cat.</th><th>Categoría</th><th>Salario base</th><th>Anual con pagas</th></tr></thead><tbody>
          ${cats.map(c => `<tr><td>${c.id}</td><td>${esc(c.nombre)}<br><small class="muted">${esc(c.grupo)}</small></td><td>${c.mes ? euros(c.mes) + '/mes' : euros(c.dia) + '/día'}</td><td>${euros(c.anual)}</td></tr>`).join('')}
          </tbody></table></div></div></details>
      </section>

      <section class="card set">
        <h2>Acerca de</h2>
        <p class="muted" style="margin:0">Plataforma RRHH · versión ${Shell.VERSION}. Funciona sin internet y sin enviar datos a terceros. Código guardado en GitHub (repositorio privado); los datos nunca se suben.</p>
      </section>
      </div></div>`;

    // Categorías de tickets
    const cats0 = () => Tareas.categorias().map(c => ({ ...c }));
    $$('.cat-ed [data-k]', main).forEach(el => el.onchange = () => {
      const i = Number(el.closest('li').dataset.i), l = cats0(), v = el.value.trim();
      if (el.dataset.k === 'nombre' && !v) { el.value = l[i].nombre; return; }
      l[i][el.dataset.k] = v; Tareas.setCategorias(l); render(main); toast('Categoría guardada');
    });
    $$('[data-del-cat]', main).forEach(b => b.onclick = () => {
      const i = Number(b.dataset.delCat), l = cats0(), [q] = l.splice(i, 1), afect = Tareas.todas().filter(t => t.categoria === q.id);
      Tareas.setCategorias(l); afect.forEach(t => Tareas.editar(t.id, { categoria: 'otras' }, `Categoría: Otras tareas (se quitó «${q.nombre}»)`));
      render(main); toast(`«${q.nombre}» quitada${afect.length ? `: ${afect.length} ticket${afect.length === 1 ? '' : 's'} a «Otras tareas»` : ''}`);
    });
    $('#addCat').onclick = () => { const l = cats0(), j = l.findIndex(c => c.id === 'otras'); l.splice(j < 0 ? l.length : j, 0, { id: 'c' + Date.now().toString(36), nombre: 'Nueva categoría', color: '#4a6f99', icono: 'documentos' }); Tareas.setCategorias(l); render(main); const ins = $$('.cat-ed input[data-k=nombre]', main); const x = ins[j < 0 ? ins.length - 1 : j]; x?.focus(); x?.select(); };
    $('#resetCat').onclick = () => { const ids = new Set(P.tareas.categorias.map(c => c.id)); Tareas.setCategorias(P.tareas.categorias); Tareas.todas().filter(t => !ids.has(t.categoria)).forEach(t => Tareas.editar(t.id, { categoria: 'otras' })); render(main); toast('Categorías de partida restauradas'); };
    $$('[data-tema]', main).forEach(b => b.onclick = () => { Shell.setTema(b.dataset.tema); render(main); });
    $('#resetPanel').onclick = () => { ModInicio.reset(); toast('Panel restablecido'); };
    $('#fMuteSet').onclick = () => { Ficus.silenciar(!Ficus.estado.mute, true); render(main); };
    $('#fMiniSet').onclick = () => { Ficus.minimizar(!Ficus.estado.mini); render(main); };
    $('#exp').onclick = () => { Datos.descargar(); toast('Copia descargada'); };
    $('#link') && ($('#link').onclick = async () => {
      try { const n = await Datos.vincular(); toast(`Guardado automático en ${n}`); Ficus.decir('Archivo vinculado. A partir de ahora guardo cada cambio yo solito.', 'yay'); render(main); }
      catch (err) { if (err.name !== 'AbortError') toast('No se pudo vincular el archivo'); }
    });
    $('#unlink') && ($('#unlink').onclick = async () => { await Datos.desvincular(); toast('Archivo desvinculado'); render(main); });
    $('#imp').onchange = async ev => {
      const file = ev.target.files[0]; if (!file) return;
      try {
        const obj = JSON.parse(await file.text());
        if (!confirmarImportar(obj)) return;
        const n = await Datos.importar(obj); toast(`Copia importada (${n} apartados)`); Shell.pintarNav(); render(main);
      } catch (err) { toast(err.message || 'Archivo no válido'); }
      ev.target.value = '';
    };
  }
  // Importar sustituye los datos actuales: se pide confirmación antes.
  function confirmarImportar(obj) {
    const fecha = obj?.exportadoEl ? new Date(obj.exportadoEl).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : 'fecha desconocida';
    return window.confirm(`Vas a sustituir los datos actuales por la copia del ${fecha}. ¿Continuar?`);
  }
  return { render };
})();
