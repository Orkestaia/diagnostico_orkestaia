import "server-only";
import { timingSafeEqual } from "node:crypto";
import { currentUser } from "@clerk/nextjs/server";

/**
 * La única persona que entra al panel (spec §1). Se comprueba aquí además de en la lista de
 * permitidos de Clerk: si alguien cambia la configuración de Clerk, el código sigue cerrando.
 * No es un secreto, por eso no va en variables de entorno.
 */
export const EMAIL_ADMIN = "aitor@orkestaia.com";

/** true solo si hay sesión y el email principal, verificado, es el de Aitor. */
export async function esAdmin(): Promise<boolean> {
  const usuario = await currentUser();
  if (!usuario) return false;
  const principal = usuario.emailAddresses.find((e) => e.id === usuario.primaryEmailAddressId);
  return (
    principal?.emailAddress.toLowerCase() === EMAIL_ADMIN &&
    principal.verification?.status === "verified"
  );
}

/** Para las rutas de API del panel: devuelve la respuesta de error, o null si puede seguir. */
export async function exigirAdmin(): Promise<Response | null> {
  if (await esAdmin()) return null;
  return Response.json({ error: "Sin acceso" }, { status: 403 });
}

/**
 * Para las rutas de JARVIS: `Authorization: Bearer <DIAGNOSTICO_ADMIN_TOKEN>`.
 * Comparación en tiempo constante. Sin token configurado, todo se rechaza.
 */
export function exigirTokenJarvis(req: Request): Response | null {
  const esperado = process.env.DIAGNOSTICO_ADMIN_TOKEN;
  const recibido = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (esperado && esperado.length >= 32) {
    const a = Buffer.from(recibido);
    const b = Buffer.from(esperado);
    if (a.length === b.length && timingSafeEqual(a, b)) return null;
  }
  return Response.json({ error: "No autorizado" }, { status: 401 });
}
