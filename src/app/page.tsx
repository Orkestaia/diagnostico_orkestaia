import { Marca } from "@/components/compartido/Marca";

/**
 * La raíz no enlaza a nada: el cliente solo entra por su enlace personal y el panel está en
 * /admin (spec §10, sin navegación a otras partes de la app).
 */
export default function Inicio() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <Marca className="text-h3" />
      <p className="max-w-sm text-ork-text-muted">
        Esta página no lleva a ningún sitio. Si te hemos pasado un enlace personal para tu
        diagnóstico, entra por él.
      </p>
    </main>
  );
}
