/*
 * Motor de altas — funciones puras.
 * Checklist por fases (basado en el Excel "Seguimiento Altas RRHH"), adaptado al centro:
 * los pasos marcados con soloFabrica solo aparecen para Fábrica (Talavera).
 * Pruebas: tests/altas.test.js
 */
(function (root) {
  const DAY = 86400000;
  const FASES = [
    { id: 'oferta', nombre: 'Selección y oferta', pasos: [
      { id: 'ofertaEnviada', nombre: 'Carta de oferta enviada' },
      { id: 'ofertaAceptada', nombre: 'Oferta aceptada por escrito' }] },
    { id: 'docs', nombre: 'Documentación del empleado', pasos: [
      { id: 'dni', nombre: 'DNI/NIE (ambas caras)' },
      { id: 'nss', nombre: 'Nº Seguridad Social (documento oficial)' },
      { id: 'banco', nombre: 'Certificado bancario' },
      { id: 'm145', nombre: 'Modelo 145 firmado' },
      { id: 'titulo', nombre: 'Título de graduado' },
      { id: 'contacto', nombre: 'Teléfono y email' },
      { id: 'cv', nombre: 'Currículum' },
      { id: 'talla', nombre: 'Talla de uniforme', soloFabrica: true }] },
    { id: 'gestoria', nombre: 'Gestoría', pasos: [
      { id: 'formGestoria', nombre: 'Formulario enviado a la gestoría' },
      { id: 'contratoRecibido', nombre: 'Contrato recibido' },
      { id: 'altaSS', nombre: 'Alta en Seguridad Social confirmada' }] },
    { id: 'firma', nombre: 'Firma de documentos', pasos: [
      { id: 'contratoFirmado', nombre: 'Contrato firmado' },
      { id: 'copiaBasica', nombre: 'Copia básica del contrato' },
      { id: 'polMedios', nombre: 'Política de medios informáticos' },
      { id: 'polConfid', nombre: 'Política de confidencialidad' },
      { id: 'camaras', nombre: 'Notificación de cámaras' },
      { id: 'correoPersonal', nombre: 'Autorización de correo personal', soloFabrica: true }] },
    { id: 'sistemas', nombre: 'Sistemas internos', pasos: [
      { id: 'navision', nombre: 'Alta en Navision' },
      { id: 'vitaly', nombre: 'Alta en Vitaly (PRL)' },
      { id: 'bbdd', nombre: 'Base de datos de RRHH' }] },
    { id: 'comunicaciones', nombre: 'Comunicaciones', pasos: [
      { id: 'bienvenida', nombre: 'Correo de bienvenida + Plan de Igualdad' },
      { id: 'emergencias', nombre: 'Correo del Plan de Emergencias' },
      { id: 'prlCalidad', nombre: 'Aviso a PRL y Calidad (tallas)', soloFabrica: true }] }
  ];
  const esFabrica = centro => /f[aá]brica/i.test(centro || '');

  /* Fases con los pasos que aplican a ese centro. */
  const fasesDe = centro => FASES.map(f => ({ ...f, pasos: f.pasos.filter(p => !p.soloFabrica || esFabrica(centro)) }));
  const pasosDe = centro => fasesDe(centro).flatMap(f => f.pasos);

  function progreso(alta) {
    const pasos = pasosDe(alta.centro), hechos = pasos.filter(p => alta.check?.[p.id]).length;
    return { hechos, total: pasos.length, pct: pasos.length ? hechos / pasos.length : 0 };
  }
  /* Estado como en el Excel, más "Bloqueado" automático si hay un bloqueante escrito. */
  function estado(alta) {
    if (alta.cerrada) return 'cerrada';
    const { pct } = progreso(alta);
    if (alta.bloqueante && alta.bloqueante.trim()) return 'bloqueada';
    if (pct === 1) return 'completada';
    if (pct === 0) return 'sin-iniciar';
    return pct < 0.5 ? 'pendiente-docs' : 'en-proceso';
  }
  const docsPendientes = alta => fasesDe(alta.centro).find(f => f.id === 'docs').pasos.filter(p => !alta.check?.[p.id]);
  /* Días desde que se envió la oferta (no desde la incorporación: corrige el Excel). */
  function diasDesdeOferta(alta, hoy) {
    if (!alta.fechaOferta) return null;
    const p = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
    return Math.round((p(hoy) - p(alta.fechaOferta)) / DAY);
  }

  const api = { FASES, esFabrica, fasesDe, pasosDe, progreso, estado, docsPendientes, diasDesdeOferta };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MotorAltas = api;
})(typeof window !== 'undefined' ? window : globalThis);
