/* ---------------------------------------------------------------
   PRECIOS — única fuente.
   Para cambiar una tarifa, se toca aquí y se actualiza en todas las
   páginas. Un precio final por servicio, en euros y con IVA incluido
   (particulares). El texto del HTML es solo respaldo si este archivo no carga.
   --------------------------------------------------------------- */
window.PRECIOS = {
  cv:               30,  // Revisión de CV
  entrevista:       40,  // Simulación de entrevista
  packCvEntrevista: 60,  // Pack CV + entrevista
  documentos:       35,  // Nómina, contrato o convenio
  despidos:         60,  // Despidos y conflictos
  tramiteSencillo:  20,  // Trámites sencillos
  tramiteCarga:     40   // Trámites con más carga
};

(function () {
  var P = window.PRECIOS;
  var nodos = document.querySelectorAll('[data-precio]');
  for (var i = 0; i < nodos.length; i++) {
    var p = P[nodos[i].getAttribute('data-precio')];
    if (p) nodos[i].textContent = p + ' €';
  }
})();
