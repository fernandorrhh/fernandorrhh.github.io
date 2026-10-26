/* ---------------------------------------------------------------
   PRECIOS — única fuente.
   Para cambiar una tarifa, se toca aquí y se actualiza en todas las
   páginas (portada y servicios). Formato: [precio social, precio estándar],
   en euros y sin IVA.
   El texto que hay en el HTML es solo respaldo por si este archivo no carga.
   --------------------------------------------------------------- */
window.PRECIOS = {
  cv:              [12, 20],  // Revisión de CV
  entrevista:      [18, 30],  // Simulación de entrevista
  packCvEntrevista:[25, 40],  // Pack CV + entrevista
  documentos:      [15, 25],  // Nómina, contrato o convenio
  despidos:        [22, 40],  // Despidos y conflictos
  tramiteSencillo: [8, 12],   // Trámites sencillos
  tramiteCarga:    [15, 25]   // Trámites con más carga
};

(function () {
  var P = window.PRECIOS;
  var nodos = document.querySelectorAll('[data-precio]');
  for (var i = 0; i < nodos.length; i++) {
    var el = nodos[i], p = P[el.getAttribute('data-precio')];
    if (!p) continue;
    // En servicios el estándar va en un <span class="std"> aparte
    var std = el.querySelector('.std');
    if (std) {
      el.firstChild.nodeValue = p[0] + ' € ';
      std.textContent = '/ ' + p[1] + ' €';
    } else {
      el.textContent = p[0] + ' € / ' + p[1] + ' €';
    }
  }
})();
