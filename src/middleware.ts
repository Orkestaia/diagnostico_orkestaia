import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Clerk solo existe en el panel (spec §1 y §10).
 *
 * - El cliente no tiene cuenta: `/d/*`, `/m/*` y sus APIs quedan FUERA del matcher, así que
 *   este middleware ni se ejecuta en ellas. Las protege el token del enlace.
 * - Las dos rutas de JARVIS (`export` y `PUT mapa`) cuelgan de `/api/admin` pero no tienen
 *   sesión de navegador: se saltan Clerk A PROPÓSITO y cada una valida el Bearer
 *   `DIAGNOSTICO_ADMIN_TOKEN` (`src/lib/acceso.ts`). Si se añade otra ruta para JARVIS, hay que
 *   incluirla aquí Y darle la comprobación del token.
 * - Estar logueado no basta: `exigirAdmin()` comprueba además que el email es el de Aitor.
 */
const esRutaJarvis = createRouteMatcher([
  "/api/admin/diagnosticos/(.*)/export",
  "/api/admin/diagnosticos/(.*)/mapa",
]);

const esRutaPrivada = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (esRutaJarvis(req)) return;
  if (esRutaPrivada(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/admin(.*)",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/api/admin(.*)",
    // Proxy de Clerk: si se deja fuera, el propio login entra en bucle.
    "/__clerk/:path*",
  ],
};
