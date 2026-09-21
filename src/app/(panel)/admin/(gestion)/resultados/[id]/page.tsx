import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { MINIMO_RESPUESTAS } from "@/config/consultor/encuesta";
import { claseBoton } from "@/components/panel/ui";
import { cargarExport } from "@/lib/datosExport";
import { ETIQUETA_ESTADO, type EstadoDiagnostico } from "@/lib/diagnosticos";
import type { FragmentoTranscripcion } from "@/lib/exportar";
import type { Madurez } from "@/lib/madurez";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Resultados · ORKESTA Automatización & IA",
  robots: { index: false, follow: false },
};

/**
 * Resultados de un diagnóstico para Aitor: leer la transcripción y la encuesta del equipo y
 * descargar los mismos archivos que recibe JARVIS. Es del panel, no de la visita: no se enseña
 * al cliente. Las respuestas individuales de la encuesta no aparecen nunca (batería v2 §6).
 */
export default async function Resultados({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const f = await cargarExport(id);
  if (!f) notFound();

  const base = `/api/admin/diagnosticos/${id}/descargar`;
  const fragmentos = f.transcripcion ?? [];
  const temas = f.temas ?? f.transcripcion_temas?.lineas ?? [];

  return (
    <main className="mx-auto max-w-4xl space-y-10 px-4 py-10">
      <div>
        <Link href="/admin" className="text-small text-ork-text-muted hover:text-ork-text">
          ← Diagnósticos
        </Link>
        <h1 className="mt-3 font-display text-h2 text-ork-text">{f.empresa}</h1>
        <p className="text-ork-text-muted">
          {[f.tipo_negocio, ETIQUETA_ESTADO[f.estado as EstadoDiagnostico] ?? f.estado]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <section aria-labelledby="descargas">
        <h2 id="descargas" className="mb-3 font-display text-body-lg text-ork-text">
          Descargar
        </h2>
        <div className="flex flex-wrap gap-2">
          <a href={`${base}?formato=md`} className={claseBoton.primario}>
            Informe completo (.md)
          </a>
          <a
            href={`${base}?formato=transcripcion`}
            className={claseBoton.secundario}
            aria-disabled={!fragmentos.length}
          >
            Transcripción (.md)
          </a>
          <a href={`${base}?formato=json`} className={claseBoton.secundario}>
            Datos (.json)
          </a>
          <Link href={`/admin/d/${id}/visita`} className={claseBoton.secundario}>
            Abrir la visita
          </Link>
        </div>
        <p className="mt-2 text-small text-ork-text-faint">
          Son los mismos archivos que recibe JARVIS. El informe incluye tus notas privadas: no lo
          reenvíes al cliente tal cual.
        </p>
      </section>

      <Transcripcion fragmentos={fragmentos} temas={temas} />
      <Encuesta m={f.madurez ?? null} />
    </main>
  );
}

const reloj = (s: number) =>
  [Math.floor(s / 3600), Math.floor((s % 3600) / 60), Math.floor(s % 60)]
    .map((x) => String(x).padStart(2, "0"))
    .join(":");

function Transcripcion({
  fragmentos,
  temas,
}: {
  fragmentos: FragmentoTranscripcion[];
  temas: string[];
}) {
  const orden = [...fragmentos].sort((a, b) => a.orden - b.orden);
  const inicio = orden[0]?.orden ?? 0;
  const minutos = Math.round(orden.reduce((s, x) => s + (x.duracion_s ?? 0), 0) / 60);
  return (
    <section aria-labelledby="transcripcion" className="space-y-4">
      <h2 id="transcripcion" className="font-display text-body-lg text-ork-text">
        Transcripción de la reunión
      </h2>
      {!orden.length ? (
        <p>Esta visita no se ha grabado.</p>
      ) : (
        <>
          <p className="text-small text-ork-text-muted">
            Unos {minutos} min grabados en {orden.length} fragmentos. El audio ya no existe: se
            borra en cuanto se transcribe.
          </p>
          {temas.length ? (
            <div className="rounded-2xl border border-ork-border bg-ork-surface-1/85 p-5">
              <p className="mb-2 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-ork-cyan">
                Temas de la conversación
              </p>
              <ul className="list-disc space-y-1 pl-5 text-ork-text">
                {temas.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <ol className="space-y-4">
            {orden.map((x) => (
              <li key={x.orden} className="grid gap-1 sm:grid-cols-[5.5rem_1fr]">
                <span className="cifra text-small text-ork-text-faint">
                  {reloj((x.orden - inicio) / 1000)}
                </span>
                <p
                  className={
                    x.estado === "transcrito" && x.texto ? "text-ork-text" : "text-small italic"
                  }
                >
                  {x.estado === "transcrito"
                    ? x.texto || "(sin voz en este fragmento)"
                    : `Fragmento todavía sin transcribir (${x.estado}). Reinténtalo desde la vista privada de la visita.`}
                </p>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

const uno = (x: number | null) =>
  x === null ? "—" : String(Math.round(x * 10) / 10).replace(".", ",");

function Encuesta({ m }: { m: Madurez | null }) {
  return (
    <section aria-labelledby="encuesta" className="space-y-4">
      <h2 id="encuesta" className="font-display text-body-lg text-ork-text">
        Encuesta de madurez del equipo
      </h2>
      {!m || !m.respuestas ? (
        <p>Todavía no ha contestado nadie (o no se ha creado el enlace en el bloque F).</p>
      ) : !m.publicable || !m.empresa ? (
        <p>
          {m.respuestas} respuesta{m.respuestas === 1 ? "" : "s"} por ahora. Los resultados salen
          con {MINIMO_RESPUESTAS} o más, para que nadie sea identificable.
        </p>
      ) : (
        <div className="space-y-5 rounded-2xl border border-ork-border bg-ork-surface-1/85 p-5">
          <p className="text-ork-text">
            {m.respuestas} respuestas ·{" "}
            <span className="font-display text-h3">
              {m.empresa.nombreNivel}{" "}
              <span className="cifra text-ork-cyan-hi">{Math.round(m.empresa.indice)}/100</span>
            </span>{" "}
            · nivel {m.empresa.nivel} de 5
          </p>
          <dl className="grid gap-2 sm:grid-cols-4">
            {(
              [
                ["Uso", m.empresa.dimensiones.uso],
                ["Competencia", m.empresa.dimensiones.competencia],
                ["Seguridad", m.empresa.dimensiones.seguridad],
                ["Actitud", m.empresa.dimensiones.actitud],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <dt className="text-small text-ork-text-muted">{k}</dt>
                <dd className="cifra text-ork-text">{uno(v)} / 4</dd>
              </div>
            ))}
          </dl>
          {m.areas.length ? (
            <div>
              <p className="mb-1 text-small text-ork-text-muted">
                Por áreas (solo las de 3 o más respuestas)
              </p>
              <ul className="space-y-1">
                {m.areas.map((a) => (
                  <li key={a.nombre} className="flex justify-between gap-4">
                    <span>
                      {a.nombre} ({a.respuestas})
                    </span>
                    <span className="cifra text-ork-text">
                      {a.nombreNivel} · {Math.round(a.indice)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {m.formacion.length ? (
            <div>
              <p className="mb-1 text-small text-ork-text-muted">Qué quieren aprender</p>
              <ul className="space-y-1">
                {m.formacion.map((x) => (
                  <li key={x.etiqueta} className="flex justify-between gap-4">
                    <span>{x.etiqueta}</span>
                    <span className="cifra text-ork-text">{x.votos}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {m.alertas.length ? (
            <div>
              <p className="mb-1 text-small text-[#f5c46b]">A tener en cuenta</p>
              <ul className="list-disc space-y-1 pl-5">
                {m.alertas.map((a) => (
                  <li key={a.id + a.texto}>{a.texto}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
      <p className="text-small text-ork-text-faint">
        Las respuestas de cada persona no se enseñan nunca, tampoco aquí: solo el cálculo agregado.
      </p>
    </section>
  );
}
