# Preguntas repetidas entre el previo y los bloques de la visita — para JARVIS (banco_v1.2)

Detectadas el 22-sep comparando el texto de las preguntas del previo (`src/config/sectores/`) y
de la batería (`src/config/consultor/bloques.ts`). BUILDS no borra ni fusiona nada: JARVIS decide
cuáles se unen y BUILDS lo aplica.

## Propuesta de mecanismo (sin borrar preguntas)

En el banco, la pregunta repetida lleva `mismo_que: <id de la original>`. La app:

1. muestra en la repetida la respuesta ya dada, rellenada y editable;
2. pone al lado la etiqueta «respondido en [bloque o previo]»;
3. si Aitor la cambia, se guarda como corrección de la original (misma clave), no como un dato
   nuevo; el export enseña una sola respuesta y de dónde salió.

Solo hacia adelante: las respuestas antiguas guardadas con el id repetido se siguen leyendo.

## Duplicados claros (misma pregunta, dos sitios)

| Repetida (visita) | Original | Igual en | Nota |
|---|---|---|---|
| `d.info_clientes` (E · Herramientas) «¿Dónde está la información de cada cliente?» | `herramientas.info_clientes` (previo) | texto y opciones | Además, en `datos.mapa` (D) ya se pregunta dónde están los datos de clientes. Tres veces. |
| `e.exito` (H · Cierre) «¿Qué tendría que pasar en 6 meses…?» | `prioridad.exito` (previo) | texto y opciones | En la visita tiene sentido **reconfirmar**; propuesta: precargar con lo del previo y etiqueta. |
| `a.otras_personas` (A) «¿Quién más debería estar…?» | `e.presentacion` (H, 🔒) «¿Quién debería estar?» | intención | Distinto momento (hoy / presentación). Quizá valga precargar la segunda con la primera. |
| `a.probado` (A) «¿Qué habéis probado ya (programas, IA…) y qué salió mal?» | `ia.fallidos` (F) «¿Habéis probado algo con IA que no funcionó?» | parcial | La de F es un subconjunto de la de A. |
| `a.ultima_inversion` (A, 🔒) «última herramienta o proveedor… ¿cómo salió?» | `a.probado` (A) | parcial | Mismo bloque, dos preguntas casi iguales. |

## Solapes entre «Datos e información» (D) y «Herramientas» (E)

| D | E | Qué se repite |
|---|---|---|
| `datos.mapa` (dónde está cada dato, formato, quién lo mantiene) | `d.inventario` (por herramienta: para qué, quién la usa) + `d.info_clientes` | «dónde vive cada cosa» se pregunta por dato y luego por herramienta |
| `datos.accesos` (🔒) «¿Quién puede ver y cambiar cada cosa? ¿Se quitan los accesos…?» | `herr.claves_compartidas` «¿Se comparten usuarios y contraseñas?» + `d.inventario` (quién tiene las claves) | accesos y claves, tres veces |
| `datos.documentos` «¿En qué forma están los documentos?» | `d.inventario` (Drive, gestor documental) | soporte de los documentos |
| `datos.verdad` «si dos sitios dan cifras distintas, ¿cuál manda?» | `herr.integracion` «¿se pasan datos o se copian a mano?» | causa y síntoma de lo mismo |
| — | `cumpl.fuera_ue` (G) «¿herramientas que guardan datos fuera de la UE?» | se deduce de `d.inventario`: podría precargarse |

## Cifras que se piden dos veces

| Visita | Previo | Nota |
|---|---|---|
| `c.horas_admin` «horas a la semana en administración» | `herramientas.horas_copiando`, `dia.horas_redaccion` (según sector) | Distinto alcance; la de la visita es el contraste con las tarjetas. Mantener, pero enseñar la del previo al lado. |
| `herr.ideal` (E, 🔒) «Si pudieras cambiar una herramienta mañana…» | `prioridad.tarea` (previo) «Si mañana pudieras quitarte una tarea…» | Parecen iguales por la forma, no por el fondo. No fusionar. |

## Valoraciones de Aitor (no son duplicados, pero van juntas)

`datos.calidad`, `datos.preparacion_ia`, `ia.valoracion_campeon`, `cumpl.riesgo`, `e.senales`:
cinco escalas 🔒 repartidas por cuatro bloques. Propuesta: agruparlas en un único panel privado
de «valoración de Aitor» al cerrar, sin cambiar sus ids.

## Cambios ya aplicados el 22-sep (pendientes de reflejar en la batería)

- `d.info_clientes`: pasa de una opción a varias (`multi`).
- `e.exito`: pasa a varias, máximo 2 (como `prioridad.exito`).
