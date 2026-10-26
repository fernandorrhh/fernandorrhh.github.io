/*
 * PARÁMETROS LEGALES DE LA WEB — archivo único.
 * Los motores (motor/*.js) vienen de la plataforma interna (repo Plataforma-RRHHSimple,
 * commit 4717e36, 26/10/2026). Aquí solo van los parámetros de ámbito general (Estatuto de
 * los Trabajadores), no los de un convenio concreto.
 * Para actualizar: cambia el valor, la fuente y la fecha de verificación.
 */
window.RRHH_WEB_PARAMS = {
  vigencia: 'octubre de 2026',

  // Copiado de la plataforma (params.js → indemnizacion). Verificado 21/10/2026.
  indemnizacion: {
    reforma2012: '2012-02-12',       // DT 11.ª ET: servicios anteriores, 45 días/año
    tipos: {
      improcedente: { nombre: 'Despido improcedente', dias: 33, topeMensualidades: 24, art: 'ET, art. 56.1 y DT 11.ª' },
      objetivo:     { nombre: 'Despido objetivo o colectivo (ERE)', dias: 20, topeMensualidades: 12, art: 'ET, arts. 51.4 y 53.1.b' },
      temporal:     { nombre: 'Fin de contrato temporal', dias: 12, topeMensualidades: null, art: 'ET, art. 49.1.c' },
      modificacion: { nombre: 'Extinción por modificación sustancial', dias: 20, topeMensualidades: 9, art: 'ET, art. 41.3' },
      traslado:     { nombre: 'Extinción por traslado', dias: 20, topeMensualidades: 12, art: 'ET, art. 40.1' }
    },
    anterior2012: { dias: 45, topeDias: 720, topeMensualidades: 42 },
    verificado: '2026-10-21'
  },

  // Vacaciones: mínimo legal de 30 días naturales (ET art. 38.1); muchos convenios lo
  // expresan como 22 días laborables. La persona elige en la calculadora.
  vacaciones: {
    opciones: [
      { id: 'laborables', dias: 22, texto: '22 días laborables (lo más habitual en convenios)' },
      { id: 'naturales',  dias: 30, texto: '30 días naturales (mínimo del Estatuto)' }
    ],
    redondeo: 'al alza',             // criterio habitual; algunos convenios redondean de otra forma
    fuente: 'ET, art. 38',
    verificado: '2026-10-26'
  },

  // Finiquito: pagas extra. Mínimo legal: dos al año (ET art. 31); el convenio fija su
  // importe, su devengo y si se prorratean. La web asume devengo semestral (junio y diciembre).
  finiquito: {
    pagas: [
      { id: '14', texto: '14 pagas (2 extra, en junio y diciembre)', numero: 2, prorrateadas: 0,
        noProrrateadas: [{ nombre: 'Paga de junio' }, { nombre: 'Paga de diciembre' }] },
      { id: '12', texto: '12 pagas (las extra prorrateadas en cada nómina)', numero: 2, prorrateadas: 2, noProrrateadas: [] }
    ],
    fuente: 'ET, arts. 26, 29, 31, 38.1 y 49.2',
    verificado: '2026-10-26'
  }
};
