/*
 * Motor de permisos — funciones puras.
 * Compara convenio (art. 14) y ET (art. 37) para cada permiso y aplica el más favorable.
 * Reducción de jornada por guarda legal (ET 37.6 · convenio 14.1.h): entre 1/8 y 1/2, salario proporcional.
 * Pruebas: tests/calculadoras.test.js
 */
(function (root) {
  const r2 = x => Math.round(x * 100) / 100;

  /* o: { desplazamiento:boolean, lejos:boolean } */
  function calcular(def, o = {}) {
    if (!def) return null;
    const val = f => f && typeof f.dias === 'number' ? f.dias + (o.desplazamiento && f.desplaz ? f.desplaz : 0) + (o.lejos && f.lejos ? f.lejos : 0) : null;
    const et = val(def.et), conv = val(def.conv);
    let aplica, dias;
    if (et === null && conv === null) { aplica = def.conv ? (def.et ? 'ambos' : 'convenio') : 'et'; dias = null; }
    else if (et === null) { aplica = 'convenio'; dias = conv; }
    else if (conv === null) { aplica = 'et'; dias = et; }
    else if (conv > et) { aplica = 'convenio'; dias = conv; }
    else if (et > conv) { aplica = 'et'; dias = et; }
    else { aplica = 'igual'; dias = et; }
    return { id: def.id, dias, unidad: def.unidad, aplica, et: def.et ? { ...def.et, total: et } : null, conv: def.conv ? { ...def.conv, total: conv } : null, nota: def.nota || '' };
  }

  /**
   * Reducción de jornada. horasSemana: jornada actual · salarioAnual · fraccion (0,125 a 0,5) o horasReduccion.
   */
  function reduccion({ horasSemana = 40, salarioAnual = 0, fraccion = 0.125 }, cfg = { min: 1 / 8, max: 1 / 2 }) {
    const h = Number(horasSemana), s = Number(salarioAnual), f = Number(fraccion);
    if (!(h > 0)) return null;
    const fueraDeRango = f < cfg.min - 1e-9 || f > cfg.max + 1e-9;
    const nuevas = h * (1 - f);
    return {
      fraccion: f, porcentaje: r2(f * 100), fueraDeRango,
      horasSemana: r2(nuevas), horasMenos: r2(h * f),
      horasDia: r2(nuevas / 5), horasDiaAntes: r2(h / 5),
      salarioAnual: s > 0 ? r2(s * (1 - f)) : null, salarioMenos: s > 0 ? r2(s * f) : null
    };
  }

  const api = { calcular, reduccion };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MotorPermisos = api;
})(typeof window !== 'undefined' ? window : globalThis);
