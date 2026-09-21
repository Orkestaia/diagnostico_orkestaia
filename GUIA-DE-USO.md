# Guía de uso · Diagnóstico Orkesta

Versión del 20-sep-2026. Batería del consultor v2: 8 bloques, preguntas de núcleo y de
profundizar, grabación, notas y encuesta de madurez en IA del equipo.

- Panel: https://diagnostico.orkestaia.com/admin (también https://diagnostico-orkestaia.vercel.app/admin)
- Entras con aitor@orkestaia.com (Clerk). Nadie más puede entrar.

---

## 1. De un vistazo

| Paso | Quién | Dónde | Qué pasa |
|---|---|---|---|
| 1. Invitación | Tú | Panel → «Nueva invitación» | Creas el diagnóstico y te da el enlace y el mensaje de WhatsApp |
| 2. Previo | Cliente, 5 min | Su enlace `/d/…` | Responde unas 10 preguntas. Te llega aviso por Telegram y email |
| 3. Visita | Tú + cliente, 3 h | Panel → «Visita» | Profundizas bloque a bloque en tu portátil o tableta, delante del cliente |
| 4. JARVIS | Tú + JARVIS | Export | JARVIS descarga los datos y escribe el mapa |
| 5. Mapa | Cliente | Su enlace `/m/…` | Sprint 2 (todavía no está) |

El cliente **nunca** tiene cuenta. Solo ve su enlace personal, y ese enlace no lleva a ninguna otra parte.

---

## 2. Crear una invitación

1. Panel → **Nueva invitación**.
2. Rellena empresa, contacto, **email** (obligatorio: sin él no sale el correo de «recibido») y tipo de negocio. Si ninguno encaja claramente, elige **Otro**.
3. Pon fecha, hora y lugar de la reunión: salen en el mensaje y en el botón de calendario del cliente.
4. Si el contacto ya está en el CRM, búscalo en el buscador (solo lectura).
5. Al guardar (y luego, desde la fila del cliente en el panel) tienes:
   - el **enlace del previo**;
   - el **mensaje para WhatsApp**, listo para copiar;
   - el enlace directo a WhatsApp, si has puesto el teléfono.

Si el cliente no termina el previo, le llega un **recordatorio automático a las 48 h**.

En cada fila del panel tienes además **Resultados** (leer la transcripción y la encuesta del
equipo, y descargar el informe, la transcripción o los datos), **Revocar enlace** (el enlace deja de funcionar y se genera
otro; las respuestas no se tocan) y **Borrar** (se va el diagnóstico entero: previo, visita,
tarjetas, notas, grabación y encuesta). Para borrar hay que escribir el nombre de la empresa; no
se puede deshacer.

Cuando lo completa:

- a ti te llega un aviso por Telegram (bot de Hermes) y por email;
- al cliente, un email de «Recibido»;
- la IA te prepara hipótesis y preguntas para la visita (las ves en la vista privada);
- las respuestas se copian en Airtable.

---

## 3. La visita

Panel → fila del cliente → **Visita**. La pantalla está pensada para girarla hacia el cliente.

### 3.1 Arriba del todo

- **Temporizador** (`0:00 / 2:30`): empieza la primera vez que abres la visita. En el minuto
  150 te sale un aviso para saltar al cierre. Puedes elegir «Seguir» o «Ir al cierre».
- **Punto de guardado**:
  - cian: guardado;
  - gris: guardando;
  - naranja: sin conexión, guardado en tu dispositivo;
  - rojo: reintentando.
- **Candado**: la vista privada (ver 3.3).
- **Bloques A-E**: puedes saltar de uno a otro cuando quieras.

### 3.2 Los bloques

| Bloque | Min | Qué haces |
|---|---|---|
| **A · Contexto y objetivos** | 15 | Repasas **«Lo que nos contaste»** (previo). Si algo no es así, **Corregir**: el original no se toca. Después: historia, equipo, quién decide, objetivo a 12 meses, qué haría que las 3 h merezcan la pena, qué han probado y qué se rompería con el doble de clientes |
| **B · Procesos** | 50 | Las tarjetas de proceso (ver 3.4) |
| **C · Números** | 15 | Tablero para repasar volumen y minutos de todas las tarjetas, picos, oportunidades perdidas, horas de administración y, en privado, el **coste por hora** |
| **D · Datos e información** | 15 | Mapa de datos (dónde está cada cosa, formato, quién la mantiene, cuánto se fían), duplicados, qué Excel es crítico y, en privado, tu valoración de la calidad y de si están listos para IA |
| **E · Herramientas** | 15 | Inventario, dónde vive la información del cliente, si las herramientas se hablan entre ellas y quién lleva la informática |
| **F · Equipo e IA** | 15 | Quién usa IA hoy, con qué cuentas, normas, formación, actitud del equipo, quién sería el campeón, las áreas de la empresa y la **encuesta al equipo** (ver 3.6) |
| **G · Cumplimiento** | 10 | Datos sensibles, protección de datos, proveedores, datos fuera de la UE, ley europea de IA y usos delicados. Sale el aviso: «esto no es una auditoría legal» |
| **H · Cierre** | 15 | Sus **3 prioridades**, éxito a 6 meses, restricciones, qué le preocupa, fecha de entrega del mapa y cuándo lo presentáis |

**Núcleo y profundizar.** Las preguntas de **núcleo** salen siempre a la vista. Las de
**profundizar** están plegadas bajo «Profundizar (n)»: son un menú para cuando el tema da de sí,
no una lista que haya que completar. Un bloque se puede cerrar sin tocarlas.

Los campos de texto guardan al salir de ellos. El **micrófono** dentro de un campo sirve para
dictar (en Chrome y Edge).

### 3.3 Vista privada (candado)

- **Para entrar**: mantén pulsado el candado **1 segundo** (se llena un anillo violeta).
- **Para salir**: un toque. Además sale sola:
  - si pasan **20 s sin escribir**;
  - si cambias de ventana o de pestaña.
- Todo lo privado va en **recuadros violetas con borde discontinuo** («Privado · no lo ve el cliente»):
  - las reglas de la visita y la preparación de la IA (hipótesis, preguntas, alertas);
  - el coste por hora, el valor de un cliente, el rango de inversión, la posible ayuda SPRI y las señales (decisor, urgencia, encaje, riesgo);
  - en cada tarjeta: el % automatizable, una primera idea, las dependencias y una nota.
- Mientras estás en la vista cliente, lo privado **no está en la página**: ni oculto ni en el código. Se pide al entrar y se borra al salir.

**Truco:** gira la pantalla hacia ti, entra, apunta y suelta. En 20 s vuelve sola.

### 3.4 Tarjetas de proceso (bloque B)

Objetivo: **5-7 tarjetas**. Mejor pocas y con cifras que muchas vacías.

1. Empieza por **«Con datos del previo»**: son tarjetas que ya traen volumen (y a veces minutos) de lo que contestó el cliente.
2. **Procesos típicos del sector**: plantillas con la pregunta con la que abrir el tema (la ves en la vista privada).
3. **Tarjeta rápida**: solo nombre, volumen y minutos. Úsala cuando vayas justo de tiempo. Con «Completar la tarjeta» la conviertes en completa.
4. **Tarjeta en blanco**: para lo que no encaja en ninguna plantilla.

Dentro de cada tarjeta:

- **Volumen + cada (día/semana/mes) + minutos cada vez** → arriba a la derecha aparece **«Hoy: ~X h al mes»**. El cliente ve las horas que se le van **hoy**; nunca el ahorro ni euros.
- **Pasos**: escribe un paso y pulsa Intro para el siguiente. Cada paso es de una **Persona** o del **Sistema** (toca la etiqueta para cambiarlo). Con 2 o más pasos se dibuja el diagrama **«Así es hoy»**.
- **Frase literal del cliente**: saldrá en su mapa. Apúntala tal cual la dice.
- **Me lo ha enseñado (visto)**: márcalo cuando te enseñe el proceso real («enséñame, no me cuentes»).
- **Profundizar** (plegado): traspasos, dependencia de una persona, excepciones, dónde se pierde
  información, datos de entrada y salida, retrabajo, si lo nota el cliente y picos. Úsalo solo en
  las 2-3 tarjetas que más horas consumen.
- En privado, además del % y tu idea: **tipo de iniciativa** (quick win, apuesta estructural,
  marginal o no rentable) y **riesgo de cumplimiento**. Si marcas «No rentable», el motivo es
  obligatorio: saldrá en el mapa como «lo que no haríamos y por qué».

Si cambias volumen o minutos de una tarjeta que venía del previo, pasa a contar como «acordado en la visita».

### 3.5 Grabar la reunión

1. Pulsa **Grabar** (arriba). La primera vez sale **«¿Grabamos la reunión?»**. Enséñaselo al
   cliente: si acepta, pulsa **«Sí, acepto»**. Queda registrado con fecha y hora.
2. El botón pasa a **rojo, «Grabando 12:34»**. El cliente ve siempre que se está grabando.
3. Se graba en trozos de 5 minutos. Cada trozo se sube, lo transcribe OpenAI y su **audio se
   borra** en cuanto hay texto. Solo queda la transcripción, que va al export de JARVIS.
4. Para parar, toca el botón rojo. **Hay que parar antes de cerrar la visita.**
5. En la vista privada ves el estado («Grabación: 12 fragmentos · 11 transcritos»). Si alguno
   falla, pulsa **Reintentar**.

Consejos:

- Si se va la conexión, los trozos esperan en tu dispositivo y se suben al volver.
- En iPad, **no bloquees la pantalla ni cambies de app** mientras grabas: Safari corta el
  micrófono. La app pide que la pantalla no se apague sola, pero si se corta, lo grabado está a
  salvo y te avisa para volver a pulsar Grabar.
- El primer día, el navegador te pedirá permiso para el micrófono.

### 3.6 Encuesta de madurez del equipo (bloque F)

1. Rellena antes **las áreas de la empresa** (pregunta «Áreas de la empresa…»).
2. Pulsa **Crear el enlace de la encuesta**. Copia el enlace y dáselo a quien lo vaya a repartir.
3. Está abierta 7 días. Puedes ampliarlo con «Ampliar el plazo otros 7 días».
4. Es anónima: no pide nombre ni email, y una respuesta por dispositivo.
5. Los resultados salen en el mismo bloque F: índice y nivel de la empresa, barras por uso,
   competencia, seguridad y actitud, nivel por área, qué quieren aprender y alertas.

Anonimato, sin excepciones: **no hay resultados con menos de 3 respuestas**, un área solo se
enseña con 3 o más (las demás se juntan en «Otras áreas») y las respuestas de una persona no se
ven nunca, tampoco tú.

### 3.7 Notas

Botón **Notas** (arriba) → se abre un panel de notas libres, solo para ti. Para leerlas o
escribir hay que tener la vista privada activa: con el candado cerrado, el panel te lo recuerda y
las notas no están en la página. Se guardan solas, también si la vista privada se cierra sola
mientras escribes, y van al export de JARVIS.

### 3.8 Sin conexión

Si se cae el wifi, **sigue trabajando**: todo se guarda en tu dispositivo y se envía al volver. Si recargas la página, lo pendiente se recupera. No cierres el navegador con el punto en naranja o rojo sin haber vuelto a tener conexión (el navegador te avisará).

### 3.9 Cerrar la visita

Bloque E → **Terminar la visita** → **Cerrar la visita**.

- Si estás grabando, primero para la grabación.
- Si falta el **coste por hora**, no deja cerrar y te ofrece ir al bloque C. Pregúntalo siempre:
  - si el cliente te da su coste real, usa «Me da su coste real»;
  - si no lo sabe, pulsa «No lo sabe: orientativo 14 / 25 / 40 €»;
  - la app guarda de cuál de los dos se trata.
- Al cerrar:
  1. Se **congelan** las horas de hoy de cada tarjeta, con fecha y origen. Es la línea base para medir el resultado real después.
  2. Se hace el cálculo completo (ahorros, topes, euros) para JARVIS.
  3. Te llega el aviso «listo para JARVIS».
  4. El cliente ve **«Esto es lo que nos llevamos»**: sus procesos por horas, sus 3 prioridades y **«Tu mapa llegará el [fecha]»**.
- Una vez cerrada, la visita **ya no se puede editar**.

---

## 4. Pasarle los datos a JARVIS

```bash
curl -H "Authorization: Bearer <DIAGNOSTICO_ADMIN_TOKEN>" \
  "https://diagnostico-orkestaia.vercel.app/api/admin/diagnosticos/<id>/export?formato=md"
```

- `formato=md`: documento listo para guardar en la carpeta del cliente como
  `YYYY-MM-DD_diagnostico-app_raw.md`. Lleva el previo con sus correcciones, la visita, las tarjetas con sus horas, las notas privadas y la transcripción de la reunión.
- `formato=json`: lo mismo más el cálculo completo.
- El `<id>` es el que aparece en la URL de la visita (`/admin/d/<id>/visita`).
- El token está en Vercel y en `.env.local` (`DIAGNOSTICO_ADMIN_TOKEN`). No lo pegues en chats ni en documentos.

---

## 5. Si algo falla

| Síntoma | Qué hacer |
|---|---|
| El panel da 404 | No has iniciado sesión, o no es la cuenta aitor@orkestaia.com |
| El punto de guardado se queda en rojo | Sin conexión con el servidor: sigue trabajando y se reintenta cada 5 s |
| «Falta el coste por hora» al cerrar | Vista privada → bloque C → coste real u orientativo |
| El cliente dice que su enlace no funciona | Comprueba en el panel que no lo has revocado («Revocar enlace») |
| No te llegó el Telegram | Mira las ejecuciones del workflow del motor en n8n |
