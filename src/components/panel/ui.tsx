"use client";

import { useState } from "react";

/** Piezas pequeñas del panel. Sin emojis; todo con los tokens de marca. */

export const claseCampo =
  "w-full rounded-lg border border-ork-border-hi bg-ork-bg px-3 py-2.5 text-ork-text placeholder:text-ork-text-faint focus:border-ork-cyan focus:outline-none";

export const claseBoton = {
  primario:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-ork-cyan px-4 py-2.5 font-medium text-ork-bg transition-colors hover:bg-ork-cyan-hi disabled:opacity-40",
  secundario:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-ork-border-hi px-4 py-2.5 text-ork-text transition-colors hover:border-ork-cyan disabled:opacity-40",
  discreto:
    "inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-small text-ork-text-muted transition-colors hover:bg-ork-surface-2 hover:text-ork-text disabled:opacity-40",
  peligro:
    "inline-flex items-center justify-center gap-1.5 rounded-md border border-[#e5484d]/60 px-2.5 py-1.5 text-small text-[#ff8a8e] transition-colors hover:bg-[#e5484d]/10",
};

export function Etiqueta({ htmlFor, children, opcional }: { htmlFor: string; children: React.ReactNode; opcional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-small text-ork-text">
      {children}
      {opcional ? <span className="ml-1.5 text-ork-text-faint">(opcional)</span> : null}
    </label>
  );
}

/** Botón que copia al portapapeles y confirma durante 2 s. */
export function BotonCopiar({
  texto,
  children,
  className = claseBoton.secundario,
}: {
  texto: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        } catch {
          // Sin permiso de portapapeles: el texto sigue visible para copiarlo a mano.
        }
      }}
    >
      <span aria-live="polite">{copiado ? "Copiado" : children}</span>
    </button>
  );
}
