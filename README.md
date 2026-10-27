# Plataforma RRHH Simple

Herramienta interna de trabajo de RRHH. Funciona **en local**, en Chrome, **sin internet** y **sin enviar datos a nadie**.
Este repositorio guarda solo el **código** y su historial. Los datos (tareas, empleados, altas…) viven en tu navegador y nunca se suben aquí.

## Cómo usarla

1. En GitHub, pulsa **Code → Download ZIP**.
2. Descomprime el ZIP en una carpeta fija, por ejemplo `Documentos\Plataforma-RRHH`.
3. Abre `index.html` con **Google Chrome** (botón derecho → Abrir con → Google Chrome).
4. **Acceso directo:** botón derecho sobre `index.html` → *Enviar a* → *Escritorio (crear acceso directo)*. Si Chrome no es tu navegador por defecto, ábrela una vez con Chrome y guarda la página en marcadores.

## Actualizar a una versión nueva

1. **Antes de nada, guarda una copia** (botón *Guardar copia*, abajo a la izquierda).
2. Descarga el ZIP nuevo y **sustituye los archivos en la misma carpeta** (misma ruta). Así el navegador sigue encontrando tus datos.
3. Si algo no aparece, ve a *Ajustes → Importar copia* y elige tu última copia.

## Empleados y contraseña

La base de empleados se cifra con tu contraseña (AES-GCM 256). Si la olvidas, esos datos **no se pueden recuperar**, tampoco desde una copia. Se bloquea sola tras 15 minutos sin actividad. El resto de datos (tareas, altas, calendario) no van cifrados.

## Copias de seguridad

- **Guardar copia**: descarga un archivo `.json` con todos tus datos.
- **Vincular archivo** (*Ajustes*): elige un archivo, por ejemplo en OneDrive, y la plataforma guarda cada cambio automáticamente. Al abrirla de nuevo, Chrome puede pedir permiso: pulsa *Guardar copia* para reactivarlo.
- **Importar copia** (*Ajustes*): recupera los datos de un archivo de copia.

## Estructura

```
index.html              Página única de la plataforma
css/fonts.css           Tipografías incrustadas (funciona sin internet)
css/app.css             Estilos y temas claro/oscuro
js/params.js            ÚNICO archivo de parámetros legales (convenio, tablas, festivos…) con fuente y vigencia
js/engines/             Motores de cálculo: funciones puras, sin interfaz, con pruebas
js/core/                Estructura común: datos y copias, tareas, asistente Ficus, navegación
js/modules/             Pantallas (inicio, vacaciones, ajustes…)
tests/                  Pruebas de los motores: node tests/<nombre>.test.js (vacaciones, tareas, festivos, altas_empleados, documentos, calculadoras, ausencias, informes, procesos, nominas)
docs/                   Licencias de las tipografías
```

## Marco normativo

Convenio colectivo estatal de industrias de alimentos compuestos para animales (BOE-A-2021-19283) y, en lo no regulado, el Estatuto de los Trabajadores. Siempre se aplica la norma más favorable. Las cifras y su fuente están en `js/params.js`.

## Fases

| Fase | Contenido | Estado |
|---|---|---|
| 1. Base | Estructura, panel con bloques, tema, buscador, tareas básicas, copias, parámetros, Ficus, vacaciones | ✅ |
| 2. Organización | Tareas con estados (pendiente, en proceso, terminado), fecha opcional, tablero tipo Trello, avisos y exportación a Outlook/Google; calendario de festivos (Madrid, Talavera, Valencia y empresa) | ✅ |
| 3. Personas | Empleados cifrados con contraseña (importar CSV, filtros, fichas) y seguimiento de altas (checklist por centro, tareas automáticas, cierre → ficha) | ✅ |
| 4. Documentos | Generador con las 6 plantillas (correo y carta de oferta, documentación, bienvenida, emergencias, aviso a PRL y Calidad) | ✅ Hecha |
| 5. Calculadoras | Salarios, permisos (convenio frente a ET y reducción de jornada), nacimiento, indemnización y finiquito | ✅ Hecha |
| 6. Ausencias | Bajas, nacimiento, excedencias, reducciones y permisos largos: cifradas, aviso de reincorporación, capa en el calendario | ✅ Hecha |
| 7. Informes de igualdad | Sexo en fichas y altas, motivo de baja, promociones; 5 informes por sexo en Excel y PDF | ✅ Hecha |
| 8. Procesos | Reclutamiento, periodos de prueba, promociones, bajas y salidas, y nóminas (variables del mes para la gestoría) | ✅ Hecha |
