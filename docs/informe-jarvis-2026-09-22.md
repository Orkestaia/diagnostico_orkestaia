# Informe para JARVIS · Diagnóstico Orkesta · 22-sep-2026 (tarde)

Todo lo de abajo está en `main` y desplegado en https://diagnostico.orkestaia.com. Aitor levantó
la congelación; la visita real de Icónica (23-sep, 10:00) se hace con esta versión.

## Hecho y desplegado hoy

### Visita
- **Grabación con pausa** (Pausar / Seguir / Terminar). Un solo documento de transcripción.
- **Avisos de plausibilidad al cerrar** (no bloquean): > 60 min por vez en todas las áreas salvo
  Operación y Dirección; horas de hoy por encima del tope de equipo; volumen el doble o la mitad
  del previo. Quedan en `calculo.avisos_plausibilidad` y en el export (§4).
- **banco_v1.1**: cada respuesta del previo guarda su redacción (`respuestas_previo_redaccion`);
  las contestadas a un texto anterior salen «por confirmar en la visita» y no precargan tarjetas.
  Icónica: `dia.pedidos_mes` es el caso.
- **Preguntas con varias opciones**: `d.info_clientes` (multi) y `e.exito` (multi, máx. 2).
- **Preguntas repetidas** (`docs/duplicados-banco-para-jarvis.md` + decisión de JARVIS):
  - Precargadas, editables, con etiqueta «Respondido en el previo / en el bloque X»:
    `d.info_clientes` ← `herramientas.info_clientes` · `e.exito` ← `prioridad.exito` ·
    `id.canales_venta` ← `captacion.canales` · `e.presentacion` ← `a.otras_personas` ·
    `a.ultima_inversion` ← `a.probado` · `ia.areas` ← `a.equipo`.
  - Referencias al lado (no rellenan): `ia.fallidos` ← `a.probado` · `d.inventario` ← `datos.mapa` ·
    `herr.claves_compartidas` ← `datos.accesos` · `cumpl.fuera_ue` ← herramientas de `d.inventario` ·
    `c.horas_admin` ← cifra del previo.
  - Nada se guarda hasta que Aitor toca el campo. La respuesta original no se modifica.
- **Panel único de valoraciones de Aitor** en el bloque H (privado): `datos.calidad`,
  `datos.preparacion_ia`, `ia.valoracion_campeon`, `cumpl.riesgo`, `e.senales`. Ids sin cambios.
- Panel: botón **Mapa** en cada fila con mapa.

### Mapa (`mapa_v1.2`, todo opcional; un `mapa_v1` se pinta igual que antes)
- Campos nuevos: `hallazgos[].inesperado` (máx. uno → «Lo que no esperabais»), `regalo`
  (copiar / descargar .txt), `coste_inaccion.mostrar` (horas × 12, ±25 %; oculto si la visita
  cerró con avisos), `plazo_orientativo` por mejora, `lo_que_ya_funciona`, `preocupaciones`,
  `no_rentables`.
- Reglas al subir (PUT): etiqueta obligatoria en flechas con 2+ salidas (máx. 3 palabras) y
  prohibida en tramos lineales; plazos sin fechas; ningún «Con el sistema» sin «Así es hoy».
- **Elige tus 3 prioridades**: solo en mapas con `"version": "mapa_v1.2"`. Guardan con fecha,
  editables; evento `diagnostico.prioridades_elegidas` → Telegram + email a Aitor (montado en n8n).
- **Rediseño UX**: portada con la cifra de horas, índice con progreso, «Así funciona hoy» con barras
  de mayor a menor, comparador que empieza en «Hoy» con «Ver cómo sería» y contador de pasos de
  persona, hoja de ruta en línea de tiempo, euros a un toque (14 / 25 / 40 €, sin guardar), aviso de
  caducidad del enlace, pie «Preparado por Aitor Colino».
- Copia en texto de cada mapa publicado (`<fecha>_mapa-publicado.md`) a Drive y a
  `03_PIPELINE/01_leads/<cliente>/`.
- Apagados hasta luz verde de TEMIS: casilla de consentimiento agregado (`CONSENTIMIENTO_AGREGADO_ACTIVO`)
  y aviso de apertura del mapa (`MAPA_APERTURA_ACTIVO`, evento `diagnostico.mapa_abierto`, ya en n8n).

### Datos y motor
- DDL v5-v7 ejecutados. Solo columnas nuevas; ninguna fila modificada.
- n8n: el motor tiene salidas para `prioridades_elegidas` y `mapa_abierto`.
- Copia a la carpeta de JARVIS: el script existe; la tarea programada de Windows la crea Aitor.

## Lo que queda
1. **Mapa del ensayo** (`723576c9-…`): sigue `mapa_publicado` con `mapa_v1`. Es el único ensayo que
   existe (no hay un segundo). Aitor tiene que pulsar «Volver a borrador» en el panel; entonces
   entra el PUT de JARVIS con `mapa_v1.2`.
2. **Email al cliente al publicar el mapa**: el motor ignora `diagnostico.mapa_publicado`. Hace falta
   el texto (JARVIS + Aitor) y montarlo en n8n. Mientras, Aitor envía el enlace a mano.
3. **Modo claro del mapa**: único punto del rediseño sin hacer.
4. **Batería**: JARVIS ya reflejó `multi` en `d.info_clientes` y `e.exito`. Falta anotar
   `mismoQuePrevio` / `mismoQueVisita` / referencias en las parejas aprobadas hoy, si quiere que el
   documento sea el contrato completo.
5. Consentimiento y aviso de apertura: encender cuando TEMIS dé el visto bueno.
6. Política de privacidad, conservación automática a 12 meses, integración con CRM, lead magnet:
   pendientes de spec.
