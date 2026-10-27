/*
 * Trabajo diario → Herramientas: accesos directos a las webs de trabajo (se abren en una pestaña nueva).
 * Lista editable (añadir, editar, ordenar, quitar). Iconos propios: no se carga nada de las webs (ni logos).
 * Datos: Datos 'herramientas' (si no existe, la lista de partida de params.herramientas).
 */
const Herramientas = (() => {
  const P = window.RRHH_PARAMS;
  const ICONOS = [['reloj', 'Reloj'], ['globo', 'Mundo'], ['prl', 'Escudo'], ['chispa', 'Chispa'], ['documentos', 'Correo'], ['nominas', 'Recibo'], ['calendario', 'Calendario'], ['empleados', 'Personas'], ['gestoria', 'Edificio'], ['legal', 'Balanza'], ['formacion', 'Formación'], ['herramientas', 'Herramienta'], ['enlace', 'Enlace']];
  const COLORES = ['#2e7f99', '#5b5fb0', '#3c7a3a', '#b5671b', '#a8434f', '#6b4f8a', '#2f7d6d', '#77735c'];
  const todas = () => { const l = Datos.get('herramientas', null); return Array.isArray(l) ? l : P.herramientas; };
  const guardar = l => Datos.set('herramientas', l);
  const valida = u => { try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:'; } catch (e) { return false; } };
  const dominio = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
  const abrir = h => window.open(h.url, '_blank', 'noopener,noreferrer');
  return { ICONOS, COLORES, todas, guardar, valida, dominio, abrir };
})();

const ModHerramientas = (() => {
  let editando = false;
  const tarjeta = (h, i, n) => `<li class="hw${editando ? ' ed' : ''}" style="--hc:${h.color};--i:${i}">
      <a class="hw-a" href="${esc(h.url)}" target="_blank" rel="noopener noreferrer" ${editando ? 'tabindex="-1" aria-hidden="true"' : ''}>
        <span class="hw-ico">${icon(h.icono || 'enlace')}</span>
        <span class="hw-t"><b>${esc(h.nombre)}</b><small>${esc(h.desc || '')}</small><em>${esc(Herramientas.dominio(h.url))}</em></span>
        <svg class="i hw-go" viewBox="0 0 24 24" aria-hidden="true"><path d="${'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'}"/></svg><span class="sr"> (se abre en una pestaña nueva)</span></a>
      ${editando ? `<div class="hw-tools"><button class="icon-act" data-mv="-1" data-i="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Subir ${esc(h.nombre)}"><svg class="i" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button><button class="icon-act" data-mv="1" data-i="${i}" ${i === n - 1 ? 'disabled' : ''} aria-label="Bajar ${esc(h.nombre)}"><svg class="i" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button><button class="icon-act" data-ed="${i}" aria-label="Editar ${esc(h.nombre)}"><svg class="i" viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/></svg></button><button class="icon-act" data-del="${i}" aria-label="Quitar ${esc(h.nombre)}"><svg class="i" viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button></div>` : ''}
    </li>`;

  function render(main) {
    const l = Herramientas.todas();
    main.innerHTML = `<div class="view">
      <div class="page-h page-h-row"><div><a class="crumb" href="#inicio">← Inicio</a><h1>Herramientas</h1><p>Accesos directos a las webs que usas a diario. Se abren en una pestaña nueva; también las encuentras con Ctrl + K.</p></div>
        <div class="page-acts"><button class="btn ${editando ? '' : 'ghost'}" id="hEd" aria-pressed="${editando}">${editando ? 'Listo' : 'Editar la lista'}</button>${editando ? '<button class="btn" id="hAdd"><svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Añadir</button>' : ''}</div></div>
      ${l.length ? `<ul class="hw-grid">${l.map((h, i) => tarjeta(h, i, l.length)).join('')}</ul>` : `<div class="card empty-card"><p><b>No hay accesos.</b></p><p class="muted">Pulsa «Editar la lista» y después «Añadir».</p></div>`}
      <p class="muted small" style="margin-top:16px">Los programas de escritorio (Dynamics NAV) y los archivos de la red (el Excel de la base) no se pueden abrir desde un enlace del navegador, por eso no están aquí.</p>
    </div>`;
    $('#hEd').onclick = () => { editando = !editando; render(main); };
    $('#hAdd') && ($('#hAdd').onclick = () => formulario(main, -1));
    main.querySelector('.hw-grid')?.addEventListener('click', e => {
      const mv = e.target.closest('[data-mv]'); if (mv) { const i = Number(mv.dataset.i), j = i + Number(mv.dataset.mv), x = [...Herramientas.todas()]; [x[i], x[j]] = [x[j], x[i]]; Herramientas.guardar(x); render(main); $(`[data-mv="${mv.dataset.mv}"][data-i="${j}"]`)?.focus(); return; }
      const ed = e.target.closest('[data-ed]'); if (ed) { formulario(main, Number(ed.dataset.ed)); return; }
      const del = e.target.closest('[data-del]'); if (del) { const i = Number(del.dataset.del), x = [...Herramientas.todas()], [q] = x.splice(i, 1); Herramientas.guardar(x); render(main); toast(`${q.nombre} quitada`, { texto: 'Deshacer', fn: () => { const y = [...Herramientas.todas()]; y.splice(i, 0, q); Herramientas.guardar(y); render(main); } }); }
    });
  }

  function formulario(main, i) {
    const h = i >= 0 ? Herramientas.todas()[i] : { nombre: '', desc: '', url: 'https://', icono: 'enlace', color: Herramientas.COLORES[0] };
    const d = abrirModal(`<form id="hF" novalidate><div class="dlg-b">
      <h2 style="font-size:20px;font-weight:600;margin:0 0 14px">${i >= 0 ? 'Editar acceso' : 'Nuevo acceso'}</h2>
      <div class="row2"><div class="field"><label for="hN">Nombre</label><input id="hN" maxlength="40" value="${esc(h.nombre)}" required></div>
        <div class="field"><label for="hD">Para qué es</label><input id="hD" maxlength="50" value="${esc(h.desc || '')}" placeholder="p. ej. Fichador"></div></div>
      <div class="field"><label for="hU">Dirección web</label><input id="hU" type="url" inputmode="url" value="${esc(h.url)}" required><div class="hint">Empieza por https://. Los archivos y programas del ordenador no se pueden abrir desde aquí.</div></div>
      <div class="row2"><div class="field"><label for="hI">Icono</label><select id="hI">${Herramientas.ICONOS.map(([k, l]) => `<option value="${k}" ${h.icono === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div><span class="flabel">Color</span><div class="hw-colores" role="radiogroup" aria-label="Color">${Herramientas.COLORES.map(c => `<button type="button" role="radio" data-c="${c}" aria-checked="${h.color === c}" style="--hc:${c}" aria-label="Color ${c}"></button>`).join('')}</div></div></div>
      <p class="form-err" id="hErr" role="alert"></p>
    </div><div class="dlg-f"><button type="button" class="btn ghost" id="hC">Cancelar</button><button class="btn">Guardar</button></div></form>`, { ancho: 520 });
    let color = h.color;
    $('.hw-colores', d).onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; color = b.dataset.c; $$('.hw-colores [data-c]', d).forEach(x => x.setAttribute('aria-checked', x === b)); };
    $('#hC', d).onclick = () => d.close('cancel');
    $('#hN', d).focus();
    $('#hF', d).onsubmit = ev => {
      ev.preventDefault();
      const n = $('#hN', d).value.trim(), u = $('#hU', d).value.trim();
      if (!n) { $('#hErr', d).textContent = 'Escribe un nombre.'; $('#hN', d).focus(); return; }
      if (!Herramientas.valida(u)) { $('#hErr', d).textContent = 'La dirección debe ser una web que empiece por https://'; $('#hU', d).focus(); return; }
      const x = [...Herramientas.todas()], nuevo = { id: h.id || 'h' + Date.now(), nombre: n, desc: $('#hD', d).value.trim(), url: u, icono: $('#hI', d).value, color };
      if (i >= 0) x[i] = nuevo; else x.push(nuevo);
      Herramientas.guardar(x); d.close('ok'); render(main); toast(i >= 0 ? 'Acceso actualizado' : 'Acceso añadido');
    };
  }
  return { render };
})();
