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
  - v3.1: serifa Instrument Serif (OFL, autoalojada) para acentos; menú con píldora deslizante y relevo de texto; fotos de Fernando (sin metadatos, webp) en píldoras que se abren.
  - Referencias: citizens.mrbandfriends.co.uk (limpieza, navegación, entradas de sección), halyard.site (animación en directo), jemini.co (scroll fluido, hover de botones, secciones que se superponen). Web multipágina, no una sola página.
  - Prototipo solo en la portada: `ui.css` + `ui.js` (capa v3 sobre styles.css) y Lenis autoalojado en `vendor/` (MIT).
  - Piezas: navegación flotante en píldora, título que entra palabra a palabra, cinta de servicios, declaración que se ilumina con el scroll, servicios en tarjetas que se apilan, nómina "en directo", sección de calculadora que se superpone, botones con flecha y relleno.
  - Accesible: sin JS todo visible; con movimiento reducido todo quieto; navegación de la nómina con teclado.
- [ ] Fase 4 — Motor compartido con la plataforma y calculadoras públicas
- [ ] Fase 5 — Guías y verificación final

## Decisiones tomadas
- Modalidad: online; presencial en Valencia o Madrid según disponibilidad.
- Precio social: personas cuya situación laboral o económica les impide pagar el servicio y que lo necesitan.
- Empresas: servicio a medida para empresas de menos de 20 personas trabajadoras (gestión operativa, fichajes, reclutamiento y contratación, despidos…), puntual o por periodos. Sin precio publicado: formulario → llamada → presupuesto.
- Formularios: abren correo o WhatsApp ya rellenado; ningún dato pasa por terceros.
- Flujo: una rama por fase, pull request y validación antes de fusionar con `main`.

## Pendiente
- Webs de referencia para la interfaz (antes de la fase 3).
- Calculadoras públicas a priorizar en la fase 4.
