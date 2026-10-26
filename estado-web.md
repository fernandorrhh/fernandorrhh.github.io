# Estado de la web RRHH Simple

Rediseño de rrhhsimple.com por fases. `main` publica la web (GitHub Pages + CNAME) y solo se toca al validar cada fase.

## Punto de partida
- Base: commit `76bfe2a` ("rediseño 2.0", 18-10-2026). Copia de seguridad: ese commit queda en el historial y `main` no se toca hasta validar.
- Web estática HTML/CSS/JS, sin frameworks ni backend.

## Fases
- [x] Fase 0 — Preparación del repositorio
- [ ] Fase 1 — Puesta al día (ubicación, precios en una sola fuente, SEO básico, estilos en línea)
- [ ] Fase 2 — Contenido y lenguaje (FAQ, casos tipo, precio social, servicio a empresas)
- [ ] Fase 3 — Sistema visual e interfaz (con webs de referencia)
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
