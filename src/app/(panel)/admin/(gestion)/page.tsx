import Link from "next/link";
import { SECTORES } from "@/config/sectores";
import {
  COLUMNAS_LISTADO,
  ETIQUETA_ESTADO,
  ETIQUETA_ORIGEN,
  type FilaListado,
} from "@/lib/diagnosticos";
import { horaCorta } from "@/lib/calendario";
import { fechaLarga } from "@/lib/invitacion";
import { supabaseAdmin } from "@/lib/supabase";
import { urlBase } from "@/lib/url";
import { AccionesFila } from "./AccionesFila";

export const dynamic = "force-dynamic";

const COLOR_ESTADO: Record<string, string> = {
  invitado: "border-ork-border-hi text-ork-text-muted",
  previo_en_curso: "border-ork-cyan/50 text-ork-cyan",
  previo_completado: "border-ork-cyan text-ork-cyan-hi",
  visita_en_curso: "border-ork-violet text-[#b58cf0]",
  visita_cerrada: "border-ork-violet text-[#b58cf0]",
  mapa_borrador: "border-ork-border-hi text-ork-text",
  mapa_publicado: "border-ork-cyan-hi text-ork-text",
  error: "border-[#e5484d] text-[#ff8a8e]",
};

export default async function Listado() {
  const { data, error } = await supabaseAdmin()
    .from("diagnosticos")
    .select(COLUMNAS_LISTADO)
    .eq("tipo", "diagnostico")
    .order("created_at", { ascending: false })
    .limit(200);
  const filas = (data ?? []) as FilaListado[];
  const base = await urlBase();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-h2">Diagnósticos</h1>

      {error ? (
        <p className="mt-6 rounded-lg border border-[#e5484d]/60 p-4 text-[#ff8a8e]">
          No se ha podido leer la base de datos. Revisa la conexión con Supabase.
        </p>
      ) : filas.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-ork-border-hi p-10 text-center">
          <p className="text-ork-text">Todavía no hay ningún diagnóstico.</p>
          <Link
            href="/admin/nueva"
            className="mt-4 inline-block text-ork-cyan underline-offset-4 hover:underline"
          >
            Crea la primera invitación
          </Link>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-ork-border rounded-2xl border border-ork-border bg-ork-surface-1">
          {filas.map((f) => (
            <li
              key={f.id}
              className="grid gap-3 p-4 md:grid-cols-[1.6fr_1fr_1.2fr] md:items-center"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-ork-text">{f.empresa ?? "Sin empresa"}</p>
                <p className="truncate text-small">
                  {f.contacto_nombre}
                  {f.contacto_email ? ` · ${f.contacto_email}` : ""}
                </p>
              </div>
              <div className="text-small">
                <p className="text-ork-text">
                  {f.tipo_negocio ?? f.subsector ?? SECTORES[f.sector]?.nombre ?? f.sector}
                </p>
                <p className="truncate">{f.origen ? ETIQUETA_ORIGEN[f.origen] : ""}</p>
              </div>
              <div className="text-small">
                <span
                  className={
                    "inline-block rounded-full border px-2.5 py-0.5 font-mono text-[0.75rem] uppercase tracking-[0.08em] " +
                    (COLOR_ESTADO[f.estado] ?? "border-ork-border-hi")
                  }
                >
                  {ETIQUETA_ESTADO[f.estado] ?? f.estado}
                </span>
                <p className="mt-1">
                  {f.fecha_reunion
                    ? `Reunión: ${fechaLarga(f.fecha_reunion)}${horaCorta(f.hora_reunion) ? ` · ${horaCorta(f.hora_reunion)}` : ""}`
                    : "Sin fecha de reunión"}
                </p>
              </div>
              <div className="md:col-span-3">
                <AccionesFila
                  id={f.id}
                  token={f.token}
                  base={base}
                  empresa={f.empresa ?? ""}
                  nombre={f.contacto_nombre ?? ""}
                  telefono={f.contacto_telefono}
                  fechaReunion={f.fecha_reunion}
                  horaReunion={f.hora_reunion}
                  email={f.contacto_email}
                  lugarReunion={f.lugar_reunion}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
