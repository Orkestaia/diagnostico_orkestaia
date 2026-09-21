"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ResultadoInvitacion, type DatosInvitacion } from "@/components/panel/ResultadoInvitacion";
import { claseBoton } from "@/components/panel/ui";
import { enlaceWhatsApp, mensajeInvitacion } from "@/lib/invitacion";
import { EditarDatos } from "./EditarDatos";

export function AccionesFila(p: {
  id: string;
  token: string;
  base: string;
  empresa: string;
  nombre: string;
  telefono: string | null;
  fechaReunion: string | null;
  horaReunion: string | null;
  email: string | null;
  lugarReunion: string | null;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState<"enviar" | "revocar" | "borrar" | "editar" | null>(null);
  const [confirmacion, setConfirmacion] = useState("");
  const [nuevo, setNuevo] = useState<DatosInvitacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const enlace = `${p.base}/d/${p.token}`;
  const mensaje = mensajeInvitacion({
    nombre: p.nombre,
    empresa: p.empresa,
    enlace,
    fechaReunion: p.fechaReunion,
    horaReunion: p.horaReunion,
  });
  const datos: DatosInvitacion = nuevo ?? {
    enlace,
    mensaje,
    whatsapp: enlaceWhatsApp(p.telefono, mensaje),
  };

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

  async function borrar() {
    setCargando(true);
    setError(null);
    const r = await fetch(`/api/admin/diagnosticos/${p.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa: confirmacion }),
    });
    setCargando(false);
    if (!r.ok) {
      setError(r.status === 409 ? "El nombre no coincide." : "No se ha podido borrar.");
      return;
    }
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
        <a
          href={datos.enlace}
          target="_blank"
          rel="noopener noreferrer"
          className={claseBoton.discreto}
        >
          Ver previo
        </a>
        <Link href={`/admin/d/${p.id}/visita`} className={claseBoton.discreto}>
          Visita
        </Link>
        <Link href={`/admin/resultados/${p.id}`} className={claseBoton.discreto}>
          Resultados
        </Link>
        <button
          type="button"
          className={claseBoton.discreto}
          aria-expanded={abierto === "editar"}
          onClick={() => setAbierto(abierto === "editar" ? null : "editar")}
        >
          Editar datos
        </button>
        <button
          type="button"
          className={claseBoton.discreto}
          aria-expanded={abierto === "revocar"}
          onClick={() => setAbierto(abierto === "revocar" ? null : "revocar")}
        >
          Revocar enlace
        </button>
        <button
          type="button"
          className={claseBoton.discreto}
          aria-expanded={abierto === "borrar"}
          onClick={() => {
            setConfirmacion("");
            setError(null);
            setAbierto(abierto === "borrar" ? null : "borrar");
          }}
        >
          Borrar
        </button>
      </div>

      {abierto === "enviar" ? (
        <div className="mt-3 rounded-xl border border-ork-border-hi bg-ork-bg p-4">
          {nuevo ? (
            <p className="mb-3 text-small text-ork-cyan">
              Enlace nuevo generado. El anterior ya no abre nada.
            </p>
          ) : null}
          <ResultadoInvitacion datos={datos} />
        </div>
      ) : null}

      {abierto === "editar" ? (
        <EditarDatos
          id={p.id}
          onCerrar={() => setAbierto(null)}
          inicial={{
            empresa: p.empresa,
            contacto_nombre: p.nombre,
            contacto_email: p.email ?? "",
            contacto_telefono: p.telefono ?? "",
            fecha_reunion: p.fechaReunion ?? "",
            hora_reunion: (p.horaReunion ?? "").slice(0, 5),
            lugar_reunion: p.lugarReunion ?? "",
          }}
        />
      ) : null}

      {abierto === "borrar" ? (
        <div className="mt-3 rounded-xl border border-[#e5484d]/50 bg-ork-bg p-4">
          <p className="text-ork-text">¿Borrar el diagnóstico de {p.empresa}?</p>
          <p className="mt-1 text-small">
            Se va todo: respuestas del previo, visita, tarjetas, notas privadas, grabación y
            encuesta del equipo. No se puede deshacer.
          </p>
          <label className="mt-3 block text-small">
            Escribe <span className="text-ork-text">{p.empresa}</span> para confirmarlo:
            <input
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
              className="mt-1 w-full max-w-sm rounded-lg border border-ork-border-hi bg-ork-bg px-3 py-2 text-ork-text focus:border-ork-cyan focus:outline-none"
            />
          </label>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className={claseBoton.peligro}
              onClick={borrar}
              disabled={cargando || confirmacion !== p.empresa}
            >
              {cargando ? "Borrando…" : "Sí, borrar"}
            </button>
            <button type="button" className={claseBoton.discreto} onClick={() => setAbierto(null)}>
              Cancelar
            </button>
          </div>
          {error ? <p className="mt-2 text-small text-[#ff8a8e]">{error}</p> : null}
        </div>
      ) : null}

      {abierto === "revocar" ? (
        <div className="mt-3 rounded-xl border border-[#e5484d]/50 bg-ork-bg p-4">
          <p className="text-ork-text">¿Revocar el enlace de {p.empresa}?</p>
          <p className="mt-1 text-small">
            El enlace actual deja de funcionar y se genera uno nuevo. Las respuestas no se pierden.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className={claseBoton.peligro}
              onClick={revocar}
              disabled={cargando}
            >
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
