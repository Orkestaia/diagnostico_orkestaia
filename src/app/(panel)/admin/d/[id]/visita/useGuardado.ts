"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { unirParches, type ParcheVisita } from "@/lib/visita";

/**
 * Guardado de la visita con cola sin conexión (spec §4 "Conexión inestable").
 *
 * Cada cambio se une a un parche pendiente que se guarda también en IndexedDB (en el dispositivo
 * de Aitor) y se envía al servidor. Si no hay red, se queda en la cola y se reintenta; al volver
 * la conexión, se sincroniza. Si se recarga la página, lo pendiente se recupera de IndexedDB.
 */

export type EstadoGuardado = "guardado" | "guardando" | "sin_conexion" | "error";

const BD = "ork-visita";
const ALMACEN = "cola";

function abrir(): Promise<IDBDatabase | null> {
  return new Promise((ok) => {
    try {
      const r = indexedDB.open(BD, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(ALMACEN);
      r.onsuccess = () => ok(r.result);
      r.onerror = () => ok(null);
    } catch {
      ok(null);
    }
  });
}

async function leerCola(id: string): Promise<ParcheVisita | null> {
  const db = await abrir();
  if (!db) return null;
  return new Promise((ok) => {
    const r = db.transaction(ALMACEN, "readonly").objectStore(ALMACEN).get(id);
    r.onsuccess = () => ok((r.result as ParcheVisita) ?? null);
    r.onerror = () => ok(null);
  });
}

async function escribirCola(id: string, p: ParcheVisita | null): Promise<void> {
  const db = await abrir();
  if (!db) return;
  await new Promise<void>((ok) => {
    const tx = db.transaction(ALMACEN, "readwrite");
    if (p) tx.objectStore(ALMACEN).put(p, id);
    else tx.objectStore(ALMACEN).delete(id);
    tx.oncomplete = () => ok();
    tx.onerror = () => ok();
  });
}

export function useGuardado(id: string, onRecuperado?: (p: ParcheVisita) => void) {
  const pendiente = useRef<ParcheVisita | null>(null);
  const vuelo = useRef<Promise<boolean> | null>(null);
  const reintento = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [estado, setEstado] = useState<EstadoGuardado>("guardado");

  const enviar = useCallback(
    async (p: ParcheVisita) => {
      try {
        const r = await fetch(`/api/admin/diagnosticos/${id}/visita`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(p),
        });
        return r.ok || r.status === 409;
      } catch {
        return false;
      }
    },
    [id],
  );

  const vaciar = useCallback(async (): Promise<boolean> => {
    while (vuelo.current) await vuelo.current;
    const p = pendiente.current;
    if (!p) {
      setEstado("guardado");
      return true;
    }
    pendiente.current = null;
    setEstado("guardando");
    const envio = enviar(p);
    vuelo.current = envio;
    const ok = await envio;
    vuelo.current = null;
    if (!ok) {
      pendiente.current = pendiente.current ? unirParches(p, pendiente.current) : p;
      await escribirCola(id, pendiente.current);
      setEstado(navigator.onLine ? "error" : "sin_conexion");
      if (reintento.current) clearTimeout(reintento.current);
      reintento.current = setTimeout(() => void vaciar(), 5000);
      return false;
    }
    await escribirCola(id, pendiente.current);
    return vaciar();
  }, [enviar, id]);

  // Junta cambios seguidos (teclear) en un solo envío.
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const encolar = useCallback(
    (p: ParcheVisita) => {
      pendiente.current = pendiente.current ? unirParches(pendiente.current, p) : p;
      void escribirCola(id, pendiente.current);
      setEstado("guardando");
      if (temporizador.current) clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => void vaciar(), 600);
    },
    [id, vaciar],
  );

  // Al abrir: lo que quedó pendiente en este dispositivo se recupera y se reenvía.
  useEffect(() => {
    void leerCola(id).then((p) => {
      if (!p) return;
      onRecuperado?.(p);
      pendiente.current = pendiente.current ? unirParches(p, pendiente.current) : p;
      void vaciar();
    });
    const alVolver = () => void vaciar();
    window.addEventListener("online", alVolver);
    const antesDeSalir = (e: BeforeUnloadEvent) => {
      if (pendiente.current || vuelo.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", antesDeSalir);
    return () => {
      window.removeEventListener("online", alVolver);
      window.removeEventListener("beforeunload", antesDeSalir);
      if (reintento.current) clearTimeout(reintento.current);
      if (temporizador.current) clearTimeout(temporizador.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return { estado, encolar, vaciar };
}
