/*
 * Ficus, el asistente. Personaje original (planta de oficina).
 * Estados: idle · wave (saludo) · think (consejo) · yay (celebración).
 * Pulsar: consejo de la pantalla actual. Doble clic: minimizar. Se puede silenciar.
 */
const Ficus = (() => {
  const el = $('#ficus'), bubble = $('#bubble'), msg = $('#fMsg');
  let st = { mini: false, mute: false }, hideT, stateT, idx = 0, ruta = 'inicio';

  const CONSEJOS = {
    inicio: [
      'Pulsa <b>Ctrl + K</b> y escribe lo que buscas: herramientas o acciones.',
      '¿Panel demasiado lleno? Pulsa <b>Personalizar</b> y quédate solo con lo que usas.',
      'El botón amarillo <b>+</b> apunta una tarea en dos segundos, estés donde estés.',
      'Llevo años en esta oficina. He visto pasar tres convenios y ningún riego en agosto.',
      'Curiosidad: el registro de jornada es obligatorio desde el primer día. Yo registro el mío: 24 horas haciendo la fotosíntesis.'
    ],
    documentos: [
      'Lo que aparece en <mark>amarillo</mark> son datos que faltan. Rellénalos antes de enviar, que luego no hay quien lo arregle.',
      '<b>Copiar con formato</b> mantiene los párrafos y las listas al pegar en Outlook o Word.',
      'Si eliges un alta en curso, relleno los datos por ti y puedo marcar el paso en su checklist.',
      'Aquí nada se guarda: cierras la pantalla y los datos se van. Discreción de planta de interior.'
    ],
    reclutamiento: [
      'Anota cuántas mujeres y hombres se presentan y se entrevistan: es justo lo que pide el plan de igualdad.',
      'Cuando elijas a alguien, pulsa “Crear alta” y la abro ya rellenada.',
      'Si una vacante se queda sin cubrir, ciérrala como “desierta”: también cuenta.'
    ],
    pruebas: [
      'Producción, mantenimiento y administración: máximo 2 meses de prueba por convenio. Técnicos titulados y comerciales, 6.',
      'La decisión de no superar la prueba hay que comunicarla antes de que termine. Por eso aviso 7 días antes.',
      'Si alguien no supera la prueba, te ofrezco abrir su salida directamente.'
    ],
    promociones: [
      'Una subida de salario también es un dato de igualdad: regístrala aquí y actualizo la ficha.',
      'El informe de Promociones calcula la subida media de mujeres y de hombres.'
    ],
    nominas: [
      'Las bajas, permisos y altas del mes aparecen solas. Tú solo añades guardias, horas extra o diferencias.',
      '“Copiar con formato” y lo pegas en Outlook con negritas y listas, como siempre.',
      'Cuando lo envíes, márcalo como comunicado y así sabrás qué meses están cerrados.'
    ],
    salidas: [
      'La copia de la liquidación, 2 días antes de la baja. Lo dice el convenio (art. 29.2).',
      'Desde agosto de 2026 hay 6 días naturales para dar la baja en la Seguridad Social.',
      'Pulsa “Calcular finiquito” y te lo llevo todo relleno.'
    ],
    informes: [
      'Todos los informes separan mujeres y hombres. Si ves “Sin indicar”, completa el sexo en la ficha.',
      'Para el PDF, pulsa “Imprimir / PDF” y elige “Guardar como PDF”.',
      'El Excel trae dos hojas: el resumen con porcentajes y el detalle nominal.'
    ],
    ausencias: [
      'Aquí nunca va el diagnóstico: solo el tipo y las fechas. Lo que no se guarda no se puede filtrar.',
      'Pon el último día previsto y te creo una tarea 5 días antes de la vuelta.',
      'Si alguien ya ha vuelto, ábrelo y pulsa “Vuelve hoy”. Así no se queda en “sin confirmar”.',
      'Las excedencias no generan vacaciones: ya lo resto yo en la calculadora.'
    ],
    salarios: [
      'Mueve la barra de jornada y verás el salario a tiempo parcial al momento.',
      'Algunos puestos tienen categorías alternativas: depende de las funciones reales, no del nombre del puesto.',
      'La prima de asistencia va aparte: se cobra por día efectivamente trabajado.'
    ],
    permisos: [
      'Aquí siempre gana lo más favorable: si el convenio da más que el Estatuto, se aplica el convenio. Y al revés.',
      'Marca “Necesita desplazamiento” y verás cómo cambia el cálculo.',
      'Desde 2023, el permiso por hospitalización de un familiar son 5 días. Yo me tomaría 5 para regarme.'
    ],
    nacimiento: [
      'Son 19 semanas por progenitor desde agosto de 2025. Las 2 últimas, hasta que el menor cumpla 8 años.',
      'La lactancia acumulada son 14 días laborables por convenio, a continuación del permiso.',
      'El permiso parental de 8 semanas es otra cosa: no retribuido y hasta los 8 años.'
    ],
    indemnizacion: [
      'La fracción de mes cuenta como mes completo. Sí, aunque sea un día.',
      'Pulsa una fila de la comparativa para cambiar de tipo de extinción.',
      'Si hay antigüedad anterior a febrero de 2012, verás dos tramos: 45 y 33 días.'
    ],
    finiquito: [
      'Elige un empleado y relleno fechas, salario y vacaciones disfrutadas.',
      'En la baja voluntaria compruebo el preaviso según su categoría.',
      'Recuerda: copia de la liquidación 2 días antes de la baja (convenio art. 29).'
    ],
    vacaciones: [
      'La IT cuenta como tiempo trabajado: aunque estés de baja, las vacaciones se siguen generando.',
      'Aquí se redondea siempre al alza: 17,66 días son 18. Generosidad vegetal.',
      'Si alguien ha disfrutado más días de los generados y se va, la diferencia se descuenta en el finiquito.',
      'Las vacaciones no disfrutadas por IT pueden usarse hasta 18 meses después del final de su año.'
    ],
    empleados: [
      'La base de empleados está cifrada: sin tu contraseña, ni yo puedo leerla. Y mira que lo intento.',
      'Puedes importar a toda la plantilla de golpe con un CSV. Descarga la plantilla abajo.',
      'Se bloquea sola tras 15 minutos sin actividad. Si sales a por café, tranquilo.',
      'Desde la ficha de una persona puedes ir directamente a calcular sus vacaciones.'
    ],
    altas: [
      'Si escribes algo en “Bloqueante”, el alta se marca en rojo para que no se te olvide.',
      'Mientras falten documentos, te mantengo una tarea automática con el número exacto.',
      'Al cerrar el alta, su ficha de empleado se crea con los datos que ya tienes.',
      'En fábrica aparecen tres pasos más: talla de uniforme, correo personal y aviso a PRL y Calidad.'
    ],
    tareas: [
      'Las tareas que se repiten crean la siguiente al completarlas. Ideal para el TC de cada mes.',
      'Pulsa el calendario de una tarea para descargarla y añadirla a Outlook: así te avisa aunque cierres la plataforma.',
      '¿Te has equivocado al borrar? Tienes unos segundos para pulsar “Deshacer”.',
      'Pulsa el título de una tarea para editarla y añadirle una nota.'
    ],
    calendario: [
      'Activa Madrid, Talavera o Valencia arriba: se suman los festivos de la comunidad y de la ciudad.',
      'Pulsa un día para ver sus festivos y tareas, o para crear una tarea justo ese día.',
      'Los festivos de empresa se guardan por año. Nochebuena y Nochevieja, por ejemplo.',
      'Recuerda: este calendario es informativo. Las calculadoras no lo usan para contar días.'
    ],
    ajustes: [
      'Vincula un archivo de copia y guardaré cada cambio automáticamente. Si está en OneDrive, mejor aún.',
      'Si cambias de ordenador, exporta una copia y la importas en el nuevo. Así de fácil.'
    ],
    _: ['Esta sección ya está definida y llegará en una próxima fase. Mientras, yo sigo creciendo.']
  };

  const guardar = () => Datos.set('_ficus', st);
  function aplicar() { el.classList.toggle('mini', st.mini); $('#fMute').textContent = st.mute ? 'Activar avisos' : 'Silenciar'; }
  function estado(s, ms = 1900) { clearTimeout(stateT); el.dataset.s = s; if (s !== 'idle') stateT = setTimeout(() => el.dataset.s = 'idle', ms); }
  function mostrar(html, s = 'idle') {
    if (st.mini) return;
    msg.innerHTML = html; bubble.classList.remove('hide'); estado(s);
    clearTimeout(hideT); hideT = setTimeout(() => bubble.classList.add('hide'), 9000);
  }
  function consejo() { const l = CONSEJOS[ruta] || CONSEJOS._; mostrar(l[idx++ % l.length], 'think'); }

  function init() {
    st = Datos.get('_ficus', st);
    $('#plant').onclick = () => {
      if (st.mini) { st.mini = false; guardar(); aplicar(); mostrar('¡He vuelto! ¿Te cuento algo?', 'wave'); return; }
      bubble.classList.contains('hide') ? consejo() : bubble.classList.add('hide');
    };
    $('#plant').ondblclick = () => minimizar(true);
    $('#fNext').onclick = consejo;
    $('#fClose').onclick = () => bubble.classList.add('hide');
    $('#fMute').onclick = () => silenciar(!st.mute, true);
    // Mirada que sigue al puntero: decorativa, suavizada, solo con ratón y sin "reducir movimiento".
    const pupils = $('#pupils'); let tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
    if (!reduceMotion && matchMedia('(pointer:fine)').matches) {
      const loop = () => { cx += (tx - cx) * .15; cy += (ty - cy) * .15; pupils.style.transform = `translate(${cx}px,${cy}px)`; raf = (Math.abs(tx - cx) + Math.abs(ty - cy) > .02) ? requestAnimationFrame(loop) : null; };
      addEventListener('pointermove', e => { const r = $('#plant').getBoundingClientRect(); const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height * .75), d = Math.hypot(dx, dy) || 1; tx = dx / d * 2.2; ty = dy / d * 1.8; if (!raf) raf = requestAnimationFrame(loop); });
    }
    aplicar();
  }
  function silenciar(v, avisarlo) { st.mute = v; guardar(); aplicar(); if (avisarlo) mostrar(v ? 'Vale, me quedo calladito. Púlsame cuando me necesites.' : 'Avisos activados. Prometo no ser pesado.'); }
  function minimizar(v) { st.mini = v; guardar(); bubble.classList.add('hide'); aplicar(); }

  return {
    init, silenciar, minimizar,
    get estado() { return { ...st }; },
    decir(html, s = 'idle') { if (st.mute) { estado(s); return; } mostrar(html, s); },
    ruta(r) { ruta = r; idx = 0; },
    saludar() {
      const p = Tareas.pendientes(), venc = p.vencidas.length, u = Datos.estado.ultimaCopia;
      const dias = u ? Math.floor((Date.now() - u) / DAY) : null;
      setTimeout(() => {
        if (st.mute) { estado('wave'); return; }
        mostrar(venc ? `¡Hola, Fer! Tienes <b>${venc} tarea${venc > 1 ? 's' : ''} vencida${venc > 1 ? 's' : ''}</b>. ¿Empezamos por ahí?`
          : dias === null ? '¡Hola, Fer! Soy Ficus. Aún no has guardado ninguna copia: el botón está abajo a la izquierda.'
          : dias >= 7 ? `¡Hola! Hace ${dias} días que no guardas copia. Un clic abajo a la izquierda y listo.`
          : '¡Hola, Fer! Todo en orden por aquí.', 'wave');
      }, 900);
    }
  };
})();
