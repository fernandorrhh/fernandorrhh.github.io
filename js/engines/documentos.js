/*
 * Motor de documentos — funciones puras.
 * Cada plantilla devuelve { asunto, cuerpo, faltan } a partir de los datos del formulario.
 * Los textos son los de Fernando (oferta, carta, solicitud de documentación, bienvenida)
 * más los redactados y validados en la definición (emergencias, aviso a PRL y Calidad).
 * Los datos que falten aparecen entre corchetes, p. ej. [Puesto], y se listan en "faltan".
 * Pruebas: tests/documentos.test.js
 */
(function (root) {
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  /* 28000 → "28.000 €" · 28000.5 → "28.000,50 €" (agrupa también los miles de 4 cifras). */
  function euros(n) {
    if (n === '' || n == null || Number.isNaN(Number(n))) return null;
    const v = Math.round(Number(n) * 100) / 100, ent = Math.trunc(v), dec = Math.round((v - ent) * 100);
    return String(ent).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (dec ? ',' + String(dec).padStart(2, '0') : '') + ' €';
  }
  /* "2026-10-26" → "26 de octubre de 2026" */
  const fechaLarga = f => { if (!f) return null; const [y, m, d] = f.split('-').map(Number); return `${d} de ${MESES[m - 1]} de ${y}`; };
  const saludoHora = hora => hora < 14 ? 'Buenos días' : 'Buenas tardes';
  const esFabrica = c => /f[aá]brica/i.test(c || '');

  function crear(datos, ctx) {
    const faltan = [];
    const v = (clave, etiqueta, valor = datos[clave]) => {
      const s = valor == null ? '' : String(valor).trim();
      if (!s) { if (!faltan.includes(etiqueta)) faltan.push(etiqueta); return `[${etiqueta}]`; }
      return s;
    };
    const e = ctx.empresa;
    const g = datos.tratamiento === 'a';                           // femenino
    const nombre = () => v('nombre', 'Nombre');
    const completo = () => v('nombre', 'Nombre', [datos.nombre, datos.apellidos].map(x => String(x || '').trim()).filter(Boolean).join(' '));
    const centroTxt = () => v('centro', 'Centro', e.centrosTexto[datos.centro] || datos.centro);
    return { v, faltan, e, g, nombre, completo, centroTxt };
  }

  const PLANTILLAS = [
    { id: 'oferta-correo', nombre: 'Correo de oferta', tipo: 'correo', pasoAlta: 'ofertaEnviada',
      campos: ['tratamiento', 'nombre', 'apellidos', 'centro', 'puesto', 'departamento', 'contrato', 'salario', 'jornada'],
      generar(d, ctx) {
        const { v, faltan, e, g, nombre, centroTxt } = crear(d, ctx);
        const cuerpo = `${g ? 'Estimada' : 'Estimado'} ${nombre()},

Me presento, soy ${e.firmante}, el responsable de Recursos Humanos de ${e.nombre}. Me pongo en contacto contigo para hacerte llegar una oferta de incorporación a nuestro equipo en el centro de ${centroTxt()}.

Las condiciones son las siguientes:

- Puesto: ${v('puesto', 'Puesto')}
- Contrato: ${v('contrato', 'Contrato')}
- Salario: ${v('salario', 'Salario', euros(d.salario) && euros(d.salario) + ' brutos anuales')}
- Jornada: ${v('jornada', 'Jornada')}

¿Podrías indicarnos cuál sería tu fecha de incorporación estimada? Así podemos avanzar con los trámites cuanto antes.

Quedo a tu disposición para cualquier duda.

Un saludo y enhorabuena,

${e.firmante}
${e.cargo}
${e.nombre}`;
        return { asunto: `Oferta de trabajo — ${v('puesto', 'Puesto')}`, cuerpo, faltan };
      } },

    { id: 'oferta-carta', nombre: 'Carta de oferta', tipo: 'documento', pasoAlta: 'ofertaEnviada',
      campos: ['tratamiento', 'nombre', 'apellidos', 'centro', 'puesto', 'departamento', 'contrato', 'salario', 'comercial'],
      generar(d, ctx) {
        const { v, faltan, e, g, nombre } = crear(d, ctx);
        const cab = `${g ? 'Estimada' : 'Estimado'} ${nombre()}:

Como continuación a nuestras recientes conversaciones, nos es grato confirmar por escrito el interés de nuestra empresa en contratar sus servicios profesionales para el puesto de ${v('puesto', 'Puesto')} en el departamento ${v('departamento', 'Departamento')} con fecha de incorporación a confirmar de su parte.`;
        let condiciones;
        if (d.comercial) {
          const l = [`- Salario base ${v('salario', 'Salario', euros(d.salario))}.${euros(d.noCompetencia) ? ` (La cláusula de no competencia son ${euros(d.noCompetencia).replace(' €', '')} euros año).` : ''}`];
          if (euros(d.bono)) l.push(`- Bono objetivos y permanencia de ${euros(d.bono)} anuales, según establecido por la empresa para el ejercicio ${ctx.anio}.`);
          if (d.comisiones) l.push('- Comisiones variables por cada operación de venta realizada calculadas según el estándar de la empresa.');
          if (euros(d.garantia)) l.push(`- La empresa garantiza que durante los primeros 12 meses de contrato el salario bruto total por todos los conceptos será de ${euros(d.garantia)}.`);
          condiciones = `Las condiciones de la contratación son las siguientes: contrato ${v('contrato', 'Contrato')} y una retribución anual bruta dividida en los siguientes conceptos:
${l.join('\n')}${String(d.beneficios || '').trim() ? `\nOtros beneficios según los existentes en cada momento. Actualmente ${String(d.beneficios).trim().replace(/\.$/, '')}.` : ''}`;
        } else {
          condiciones = `Las condiciones de la contratación son las siguientes: contrato ${v('contrato', 'Contrato')} y una retribución anual bruta de ${v('salario', 'Salario', euros(d.salario))}.`;
        }
        const cuerpo = `${cab}
${condiciones}
Quedamos a su disposición para cualquier aclaración o ampliación que requiera previa a la aceptación.
Validez de oferta ${String(e.validezOfertaDias).padStart(2, '0')} días.
Cordialmente,`;
        return { asunto: null, cuerpo, faltan };
      } },

    { id: 'documentacion', nombre: 'Solicitud de documentación', tipo: 'correo', pasoAlta: null,
      campos: ['nombre', 'centro'],
      generar(d, ctx) {
        const { v, faltan, e, nombre } = crear(d, ctx);
        v('centro', 'Centro');
        const tallas = esFabrica(d.centro) ? `
Y el tallaje de ropa:
- Talla de pie
- Talla de ropa (S - M - L - XL)
- Talla de pantalón (38-40 / 40-42 / 42-44 / 44-46, etc.)
` : '';
        const cuerpo = `${saludoHora(ctx.hora)} ${nombre()},

Un placer que te unas al equipo. Cualquier duda o necesidad que tengas, no dudes en contactarme por email o llamarme al teléfono que aparece en mi firma.

Para continuar con el proceso de incorporación necesito que me facilites la siguiente documentación para preparar tu contrato:

- DNI/NIE por ambas caras (si tu domicilio actual no es el que figura en el DNI/NIE, también necesito tu dirección completa actual)
- Número de la Seguridad Social (necesito un documento oficial donde aparezca el número)
- Certificado de titularidad bancaria de la cuenta donde quieres que te transfiramos la nómina
- Modelo 145 relleno y firmado (enlace de descarga: ${e.enlaceModelo145})
- Título de Graduado

También debes rellenar y enviarme:
- Formulario de datos personales
${tallas}
Cualquier duda que tengas en el proceso, estoy a tu completa disposición.

Un saludo,
${e.firmante}`;
        return { asunto: `Documentación para tu incorporación — ${e.nombre}`, cuerpo, faltan };
      } },

    { id: 'bienvenida', nombre: 'Bienvenida + Plan de Igualdad', tipo: 'correo', pasoAlta: 'bienvenida',
      campos: ['nombre'],
      adjuntos: ['Guía de medidas de conciliación', 'Guía de ayuda y protección a víctimas de violencia de género', 'Plan de Igualdad (con el Anexo I)'],
      generar(d, ctx) {
        const { faltan, e, nombre } = crear(d, ctx), p = ctx.planIgualdad;
        const cuerpo = `${saludoHora(ctx.hora)} ${nombre()},

¡Te damos la bienvenida!

Adjuntamos dos documentos de interés:

- Guía de medidas de conciliación personal, familiar y laboral, elaborada por ${e.nombreMayusculas} conforme a la normativa laboral, el Convenio Colectivo y el Plan de Igualdad.
- Guía de ayuda y protección a víctimas de violencia de género, orientada a garantizar sus derechos de protección y asistencia.

Te recomendamos revisar ambos documentos con detenimiento; quedamos a tu disposición para cualquier consulta.

Adjuntamos también el Plan de Igualdad, aprobado el ${fechaLarga(p.aprobado)} tras el acuerdo entre la dirección de la empresa y la representación de ${p.firmantes}, e inscrito y registrado por el ${p.registro} en esa misma fecha. Estará vigente hasta el ${fechaLarga(p.vigenteHasta)} e incluye medidas en materia de acceso al empleo, formación, promoción, retribución, conciliación, violencia de género, prevención del acoso y comunicación no sexista, entre otras. Su Anexo I recoge el Protocolo global de prevención del acoso y la discriminación en el ámbito laboral.

Durante su vigencia, te iremos informando sobre la implantación de las medidas pactadas.

Cualquier duda, aquí estamos. ¡Gracias!

Un saludo,
${e.firmaCorta}`;
        return { asunto: `Te damos la bienvenida a ${e.nombre}`, cuerpo, faltan };
      } },

    { id: 'emergencias', nombre: 'Plan de Emergencias', tipo: 'correo', pasoAlta: 'emergencias',
      campos: ['nombre', 'centro'],
      adjuntos: ['Plan de Emergencias y Autoprotección del centro'],
      generar(d, ctx) {
        const { faltan, e, nombre, centroTxt } = crear(d, ctx);
        const c = centroTxt();
        const cuerpo = `Hola ${nombre()},

Te adjunto el Plan de Emergencias y Autoprotección del centro de ${c}. Recoge las vías de evacuación, los puntos de encuentro, las actuaciones ante cada tipo de emergencia y los teléfonos de contacto.

Te pido que lo revises con atención durante tu primera semana.

Un saludo,
${e.firmaCorta}`;
        return { asunto: `Plan de Emergencias — ${c}`, cuerpo, faltan };
      } },

    { id: 'prl-calidad', nombre: 'Aviso a PRL y Calidad', tipo: 'correo', pasoAlta: 'prlCalidad', soloFabrica: true,
      campos: ['tratamiento', 'nombre', 'apellidos', 'puesto', 'fechaIncorporacion', 'tallaPie', 'tallaRopa', 'tallaPantalon'],
      generar(d, ctx) {
        const { v, faltan, e, g, completo } = crear(d, ctx), nombre = completo;
        const fecha = v('fechaIncorporacion', 'Fecha de incorporación', fechaLarga(d.fechaIncorporacion));
        const cuerpo = `Hola,

Os informo de que el ${fecha} se incorpora ${nombre()} como ${v('puesto', 'Puesto')} en el centro de ${e.centrosTexto['Fábrica (Talavera)'] || 'Talavera de la Reina'}.

Tallas para el uniforme y los EPI:
- Pie: ${v('tallaPie', 'Talla de pie')}
- Ropa: ${v('tallaRopa', 'Talla de ropa')}
- Pantalón: ${v('tallaPantalon', 'Talla de pantalón')}

Ya está ${g ? 'dada' : 'dado'} de alta en Vitaly para programar el reconocimiento médico. Por favor, preparad la formación inicial en PRL y en calidad y seguridad alimentaria para su primer día.

Un saludo,
${e.firmaCorta}`;
        return { asunto: `Nueva incorporación en fábrica — ${nombre()} — ${fecha}`, cuerpo, faltan };
      } }
  ];

  function generar(id, datos, ctx) {
    const p = PLANTILLAS.find(x => x.id === id); if (!p) throw new Error('Plantilla desconocida: ' + id);
    const r = p.generar(datos, ctx);
    return { ...r, cuerpo: r.cuerpo.replace(/\n{3,}/g, '\n\n') };
  }

  /* Versión HTML (para pegar con formato en Word u Outlook): párrafos y listas. */
  function aHtml(texto) {
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const lineas = texto.split('\n'), out = []; let lista = null;
    for (const l of lineas) {
      if (/^- /.test(l)) { if (!lista) { lista = []; } lista.push(`<li>${esc(l.slice(2))}</li>`); continue; }
      if (lista) { out.push(`<ul>${lista.join('')}</ul>`); lista = null; }
      out.push(l.trim() ? `<p>${esc(l)}</p>` : '');
    }
    if (lista) out.push(`<ul>${lista.join('')}</ul>`);
    return `<div style="font-family:Calibri,Arial,sans-serif;font-size:11pt">${out.filter(Boolean).join('')}</div>`;
  }

  /* Enlace para abrir el correo en el programa de correo (Outlook…). */
  const mailto = (asunto, cuerpo, para = '') => `mailto:${encodeURIComponent(para)}?subject=${encodeURIComponent(asunto || '')}&body=${encodeURIComponent(cuerpo)}`;

  const api = { PLANTILLAS, generar, aHtml, mailto, euros, fechaLarga, saludoHora };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MotorDocumentos = api;
})(typeof window !== 'undefined' ? window : globalThis);
