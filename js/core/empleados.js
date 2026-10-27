/*
 * Base de empleados cifrada con contraseña.
 * - Cifrado AES-GCM 256 con clave derivada de la contraseña (PBKDF2-SHA-256, 310.000 iteraciones, sal aleatoria).
 * - La contraseña no se guarda en ningún sitio: si se olvida, los datos no se pueden recuperar.
 * - Lo guardado (y lo que va a las copias de seguridad) es siempre el bloque cifrado.
 * - Se bloquea sola tras 15 minutos sin actividad.
 */
const Empleados = (() => {
  const CLAVE = 'empleadosCifrado', ITER = 310000, INACTIVIDAD = 15 * 60 * 1000;
  let clave = null, sal = null, lista = [], tBloqueo = null;
  const oyentes = new Set();
  const avisar = () => oyentes.forEach(fn => fn());
  const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const deB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const disponible = () => !!(window.crypto && crypto.subtle);

  async function derivar(password, salt) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function cifrar(datos) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, clave, new TextEncoder().encode(JSON.stringify(datos)));
    return { v: 1, kdf: 'PBKDF2-SHA256', iter: ITER, sal: b64(sal), iv: b64(iv), datos: b64(ct) };
  }
  let guardando = false;
  async function guardar() { const c = await cifrar(lista); guardando = true; Datos.set(CLAVE, c); guardando = false; avisar(); }
  /* Otros bloques cifrados con la misma contraseña (p. ej. trabajadores de empresas externas, CAE). */
  const EXTRAS = new Set(), extras = new Map();
  const registrarExtra = nombre => EXTRAS.add(nombre);
  async function abrirExtra(nombre, k) {
    const b = Datos.get(nombre); if (!b) return;
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(b.iv) }, k, deB64(b.datos));
    extras.set(nombre, JSON.parse(new TextDecoder().decode(pt)));
  }
  async function guardarExtra(nombre, datos) {
    if (!clave) throw new Error('La base de empleados está bloqueada');
    extras.set(nombre, structuredClone(datos)); const c = await cifrar(datos);
    guardando = true; Datos.set(nombre, c); guardando = false; avisar();
  }
  const extra = (nombre, defecto) => structuredClone(extras.has(nombre) ? extras.get(nombre) : defecto);
  /* Si un bloque cifrado cambia desde fuera (p. ej. al importar una copia), se vuelve a bloquear para releerlo. */
  Datos.on(k => { if ((k === CLAVE || EXTRAS.has(k)) && !guardando && clave) bloquear(); });
  function programarBloqueo() { clearTimeout(tBloqueo); if (clave) tBloqueo = setTimeout(() => { bloquear(); toast('Empleados bloqueados por inactividad'); }, INACTIVIDAD); }
  ['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, () => { if (clave) programarBloqueo(); }, { passive: true }));

  const configurado = () => !!Datos.get(CLAVE);
  async function crear(password) {
    if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');
    sal = crypto.getRandomValues(new Uint8Array(16)); clave = await derivar(password, sal); lista = [];
    await guardar(); programarBloqueo();
  }
  async function desbloquear(password) {
    const b = Datos.get(CLAVE); if (!b) return false;
    try {
      const s = deB64(b.sal), k = await derivar(password, s);
      const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(b.iv) }, k, deB64(b.datos));
      lista = JSON.parse(new TextDecoder().decode(pt)).map(limpiar);
      extras.clear(); for (const n of EXTRAS) await abrirExtra(n, k);
      clave = k; sal = s;
      programarBloqueo(); avisar(); return true;
    } catch (e) { return false; }
  }
  function bloquear() { clave = null; lista = []; extras.clear(); clearTimeout(tBloqueo); avisar(); }
  async function cambiarPassword(actual, nueva) {
    if (!(await desbloquear(actual))) throw new Error('La contraseña actual no es correcta');
    if (nueva.length < 8) throw new Error('La nueva contraseña debe tener al menos 8 caracteres');
    sal = crypto.getRandomValues(new Uint8Array(16)); clave = await derivar(nueva, sal); await guardar();
    for (const [n, d] of extras) await guardarExtra(n, d);   // los bloques extra, con la clave nueva
  }

  const nuevoId = () => Date.now() + Math.random();
  /* Fichas antiguas con "nombre" completo se separan en nombre y apellidos; nombreCompleto no se guarda. */
  const limpiar = e => { const n = MotorEmpleados.normalizar(e); delete n.nombreCompleto; return n; };
  async function crearEmpleado(e) { const n = limpiar({ ...e, id: nuevoId(), vacaciones: e.vacaciones || {} }); lista.push(n); await guardar(); return MotorEmpleados.normalizar(n); }
  async function editarEmpleado(id, cambios) { const e = lista.find(x => x.id === id); if (e) { Object.assign(e, cambios); delete e.nombreCompleto; await guardar(); } return e && MotorEmpleados.normalizar(e); }
  async function eliminarEmpleado(id) { const i = lista.findIndex(x => x.id === id); if (i < 0) return null; const [e] = lista.splice(i, 1); await guardar(); return e; }
  async function restaurar(e) { lista.push(e); await guardar(); }
  /* Aplica varias actualizaciones de una vez (importación de CSV con códigos existentes). */
  async function actualizarVarios(lst) { lst.forEach(({ id, cambios }) => { const e = lista.find(x => x.id === id); if (e) Object.assign(e, cambios); }); await guardar(); return lst.length; }
  async function importar(nuevos) { nuevos.forEach(e => lista.push(limpiar({ ...e, id: nuevoId(), vacaciones: e.vacaciones || {} }))); await guardar(); return nuevos.length; }

  return {
    disponible, configurado, crear, desbloquear, bloquear, cambiarPassword,
    get desbloqueado() { return !!clave; },
    todos: () => lista.map(e => MotorEmpleados.normalizar(structuredClone(e))),
    buscar: id => { const e = lista.find(x => x.id === id); return e ? MotorEmpleados.normalizar(structuredClone(e)) : null; },
    crearEmpleado, editarEmpleado, eliminarEmpleado, restaurar, importar, actualizarVarios,
    registrarExtra, extra, guardarExtra,
    on: fn => (oyentes.add(fn), () => oyentes.delete(fn))
  };
})();

/* Ventana modal genérica (se crea y se elimina al cerrarse). */
function abrirModal(html, { ancho = 560, alCerrar } = {}) {
  const d = document.createElement('dialog');
  d.className = 'modal'; d.style.maxWidth = `min(${ancho}px, calc(100vw - 32px))`;
  d.innerHTML = `<div class="dlg">${html}</div>`;
  document.body.append(d);
  d.addEventListener('close', () => { alCerrar?.(d.returnValue, d); d.remove(); });
  d.addEventListener('click', e => { if (e.target === d) d.close('cancel'); });
  d.showModal();
  return d;
}
