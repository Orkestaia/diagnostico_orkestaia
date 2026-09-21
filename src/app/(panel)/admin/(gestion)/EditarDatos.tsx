"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { claseBoton, claseCampo } from "@/components/panel/ui";

/**
 * Corregir los datos de contacto y de la reunión sin tocar la base de datos a mano (un email mal
 * escrito hace que el «recibido» rebote). El tipo de negocio no se cambia: decide las preguntas.
 */
export interface DatosEditables {
  empresa: string;
  contacto_nombre: string;
  contacto_email: string;
  contacto_telefono: string;
  fecha_reunion: string;
  hora_reunion: string;
  lugar_reunion: string;
}

const CAMPOS: { id: keyof DatosEditables; etiqueta: string; tipo?: string }[] = [
  { id: "empresa", etiqueta: "Empresa" },
  { id: "contacto_nombre", etiqueta: "Nombre" },
  { id: "contacto_email", etiqueta: "Email", tipo: "email" },
  { id: "contacto_telefono", etiqueta: "Teléfono", tipo: "tel" },
  { id: "fecha_reunion", etiqueta: "Fecha de la reunión", tipo: "date" },
  { id: "hora_reunion", etiqueta: "Hora", tipo: "time" },
  { id: "lugar_reunion", etiqueta: "Lugar" },
];

export function EditarDatos({
  id,
  inicial,
  onCerrar,
}: {
  id: string;
  inicial: DatosEditables;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const [d, setD] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cambiados = Object.fromEntries(
    (Object.keys(d) as (keyof DatosEditables)[])
      .filter((k) => d[k] !== inicial[k])
      .map((k) => [k, d[k]]),
  );

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!Object.keys(cambiados).length) return onCerrar();
    // Sin fecha no tiene sentido una hora.
    if (cambiados.fecha_reunion === "") cambiados.hora_reunion = "";
    setGuardando(true);
    setError(null);
    const r = await fetch(`/api/admin/diagnosticos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cambiados),
    });
    setGuardando(false);
    if (!r.ok) {
      setError(
        r.status === 400
          ? "Revisa los datos: algún campo no es válido."
          : "No se ha podido guardar.",
      );
      return;
    }
    router.refresh();
    onCerrar();
  }

  return (
    <form onSubmit={guardar} className="mt-3 rounded-xl border border-ork-border-hi bg-ork-bg p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {CAMPOS.map((c) => (
          <label key={c.id} className="block text-small">
            {c.etiqueta}
            <input
              type={c.tipo ?? "text"}
              value={d[c.id]}
              required={
                c.id === "empresa" || c.id === "contacto_nombre" || c.id === "contacto_email"
              }
              onChange={(e) => setD({ ...d, [c.id]: e.target.value })}
              className={claseCampo + " mt-1"}
            />
          </label>
        ))}
      </div>
      <p className="mt-2 text-small text-ork-text-faint">
        Si cambias la fecha o la hora, recuerda avisar al cliente: esto no le manda nada.
      </p>
      <div className="mt-3 flex gap-2">
        <button type="submit" className={claseBoton.primario} disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        <button type="button" className={claseBoton.discreto} onClick={onCerrar}>
          Cancelar
        </button>
      </div>
      {error ? <p className="mt-2 text-small text-[#ff8a8e]">{error}</p> : null}
    </form>
  );
}
