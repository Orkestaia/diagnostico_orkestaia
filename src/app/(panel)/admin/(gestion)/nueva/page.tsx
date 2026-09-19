import { CATALOGO_SECTORES } from "@/config/catalogoSectores";
import { SECTORES } from "@/config/sectores";
import { ETIQUETA_ORIGEN, ORIGENES } from "@/lib/diagnosticos";
import { FormularioInvitacion } from "./FormularioInvitacion";

export default function NuevaInvitacion() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-h2">Nueva invitación</h1>
      <p className="mt-2">
        Crea el diagnóstico y el enlace del previo. Empresa, nombre, sector y fecha ya le llegan
        puestos al cliente.
      </p>
      <FormularioInvitacion
        catalogo={CATALOGO_SECTORES.map((g) => ({
          grupo: g.grupo,
          tipos: g.tipos.map((t) => ({ etiqueta: t.etiqueta, preguntas: SECTORES[t.sector].nombre })),
        }))}
        origenes={ORIGENES.map((o) => ({ id: o, nombre: ETIQUETA_ORIGEN[o] }))}
      />
    </main>
  );
}
