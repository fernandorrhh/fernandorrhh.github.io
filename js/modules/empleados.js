/*
 * Pantalla de Empleados: base cifrada con contraseña.
 * Tres situaciones: sin configurar (crear contraseña) · bloqueada (pedir contraseña) · abierta (lista, filtros, fichas).
 */
const ModEmpleados = (() => {
  const P = window.RRHH_PARAMS;
  let f = { q: '', centro: '', departamento: '', responsable: '', sexo: '', estado: 'activos' }, orden = { col: 'nombre', dir: 1 };
  const COLS = [['nombre', 'Empleado'], ['departamento', 'Departamento'], ['responsable', 'Responsable'], ['centro', 'Centro'], ['puesto', 'Puesto'], ['fechaContratacion', 'Contratación'], ['salario', 'Salario anual']];
  /* Ordena la lista por la columna elegida (vacíos siempre al final). Por defecto, apellidos. */
  function ordenar(l) {
    if (orden.col === 'nombre') return orden.dir > 0 ? l : [...l].reverse();
    const k = orden.col, vacio = v => v === '' || v == null;
    return [...l].sort((a, b) => { const x = a[k], y = b[k];
      if (vacio(x) || vacio(y)) return vacio(x) - vacio(y);
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es')) * orden.dir; });
  }
  let pendienteAbrir = null;
  const hoy = () => Fecha.iso(Fecha.hoy());
  const antig = fc => { if (!fc) return ''; const d = Fecha.parse(fc), a = (Fecha.hoy() - d) / (365.25 * DAY); return a < 1 ? `${Math.max(0, Math.floor(a * 12))} meses` : `${Math.floor(a)} año${Math.floor(a) === 1 ? '' : 's'}`; };
  const ini = n => (n || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const ICO = {
    candado: '<svg class="i" viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    subir: '<svg class="i" viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></svg>',
    bajar: '<svg class="i" viewBox="0 0 24 24"><path d="M12 4v12M7 11l5 5 5-5M4 20h16"/></svg>',
    mas: '<svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>'
  };

  /* ---------- Pantallas de acceso ---------- */
  function pantallaCrear(main) {
    main.innerHTML = `<div class="view"><div class="page-h"><a class="crumb" href="#inicio">← Inicio</a><h1>Empleados</h1><p>La base de empleados se protege con una contraseña. Los datos se guardan cifrados en este equipo y en tus copias.</p></div>
      <form class="card lock-card" id="crearPw" autocomplete="off">
        <div class="lock-ico">${ICO.candado}</div><h2>Crea la contraseña de la base de empleados</h2>
        <div class="note warn">${icon('info')}<div><b>Importante:</b> si olvidas la contraseña, los datos de empleados <b>no se pueden recuperar</b>, ni siquiera desde una copia. Apúntala en un lugar seguro.</div></div>
        <div class="field"><label for="pw1">Contraseña (mínimo 8 caracteres)</label><input type="password" id="pw1" minlength="8" required autocomplete="new-password"></div>
        <div class="field"><label for="pw2">Repite la contraseña</label><input type="password" id="pw2" minlength="8" required autocomplete="new-password"></div>
        <label class="check"><input type="checkbox" id="pwOk" required> Entiendo que no se puede recuperar si la olvido</label>
        <p class="form-err" id="pwErr" role="alert"></p>
        <button class="btn">Crear base de empleados</button>
        <p class="muted small">Recuerda confirmar con la empresa que puedes guardar estos datos en esta herramienta. La fuente oficial sigue siendo Navision o la gestoría.</p>
      </form></div>`;
    if (!Empleados.disponible()) { $('#pwErr').textContent = 'Este navegador no permite cifrar datos. Usa Edge o Chrome actualizados.'; return; }
    $('#crearPw').onsubmit = async e => {
      e.preventDefault();
      if ($('#pw1').value !== $('#pw2').value) { $('#pwErr').textContent = 'Las contraseñas no coinciden.'; return; }
      try { await Empleados.crear($('#pw1').value); toast('Base de empleados creada'); Ficus.decir('Base creada y cifrada. Ni yo puedo leerla sin la contraseña.', 'yay'); render(main); }
      catch (err) { $('#pwErr').textContent = err.message; }
    };
  }
  function pantallaBloqueada(main) {
    main.innerHTML = `<div class="view"><div class="page-h"><a class="crumb" href="#inicio">← Inicio</a><h1>Empleados</h1><p>La base de empleados está bloqueada.</p></div>
      <form class="card lock-card" id="abrirPw" autocomplete="off">
        <div class="lock-ico">${ICO.candado}</div><h2>Introduce la contraseña</h2>
        <div class="field"><label for="pw">Contraseña</label><input type="password" id="pw" required autocomplete="current-password"></div>
        <p class="form-err" id="pwErr" role="alert"></p>
        <button class="btn" id="pwBtn">Desbloquear</button>
        <p class="muted small">Se bloquea sola tras 15 minutos sin actividad.</p>
      </form></div>`;
    $('#pw').focus();
    $('#abrirPw').onsubmit = async e => {
      e.preventDefault(); $('#pwBtn').disabled = true; $('#pwBtn').textContent = 'Comprobando…';
      const ok = await Empleados.desbloquear($('#pw').value);
      if (ok) { render(main); Shell.pintarNav(); } else { $('#pwErr').textContent = 'Contraseña incorrecta.'; $('#pwBtn').disabled = false; $('#pwBtn').textContent = 'Desbloquear'; $('#pw').select(); }
    };
  }

  /* ---------- Lista ---------- */
  function filas(l) {
    if (!l.length) return `<tr><td colspan="7" class="empty-row">${Empleados.todos().length ? 'Ningún empleado coincide con los filtros.' : 'Aún no hay empleados. Añádelos uno a uno o importa un CSV.'}</td></tr>`;
    return l.map(e => `<tr data-id="${e.id}" tabindex="0" class="${MotorEmpleados.activo(e, hoy()) ? '' : 'baja'}">
      <td><span class="emp-cell"><span class="avatar">${esc(ini(e.nombre + ' ' + e.apellido1))}</span><span><b>${esc(e.nombreCompleto)}</b><small>${esc(e.codigo)}${e.fechaBaja ? ` · baja ${Fecha.larga(Fecha.parse(e.fechaBaja))}` : ''}</small></span></span></td>
      <td>${esc(e.departamento || '—')}</td><td>${esc(e.responsable || '—')}</td><td>${esc(e.centro || '—')}</td><td>${esc(e.puesto || '—')}</td>
      <td>${e.fechaContratacion ? `${Fecha.larga(Fecha.parse(e.fechaContratacion))}<small>${antig(e.fechaContratacion)}</small>` : '—'}</td>
      <td class="num">${e.salario !== '' && e.salario != null ? euros(e.salario) : '—'}</td></tr>`).join('');
  }
  function render(main) {
    if (!Empleados.configurado()) return pantallaCrear(main);
    if (!Empleados.desbloqueado) return pantallaBloqueada(main);
    const todos = Empleados.todos();
    const sel = (id, campo, label) => `<label class="sel"><span class="sr">${label}</span><select id="${id}"><option value="">${label}: todos</option>${MotorEmpleados.valores(todos, campo).map(v => `<option ${f[campo] === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>`;
    main.innerHTML = `<div class="view">
      <div class="page-h page-h-row"><div><a class="crumb" href="#inicio">← Inicio</a><h1>Empleados</h1><p>Datos básicos para calcular y filtrar. Cifrados con tu contraseña.</p></div>
        <div class="page-acts">
          <button class="btn ghost" id="lock">${ICO.candado}Bloquear</button>
          <button class="btn ghost" id="impBtn">${ICO.subir}Importar CSV</button>
          <button class="btn ghost" id="expBtn">${ICO.bajar}Exportar</button>
          <button class="btn" id="nuevo">${ICO.mas}Nuevo empleado</button>
        </div></div>
      ${todos.some(e => !e.sexo) ? `<div class="note warn" style="margin-bottom:16px">${icon('info')}<div><b>${todos.filter(e => !e.sexo).length === 1 ? '1 ficha' : `${todos.filter(e => !e.sexo).length} fichas`} sin sexo.</b> Los informes de igualdad lo necesitan. <button class="linkbtn" id="verSinSexo">Ver cuáles</button></div></div>` : ''}
      <div class="toolbar">
        <div class="seg3" role="group" aria-label="Situación">${[['activos', 'Activos'], ['bajas', 'Bajas'], ['todos', 'Todos']].map(([k, l]) => `<button data-est="${k}" aria-pressed="${f.estado === k}">${l}</button>`).join('')}</div>
        ${sel('fCentro', 'centro', 'Centro')}${sel('fDep', 'departamento', 'Departamento')}${sel('fResp', 'responsable', 'Responsable')}<label class="sel"><span class="sr">Sexo</span><select id="fSx"><option value="">Sexo: todos</option>${[['mujer', 'Mujeres'], ['hombre', 'Hombres'], ['sin', 'Sin indicar']].map(([k, l]) => `<option value="${k}" ${f.sexo === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="search-in"><svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><span class="sr">Buscar empleados</span><input id="eq" type="search" placeholder="Nombre, código, puesto…" value="${esc(f.q)}"></label>
      </div>
      <div class="card tbl-card"><div class="tbl-wrap"><table class="tbl emp-tbl"><thead><tr>${COLS.map(([k, l]) => `<th class="${k === 'salario' ? 'num' : ''}" aria-sort="${orden.col === k ? (orden.dir > 0 ? 'ascending' : 'descending') : 'none'}"><button type="button" class="th-sort" data-sort="${k}">${l}<svg class="i" viewBox="0 0 24 24"><path d="M8 10l4-4 4 4M8 14l4 4 4-4"/></svg></button></th>`).join('')}</tr></thead>
        <tbody id="eBody"></tbody></table></div></div>
      <p class="muted small" style="margin-top:12px"><span id="eCount"></span> Pulsa una fila para ver la ficha. <button class="linkbtn" id="plantilla">Descargar plantilla CSV</button> · <button class="linkbtn" id="cambiarPw">Cambiar contraseña</button></p>
      <input type="file" id="impFile" accept=".csv,text/csv" hidden>
    </div>`;
    const repintar = () => { const l = ordenar(MotorEmpleados.filtrar(Empleados.todos(), { ...f, hoy: hoy() })); $('#eBody').innerHTML = filas(l); $('#eCount').textContent = `${l.length} de ${Empleados.todos().length} empleados.`; };
    repintar();
    $$('[data-est]', main).forEach(b => b.onclick = () => { f.estado = b.dataset.est; render(main); });
    [['fCentro', 'centro'], ['fDep', 'departamento'], ['fResp', 'responsable']].forEach(([id, k]) => $('#' + id).onchange = e => { f[k] = e.target.value; repintar(); });
    $('#eq').oninput = e => { f.q = e.target.value; repintar(); };
    $$('[data-sort]', main).forEach(b => b.onclick = () => {
      const k = b.dataset.sort; orden = orden.col === k ? { col: k, dir: -orden.dir } : { col: k, dir: 1 };
      $$('[data-sort]', main).forEach(x => x.closest('th').setAttribute('aria-sort', x === b ? (orden.dir > 0 ? 'ascending' : 'descending') : 'none'));
      repintar();
    });
    $('#fSx').onchange = e => { f.sexo = e.target.value; repintar(); };
    $('#verSinSexo') && ($('#verSinSexo').onclick = () => { f.sexo = 'sin'; f.estado = 'todos'; render(main); });
    $('#lock').onclick = () => { Empleados.bloquear(); render(main); toast('Empleados bloqueados'); };
    $('#nuevo').onclick = () => ficha(null, main);
    $('#eBody').onclick = e => { const tr = e.target.closest('tr[data-id]'); if (tr) ficha(Number(tr.dataset.id), main); };
    $('#eBody').onkeydown = e => { const tr = e.target.closest('tr[data-id]'); if (tr && e.key === 'Enter') ficha(Number(tr.dataset.id), main); };
    $('#expBtn').onclick = () => {
      descargar(MotorEmpleados.exportarCSV(MotorEmpleados.filtrar(Empleados.todos(), { ...f, hoy: hoy() })), `empleados-${hoy()}.csv`, 'text/csv');
      toast('CSV descargado: contiene datos personales sin cifrar, guárdalo con cuidado');
    };
    $('#plantilla').onclick = () => descargar(MotorEmpleados.exportarCSV([]), 'plantilla-empleados.csv', 'text/csv');
    $('#impBtn').onclick = () => $('#impFile').click();
    $('#impFile').onchange = async e => { const file = e.target.files[0]; e.target.value = ''; if (file) previsualizarImport(await file.text(), main); };
    $('#cambiarPw').onclick = () => cambiarPw();
    if (pendienteAbrir) { const id = pendienteAbrir; pendienteAbrir = null; ficha(id, main); }
  }

  function descargar(texto, nombre, tipo) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([texto], { type: tipo + ';charset=utf-8' })); a.download = nombre; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  /* ---------- Ficha (crear / editar) ---------- */
  function ficha(id, main, { prefill = null, alGuardar = null } = {}) {
    const e = id ? Empleados.buscar(id) : { codigo: '', nombre: '', apellido1: '', apellido2: '', sexo: '', motivoBaja: '', departamento: '', responsable: '', centro: P.centros[0], puesto: '', fechaContratacion: '', salario: '', fechaBaja: '', vacaciones: {}, ...(prefill || {}) };
    if (!e) return;
    const y = new Date().getFullYear(), todos = Empleados.todos();
    const dl = (idl, campo) => `<datalist id="${idl}">${MotorEmpleados.valores(todos, campo).map(v => `<option value="${esc(v)}">`).join('')}</datalist>`;
    const deps = [...P.departamentos, ...(e.departamento && !P.departamentos.includes(e.departamento) ? [e.departamento] : [])];
    const puestos = [...new Set([...P.puestos.map(p => p.puesto), ...MotorEmpleados.valores(todos, 'puesto')])];
    const d = abrirModal(`<form id="fForm" novalidate>
      <div class="dlg-b">
        <div class="ficha-h"><span class="avatar lg">${esc(ini([e.nombre, e.apellido1].join(' ').trim()) || '+')}</span><div><h2>${id ? esc(e.nombreCompleto) : 'Nuevo empleado'}</h2>${id ? `<span class="muted">${esc(e.codigo)} · ${antig(e.fechaContratacion)} en la empresa</span>` : '<span class="muted">Solo datos básicos para calcular y filtrar</span>'}</div></div>
        ${id ? (() => { const pr = (e.pruebas || []).slice(-1)[0], hoyI = hoy();
          const chip = (ident, ico, texto, extra = '') => `<button type="button" class="acc-chip" id="${ident}">${icon(ico)}<span>${texto}</span>${extra}</button>`;
          return `<div class="ficha-acc" role="group" aria-label="Accesos de esta persona">
            ${chip('fAusBtn', 'ausencias', 'Ausencias', (e.ausencias || []).length ? `<b>${e.ausencias.length}</b>` : '')}
            ${chip('fVacBtn', 'vacaciones', 'Vacaciones')}
            ${chip('fProBtn', 'promociones', 'Promociones', (e.promociones || []).length ? `<b>${e.promociones.length}</b>` : '')}
            ${chip('fPruBtn', 'pruebas', 'Periodo de prueba', pr ? `<b class="${pr.resultado ? '' : 'on'}">${pr.resultado ? (pr.resultado === 'favorable' ? '✓' : '✗') : MotorProcesos.diasEntre(hoyI, pr.fin) >= 0 ? 'en curso' : '!'}</b>` : '')}
            ${chip('fSalBtn', 'salidas', e.salida ? 'Salida' : 'Iniciar salida', e.salida && !e.salida.cerrada ? '<b class="on">en curso</b>' : '')}
          </div>`; })() : ''}
        <div class="row2"><div class="field"><label for="fCod">Código de empleado</label><input id="fCod" value="${esc(e.codigo)}" required></div>
          <div class="field"><label for="fNom">Nombre</label><input id="fNom" value="${esc(e.nombre)}" required autocomplete="off"></div></div>
        <div class="row2"><div class="field"><label for="fAp1">Primer apellido</label><input id="fAp1" value="${esc(e.apellido1)}" required autocomplete="off"></div>
          <div class="field"><label for="fAp2">Segundo apellido <span class="muted" style="font-weight:400">(opcional)</span></label><input id="fAp2" value="${esc(e.apellido2)}" autocomplete="off"></div></div>
        <div class="field"><span class="flabel">Sexo <span class="muted" style="font-weight:400">(para los informes de igualdad)</span></span><div class="seg" id="fSexo" role="radiogroup"><span class="thumb" style="${e.sexo ? (e.sexo === 'hombre' ? 'transform:translateX(100%)' : '') : 'opacity:0'}"></span><button type="button" role="radio" data-sx="mujer" aria-pressed="${e.sexo === 'mujer'}" aria-checked="${e.sexo === 'mujer'}">Mujer</button><button type="button" role="radio" data-sx="hombre" aria-pressed="${e.sexo === 'hombre'}" aria-checked="${e.sexo === 'hombre'}">Hombre</button></div></div>
        <div class="row2"><div class="field"><label for="fDepI">Departamento</label><select id="fDepI"><option value="">Sin indicar</option>${deps.map(x => `<option ${e.departamento === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div>
          <div class="field"><label for="fRespI">Responsable</label><input id="fRespI" list="dlResp" value="${esc(e.responsable)}">${dl('dlResp', 'responsable')}</div></div>
        <div class="row2"><div class="field"><label for="fCen">Centro</label><select id="fCen">${P.centros.map(c => `<option ${e.centro === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}${e.centro && !P.centros.includes(e.centro) ? `<option selected>${esc(e.centro)}</option>` : ''}</select></div>
          <div class="field"><label for="fPue">Puesto</label><input id="fPue" list="dlPue" value="${esc(e.puesto)}"><datalist id="dlPue">${puestos.map(v => `<option value="${esc(v)}">`).join('')}</datalist></div></div>
        <div class="row2"><div class="field"><label for="fFc">Fecha de contratación</label><input type="date" id="fFc" value="${e.fechaContratacion || ''}" required></div>
          <div class="field"><label for="fSal">Salario bruto anual (€)</label><input id="fSal" inputmode="decimal" value="${e.salario === '' || e.salario == null ? '' : String(e.salario).replace('.', ',')}" placeholder="p. ej. 23.318,24"></div></div>
        <div class="row2"><div class="field"><label for="fFb">Fecha de baja <span class="muted" style="font-weight:400">(si ya no está)</span></label><input type="date" id="fFb" value="${e.fechaBaja || ''}"></div>
          <div class="field"><label for="fVac">Vacaciones disfrutadas en ${y}</label><input type="number" id="fVac" min="0" step="1" value="${e.vacaciones?.[y] ?? ''}" placeholder="0"><div class="hint">Se usan al calcular sus vacaciones.</div></div></div>
        <div class="field" id="fMotBox" ${e.fechaBaja ? '' : 'hidden'}><label for="fMot">Motivo de la baja</label><select id="fMot"><option value="">— Elige —</option>${[...P.motivosBaja, ...(e.motivoBaja && !P.motivosBaja.includes(e.motivoBaja) ? [e.motivoBaja] : [])].map(m => `<option ${e.motivoBaja === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></div>
        <p class="form-err" id="fErr" role="alert"></p>
      </div>
      <div class="dlg-f">
        ${id ? `<button type="button" class="btn ghost danger icon-only-sm" id="fDel" style="margin-right:auto" title="Eliminar empleado"><svg class="i" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg><span>Eliminar</span></button>` : ''}
        <button type="button" class="btn ghost" id="fCancel">Cancelar</button><button class="btn">${id ? 'Guardar' : 'Crear empleado'}</button>
      </div></form>`, { ancho: 640 });
    $('#fCancel', d).onclick = () => d.close('cancel');
    let sexo = e.sexo || '';
    $$('[data-sx]', d).forEach(b => b.onclick = () => { sexo = b.dataset.sx; $$('[data-sx]', d).forEach(x => { x.setAttribute('aria-pressed', x === b); x.setAttribute('aria-checked', x === b); }); const th = $('#fSexo .thumb', d); th.style.opacity = 1; th.style.transform = sexo === 'hombre' ? 'translateX(100%)' : 'none'; });
    $('#fFb', d).addEventListener('input', () => { $('#fMotBox', d).hidden = !$('#fFb', d).value; });
    $('#fProBtn', d) && ($('#fProBtn', d).onclick = () => { d.close('cancel'); ModPromociones.formulario(main, { empleadoId: id }); });
    $('#fAusBtn', d) && ($('#fAusBtn', d).onclick = () => { d.close('cancel'); ModAusencias.deEmpleado(id); });
    $('#fPruBtn', d) && ($('#fPruBtn', d).onclick = () => { d.close('cancel'); const pr = (e.pruebas || []).slice(-1)[0]; if (pr) ModPruebas.abrir(pr.id); else ModPruebas.formulario(null, { empleadoId: id, inicio: e.fechaContratacion }); });
    $('#fSalBtn', d) && ($('#fSalBtn', d).onclick = () => { d.close('cancel'); ModSalidas.formulario(null, { empleadoId: id }); });
    $('#fForm', d).onsubmit = async ev => {
      ev.preventDefault();
      const sal = MotorEmpleados.importe($('#fSal', d).value);
      const nuevo = { codigo: $('#fCod', d).value.trim(), nombre: $('#fNom', d).value.trim(), apellido1: $('#fAp1', d).value.trim(), apellido2: $('#fAp2', d).value.trim(), departamento: $('#fDepI', d).value, responsable: $('#fRespI', d).value.trim(),
        centro: $('#fCen', d).value, puesto: $('#fPue', d).value.trim(), fechaContratacion: $('#fFc', d).value, salario: sal === null ? NaN : sal, fechaBaja: $('#fFb', d).value, sexo, motivoBaja: $('#fFb', d).value ? $('#fMot', d).value : '',
        vacaciones: { ...(e.vacaciones || {}), ...($('#fVac', d).value !== '' ? { [y]: Math.max(0, Math.floor(Number($('#fVac', d).value))) } : {}) } };
      const err = MotorEmpleados.validar({ ...nuevo, id }, Empleados.todos());
      if (Number.isNaN(nuevo.salario)) err.push('Salario no válido');
      if (!nuevo.sexo) err.push('Indica el sexo (lo necesitan los informes de igualdad)');
      if (err.length) { $('#fErr', d).textContent = err.join(' · '); return; }
      const guardado = id ? await Empleados.editarEmpleado(id, nuevo) : await Empleados.crearEmpleado(nuevo);
      d.close('ok'); toast(id ? 'Ficha actualizada' : 'Empleado creado');
      if (alGuardar) alGuardar(guardado); else if (main) render(main);
    };
    if (id) {
      $('#fDel', d).onclick = async () => {
        d.close('del'); const quitado = await Empleados.eliminarEmpleado(id); if (main) render(main);
        toast('Empleado eliminado', { texto: 'Deshacer', fn: async () => { await Empleados.restaurar(quitado); if (main) render(main); } });
      };
      $('#fVacBtn', d).onclick = () => { d.close('vac'); ModVacaciones.paraEmpleado(id); };
    }
    $('#fCod', d).focus();
  }

  function previsualizarImport(texto, main) {
    const r = MotorEmpleados.importarCSV(texto, Empleados.todos(), { departamentos: P.departamentos });
    const ETQ = { nombre: 'nombre', apellido1: '1.er apellido', apellido2: '2.º apellido', sexo: 'sexo', departamento: 'departamento', responsable: 'responsable', centro: 'centro', puesto: 'puesto', fechaContratacion: 'contratación', salario: 'salario', fechaBaja: 'fecha de baja', motivoBaja: 'motivo de baja' };
    const val = (k, v) => k === 'sexo' ? MotorEmpleados.SEXO[v] : k === 'salario' ? euros(v) : /^fecha/.test(k) ? Fecha.larga(Fecha.parse(v)) : v;
    const total = r.empleados.length + r.actualizaciones.length;
    const d = abrirModal(`<div class="dlg-b"><h2 style="font-size:20px;font-weight:600">Importar empleados</h2>
      <p><b>${r.empleados.length}</b> nuevos · <b>${r.actualizaciones.length}</b> fichas que se actualizan${r.errores.length ? ` · <b class="danger">${r.errores.length}</b> filas con errores (no se importarán)` : ''}.</p>
      ${r.errores.length ? `<ul class="imp-err">${r.errores.slice(0, 20).map(x => `<li>Fila ${x.fila}: ${x.mensajes.map(esc).join(' · ')}</li>`).join('')}${r.errores.length > 20 ? `<li>…y ${r.errores.length - 20} más</li>` : ''}</ul>` : ''}
      ${r.actualizaciones.length ? `<h3 class="imp-h">Se actualizan (por código)</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Código</th><th>Empleado</th><th>Cambios</th></tr></thead><tbody>${r.actualizaciones.slice(0, 12).map(u => `<tr><td>${esc(u.codigo)}</td><td>${esc(u.nombre)}</td><td>${Object.entries(u.cambios).map(([k, v]) => `${ETQ[k]}: <b>${esc(val(k, v))}</b>`).join(' · ')}</td></tr>`).join('')}</tbody></table></div>${r.actualizaciones.length > 12 ? `<p class="muted small">…y ${r.actualizaciones.length - 12} más.</p>` : ''}` : ''}
      ${r.empleados.length ? `<h3 class="imp-h">Nuevos</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Código</th><th>Nombre</th><th>Sexo</th><th>Departamento</th></tr></thead><tbody>${r.empleados.slice(0, 8).map(e => `<tr><td>${esc(e.codigo)}</td><td>${esc(MotorEmpleados.nombreCompleto(e))}</td><td>${MotorEmpleados.SEXO[e.sexo] || '—'}</td><td>${esc(e.departamento)}</td></tr>`).join('')}</tbody></table></div>` : ''}
      ${!total && !r.errores.length ? '<p class="muted">No hay nada que cambiar: las fichas ya tienen estos datos.</p>' : ''}
      <p class="muted small">Si el código ya existe, la ficha se <b>actualiza</b> con las columnas que vengan rellenas (las vacías no borran nada; ausencias, promociones y demás se conservan). Si no existe, se crea. Columnas: ${MotorEmpleados.COLUMNAS.join(', ')}. Separador ; o , · fechas dd/mm/aaaa.</p></div>
      <div class="dlg-f"><button class="btn ghost" id="iCancel">Cancelar</button><button class="btn" id="iOk" ${total ? '' : 'disabled'}>${r.actualizaciones.length && r.empleados.length ? `Importar ${r.empleados.length} y actualizar ${r.actualizaciones.length}` : r.actualizaciones.length ? `Actualizar ${r.actualizaciones.length}` : `Importar ${r.empleados.length}`}</button></div>`, { ancho: 760 });
    $('#iCancel', d).onclick = () => d.close('cancel');
    $('#iOk', d).onclick = async () => {
      if (r.actualizaciones.length) await Empleados.actualizarVarios(r.actualizaciones);
      const n = r.empleados.length ? await Empleados.importar(r.empleados) : 0;
      d.close('ok'); toast([n && `${n} empleados nuevos`, r.actualizaciones.length && `${r.actualizaciones.length} fichas actualizadas`].filter(Boolean).join(' · '));
      Ficus.decir('Hecho. Todo sigue cifrado.', 'yay'); render(main);
    };
  }

  function cambiarPw() {
    const d = abrirModal(`<form id="cpw"><div class="dlg-b"><h2 style="font-size:20px;font-weight:600">Cambiar contraseña</h2>
      <div class="field"><label for="cp0">Contraseña actual</label><input type="password" id="cp0" required autocomplete="current-password"></div>
      <div class="field"><label for="cp1">Nueva contraseña (mínimo 8)</label><input type="password" id="cp1" minlength="8" required autocomplete="new-password"></div>
      <div class="field"><label for="cp2">Repite la nueva</label><input type="password" id="cp2" minlength="8" required autocomplete="new-password"></div>
      <p class="form-err" id="cpErr" role="alert"></p></div>
      <div class="dlg-f"><button type="button" class="btn ghost" id="cpC">Cancelar</button><button class="btn">Cambiar</button></div></form>`);
    $('#cpC', d).onclick = () => d.close('cancel');
    $('#cpw', d).onsubmit = async e => {
      e.preventDefault();
      if ($('#cp1', d).value !== $('#cp2', d).value) { $('#cpErr', d).textContent = 'Las contraseñas nuevas no coinciden.'; return; }
      try { await Empleados.cambiarPassword($('#cp0', d).value, $('#cp1', d).value); d.close('ok'); toast('Contraseña cambiada'); }
      catch (err) { $('#cpErr', d).textContent = err.message; }
    };
  }

  return { render, ficha, abrir: id => { pendienteAbrir = id; } };
})();
