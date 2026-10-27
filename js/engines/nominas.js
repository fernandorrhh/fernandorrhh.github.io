/*
 * Motor de nóminas — funciones puras. Reúne las variables de nómina de un mes a partir de lo registrado
 * (altas, bajas, ausencias, promociones) más las variables añadidas a mano (empleado.variablesNomina).
 * Pruebas: tests/nominas.test.js
 */
(function (root) {
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const f = s => s ? s.split('-').reverse().join('/') : '';
  const ultimo = mes => { const [y, m] = mes.split('-').map(Number); return `${mes}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`; };
  const nombreMes = mes => MESES[Number(mes.slice(5, 7)) - 1];
  const nombreDe = e => (e.nombreCompleto || [e.nombre, e.apellido1, e.apellido2].filter(Boolean).join(' ')).toUpperCase();
  const quien = e => `${e.codigo ? e.codigo + ' ' : ''}${nombreDe(e)}`;
  const euros = n => Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' }) + ' €';
  const rango = (d, h) => !h ? `${f(d)} - en curso` : d === h ? f(d) : `${f(d)} - ${f(h)}`;

  /**
   * @param {Array} empleados  (normalizados, con ausencias, promociones, salida y variablesNomina)
   * @param {object} o  mes (AAAA-MM) · cfg (params.nomina) · tipos (params.ausencias.tipos) · excluidas (claves)
   */
  function resumen(empleados, { mes, cfg, tipos = [], excluidas = [] }) {
    const ini = `${mes}-01`, fin = ultimo(mes), en = s => s && s >= ini && s <= fin, solapa = (d, h) => d <= fin && (!h || h >= ini);
    const L = Object.fromEntries(cfg.categorias.map(c => [c.id, []]));
    const add = (cat, clave, e, texto) => { if (L[cat]) L[cat].push({ clave, empleadoId: e.id, quien: quien(e), texto, excluida: excluidas.includes(clave) }); };
    const tipoDe = id => tipos.find(t => t.id === id) || {};
    empleados.forEach(e => {
      if (en(e.fechaContratacion)) add('altas', `alta-${e.id}`, e, `alta el ${f(e.fechaContratacion)}${e.puesto ? ' · ' + e.puesto : ''}${e.salario ? ' · ' + euros(e.salario) + ' brutos/año' : ''}`);
      const fb = e.fechaBaja || (e.salida && !e.salida.cerrada ? e.salida.fechaBaja : '');
      const motivo = e.motivoBaja || e.salida?.motivo || '';
      if (en(fb)) add('bajas', `baja-${e.id}`, e, `${e.fechaBaja ? 'baja' : 'baja prevista'} el ${f(fb)}${motivo ? ' · ' + motivo : ''}`);
      (e.ausencias || []).forEach(a => {
        const h = a.finReal || a.hastaPrevista || '', t = tipoDe(a.tipo);
        if (a.tipo === 'reduccion') {
          if (en(a.desde)) add('reduccion', `red-ini-${a.id}`, e, `reducción del ${String(a.porcentaje || '?').replace('.', ',')} % desde el ${f(a.desde)}${a.subtipo ? ' · ' + a.subtipo.toLowerCase() : ''}`);
          if (en(h)) add('reduccion', `red-fin-${a.id}`, e, `fin de la reducción el ${f(h)} (vuelve a jornada completa)`);
          return;
        }
        if (!['nacimiento', 'parental', 'it', 'excedencia', 'noRetribuido'].includes(a.tipo) || !solapa(a.desde, h)) return;
        const extra = a.tipo === 'it' && a.subtipo && a.subtipo !== 'Enfermedad común' ? ` (${a.subtipo.toLowerCase()})`
          : a.tipo === 'nacimiento' && a.subtipo === 'Lactancia acumulada' ? ' (lactancia acumulada)'
          : a.tipo === 'excedencia' && a.subtipo ? ` (${a.subtipo.toLowerCase()})` : '';
        add(a.tipo, `aus-${a.id}`, e, `${rango(a.desde, h)}${extra}`);
      });
      (e.promociones || []).filter(p => en(p.fecha)).forEach(p => add('cambios', `pro-${p.id}`, e,
        `${p.tipo.toLowerCase()} desde el ${f(p.fecha)}: ${p.salarioAnterior && p.salarioNuevo ? `${euros(p.salarioAnterior)} → ${euros(p.salarioNuevo)} brutos/año` : `${p.de || '—'} → ${p.a || '—'}`}`));
      (e.variablesNomina || []).filter(v => v.mes === mes).forEach(v => add(v.cat, `man-${v.id}`, e, v.detalle));
    });
    const orden = (a, b) => a.quien.localeCompare(b.quien, 'es', { numeric: true });
    return cfg.categorias.map(c => ({ ...c, lineas: L[c.id].sort(orden) }));
  }

  /* Texto del correo (solo categorías con líneas incluidas). */
  function texto(secciones, { mes, cfg }) {
    const s = secciones.map(c => ({ ...c, lineas: c.lineas.filter(l => !l.excluida) })).filter(c => c.lineas.length);
    return [cfg.saludo, '', cfg.intro.replace('{mes}', nombreMes(mes)), '', ...s.flatMap(c => [`${c.titulo}:`, ...c.lineas.map(l => `- ${l.quien} ${l.texto}`), ''])].join('\n').trim();
  }
  const escH = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  /* Versión con formato (títulos en negrita y listas) para pegar en Outlook. */
  function html(secciones, { mes, cfg }) {
    const s = secciones.map(c => ({ ...c, lineas: c.lineas.filter(l => !l.excluida) })).filter(c => c.lineas.length);
    return `<p>${escH(cfg.saludo)}</p><p>${escH(cfg.intro.replace('{mes}', nombreMes(mes)))}</p>` + s.map(c => `<p><b>${escH(c.titulo)}:</b></p><ul>${c.lineas.map(l => `<li>${escH(l.quien)} ${escH(l.texto)}</li>`).join('')}</ul>`).join('');
  }

  const api = { resumen, texto, html, nombreMes, ultimo };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MotorNominas = api;
})(typeof window !== 'undefined' ? window : globalThis);
