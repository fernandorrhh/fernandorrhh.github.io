/* ===========================================================================
   Opiniones — conexión con el formulario y la hoja de Google de Fernando
   Mientras esto esté vacío, la página para opinar avisa de que no está activa
   y los bloques de opiniones de la web no se muestran.
   =========================================================================== */
window.RRHH_OPINIONES = {
  /* Dirección de envío del formulario de Google: termina en /formResponse */
  formulario: '',

  /* Identificadores de cada pregunta del formulario (entry.123456789) */
  campos: {
    nombre: '',
    servicio: '',
    puntuacion: '',
    opinion: '',
    consentimiento: ''
  },

  /* Enlace CSV de la pestaña «Publicadas» de la hoja (Archivo › Compartir › Publicar en la web) */
  hoja: ''
};
