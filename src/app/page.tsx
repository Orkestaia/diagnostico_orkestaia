/**
 * La raíz no enlaza a nada: el cliente solo entra por su enlace personal y el panel está en
 * /admin (spec §10, sin navegación a otras partes de la app).
 */
export default function Inicio() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <p className="font-display text-h3 text-ork-text">Orkesta</p>
    </main>
  );
}
