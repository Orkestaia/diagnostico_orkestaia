import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SECTORES } from "@/config/sectores";
import { leerPrevio, paraCliente } from "@/lib/datosPrevio";
import { ESTADOS_PREVIO_EDITABLE } from "@/lib/previo";
import { resumenFinal } from "@/lib/resumenPrevio";
import { Previo } from "./Previo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tu diagnóstico · ORKESTA Automatización & IA",
  robots: { index: false, follow: false },
};

/** Previo del cliente (spec §3). Sin cuenta: el token del enlace es la única llave. */
export default async function PaginaPrevio({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const d = await leerPrevio(token);
  if (!d) notFound();

  const completado = !(ESTADOS_PREVIO_EDITABLE as readonly string[]).includes(d.estado);
  return (
    <Previo
      token={token}
      datos={paraCliente(d)}
      avisoFijo={SECTORES[d.sector].avisoFijo ?? null}
      resumenInicial={completado ? resumenFinal(d.respuestas_previo, d.sector, d.informe) : null}
    />
  );
}
