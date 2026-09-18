import "server-only";
import { headers } from "next/headers";

/**
 * Base de los enlaces que se envían al cliente. `DIAGNOSTICO_URL_PUBLICA` manda cuando exista
 * el subdominio (diagnostico.orkestaia.com); mientras tanto, el host desde el que se usa el panel.
 */
export async function urlBase(): Promise<string> {
  const fija = process.env.DIAGNOSTICO_URL_PUBLICA;
  if (fija) return fija.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export const enlacePrevio = (base: string, token: string) => `${base}/d/${token}`;
