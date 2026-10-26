# RRHH Simple — web

Web estática de la asesoría laboral RRHH Simple (rrhhsimple.com).
HTML, CSS y JavaScript sin frameworks, publicada con GitHub Pages.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | Portada |
| `servicios.html` | Servicios y tarifas |
| `calculadora-despido.html` | Calculadora de indemnización |
| `reservar.html` | Reserva de la primera consulta (Google Calendar) |
| `sobre-mi.html` | Sobre Fernando |
| `contacto.html` | Formulario de contacto |
| `aviso-legal.html`, `privacidad.html` | Páginas legales |
| `styles.css` | Todo el diseño: tokens, rejilla, componentes, movimiento |
| `main.js` | Menú, entradas por scroll, calendario y formulario |
| `precios.js` | Tarifas: única fuente de precios |
| `404.html`, `robots.txt`, `sitemap.xml` | Página de error y archivos para buscadores |
| `calculadora.js` | Motor de cálculo + interfaz de la calculadora |
| `assets/` | Logos, favicon, foto y tipografías |

## Sistema de diseño

Todo sale de los tokens de `:root` en `styles.css`. Para cambiar algo,
se toca ahí y se propaga a toda la web.

- **Color:** papel `#faf8f3`, tinta `#1a1a1a`, oliva `#4a4732`, campo oscuro
  `#2e2e2e`, amarillo `#ffde59` solo como superficie de acción.
- **Tipografía:** cinco pasos (`--display`, `--title`, `--lead`, `--body`,
  `--small`). Poppins para titulares, Atkinson Hyperlegible para texto.
- **Espacio:** escala de 4 (`--s1` … `--s10`).
- **Forma:** controles redondos (`--pill`), superficies cuadradas (`--edge`).
- **Botones:** tres niveles. `.btn` (principal, amarillo), `.btn-ghost`
  (secundario, solo contorno) y `.btn-text` (terciario, enlace subrayado).
  Un solo botón principal por pantalla.

## Cómo cambiar las cosas más habituales

- **Precios:** solo en `precios.js`. Se actualizan solos en la portada y en
  servicios. (El número que se ve en el HTML es un respaldo por si el script
  no carga; si cambias una tarifa, conviene cambiarlo también.)
- **Parámetros legales de la calculadora:** bloque `LEY` al principio de
  `calculadora.js`. Si cambia la ley, se edita solo ese bloque.
- **Teléfono y WhatsApp:** constantes `WHATSAPP` y `EMAIL` en `main.js`,
  y los enlaces del pie de cada página.
- **Enlace del calendario:** atributo `data-src` del div `#calHolder` en
  `reservar.html`.

## Decisiones que conviene no deshacer sin pensarlo

- **Las tipografías se sirven desde `assets/fonts/`,** no desde Google Fonts.
  Es más rápido y evita enviar la IP de quien visita a un tercero, cosa que
  importa en una web de asesoría laboral. La política de privacidad lo dice así.
- **El contenido es visible sin JavaScript.** Las animaciones de entrada solo
  se activan si el script carga; si falla, todo se ve igual.
- **`prefers-reduced-motion`** quita el movimiento en toda la web.
- **La calculadora no finge que tarda.** El cálculo es instantáneo; lo que se
  anima es la entrada del resultado.
