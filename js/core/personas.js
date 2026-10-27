/*
 * Buscador de personas (componente único para procesos, calculadoras y tickets).
 * - Lista ordenada por código de empleado; busca por código, nombre, apellidos, departamento, puesto y centro
 *   (sin tildes ni mayúsculas; varias palabras a la vez). Las bajas, al final y marcadas.
 * - Las últimas personas elegidas aparecen primero al abrirlo.
 * - El valor (id del empleado) queda en un <input type="hidden" id="…">, que lanza "change" al elegir.
 * Uso: SelPersona.campo('pEmp', 'Persona', { valor, bajas: true, vacio: '— Datos a mano —' }) y luego SelPersona.enlazar(contenedor).
 * Solo con la base de empleados desbloqueada (si no, quien lo usa muestra el aviso de bloqueo).
 */
const SelPersona = (() => {
  const REC = 'rrhh.recientes', MAX = 60;
  const recientes = () => { try { return JSON.parse(localStorage.getItem(REC) || '[]'); } catch (e) { return []; } };
  const recordar = id => { try { localStorage.setItem(REC, JSON.stringify([id, ...recientes().filter(x => x !== id)].slice(0, 6))); } catch (e) {} };
  const hoyISO = () => Fecha.iso(Fecha.hoy());
  const numCod = c => { const n = parseInt(String(c || '').replace(/\D/g, ''), 10); return Number.isFinite(n) ? n : Infinity; };
  const porCodigo = (a, b) => numCod(a.codigo) - numCod(b.codigo) || String(a.codigo || '').localeCompare(String(b.codigo || ''), 'es', { numeric: true }) || a.nombreCompleto.localeCompare(b.nombreCompleto, 'es');
  const deBaja = e => !!e.fechaBaja && e.fechaBaja < hoyISO();
  const texto = e => e ? `${e.codigo ? e.codigo + ' · ' : ''}${e.nombreCompleto}` : '';
  const iniciales = e => ((e.nombre || '?')[0] + ((e.apellido1 || '')[0] || '')).toUpperCase();

  /* Personas candidatas, ya ordenadas: activas por código y después las bajas. */
  function candidatas({ bajas = true, filtro = null, ids = null } = {}) {
    if (typeof Empleados === 'undefined' || !Empleados.desbloqueado) return [];
    let l = Empleados.todos(); if (filtro) l = l.filter(filtro);
    if (ids) { const s = new Set(ids); l = l.filter(e => s.has(e.id)); }
    if (!bajas) l = l.filter(e => !deBaja(e));
    return [...l.filter(e => !deBaja(e)).sort(porCodigo), ...l.filter(deBaja).sort(porCodigo)];
  }
  /* Búsqueda: todas las palabras deben aparecer en código, nombre, apellidos, departamento, puesto o centro. */
  function buscar(lista, q) {
    const p = norm(q).trim().split(/\s+/).filter(Boolean); if (!p.length) return lista;
    return lista.filter(e => { const h = norm(`${e.codigo} ${e.nombreCompleto} ${e.departamento || ''} ${e.puesto || ''} ${e.centro || ''}`); return p.every(w => h.includes(w)); });
  }

  const cfgs = new Map();   // id → opciones
  function campo(id, label, o = {}) {
    cfgs.set(id, o);
    const e = o.valor ? Empleados.buscar(Number(o.valor)) : null;
    return `<div class="field selp" data-selp="${id}">${label ? `<label for="${id}-q">${label}</label>` : ''}
      <input type="hidden" id="${id}" value="${e ? e.id : ''}">
      <div class="selp-in${o.disabled ? ' off' : ''}"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input id="${id}-q" class="selp-q" role="combobox" aria-expanded="false" aria-controls="${id}-l" aria-autocomplete="list" autocomplete="off" spellcheck="false"
          placeholder="${esc(o.placeholder || 'Código, nombre, apellidos o departamento…')}" value="${esc(texto(e))}" ${o.disabled ? 'disabled' : ''}>
        ${o.vacio && !o.disabled ? `<button type="button" class="selp-x" aria-label="Quitar la persona" title="Quitar" ${e ? '' : 'hidden'}><svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>` : ''}</div>
      <ul class="selp-l" id="${id}-l" role="listbox" aria-label="${esc(label || 'Personas')}" hidden></ul>
      ${o.hint ? `<div class="hint">${o.hint}</div>` : ''}</div>`;
  }

  function enlazar(cont = document) {
    $$('[data-selp]', cont).forEach(box => {
      if (box._selp) return; box._selp = true;
      const id = box.dataset.selp, o = cfgs.get(id) || {}, hid = $(`#${CSS.escape(id)}`, box), q = $('.selp-q', box), ul = $('.selp-l', box), x = $('.selp-x', box);
      let items = [], sel = 0, abierto = false;
      const actual = () => hid.value ? Empleados.buscar(Number(hid.value)) : null;
      const mostrarActual = () => { q.value = texto(actual()); if (x) x.hidden = !actual(); };
      function pintar() {
        const todas = candidatas(o), escrito = q.value.trim(), rec = recientes();
        const filtrando = escrito && escrito !== texto(actual());
        if (filtrando) items = buscar(todas, escrito);
        else { const r = rec.map(i => todas.find(e => e.id === i)).filter(Boolean); items = [...r, ...todas.filter(e => !r.includes(e))]; }
        const nRec = filtrando ? 0 : rec.filter(i => todas.some(e => e.id === i)).length;
        sel = Math.min(sel, Math.max(0, items.length - 1));
        const vis = items.slice(0, MAX);
        ul.innerHTML = vis.length ? vis.map((e, i) => `${i === 0 && nRec ? '<li class="selp-sec" role="presentation">Recientes</li>' : ''}${i === nRec && nRec ? '<li class="selp-sec" role="presentation">Por código</li>' : ''}
          <li role="option" id="${id}-o${i}" data-i="${i}" aria-selected="${i === sel}" class="${deBaja(e) ? 'baja' : ''}${String(e.id) === hid.value ? ' cur' : ''}">
            <span class="avatar">${esc(iniciales(e))}</span><span class="selp-t"><b><em>${esc(e.codigo || '—')}</em>${esc(e.nombreCompleto)}</b><small>${esc([e.puesto, e.departamento, e.centro].filter(Boolean).join(' · ') || 'Sin puesto')}${deBaja(e) ? ' · <i>baja</i>' : ''}</small></span></li>`).join('')
          + (items.length > MAX ? `<li class="selp-more" role="presentation">${items.length - MAX} más: escribe para afinar</li>` : '')
          : `<li class="selp-more" role="presentation">${todas.length ? 'Nadie coincide con la búsqueda.' : 'No hay personas en la base.'}</li>`;
        q.setAttribute('aria-activedescendant', vis.length ? `${id}-o${sel}` : '');
      }
      const abrir = () => { if (abierto || q.disabled) return; abierto = true; ul.hidden = false; q.setAttribute('aria-expanded', 'true'); sel = 0; pintar(); };
      const cerrar = () => { abierto = false; ul.hidden = true; q.setAttribute('aria-expanded', 'false'); };
      function elegir(e) {
        hid.value = e ? e.id : ''; if (e) recordar(e.id);
        mostrarActual(); cerrar(); hid.dispatchEvent(new Event('change', { bubbles: true }));
      }
      q.addEventListener('focus', () => { abrir(); q.select(); });
      q.addEventListener('click', abrir);
      q.addEventListener('input', () => { sel = 0; if (!abierto) abrir(); else pintar(); });
      q.addEventListener('keydown', ev => {
        if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { ev.preventDefault(); if (!abierto) { abrir(); return; } const n = Math.min(items.length, MAX); if (!n) return; sel = (sel + (ev.key === 'ArrowDown' ? 1 : -1) + n) % n; pintar(); $(`#${CSS.escape(id)}-o${sel}`, box)?.scrollIntoView({ block: 'nearest' }); }
        else if (ev.key === 'Enter') { if (abierto && items[sel]) { ev.preventDefault(); elegir(items[sel]); } }
        else if (ev.key === 'Escape') { if (abierto) { ev.preventDefault(); ev.stopPropagation(); mostrarActual(); cerrar(); } }
        else if (ev.key === 'Tab') { if (abierto && q.value.trim() && q.value !== texto(actual()) && items.length === 1) elegir(items[0]); else { mostrarActual(); cerrar(); } }
      });
      ul.addEventListener('mousedown', ev => ev.preventDefault());   // no perder el foco al pulsar
      ul.addEventListener('click', ev => { const li = ev.target.closest('[data-i]'); if (li) elegir(items[Number(li.dataset.i)]); });
      q.addEventListener('blur', () => setTimeout(() => { if (!box.contains(document.activeElement)) { mostrarActual(); cerrar(); } }, 120));
      if (x) x.onclick = () => { elegir(null); q.focus(); };
      // Si otro código cambia el valor (hid.value = …; dispatch change), se actualiza el texto.
      hid.addEventListener('change', mostrarActual);
    });
  }

  return { campo, enlazar, candidatas, buscar, texto, recordar };
})();
