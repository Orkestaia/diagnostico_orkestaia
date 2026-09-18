"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Respuestas, ValorRespuesta } from "@/config/tipos";

export type EstadoGuardado = "guardado" | "guardando" | "sin_conexion" | "error";

/**
 * Autoguardado del previo: cada respuesta se manda al momento; si falla (sin conexión), se
 * queda en cola y se reintenta hasta que entra. Copia local en localStorage por si se cierra
 * la pestaña sin conexión (comodidad del propio cliente, no fuente de verdad).
 */
export function useAutoguardado(token: string) {
  const pendientes = useRef<Respuestas>({});
  const vuelo = useRef<Promise<boolean> | null>(null);
  const reintento = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [estado, setEstado] = useState<EstadoGuardado>("guardado");
  const clave = `ork-previo:${token}`;

  const copiaLocal = useCallback(() => {
    try {
      if (Object.keys(pendientes.current).length) localStorage.setItem(clave, JSON.stringify(pendientes.current));
      else localStorage.removeItem(clave);
    } catch {
      // Navegación privada o almacenamiento bloqueado: no pasa nada.
    }
  }, [clave]);

  /** Envía un lote. true si entró (o si el previo ya estaba cerrado: 409). */
  const enviar = useCallback(
    async (lote: Respuestas): Promise<boolean> => {
      try {
        const r = await fetch(`/api/d/${token}/respuestas`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ respuestas: lote }),
        });
        return r.ok || r.status === 409;
      } catch {
        return false;
      }
    },
    [token],
  );

  /**
   * Manda todo lo pendiente. Si ya hay un envío en curso, lo ESPERA (antes devolvía "fallo" y
   * el cierre del previo decía "sin conexión" sin motivo). Devuelve true cuando no queda nada.
   */
  const vaciar = useCallback(async (): Promise<boolean> => {
    while (vuelo.current) await vuelo.current;
    const lote = pendientes.current;
    if (Object.keys(lote).length === 0) {
      setEstado("guardado");
      return true;
    }
    pendientes.current = {};
    setEstado("guardando");
    const p = enviar(lote);
    vuelo.current = p;
    const ok = await p;
    vuelo.current = null;

    if (!ok) {
      // Lo que no entró vuelve a la cola, sin pisar respuestas más nuevas.
      pendientes.current = { ...lote, ...pendientes.current };
      copiaLocal();
      setEstado(navigator.onLine ? "error" : "sin_conexion");
      if (reintento.current) clearTimeout(reintento.current);
      reintento.current = setTimeout(() => void vaciar(), 4000);
      return false;
    }
    copiaLocal();
    return vaciar(); // por si entraron respuestas mientras tanto
  }, [enviar, copiaLocal]);

  const guardar = useCallback(
    (id: string, valor: ValorRespuesta) => {
      pendientes.current = { ...pendientes.current, [id]: valor };
      copiaLocal();
      void vaciar();
    },
    [vaciar, copiaLocal],
  );

  /** Recupera lo que quedó sin enviar en una visita anterior (misma máquina). */
  const recuperarLocal = useCallback((): Respuestas => {
    try {
      const v = localStorage.getItem(clave);
      if (!v) return {};
      const r = JSON.parse(v) as Respuestas;
      pendientes.current = { ...r, ...pendientes.current };
      return r;
    } catch {
      return {};
    }
  }, [clave]);

  useEffect(() => {
    const alVolver = () => void vaciar();
    window.addEventListener("online", alVolver);
    return () => {
      window.removeEventListener("online", alVolver);
      if (reintento.current) clearTimeout(reintento.current);
    };
  }, [vaciar]);

  return { estado, guardar, vaciar, recuperarLocal };
}
