"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ResultadoInvitacion, type DatosInvitacion } from "@/components/panel/ResultadoInvitacion";
import { claseBoton } from "@/components/panel/ui";
import { enlaceWhatsApp, mensajeInvitacion } from "@/lib/invitacion";

export function AccionesFila(p: {
  id: string;
  token: string;
  base: string;
  empresa: string;
  nombre: string;
  telefono: string | null;
  fechaReunion: string | null;
  horaReunion: string | null;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState<"enviar" | "revocar" | null>(null);
  const [nuevo, setNuevo] = useState<DatosInvitacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const enlace = `${p.base}/d/${p.token}`;
  const mensaje = mensajeInvitacion({ nombre: p.nombre, empresa: p.empresa, enlace, fechaReunion: p.fechaReunion, horaReunion: p.horaReunion });
  const datos: DatosInvitacion = nuevo ?? { enlace, mensaje, whatsapp: enlaceWhatsApp(p.telefono, mensaje) };

  async function revocar() {
    setCargando(true);
    setError(null);
    const r = await fetch(`/api/admin/diagnosticos/${p.id}/revocar`, { method: "POST" });
    setCargando(false);
    if (!r.ok) {
      setError("No se ha podido revocar el enlace.");
      return;
    }
    setNuevo(await r.json());
    setAbierto("enviar");
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          className={claseBoton.discreto}
          aria-expanded={abierto === "enviar"}
          onClick={() => setAbierto(abierto === "enviar" ? null : "enviar")}
        >
          Enviar enlace
        </button>
        <a href={datos.enlace} target="_blank" rel="noopener noreferrer" className={claseBoton.discreto}>
          Ver previo
        </a>
        <span className={claseBoton.discreto + " cursor-not-allowed opacity-40"} title="Llega en la fase 5">
          Visita
        </span>
        <button
          type="button"
          className={claseBoton.discreto}
          aria-expanded={abierto === "revocar"}
          onClick={() => setAbierto(abierto === "revocar" ? null : "revocar")}
        >
          Revocar enlace
        </button>
      </div>

      {abierto === "enviar" ? (
        <div className="mt-3 rounded-xl border border-ork-border-hi bg-ork-bg p-4">
          {nuevo ? (
            <p className="mb-3 text-small text-ork-cyan">Enlace nuevo generado. El anterior ya no abre nada.</p>
          ) : null}
          <ResultadoInvitacion datos={datos} />
        </div>
      ) : null}

      {abierto === "revocar" ? (
        <div className="mt-3 rounded-xl border border-[#e5484d]/50 bg-ork-bg p-4">
          <p className="text-ork-text">¿Revocar el enlace de {p.empresa}?</p>
          <p className="mt-1 text-small">
            El enlace actual deja de funcionar y se genera uno nuevo. Las respuestas no se pierden.
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" className={claseBoton.peligro} onClick={revocar} disabled={cargando}>
              {cargando ? "Revocando…" : "Sí, revocar"}
            </button>
            <button type="button" className={claseBoton.discreto} onClick={() => setAbierto(null)}>
              Cancelar
            </button>
          </div>
          {error ? <p className="mt-2 text-small text-[#ff8a8e]">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
