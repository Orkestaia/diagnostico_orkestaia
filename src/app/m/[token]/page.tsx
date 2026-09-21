import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapaCliente } from "@/components/mapa/MapaCliente";
import { leerMapaPublico } from "@/lib/datosMapa";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tu mapa de automatización · ORKESTA Automatización & IA",
  robots: { index: false, follow: false },
};

/**
 * El mapa del cliente (spec §6). Sin cuenta: el token de su enlace es la llave, y solo abre si
 * Aitor lo ha publicado. `?imprimir=1` es la versión para imprimir o guardar en PDF.
 */
export default async function PaginaMapa({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ imprimir?: string }>;
}) {
  const [{ token }, { imprimir }] = await Promise.all([params, searchParams]);
  const datos = await leerMapaPublico(token);
  if (!datos) notFound();
  return <MapaCliente datos={datos} imprimir={imprimir === "1"} />;
}
