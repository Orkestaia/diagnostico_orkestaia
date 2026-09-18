"use client";

import { BotonCopiar, claseBoton, claseCampo } from "./ui";

export interface DatosInvitacion {
  enlace: string;
  mensaje: string;
  whatsapp: string | null;
}

/** Enlace del previo + mensaje de WhatsApp listo para copiar y, si hay teléfono, abrir (spec §3). */
export function ResultadoInvitacion({ datos }: { datos: DatosInvitacion }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-1.5 text-small text-ork-text">Enlace del previo</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input readOnly value={datos.enlace} className={claseCampo + " font-mono text-small"} aria-label="Enlace del previo" />
          <BotonCopiar texto={datos.enlace}>Copiar enlace</BotonCopiar>
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-small text-ork-text">Mensaje de WhatsApp</p>
        <textarea
          readOnly
          value={datos.mensaje}
          rows={8}
          className={claseCampo + " resize-y leading-relaxed"}
          aria-label="Mensaje de WhatsApp"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <BotonCopiar texto={datos.mensaje} className={claseBoton.primario}>
            Copiar mensaje
          </BotonCopiar>
          {datos.whatsapp ? (
            <a href={datos.whatsapp} target="_blank" rel="noopener noreferrer" className={claseBoton.secundario}>
              Abrir WhatsApp
            </a>
          ) : (
            <p className="self-center text-small text-ork-text-faint">Sin teléfono: cópialo y envíalo tú.</p>
          )}
        </div>
      </div>
    </div>
  );
}
