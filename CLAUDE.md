# Diagnóstico Orkesta

## Qué es

Herramienta del diagnóstico en 4 pasos de Orkesta: **previo** del cliente (5 min, enlace
personal) → **visita** de 3h con Aitor (modo consultor, la misma app) → **JARVIS** (export y
análisis) → **mapa** para el cliente. Para Aitor y sus leads. Objetivo: que el cliente sienta
"esto es serio y es mío" y que ninguna cifra sea inventada.

## Documentos que mandan (en ORKESTA - JARVIS, solo lectura)

`01_ORKESTA_CORE/sales-system/diagnostico-app/`:

- `diagnostico-app_spec-producto_v2_2026-09-18.md` — la spec principal.
- `diagnostico-app_banco-sectores_v1_2026-09-18.md` — preguntas, frases del Orkestador, fórmulas,
  quick wins, `etiqueta_tarea`. Se transcribe a `src/config/sectores/` **sin cambiar textos ni valores**.
- `diagnostico-app_bateria-consultor_v2_2026-09-19.md` — **la batería vigente** (8 bloques,
  niveles N/P, encuesta de madurez) → `src/config/consultor/`. La v1 solo sigue valiendo para las
  plantillas de proceso de su §3. `scripts/verificar-config.test.ts` compara ambas con el código.
- `motor-diagnostico-n8n_spec_v1_2026-09-18.md` — solo eventos y callback.

Si la spec y el código discrepan, manda la spec: preguntar a Aitor antes de "arreglar" la spec.

## Stack

Next.js 15 (App Router) + React 19 + Tailwind 4 + TypeScript + Framer Motion. Clerk (app
"Orkesta Diagnóstico", `app_3JUqcVntdda5YxeTUZNFhxQocEo`) **en modo desarrollo a propósito**: la
instancia de producción pide plan de pago por la allowlist y Aitor no quiere pagar; la seguridad
real la da `esAdmin()` en código. Supabase `ORKESTA_OPS_2026` (`ddruuldwacxvvhvhjomm`, compartido
con el CRM de Mission Control). OpenAI (`OPENAI_API_KEY`) para transcribir. Vitest (+ jsdom y
testing-library para pantallas).

Repo `github.com/Orkestaia/diagnostico_orkestaia`. Vercel: equipo `orkesta-automation`, proyecto
`diagnostico-orkestaia`. **Dominio: https://diagnostico.orkestaia.com** (CNAME en Namecheap; también
responde `diagnostico-orkestaia.vercel.app`).

## Estado (22-sep-2026)

En producción y usado con clientes reales (3 previos contestados; visitas el 22, 23 y 24-sep).
Detalle y guía: `GUIA-DE-USO.md`.

**Congelación de despliegues:** nada a `main` desde el martes 22-sep a las 20:00 hasta que acabe
la visita del jueves 24, salvo un fallo grave.

Ramas abiertas (22-sep):

- `grabacion-pausa`: pausa de la grabación, aviso de más de 60 min en todas las áreas salvo
  Operación y Dirección, consentimiento agregado apagado, botón «Mapa» en el panel. Aitor la prueba
  el martes 22 por la mañana con «Marta Test» (`docs/prueba-martes-22-sep.md`); si va bien, se
  fusiona antes de las 20:00; si no, después del jueves.
- `mapa-v1-2`: campos opcionales de la spec §7 (21-sep). **No desplegar hasta después del jueves 24.**

- Previo `/d/[token]`, visita `/admin/d/[id]/visita` (batería v2: 8 bloques, núcleo/profundizar,
  vista privada, sin conexión, grabación + transcripción, notas, encuesta del equipo), cierre,
  resultados `/admin/resultados/[id]`, export para JARVIS, copia a Drive y a la carpeta de JARVIS.
- Encuesta de madurez del equipo `/e/[token]` (`src/lib/madurez.ts`).
- **Mapa (sprint 2) en marcha:** `src/lib/mapa.ts` (mapa_v1 de la spec §7 + validación contra el
  cálculo), `PUT /api/admin/diagnosticos/[id]/mapa` (JARVIS), `/admin/d/[id]/mapa` (vista previa +
  Publicar), `/m/[token]` (cliente). **Se entrega solo como enlace web; no hay PDF** (decisión de
  Aitor, 21-sep). `?imprimir=1` y `scripts/mapa-pdf.mjs` existen solo por si un cliente lo pide.
  Al cliente solo horas; euros solo con **su** coste por hora, escrito en su mapa y sin guardar.
- Revisión del mapa con JARVIS (21-sep, en producción): hallazgos, lo que ya funciona,
  preocupaciones, no rentables, `plazo_orientativo` (semanas, nunca fechas), etiquetas de flecha
  obligatorias en bifurcaciones (prohibidas en tramos lineales), ningún «Con el sistema» sin su
  «Así es hoy», aviso de caducidad del enlace y copia `<fecha>_mapa-publicado.md` a Drive/JARVIS.
  Las reglas nuevas solo se aplican al subir mapas (PUT): el esquema de lectura sigue aceptando los
  guardados (Colino ya no pasaría el PUT: su tarjeta de recordatorios no tiene pasos).
- Avisos de plausibilidad al cerrar la visita (`src/lib/plausibilidad.ts`): avisan, no bloquean;
  quedan en `calculo.avisos_plausibilidad`.
- banco_v1.1 (`src/config/redacciones.ts`): cada respuesta del previo guarda con qué redacción se
  contestó (`respuestas_previo_redaccion`); las contestadas a un texto anterior salen «por
  confirmar en la visita» y no precargan tarjetas (Icónica, `dia.pedidos_mes`). Nunca se tocan
  los datos guardados: se decide al leer.
- Mapa de prueba publicado (visita ficticia «Clínica Colino»): `/m/8KDrahMW30hR-AdO5jIlm`. Lo
  escribió BUILDS para ver la maqueta; Aitor lo revisa con JARVIS.
- **Pendiente:** lo que salga de la revisión del mapa con JARVIS; email al cliente al publicar el
  mapa (evento `diagnostico.mapa_publicado` → n8n, sin montar); CRM de Mission Control; política de
  privacidad (TEMIS); conservación de 12 meses automatizada; lead magnet (sprint 4, necesita spec).

## Reglas específicas

- **Las cifras las calcula `src/lib/calculo.ts`.** La IA redacta; nunca pone números. Topes y
  umbrales sobre el valor sin redondear; el redondeo es solo para mostrar.
- **Campos 🔒 (`privado`, `interno`, `calculo` completo) nunca salen por `/d/*`, `/m/*` ni sus
  APIs.** Selección de columnas explícita, nunca `select *`. En vista cliente de la visita no se
  renderizan ni se cargan en el navegador.
- **Clerk solo en `(panel)`.** El cliente no tiene cuenta y su enlace no navega a nada más.
  Solo entra `aitor@orkestaia.com` (allowlist de Clerk + `src/lib/acceso.ts`).
- Rutas de JARVIS (`export`, `PUT mapa`): fuera de Clerk en el middleware, Bearer
  `DIAGNOSTICO_ADMIN_TOKEN`. Si se añade otra, tocar las dos cosas. Rutas de n8n
  (`/api/motor/*`): cabecera `x-orkesta-token` = `DIAGNOSTICO_MOTOR_TOKEN`.
- `scripts/verificar-config.test.ts` compara la config con los .md de JARVIS. **Si falla después de
  que JARVIS edite un documento, sincronizar el texto de la app con el documento** (manda la spec),
  y avisar a Aitor de qué cambió.
- Emails del motor: diseño CLARO; nada legible puede depender de un fondo (Gmail los borra).
- Comprobar que los tests pasan ANTES de hacer commit (una vez se coló uno en rojo).
- `src/components/diagrama/FlowDiagram.tsx` y las animaciones `ork-diagrama__*` de
  `globals.css` son **copia del portfolio** (`orkesta-web`). Si se mejoran aquí, llevarlo allí.
- DDL: no se ejecuta desde aquí. Se prepara en `supabase/*.sql` y lo ejecuta Aitor. v1-v7
  ejecutados (22-sep). Las columnas nuevas se leen aparte y de forma tolerante (`lib/redaccion.ts`,
  `lib/consentimiento.ts`): si faltan, la app sigue funcionando.
- **Solo hacia adelante:** nada de lo ya guardado se modifica al cambiar reglas o textos; los campos
  nuevos son opcionales y los mapas guardados siguen abriéndose.
- Interruptores (funciones construidas pero apagadas, variable a `1` en Vercel):
  `CONSENTIMIENTO_AGREGADO_ACTIVO` (hasta tener el texto revisado de TEMIS).
- Sin emojis en la UI. Tuteo, España.

## Cómo ejecutar

```bash
npm install
cp .env.example .env.local   # y rellenar
npm run dev
```

## Cómo testear

```bash
npm test          # cálculo, configuración, mapa, encuesta, export y pantalla de la visita
npx tsc --noEmit
npm run lint
```

## Cómo desplegar

`git push` a `main` → Vercel despliega solo. No usar `vercel --prod` a mano. Variables de
entorno en Vercel, marcadas como sensibles; tras cambiarlas, redeploy.

Versión de prueba: cada rama subida tiene su preview en Vercel, **con protección de Vercel** (pide
la sesión de la cuenta de Orkesta) y **contra la base de datos real**. Las variables de entorno de
Preview solo están puestas para la rama `grabacion-pausa` (sin `N8N_WEBHOOK_URL`, para que las
pruebas no avisen a n8n); otra rama necesita las suyas (`vercel env add NOMBRE preview <rama>`).
Comprobar una preview desde aquí: `MSYS_NO_PATHCONV=1 npx vercel curl <ruta> --deployment <url>`.
Comparar con producción sin tocar datos: `next start` en local contra la misma Supabase, huella
(sha256) de las filas antes y después.
