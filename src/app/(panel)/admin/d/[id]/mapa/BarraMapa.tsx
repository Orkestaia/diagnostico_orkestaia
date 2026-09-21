"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { claseBoton } from "@/components/panel/ui";

/** Barra del panel sobre la vista previa del mapa: publicar, despublicar y enlaces. */
export function BarraMapa({ id, token, estado }: { id: string; token: string; estado: string }) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const publicado = estado === "mapa_publicado";

  async function cambiar(metodo: "POST" | "DELETE") {
    setCargando(true);
    setError(null);
    const r = await fetch(`/api/admin/diagnosticos/${id}/publicar`, { method: metodo });
    setCargando(false);
    if (!r.ok) {
      setError("No se ha podido cambiar el estado del mapa.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="solo-pantalla sticky top-0 z-50 border-b border-ork-violet/50 bg-ork-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <p className="text-small">
          <span className="font-mono uppercase tracking-[0.14em] text-[#b58cf0]">Vista previa</span>{" "}
          <span className="text-ork-text-muted">
            ·{" "}
            {publicado
              ? "Publicado: el cliente ya lo puede abrir"
              : "Borrador: el cliente todavía no lo ve"}
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin" className={claseBoton.discreto}>
            Panel
          </Link>
          <a href="?imprimir=1" target="_blank" rel="noopener" className={claseBoton.discreto}>
            Versión PDF
          </a>
          {publicado ? (
            <>
              <a
                href={`/m/${token}`}
                target="_blank"
                rel="noopener"
                className={claseBoton.discreto}
              >
                Abrir como el cliente
              </a>
              <button
                type="button"
                className={claseBoton.peligro}
                onClick={() => cambiar("DELETE")}
                disabled={cargando}
              >
                Volver a borrador
              </button>
            </>
          ) : (
            <button
              type="button"
              className={claseBoton.primario}
              onClick={() => cambiar("POST")}
              disabled={cargando}
            >
              {cargando ? "Publicando…" : "Publicar"}
            </button>
          )}
        </div>
      </div>
      {error ? <p className="px-4 pb-2 text-center text-small text-[#ff8a8e]">{error}</p> : null}
    </div>
  );
}
