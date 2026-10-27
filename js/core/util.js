/* Utilidades comunes (sin dependencias). */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const DAY = 86400000;
const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const Fecha = {
  hoy() { const d = new Date(); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()); },
  iso(t) { return new Date(t).toISOString().slice(0, 10); },
  parse(s) { if (!s) return null; const [y, m, d] = String(s).split('-').map(Number); return (y && m && d) ? Date.UTC(y, m - 1, d) : null; },
  larga(t) { return new Date(t).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }); },
  corta(t) { return new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' }).replace('.', ''); },
  diaSemana(t) { return new Date(t).toLocaleDateString('es-ES', { weekday: 'long', timeZone: 'UTC' }); },
  mesCorto(t) { return new Date(t).toLocaleDateString('es-ES', { month: 'short', timeZone: 'UTC' }).replace('.', ''); },
  sumar(t, unidad, n = 1) {             // unidad: 'semana' | 'mes' | 'anio'
    const d = new Date(t);
    if (unidad === 'semana') return t + 7 * n * DAY;
    const y = d.getUTCFullYear() + (unidad === 'anio' ? n : 0), m = d.getUTCMonth() + (unidad === 'mes' ? n : 0);
    const ultimo = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return Date.UTC(y, m, Math.min(d.getUTCDate(), ultimo));
  }
};

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dec = n => Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' });
const euros = n => Number(n).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', useGrouping: 'always' });
const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* Número que cuenta hasta su nuevo valor (decorativo; respeta "reducir movimiento"). */
function countTo(el, to) {
  const from = Number(el.dataset.v ?? 0); el.dataset.v = to;
  if (reduceMotion || from === to) { el.textContent = to; return; }
  const t0 = performance.now(), dur = 420; cancelAnimationFrame(el._raf);
  const step = t => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4); el.textContent = Math.round(from + (to - from) * e); if (p < 1) el._raf = requestAnimationFrame(step); };
  el._raf = requestAnimationFrame(step);
}

let _toastT;
/* Aviso breve. Opcionalmente con una acción, p. ej. { texto: 'Deshacer', fn }. */
function toast(msg, accion = null) {
  const t = $('#toast'), b = $('#toastBtn');
  $('#toastTxt').textContent = msg; t.hidden = false;
  b.hidden = !accion;
  if (accion) { b.textContent = accion.texto; b.onclick = () => { t.hidden = true; accion.fn(); }; }
  clearTimeout(_toastT); _toastT = setTimeout(() => t.hidden = true, accion ? 6000 : 2800);
}

/* Iconos (trazos 24×24). */
const ICON = {
  inicio: 'M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z',
  empleados: 'M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  altas: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9',
  tareas: 'M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2',
  documentos: 'M3 5h18v14H3zM4 6l8 6 8-6',
  calendario: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4',
  salarios: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  vacaciones: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  permisos: 'M4 3h16v18H4zM8 8h8M8 12h8M8 16h5',
  nacimiento: 'M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z',
  ausencias: 'M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM2 21v-1a6 6 0 0 1 9.5-4.9M16 15l5 5M21 15l-5 5',
  informes: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  reclutamiento: 'M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM21 21l-6.5-6.5M10 7.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM6.8 14a4 4 0 0 1 6.4 0',
  pruebas: 'M7 3h10M7 21h10M8 3v4l4 5 4-5V3M8 21v-4l4-5 4 5v4',
  promociones: 'M4 20l6-6 4 4 7-8M15 10h6v6',
  salidas: 'M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5M10 16l-4-4 4-4M6 12h10',
  personas: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1M17 3.5a4 4 0 0 1 0 7M22 21v-1a6 6 0 0 0-4-5.6',
  procesos: 'M5 6a2 2 0 1 0 0-.01M19 6a2 2 0 1 0 0-.01M12 18a2 2 0 1 0 0-.01M7 6h10M6.5 7.5l4.5 9M17.5 7.5l-4.5 9',
  trabajo: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16',
  calculadoras: 'M6 3h12v18H6zM9 7h6M9 11h.01M12 11h.01M15 11h.01M9 14h.01M12 14h.01M15 14h.01M9 17h.01M12 17h.01M15 17h.01',
  nominas: 'M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6M9 16h3',
  indemnizacion: 'M3 7h18v12H3zM3 11h18M7 15h3',
  finiquito: 'M6 3h9l3 3v15H6zM9 10h6M9 14h6M9 18h3',
  ajustes: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.6 15H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9.7 4.4V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z',
  accion: 'M13 2L4 14h7l-1 8 9-12h-7z',
  cae: 'M3 5h18v14H3zM8 9.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM5 17a3.5 3.5 0 0 1 6 0M14 10h4M14 14h4',
  herramientas: 'M14.7 6.3a4 4 0 0 0 5 5l-8.4 8.4a2.1 2.1 0 0 1-3-3zM9.3 6.3L6 3 3 6l3.3 3.3',
  gestoria: 'M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6M9 10h.01M15 10h.01',
  prl: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4',
  legal: 'M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z',
  formacion: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5M22 9v6',
  otras: 'M5 12h.01M12 12h.01M19 12h.01',
  pin: 'M9 4h6M10 4v5l-3 4h10l-3-4V4M12 13v7',
  campana: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
  archivo: 'M3 4h18v4H3zM5 8v12h14V8M10 12h4',
  foco: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
  repite: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3',
  reloj: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  globo: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  chispa: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6',
  enlace: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v5M12 16h.01'
};
const icon = (k, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON[k] || ICON.info}"/></svg>`;

/* Efecto burbuja al marcar una casilla .paso (se infla, estalla y suelta gotas). */
function burbuja(b) {
  if (reduceMotion || !b) return;
  const box = b.querySelector('.box'); if (!box) return;
  box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
  const w = document.createElement('span'); w.className = 'burst'; w.setAttribute('aria-hidden', 'true');
  w.innerHTML = '<i class="bring"></i>' + Array.from({ length: 8 }, (_, i) => `<i class="dot" style="--a:${i * 45 + (Math.random() * 16 - 8)}deg;--d:${18 + Math.random() * 8}px"></i>`).join('');
  box.append(w); setTimeout(() => { w.remove(); box.classList.remove('pop'); }, 700);
}
/* Casilla de lista de pasos (mismo aspecto que en las altas). */
const casilla = (attrs, on, texto, extra = '') => `<button type="button" class="paso${on ? ' on' : ''}" role="checkbox" aria-checked="${!!on}" ${attrs}><span class="box"><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg></span><span class="paso-t">${texto}</span>${extra}</button>`;
/* Pantalla de base de empleados bloqueada o sin crear (para procesos que la necesitan). */
function pantallaBloqueo(main, titulo, desc, alAbrir) {
  const conf = Empleados.configurado();
  main.innerHTML = `<div class="view"><div class="page-h"><a class="crumb" href="#inicio">← Inicio</a><h1>${titulo}</h1><p>${desc}</p></div>
    <div class="card lock-card"><div class="lock-ico">${icon('empleados')}</div><h2>${conf ? 'Datos protegidos' : 'Falta la base de empleados'}</h2><p class="muted">Estos datos se guardan cifrados con la base de empleados.</p>
    ${conf ? '<button class="btn" id="pbUnlock">Desbloquear</button>' : '<a class="btn" href="#empleados">Ir a Empleados</a>'}</div></div>`;
  const b = document.getElementById('pbUnlock'); if (b) b.onclick = async () => { if (await ModAltas.pedirPassword()) alAbrir(); };
}
