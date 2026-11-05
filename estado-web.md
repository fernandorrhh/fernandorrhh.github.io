# Estado de la web RRHH Simple

Rediseño de rrhhsimple.com por fases. `main` publica la web (GitHub Pages + CNAME) y solo se toca al validar cada fase.

## Punto de partida
- Base: commit `76bfe2a` ("rediseño 2.0", 18-10-2026). Copia de seguridad: ese commit queda en el historial y `main` no se toca hasta validar.
- Web estática HTML/CSS/JS, sin frameworks ni backend.

## Fases
- [x] Fase 0 — Preparación del repositorio
- [x] Fase 1 — Puesta al día (26-10-2026, rama `fase-1-puesta-al-dia`)
  - Modalidad: online + presencial en Valencia o Madrid según disponibilidad; pie a Valencia; domicilio legal: San Blas-Canillejas, 28037 Madrid.
  - Precios en `precios.js` (portada y servicios).
  - SEO: canonical, Open Graph con imagen 1200×630, JSON-LD `ProfessionalService`, `sitemap.xml`, `robots.txt`, `404.html`.
  - Estilos en línea pasados a utilidades `.u-*` en `styles.css` (solo queda `--rise-delay`, que es un dato por elemento).
  - Arreglos recuperados: red de seguridad de 2 s si `main.js` no carga y calendario de reservas que no llegaba a mostrarse.
  - Verificado: capturas antes/después en escritorio y móvil sin cambios de diseño; sin errores JS.
- [x] Fase 2 — Contenido y lenguaje (26-10-2026, rama `fase-2-contenido`)
  - Nueva página `empresas.html`: servicio a medida (<20 personas), cómo funciona (formulario → llamada → presupuesto) y formulario que abre email o WhatsApp ya rellenado. Enlazada en menú, pie, portada, servicios y contacto.
  - Servicios: precio social redefinido y 8 preguntas frecuentes con datos estructurados `FAQPage`.
  - `main.js`: un único manejador para los dos formularios, con validación antes de abrir la app.
  - Lenguaje neutro en avisos legales y pies ("despacho de graduado/a social o de abogacía laboralista").
  - Arreglo: el aviso vacío bajo los botones de formulario ya no se ve.
  - Pendiente: casos tipo reales y anonimizados (los aporta Fernando; no se inventan).
- [ ] Fase 3 — Sistema visual e interfaz (rama `fase-3-interfaz`; portada validada el 26-10-2026, falta extender al resto)
  - Extendido a todas las páginas (títulos con acento en serifa, secciones oscuras superpuestas, foto del portátil en Empresas). Emojis retirados de servicios.
  - v3.4–3.6 (27/10): ritmo vertical equilibrado; la cinta ya no queda tapada; cada página se abre desde arriba; menú desplegable también en tableta; superficies separadas por tono (sin sombras); contraste ≥ 3:1 en la frase animada; titulares en dos líneas; selección y caret de marca.
  - v3.3: solo colores de marca (paletas "Dark professional" y "Light & engaging"): #FAF8F3, #F9F9F9, #D4CFC0, #8A8666, #4A4732, #3A3825, #2E2E2E, #FFDE59 (solo acción) y #E8A87C. Nada de tonos inventados.
  - v3.2 (feedback 26/10): fondos claros en fotos, menos huecos, cada sección en un bloque de color que se superpone a la anterior, servicios en bloques de color, pasos en tarjetas y preguntas frecuentes desplegables. Marca de agua quitada de la foto del portátil.
  - v3.1: serifa Instrument Serif (OFL, autoalojada) para acentos; menú con píldora deslizante y relevo de texto; fotos de Fernando (sin metadatos, webp) en píldoras que se abren.
  - Referencias: citizens.mrbandfriends.co.uk (limpieza, navegación, entradas de sección), halyard.site (animación en directo), jemini.co (scroll fluido, hover de botones, secciones que se superponen). Web multipágina, no una sola página.
  - Prototipo solo en la portada: `ui.css` + `ui.js` (capa v3 sobre styles.css) y Lenis autoalojado en `vendor/` (MIT).
  - Piezas: navegación flotante en píldora, título que entra palabra a palabra, cinta de servicios, declaración que se ilumina con el scroll, servicios en tarjetas que se apilan, nómina "en directo", sección de calculadora que se superpone, botones con flecha y relleno.
  - Accesible: sin JS todo visible; con movimiento reducido todo quieto; navegación de la nómina con teclado.
- [x] Fase 4 — Motor compartido y calculadoras públicas (26-10-2026, rama `fase-4-calculadoras`)
  - `motor/`: indemnización y vacaciones copiados tal cual de la plataforma (commit 4717e36); finiquito adaptado a cualquier convenio (nº de pagas configurable, vacaciones en laborables o naturales, sin preaviso). Con 16 pagas reproduce la prueba de la plataforma; la versión adaptada también pasa las 66 pruebas de la plataforma.
  - `motor/parametros.js`: único archivo de parámetros de la web (ET), con fuente y fecha de verificación.
  - `tests/motores.test.js`: 16 pruebas (node tests/motores.test.js), incluido el caso de referencia 19.408 € / 11.763 €.
  - Páginas: `herramientas.html` (índice), despido (ahora con el motor común), `calculadora-finiquito.html` y `calculadora-vacaciones.html`.
  - Decisión (26/10/2026): no se hacen cálculos de IRPF ni calculadora bruto/neto.
  - La sección se llama «Herramientas» (`herramientas.html`).
  - Mantenimiento: si cambia un motor en la plataforma, copiarlo a `motor/` y pasar las pruebas de los dos repositorios.
- [x] Fase 5 — Guías y verificación final (26-10-2026, rama `fase-4-calculadoras`)
  - Guías: `guias.html` (índice), `guia-nomina.html`, `guia-finiquito.html`, `guia-plazo-despido.html`, con base legal citada (ET, LRJS, Orden ESS/2098/2014), datos estructurados `Article` y enlace a la calculadora correspondiente.
  - Verificación: 0 incidencias WCAG 2 A/AA (axe-core) en las 19 páginas; sin desbordes horizontales a 375 px; sin enlaces internos rotos; sin errores de JavaScript. Portada ≈ 480 KB con fuentes e imágenes.

## Cambios sueltos
- 31-10-2026 — Incidencia: el commit `6e48113` ("CAE", 27/10) subió la plataforma interna de RRHH a este repositorio y sustituyó la portada. Revertido en `d12055a`. La plataforma debe vivir en su propio repositorio privado.
- 31-10-2026 — Empresas: "En qué puedo ayudar" pasa a 24 tareas seleccionables en las tres columnas (día a día, entradas, salidas). Al marcar la primera aparece abajo un aviso "Reserva tu presupuesto" que no bloquea; su botón baja al formulario (ahora "Reserva tu presupuesto"), que muestra y envía las tareas agrupadas por columna. Lógica en `empresas.js`. Portada: tercer botón "Para empresas".
- 31-10-2026 — Auditoría, fase 1 (mejoras rápidas): botón de reserva bajo los precios de Servicios; cabecera de Empresas con «Pedir diagnóstico gratuito» y botón del menú a «Diagnóstico gratis»; cierre con reserva en Herramientas y Guías; `scroll-padding-top` para que el menú no tape el campo enfocado (WCAG 2.4.11); notas de la nómina atenuadas con color (5,4:1) en vez de opacidad; Inicio sin «presencial» (servicio online en toda España); consulta de unos 30 minutos en Reservar; títulos de Contacto y Sobre mí; descripción de Empresas a 136 caracteres; logo de cabecera `logo-nav.png` (8 KB); sitemap con fechas reales; 404 sin robots duplicada; ganchos de medición sin cookies en `main.js` (`rrhhMedir`), inactivos hasta añadir el proveedor.
- 31-10-2026 — Auditoría, fase 2: errores propios bajo cada campo en Contacto y Empresas (aria-invalid, aria-describedby, foco al primero) y opciones de envío en pastilla; botón «Elegir día y hora» en la cabecera de Reservar; tareas de Empresas plegadas a 4 por bloque en móvil (las marcadas nunca se ocultan); en móvil, «Para empresas» de Inicio pasa a enlace; H1 de Inicio con «Asesoría laboral online»; JSON-LD `Service` en Empresas y `WebApplication` en las calculadoras; sin numeración decorativa 01-03 en Inicio, Servicios, Herramientas y Guías (se mantiene en los pasos de las guías, que sí son secuencia); cifras de dinero en Poppins; guía del plazo de despido ampliada a ~900 palabras y verificada (arts. 43.4, 65.1 y 103 LRJS: agosto y del 24-12 al 6-01 cuentan para el despido; la baja médica no suspende el plazo). La medición cuenta solo envíos válidos.
- 31-10-2026 — Opiniones de clientela: página `opina.html` (noindex, fuera del sitemap y del menú) con formulario de marca que envía a un Formulario de Google de Fernando (sin servidor propio); bloques `[data-opiniones]` en Inicio (personas, 3), Servicios (personas, 6) y Empresas (empresas, 3) que leen la pestaña «Publicadas» de la hoja en CSV y solo aparecen si hay opiniones aprobadas; media visible a partir de 3 opiniones; carrusel en móvil; aviso de verificación (art. 20.4 LGDCU). Configuración en `opiniones-config.js` (vacía hasta conectar la cuenta). Política de privacidad actualizada.
- 01-11-2026 — Portada simplificada: orden portada › declaración › opiniones (carrusel) › servicios en 3 tarjetas sin precios › calculadora › nómina › cierre. Quitada la sección «Soy Fernando» (está en Sobre mí). Carrusel de opiniones: una fila; si no caben, avanza una tarjeta cada 10 s, con anterior/siguiente y pausa, se detiene con ratón, teclado, toque o pestaña oculta, y no avanza solo con «reducir movimiento».

## Decisiones tomadas
- Precios particulares (05-11-2026): se elimina el precio social/estándar; un precio final con IVA incluido por servicio: CV 30 €, entrevista 40 €, pack CV+entrevista 60 €, nómina/contrato/convenio 35 €, despidos y conflictos 60 €, trámites sencillos 20 €, trámites con más carga 40 €. Empresas siguen en «desde … + IVA». Pendiente: confirmar con la gestoría que aplica el 21 % general.
- Modalidad: solo online, en toda España (31-10-2026; antes también presencial).
- Precio social: personas cuya situación laboral o económica les impide pagar el servicio y que lo necesitan.
- Empresas (31-10-2026): RRHH externo con cuota mensual, coordinado con la gestoría del cliente. Hasta 10 personas, desde 220 €/mes; de 11 a 19, a medida. Planes de igualdad (50+): seguimiento desde 400 €, auditoría retributiva desde 600 €, renovación desde 1.200 €. Entrada: diagnóstico gratuito de 30 min → propuesta en 48 h. Lanzamiento: 20 % los 3 primeros meses para las 3 primeras empresas. Precios sin IVA; en la web solo el "desde".
- Formularios: abren correo o WhatsApp ya rellenado; ningún dato pasa por terceros.
- Flujo: una rama por fase, pull request y validación antes de fusionar con `main`.

## Pendiente
- Casos tipo reales y anonimizados.
- Webs de referencia para la interfaz (antes de la fase 3).
- Calculadoras públicas a priorizar en la fase 4.
