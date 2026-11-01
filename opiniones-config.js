/* ===========================================================================
   Opiniones — conexión con el formulario y la hoja de Google de Fernando
   Mientras esto esté vacío, la página para opinar avisa de que no está activa
   y los bloques de opiniones de la web no se muestran.
   =========================================================================== */
window.RRHH_OPINIONES = {
  /* Dirección de envío del formulario de Google: termina en /formResponse */
  formulario: 'https://docs.google.com/forms/d/e/1FAIpQLSfY4Xnqv1306bymd2skw8nm2fupHO7hHeNbukJmW-ReVpdJzw/formResponse',

  /* Identificadores de cada pregunta del formulario (entry.123456789) */
  campos: {
    nombre: 'entry.173312597',
    servicio: 'entry.479538320',
    puntuacion: 'entry.1746397201',
    opinion: 'entry.1177447972',
    consentimiento: 'entry.1892288707'
  },

  /* Enlace CSV de la pestaña «Publicadas» de la hoja (Archivo › Compartir › Publicar en la web) */
  hoja: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS5S1VP0r9aVP4B-OBOBlG4nMnWYagh8TkcmjBXhReRopkXiSJ3xewjMqm3Bwh0Yv6GcuG-JtvCSV02/pub?gid=1325156940&single=true&output=csv'
};
