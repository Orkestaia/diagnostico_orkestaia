import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { MarcaPanel } from "@/components/mapa/Interactivos";
import { MapaCliente } from "@/components/mapa/MapaCliente";
import { leerMapaAdmin } from "@/lib/datosMapa";
import { BarraMapa } from "./BarraMapa";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mapa (vista previa) · ORKESTA Automatización & IA",
  robots: { index: false, follow: false },
};

/** Vista previa del mapa (spec §5.5): idéntica a la del cliente, con la barra para publicarlo. */
export default async function VistaPreviaMapa({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ imprimir?: string }>;
}) {
  const [{ id }, { imprimir }] = await Promise.all([params, searchParams]);
  if (!z.string().uuid().safeParse(id).success) notFound();
  const datos = await leerMapaAdmin(id);
  if (!datos) notFound();
  return (
    <>
      {imprimir !== "1" ? <BarraMapa id={id} token={datos.token} estado={datos.estado} /> : null}
      <MarcaPanel />
      <MapaCliente datos={datos} imprimir={imprimir === "1"} />
    </>
  );
}
