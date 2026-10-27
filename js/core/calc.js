/* Piezas comunes de las calculadoras (interfaz): selector de empleado, números y bloques de resultado. */
const Calc = (() => {
  /* "28.000,50" → 28000.5 · vacío o no válido → null */
  const num = v => { const n = MotorEmpleados.importe(v); return n === '' || n === null ? null : n; };
  const ent = v => { const n = Math.floor(Number(String(v).replace(',', '.'))); return Number.isFinite(n) ? n : 0; };
  const hoyISO = () => Fecha.iso(Fecha.hoy());
  const f = s => s ? Fecha.larga(Fecha.parse(s)) : '—';

  /* Buscador "Rellenar con los datos de una persona". alElegir(empleado | null). Solo con la base de empleados abierta. */
  function empleado(caja, alElegir) {
    if (!caja || typeof Empleados === 'undefined' || !Empleados.configurado()) return;
    if (!Empleados.desbloqueado) { caja.innerHTML = `<div class="note">${icon('info')}<div>Para rellenar con los datos de una persona, <a href="#empleados">desbloquea la base de empleados</a>.</div></div>`; return; }
    if (!Empleados.todos().length) return;
    caja.innerHTML = SelPersona.campo('cEmp', 'Rellenar con los datos de una persona', { vacio: true, placeholder: 'Código, nombre, apellidos o departamento… (o datos a mano)' });
    SelPersona.enlazar(caja);
    $('#cEmp', caja).onchange = ev => alElegir(ev.target.value ? Empleados.buscar(Number(ev.target.value)) : null);
  }

  /* Categoría del convenio a partir del puesto de la empresa. */
  const categoriaDePuesto = puesto => { const P = window.RRHH_PARAMS, p = P.puestos.find(x => norm(x.puesto) === norm(puesto || '')); return p ? P.tablas.categorias.find(c => c.id === p.categoria) : null; };

  const notas = lista => lista.filter(Boolean).map(([k, t]) => `<div class="note ${k}">${icon('info')}<div>${t}</div></div>`).join('');
  const legal = (titulo, html) => `<details class="legal"><summary>${titulo}<svg class="i" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></summary><div class="body">${html}</div></details>`;
  const tabla = (filas, total) => `<table class="liq"><tbody>${filas.map(l => `<tr class="${l.importe < 0 ? 'neg' : ''}"><td><b>${esc(l.concepto)}</b><small>${esc(l.detalle || '')}</small></td><td>${euros(l.importe)}</td></tr>`).join('')}</tbody>${total ? `<tfoot><tr><td>${total[0]}</td><td>${euros(total[1])}</td></tr></tfoot>` : ''}</table>`;

  return { num, ent, hoyISO, f, empleado, categoriaDePuesto, notas, legal, tabla };
})();
