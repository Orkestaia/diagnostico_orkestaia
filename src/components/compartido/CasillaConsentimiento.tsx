"use client";

import { useState } from "react";
import { TEXTO_CONSENTIMIENTO } from "@/config/consentimiento";

/**
 * Casilla del consentimiento agregado. Solo se pinta si la página la activa (interruptor en el
 * servidor). Marcar y desmarcar guarda al momento; desmarcar es retirarlo.
 */
export function CasillaConsentimiento({
  token,
  inicial,
}: {
  token: string;
  inicial: boolean | null;
}) {
  const [acepta, setAcepta] = useState(inicial === true);
  const [estado, setEstado] = useState<"quieto" | "guardando" | "error">("quieto");

  async function cambiar(v: boolean) {
    const antes = acepta;
    setAcepta(v);
    setEstado("guardando");
    try {
      const r = await fetch(`/api/d/${token}/consentimiento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acepta: v }),
      });
      if (!r.ok) throw new Error();
      setEstado("quieto");
    } catch {
      setAcepta(antes);
      setEstado("error");
    }
  }

  return (
    <div className="rounded-2xl border border-ork-border bg-ork-surface-1/80 p-5">
      <label className="flex cursor-pointer items-start gap-3 text-ork-text">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-ork-cyan)]"
          checked={acepta}
          disabled={estado === "guardando"}
          onChange={(e) => void cambiar(e.target.checked)}
        />
        <span>{TEXTO_CONSENTIMIENTO}</span>
      </label>
      {estado === "error" ? (
        <p role="alert" className="mt-2 text-small text-[#ff8a8e]">
          No se ha podido guardar. Revisa la conexión y vuelve a intentarlo.
        </p>
      ) : null}
    </div>
  );
}
