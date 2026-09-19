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
"Orkesta Diagnóstico", `app_3JUqcVntdda5YxeTUZNFhxQocEo`, modo desarrollo hasta tener DNS).
Supabase `ORKESTA_OPS_2026` (`ddruuldwacxvvhvhjomm`, compartido con el CRM de Mission Control).
Vitest para `calculo.ts`.

Repo `github.com/Orkestaia/diagnostico_orkestaia`. Vercel: equipo `orkesta-automation`, proyecto
`diagnostico-orkestaia`. Dominio futuro `diagnostico.orkestaia.com` (DNS en Namecheap).

## Reglas específicas

- **Las cifras las calcula `src/lib/calculo.ts`.** La IA redacta; nunca pone números. Topes y
  umbrales sobre el valor sin redondear; el redondeo es solo para mostrar.
- **Campos 🔒 (`privado`, `interno`, `calculo` completo) nunca salen por `/d/*`, `/m/*` ni sus
  APIs.** Selección de columnas explícita, nunca `select *`. En vista cliente de la visita no se
  renderizan ni se cargan en el navegador.
- **Clerk solo en `(panel)`.** El cliente no tiene cuenta y su enlace no navega a nada más.
  Solo entra `aitor@orkestaia.com` (allowlist de Clerk + `src/lib/acceso.ts`).
- Rutas de JARVIS (`export`, `PUT mapa`): fuera de Clerk en el middleware, Bearer
  `DIAGNOSTICO_ADMIN_TOKEN`. Si se añade otra, tocar las dos cosas.
- `src/components/diagrama/FlowDiagram.tsx` y las animaciones `ork-diagrama__*` de
  `globals.css` son **copia del portfolio** (`orkesta-web`). Si se mejoran aquí, llevarlo allí.
- DDL: no se ejecuta desde aquí. Se prepara en `supabase/*.sql` y lo ejecuta Aitor.
- Sin emojis en la UI. Tuteo, España.

## Cómo ejecutar

```bash
npm install
cp .env.example .env.local   # y rellenar
npm run dev
```

## Cómo testear

```bash
npm test          # calculo.ts y configuración
npx tsc --noEmit
npm run lint
```

## Cómo desplegar

`git push` a `main` → Vercel despliega solo. No usar `vercel --prod` a mano. Variables de
entorno en Vercel, marcadas como sensibles; tras cambiarlas, redeploy.
