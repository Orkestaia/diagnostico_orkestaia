# Encargo para JARVIS · Batería del consultor v2 + madurez en IA

De: BUILDS (app Diagnóstico) · Para: JARVIS · 19-sep-2026 · Pide: Aitor

## Por qué

Aitor ha revisado la visita en producción. En su opinión, para 3 horas **hay muy pocas
preguntas**: hay que profundizar mucho más y bajar al detalle. Además quiere medir la
**madurez en IA** de la empresa y de sus equipos, y detectar necesidades de **formación**.

Decisión de Aitor: **la batería v2 la escribe JARVIS** y BUILDS la transcribe sin cambiar
textos, igual que la v1. Esto levanta, solo para esta parte, el «parar hasta 2-3 visitas
reales» del 19-sep.

Inspiración que ha pasado Aitor: https://www.solutechia.es/consultoria. Analizan seis áreas:

1. procesos operativos;
2. datos e información;
3. stack tecnológico;
4. equipo, roles y alfabetización en IA;
5. cumplimiento (RGPD, ley europea de IA y normativa del sector);
6. hoja de ruta económica.

Clasifican las iniciativas en quick wins, apuestas estructurales, marginales y «no rentables»,
dejando documentado por qué se descarta cada una.

## Qué hay que escribir

### 1. `diagnostico-app_bateria-consultor_v2_…md`

La misma estructura que la v1: §1 bloques, §2 tarjeta, §3 plantillas, §4 preguntas por bloque.
Cambios que pide Aitor:

- **Más profundidad en cada bloque**: preguntas de seguimiento («¿y después qué pasa?»,
  «¿quién más lo toca?», «¿qué pasa cuando esa persona falta?»), excepciones, casos límite, dónde
  se pierde información.
- **Bloques nuevos o ampliados** (JARVIS decide el reparto y los minutos; el total sigue siendo
  150 min de trabajo + 30 de margen):
  - **Datos e información**: dónde están, en qué formato, su calidad, duplicados, quién los
    mantiene al día.
  - **Madurez en IA y formación** (ver punto 2).
  - **Cumplimiento**: RGPD, datos sensibles, ley europea de IA, normativa del sector. Hoy
    `d.datos_sensibles` es la única pregunta.
- Si alguna tarjeta de proceso necesita más campos, añádelos a §2 con el mismo formato
  (tipo, visible para el cliente o 🔒).

### 2. Madurez en IA: dos partes

**a) Bloque en la visita (para dirección).** Algunas ideas, que JARVIS decide:

- uso actual de IA (quién, qué herramientas, con permiso o por su cuenta);
- política o normas internas;
- formación recibida;
- actitud del equipo (ilusión, miedo, rechazo);
- quién sería el «campeón» interno;
- presupuesto de tiempo para formarse.

**b) Encuesta para el equipo.** Enlace anónimo, unos 5 minutos, que cada empleado responde
desde el móvil. Da la madurez real por área o rol y lo que necesitan formar. Hace falta:

- las preguntas (máximo 12-15), con sus opciones;
- cómo se calcula el **nivel de madurez** (escala, pesos y niveles con nombre). Igual que en el
  banco: fórmula explícita, la IA redacta pero nunca pone números;
- mínimo de respuestas para enseñar resultados por área (propuesta de BUILDS: 3, para
  proteger el anonimato);
- qué se enseña al cliente y qué queda 🔒.

## Formato que la app sabe leer

Tipos de campo disponibles hoy en la visita:

| Tipo | Qué es |
|---|---|
| `texto` | Respuesta libre |
| `numero` | Número |
| `chips` | Una opción de una lista |
| `multi` | Varias opciones (con máximo si hace falta) |
| `si_no` / `si_no_nose` | Sí o no, con o sin «No lo sé» |
| `fecha` | Fecha |
| `lista_equipo` / `lista_herramientas` | Listas de filas |
| `texto_si_no` | Texto más sí o no |
| `costes_perfil` | Costes por perfil |
| `elegir_tarjetas` | Elegir tarjetas de proceso |
| `senales` | Señales del cierre |

Si hace falta un tipo nuevo (por ejemplo, escala 1-5 o matriz rol × nivel), JARVIS lo describe
y BUILDS lo construye.

Cada pregunta necesita:

- `id` estable (p. ej. `ia.uso_actual`);
- bloque;
- texto literal;
- tipo;
- opciones;
- si es 🔒 privada;
- si es opcional.

Para la encuesta del equipo, además, los pesos del cálculo de madurez.

## Lo que BUILDS ya está construyendo (no depende de la v2)

- **Grabación de la reunión** desde la visita. El cliente da su consentimiento, que queda
  registrado con fecha. Se graba por fragmentos y OpenAI los transcribe; el audio se borra al
  transcribirse. La transcripción irá en el export `md` y `json` en una sección nueva
  «Transcripción». Sirve para que `meeting-analysis` recupere lo que se escape de las tarjetas.
- **Notas libres de Aitor** durante la visita (🔒). También van en el export.

Pregunta para JARVIS: ¿la transcripción completa en el `md` es útil, o prefieres un archivo
aparte (`…_transcripcion.md`) para que el raw no se haga enorme? Una visita de 3 h son unas
25-30 mil palabras.
