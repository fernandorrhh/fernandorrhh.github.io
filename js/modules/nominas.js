/* Nóminas: variables del mes para la gestoría, a partir de lo registrado y de lo que se añade a mano. Motor: engines/nominas.js */
const ModNominas = (() => {
  const P = window.RRHH_PARAMS, C = P.nomina;
  const hoy = new Date();
  let mes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const titMes = m => `${MESES[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
  const mover = (m, d) => { const [y, mm] = m.split('-').map(Number), t = new Date(Date.UTC(y, mm - 1 + d, 1)); return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}`; };
  const excluidas = () => Datos.get('nominaExcluidas', {})[mes] || [];
  const enviada = () => Datos.get('nominaEnviada', {})[mes] || '';
  const PISTA = { guardias: 'p. ej. 2 semanas · 1 semana + 1 día', horasExtra: 'p. ej. 6 horas', diferencia: 'p. ej. diferencia a favor de Lucía +11,15', anticipo: 'p. ej. 300 €', otros: 'Lo que haya que comunicar' };

  const generar = () => MotorNominas.resumen(Empleados.todos(), { mes, cfg: C, tipos: P.ausencias.tipos, excluidas: excluidas() });

  function render(main) {
    if (!Empleados.configurado() || !Empleados.desbloqueado) return pantallaBloqueo(main, 'Nóminas', 'Las variables del mes para la gestoría: bajas, permisos, altas, cambios y lo que añadas a mano.', () => render(main));
    const env = enviada();
    main.innerHTML = `<div class="view">
      <div class="page-h page-h-row"><div><a class="crumb" href="#inicio">← Inicio</a><h1>Nóminas</h1><p>Las variables del mes para comunicar a la gestoría. Lo registrado en la plataforma aparece solo; el resto lo añades tú.</p></div>
        <button class="btn" id="nAdd"><svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Añadir variable</button></div>
      <div class="nom-bar">
        <div class="nom-mes"><button class="icon-btn" data-m="-1" aria-label="Mes anterior"><svg class="i" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button><h2>${titMes(mes)}</h2><button class="icon-btn" data-m="1" aria-label="Mes siguiente"><svg class="i" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button></div>
        <span class="grow"></span>
        ${env ? `<span class="achip ae-completada">Comunicada el ${Fecha.larga(Fecha.parse(env))}</span><button class="linkbtn" id="nDesm">Desmarcar</button>` : '<button class="btn ghost sm" id="nEnv">Marcar como comunicada</button>'}
      </div>
      <div class="nom-layout">
        <div id="nCats" class="nom-cats live"></div>
        <aside class="card nom-prev"><div class="card-h"><h3>Correo para la gestoría</h3><span class="ex" id="nCount"></span></div>
          <div class="mail-body" id="nTexto"></div>
          <div class="doc-acts"><button class="btn" data-copy="txt">${icon('documentos')}Copiar texto</button><button class="btn ghost" data-copy="html">Copiar con formato</button><a class="btn ghost" id="nMail">Abrir en el correo</a></div>
        </aside>
      </div>
      ${Calc.legal('De dónde sale cada dato', `<p><b>Automático:</b> incorporaciones y bajas (fichas y salidas), maternidad/paternidad, permiso parental, bajas laborales, excedencias y permisos sin sueldo (Ausencias que tocan el mes), reducciones de jornada que empiezan o terminan en el mes, y cambios de salario, categoría o contrato (Promociones).</p>
        <p><b>A mano:</b> guardias, horas extra, diferencias de nómina, anticipos y otros. Se guardan cifrados en la ficha de cada persona.</p>
        <p style="margin:0">Si una línea automática no debe comunicarse este mes, quítala con × (solo para este mes). Los datos de salud no aparecen: solo el tipo de ausencia y las fechas.</p>`)}
    </div>`;
    pintar();
    $$('[data-m]').forEach(b => b.onclick = () => { mes = mover(mes, Number(b.dataset.m)); render(main); });
    $('#nAdd').onclick = () => formulario(main);
    $('#nEnv') && ($('#nEnv').onclick = () => { Datos.set('nominaEnviada', { ...Datos.get('nominaEnviada', {}), [mes]: Fecha.iso(Fecha.hoy()) }); toast(`${titMes(mes)}: comunicada`); render(main); });
    $('#nDesm') && ($('#nDesm').onclick = () => { const o = Datos.get('nominaEnviada', {}); delete o[mes]; Datos.set('nominaEnviada', o); render(main); });
    $$('[data-copy]').forEach(b => b.onclick = () => copiar(b.dataset.copy));
  }

  function pintar() {
    const r = generar(), con = r.filter(c => c.lineas.length), vacias = r.filter(c => !c.lineas.length);
    const incluidas = r.reduce((a, c) => a + c.lineas.filter(l => !l.excluida).length, 0);
    $('#nCats').innerHTML = (con.length ? con.map((c, i) => `<section class="card nom-cat${c.manual ? ' manual' : ''}" style="--i:${i}">
        <div class="card-h"><h3>${esc(c.titulo)}</h3><span class="tag">${c.manual ? 'a mano' : 'automático'}</span></div>
        <ul class="nom-l">${c.lineas.map(l => `<li class="${l.excluida ? 'fuera' : ''}"><span><b>${esc(l.quien)}</b> ${esc(l.texto)}</span>
          ${c.manual ? `<button class="icon-act" data-del="${l.clave}" data-e="${l.empleadoId}" aria-label="Borrar" title="Borrar"><svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>`
            : l.excluida ? `<button class="linkbtn" data-inc="${l.clave}">Incluir</button>` : `<button class="icon-act" data-exc="${l.clave}" aria-label="No comunicar este mes" title="No comunicar este mes"><svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>`}</li>`).join('')}</ul>
        ${c.manual ? `<button class="linkbtn" data-add-cat="${c.id}">+ Añadir</button>` : ''}</section>`).join('')
      : `<div class="empty-mini"><p class="muted">No hay variables registradas para ${titMes(mes).toLowerCase()}. Añade guardias, horas extra o diferencias con «Añadir variable».</p></div>`)
      + (vacias.length ? `<p class="muted small nom-vacias">Sin datos este mes: ${vacias.map(c => c.manual ? `<button class="linkbtn" data-add-cat="${c.id}">${esc(c.titulo)}</button>` : esc(c.titulo)).join(' · ')}</p>` : '');
    $('#nTexto').textContent = incluidas ? MotorNominas.texto(r, { mes, cfg: C }) : 'Aún no hay nada que comunicar este mes.';
    $('#nCount').textContent = `${incluidas} línea${incluidas === 1 ? '' : 's'}`;
    $('#nMail').href = MotorDocumentos.mailto(`Variables de nómina · ${titMes(mes)}`, MotorNominas.texto(r, { mes, cfg: C }));
    const ex = (clave, on) => { const o = Datos.get('nominaExcluidas', {}), l = new Set(o[mes] || []); on ? l.add(clave) : l.delete(clave); Datos.set('nominaExcluidas', { ...o, [mes]: [...l] }); pintar(); };
    $$('[data-exc]').forEach(b => b.onclick = () => ex(b.dataset.exc, true));
    $$('[data-inc]').forEach(b => b.onclick = () => ex(b.dataset.inc, false));
    $$('[data-del]').forEach(b => b.onclick = async () => {
      const e = Empleados.buscar(Number(b.dataset.e)), id = b.dataset.del.replace('man-', '');
      const quitada = (e.variablesNomina || []).find(v => String(v.id) === id);
      await Empleados.editarEmpleado(e.id, { variablesNomina: (e.variablesNomina || []).filter(v => String(v.id) !== id) }); pintar();
      toast('Variable borrada', { texto: 'Deshacer', fn: async () => { const x = Empleados.buscar(e.id); await Empleados.editarEmpleado(e.id, { variablesNomina: [...(x.variablesNomina || []), quitada] }); pintar(); } });
    });
    $$('[data-add-cat]').forEach(b => b.onclick = () => formulario(null, b.dataset.addCat));
  }

  async function copiar(tipo) {
    const r = generar(), t = MotorNominas.texto(r, { mes, cfg: C });
    try {
      if (tipo === 'html' && window.ClipboardItem) await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([MotorNominas.html(r, { mes, cfg: C })], { type: 'text/html' }), 'text/plain': new Blob([t], { type: 'text/plain' }) })]);
      else await navigator.clipboard.writeText(t);
    } catch (e) { const x = document.createElement('textarea'); x.value = t; document.body.append(x); x.select(); document.execCommand('copy'); x.remove(); }
    toast(tipo === 'html' ? 'Copiado con formato: pégalo en Outlook' : 'Texto copiado');
  }

  /* Añadir una variable a mano (se guarda cifrada en la ficha). */
  function formulario(main, cat = 'guardias') {
    const lista = MotorEmpleados.filtrar(Empleados.todos(), { estado: 'todos', hoy: Fecha.iso(Fecha.hoy()) }).filter(e => !e.fechaBaja || e.fechaBaja >= `${mes}-01`);
    if (!lista.length) { toast('Primero añade empleados'); return; }
    const man = C.categorias.filter(c => c.manual);
    const d = abrirModal(`<form id="nF" novalidate><div class="dlg-b">
      <h2 style="font-size:20px;font-weight:600;margin:0 0 14px">Añadir variable · ${titMes(mes)}</h2>
      <div class="field"><label for="nCat">Concepto</label><select id="nCat">${man.map(c => `<option value="${c.id}" ${c.id === cat ? 'selected' : ''}>${esc(c.titulo)}</option>`).join('')}</select></div>
      ${SelPersona.campo('nEmp', 'Persona', { ids: lista.map(e => e.id) })}
      <div class="field"><label for="nDet">Detalle</label><input id="nDet" maxlength="120" autocomplete="off"></div>
      <p class="form-err" id="nErr" role="alert"></p>
    </div><div class="dlg-f"><button type="button" class="btn ghost" id="nC">Cancelar</button><button type="submit" class="btn ghost" data-otra="1">Guardar y añadir otra</button><button class="btn">Guardar</button></div></form>`, { ancho: 520 });
    const pista = () => { $('#nDet', d).placeholder = PISTA[$('#nCat', d).value] || ''; };
    SelPersona.enlazar(d);
    $('#nCat', d).onchange = pista; pista(); $('#nEmp-q', d).focus();
    $('#nC', d).onclick = () => d.close('cancel');
    $('#nF', d).onsubmit = async ev => {
      ev.preventDefault();
      const det = $('#nDet', d).value.trim(); if (!det) { $('#nErr', d).textContent = 'Escribe el detalle.'; $('#nDet', d).focus(); return; }
      const id = Number($('#nEmp', d).value), e = Empleados.buscar(id);
      if (!e) { $('#nErr', d).textContent = 'Elige a la persona.'; $('#nEmp-q', d).focus(); return; }
      await Empleados.editarEmpleado(id, { variablesNomina: [...(e.variablesNomina || []), { id: Date.now(), mes, cat: $('#nCat', d).value, detalle: det }] });
      toast('Variable añadida'); pintar();
      if (ev.submitter?.dataset.otra) { $('#nDet', d).value = ''; $('#nErr', d).textContent = ''; $('#nEmp-q', d).focus(); } else d.close('ok');
    };
  }

  return { render };
})();
