"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { BOTON, BOTON_PRIMARIO } from "./campos";

/**
 * Grabación de la reunión (decisión de Aitor, 19-sep).
 *
 * - Antes de grabar, el cliente da su consentimiento (queda registrado con fecha en el servidor).
 * - Se graba en fragmentos de 5 min: cada uno es un archivo completo que se transcribe por
 *   separado y cabe de sobra en una petición (32 kbps ≈ 1,2 MB).
 * - Cada fragmento va primero a IndexedDB y luego se sube. Sin conexión, espera en la cola.
 *   Si se recarga la página, lo pendiente se sube al volver.
 * - Mientras se graba se pide al sistema que no apague la pantalla (Wake Lock).
 */

export const MS_FRAGMENTO = 5 * 60 * 1000;
const BITS_POR_SEGUNDO = 32000;
const BD = "ork-grabacion";
const ALMACEN = "fragmentos";

interface FragmentoLocal {
  clave: string;
  diagnostico: string;
  orden: number;
  duracion: number;
  audio: Blob;
}

function abrir(): Promise<IDBDatabase | null> {
  return new Promise((ok) => {
    try {
      const r = indexedDB.open(BD, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(ALMACEN, { keyPath: "clave" });
      r.onsuccess = () => ok(r.result);
      r.onerror = () => ok(null);
    } catch {
      ok(null);
    }
  });
}

async function guardarLocal(f: FragmentoLocal) {
  const db = await abrir();
  if (!db) return;
  await new Promise<void>((ok) => {
    const tx = db.transaction(ALMACEN, "readwrite");
    tx.objectStore(ALMACEN).put(f);
    tx.oncomplete = () => ok();
    tx.onerror = () => ok();
  });
}

async function pendientesLocales(diagnostico: string): Promise<FragmentoLocal[]> {
  const db = await abrir();
  if (!db) return [];
  return new Promise((ok) => {
    const r = db.transaction(ALMACEN, "readonly").objectStore(ALMACEN).getAll();
    r.onsuccess = () =>
      ok(
        ((r.result as FragmentoLocal[]) ?? [])
          .filter((f) => f.diagnostico === diagnostico)
          .sort((a, b) => a.orden - b.orden),
      );
    r.onerror = () => ok([]);
  });
}

async function borrarLocal(clave: string) {
  const db = await abrir();
  if (!db) return;
  await new Promise<void>((ok) => {
    const tx = db.transaction(ALMACEN, "readwrite");
    tx.objectStore(ALMACEN).delete(clave);
    tx.oncomplete = () => ok();
    tx.onerror = () => ok();
  });
}

function tipoAudio(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

type Estado = "parada" | "pidiendo" | "grabando" | "error";

interface Ctx {
  estado: Estado;
  error: string | null;
  consentimiento: string | null;
  segundos: number;
  enCola: number;
  resumen: { total: number; transcritos: number; errores: number };
  darConsentimiento: () => Promise<boolean>;
  empezar: () => Promise<void>;
  parar: () => void;
  reintentar: () => Promise<void>;
}

const Contexto = createContext<Ctx | null>(null);
export function useGrabacion() {
  const c = useContext(Contexto);
  if (!c) throw new Error("useGrabacion fuera de Grabacion");
  return c;
}

export function Grabacion({ id, children }: { id: string; children: React.ReactNode }) {
  const [estado, setEstado] = useState<Estado>("parada");
  const [error, setError] = useState<string | null>(null);
  const [consentimiento, setConsentimiento] = useState<string | null>(null);
  const [segundos, setSegundos] = useState(0);
  const [enCola, setEnCola] = useState(0);
  const [resumen, setResumen] = useState({ total: 0, transcritos: 0, errores: 0 });

  const flujo = useRef<MediaStream | null>(null);
  const grabador = useRef<MediaRecorder | null>(null);
  const corte = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activa = useRef(false);
  const bloqueo = useRef<{ release: () => Promise<void> } | null>(null);
  const subiendo = useRef(false);
  const inicioSesion = useRef(0);

  const refrescar = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/diagnosticos/${id}/grabacion`, { cache: "no-store" });
      if (!r.ok) return;
      const j = (await r.json()) as {
        consentimiento_at: string | null;
        fragmentos: { estado: string }[];
      };
      setConsentimiento(j.consentimiento_at);
      setResumen({
        total: j.fragmentos.length,
        transcritos: j.fragmentos.filter((f) => f.estado === "transcrito").length,
        errores: j.fragmentos.filter((f) => f.estado === "error").length,
      });
    } catch {
      // Sin conexión: se verá al volver.
    }
  }, [id]);

  const subirCola = useCallback(async () => {
    if (subiendo.current) return;
    subiendo.current = true;
    try {
      const cola = await pendientesLocales(id);
      setEnCola(cola.length);
      for (const f of cola) {
        const form = new FormData();
        form.append("audio", f.audio, `fragmento-${f.orden}`);
        form.append("orden", String(f.orden));
        form.append("duracion", String(f.duracion));
        let r: Response;
        try {
          r = await fetch(`/api/admin/diagnosticos/${id}/grabacion`, {
            method: "POST",
            body: form,
          });
        } catch {
          break; // Sin conexión: se reintenta luego.
        }
        // 2xx: recibido. 400/413/415: nunca va a entrar; se descarta para no atascar la cola.
        if (r.ok || [400, 413, 415].includes(r.status)) {
          if (!r.ok) console.error("[grabacion] fragmento descartado", r.status);
          await borrarLocal(f.clave);
          setEnCola((n) => Math.max(0, n - 1));
        } else break;
      }
    } finally {
      subiendo.current = false;
      void refrescar();
    }
  }, [id, refrescar]);

  // Al abrir: estado del servidor y lo que quedara en la cola de este dispositivo.
  useEffect(() => {
    void refrescar();
    void subirCola();
    const t = setInterval(() => void subirCola(), 15000);
    const alVolver = () => void subirCola();
    window.addEventListener("online", alVolver);
    return () => {
      clearInterval(t);
      window.removeEventListener("online", alVolver);
    };
  }, [refrescar, subirCola]);

  // Contador visible mientras se graba.
  useEffect(() => {
    if (estado !== "grabando") return;
    const t = setInterval(
      () => setSegundos(Math.round((Date.now() - inicioSesion.current) / 1000)),
      1000,
    );
    return () => clearInterval(t);
  }, [estado]);

  // No salir de la página a mitad de un fragmento.
  useEffect(() => {
    if (estado !== "grabando") return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [estado]);

  const nuevoFragmento = useCallback(() => {
    const stream = flujo.current;
    if (!stream) return;
    const tipo = tipoAudio();
    const rec = new MediaRecorder(stream, {
      ...(tipo ? { mimeType: tipo } : {}),
      audioBitsPerSecond: BITS_POR_SEGUNDO,
    });
    const trozos: Blob[] = [];
    const inicio = Date.now();
    rec.ondataavailable = (e) => e.data.size && trozos.push(e.data);
    rec.onstop = async () => {
      const audio = new Blob(trozos, {
        type: (rec.mimeType || tipo || "audio/webm").split(";")[0],
      });
      if (audio.size > 0) {
        await guardarLocal({
          clave: `${id}:${inicio}`,
          diagnostico: id,
          orden: inicio,
          duracion: (Date.now() - inicio) / 1000,
          audio,
        });
        setEnCola((n) => n + 1);
        void subirCola();
      }
      if (activa.current) nuevoFragmento();
    };
    rec.start(10000);
    grabador.current = rec;
    corte.current = setTimeout(() => rec.state !== "inactive" && rec.stop(), MS_FRAGMENTO);
  }, [id, subirCola]);

  const darConsentimiento = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/diagnosticos/${id}/grabacion/consentimiento`, {
        method: "POST",
      });
      if (!r.ok) throw new Error();
      const j = await r.json();
      setConsentimiento(j.consentimiento_at);
      return true;
    } catch {
      setError("No se ha podido registrar el consentimiento. Revisa la conexión.");
      return false;
    }
  }, [id]);

  const empezar = useCallback(async () => {
    setError(null);
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setEstado("error");
      setError("Este navegador no puede grabar audio.");
      return;
    }
    setEstado("pidiendo");
    try {
      flujo.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch {
      setEstado("error");
      setError("Sin permiso para el micrófono. Actívalo en el navegador y vuelve a intentarlo.");
      return;
    }
    activa.current = true;
    inicioSesion.current = Date.now();
    setSegundos(0);
    nuevoFragmento();
    setEstado("grabando");
    try {
      const wl = (
        navigator as unknown as {
          wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
        }
      ).wakeLock;
      bloqueo.current = (await wl?.request("screen")) ?? null;
    } catch {
      // Sin Wake Lock: la pantalla puede apagarse; en iPad eso corta la grabación.
    }
  }, [nuevoFragmento]);

  const parar = useCallback(() => {
    activa.current = false;
    if (corte.current) clearTimeout(corte.current);
    if (grabador.current && grabador.current.state !== "inactive") grabador.current.stop();
    // Soltar el micrófono cuando el último fragmento ya se ha cerrado.
    setTimeout(() => {
      flujo.current?.getTracks().forEach((t) => t.stop());
      flujo.current = null;
    }, 300);
    void bloqueo.current?.release().catch(() => {});
    bloqueo.current = null;
    setEstado("parada");
  }, []);

  // Si el micrófono se corta solo (auriculares desconectados, pantalla bloqueada), se avisa.
  useEffect(() => {
    if (estado !== "grabando") return;
    const pista = flujo.current?.getAudioTracks()[0];
    if (!pista) return;
    const fin = () => {
      parar();
      setEstado("error");
      setError("El micrófono se ha cortado. Lo grabado está a salvo; pulsa Grabar para seguir.");
    };
    pista.addEventListener("ended", fin);
    return () => pista.removeEventListener("ended", fin);
  }, [estado, parar]);

  useEffect(() => () => (activa.current ? parar() : undefined), [parar]);

  const reintentar = useCallback(async () => {
    await subirCola();
    await fetch(`/api/admin/diagnosticos/${id}/grabacion/transcribir`, { method: "POST" }).catch(
      () => {},
    );
    await refrescar();
  }, [id, refrescar, subirCola]);

  return (
    <Contexto.Provider
      value={{
        estado,
        error,
        consentimiento,
        segundos,
        enCola,
        resumen,
        darConsentimiento,
        empezar,
        parar,
        reintentar,
      }}
    >
      {children}
    </Contexto.Provider>
  );
}

const reloj = (s: number) =>
  `${Math.floor(s / 3600) ? `${Math.floor(s / 3600)}:` : ""}${String(Math.floor((s % 3600) / 60)).padStart(Math.floor(s / 3600) ? 2 : 1, "0")}:${String(s % 60).padStart(2, "0")}`;

/** Botón de la cabecera. Visible para el cliente: grabar es algo que tiene que ver. */
export function BotonGrabar() {
  const g = useGrabacion();
  const [pidiendoPermiso, setPidiendoPermiso] = useState(false);
  const grabando = g.estado === "grabando";

  return (
    <>
      <button
        type="button"
        aria-pressed={grabando}
        onClick={() => {
          if (grabando) g.parar();
          else if (!g.consentimiento) setPidiendoPermiso(true);
          else void g.empezar();
        }}
        title={grabando ? "Parar la grabación" : "Grabar la reunión"}
        className={
          "flex h-10 items-center gap-2 rounded-full border px-3 text-small transition-colors " +
          (grabando
            ? "border-[#e5484d] bg-[#e5484d]/10 text-ork-text"
            : "border-ork-border-hi text-ork-text-muted hover:text-ork-text")
        }
      >
        <span
          aria-hidden="true"
          className={
            "h-2.5 w-2.5 rounded-full " +
            (grabando ? "animate-pulse bg-[#e5484d]" : "bg-ork-text-faint")
          }
        />
        <span className="cifra">
          {grabando
            ? `Grabando ${reloj(g.segundos)}`
            : g.estado === "pidiendo"
              ? "Micrófono…"
              : "Grabar"}
        </span>
      </button>

      {pidiendoPermiso ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-consentimiento"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
        >
          <div className="max-w-md space-y-4 rounded-2xl border border-ork-border-hi bg-ork-surface-1 p-6">
            <h2 id="titulo-consentimiento" className="font-display text-h3 text-ork-text">
              ¿Grabamos la reunión?
            </h2>
            <p>
              Solo para transcribirla y que no se nos escape nada de lo que nos cuentes. El audio se
              borra en cuanto está transcrito; el texto se queda con tu diagnóstico y no se comparte
              con nadie.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className={BOTON} onClick={() => setPidiendoPermiso(false)}>
                No grabar
              </button>
              <button
                type="button"
                className={BOTON_PRIMARIO}
                onClick={async () => {
                  setPidiendoPermiso(false);
                  if (await g.darConsentimiento()) await g.empezar();
                }}
              >
                Sí, acepto
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {g.error ? (
        <div
          role="alert"
          className="fixed inset-x-4 top-24 z-50 mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl border border-[#e5484d]/60 bg-ork-surface-1 px-5 py-3 shadow-xl"
        >
          <p className="text-small text-ork-text">{g.error}</p>
        </div>
      ) : null}
    </>
  );
}

/** Estado de la transcripción (en la vista privada). */
export function EstadoTranscripcion() {
  const g = useGrabacion();
  const { total, transcritos, errores } = g.resumen;
  if (!total && !g.enCola && !g.consentimiento) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 text-small">
      <span>
        Grabación: {total} fragmento{total === 1 ? "" : "s"} · {transcritos} transcrito
        {transcritos === 1 ? "" : "s"}
        {errores ? ` · ${errores} con error` : ""}
        {g.enCola ? ` · ${g.enCola} por subir` : ""}
      </span>
      {errores || g.enCola || total > transcritos ? (
        <button
          type="button"
          className="underline hover:text-ork-text"
          onClick={() => void g.reintentar()}
        >
          Reintentar
        </button>
      ) : null}
    </div>
  );
}
