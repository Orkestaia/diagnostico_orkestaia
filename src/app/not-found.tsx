import { Marca } from "@/components/compartido/Marca";

/**
 * 404 neutro: un enlace revocado, mal copiado o inexistente no da pistas de nada más
 * (spec §10: el cliente no navega a ninguna otra parte de la app).
 */
export default function NoEncontrado() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Marca className="text-body-lg" />
      <div>
        <h1 className="font-display text-h3">Este enlace no está disponible</h1>
        <p className="mt-2">Puede que haya caducado o que se haya copiado incompleto. Escríbenos y te enviamos uno nuevo.</p>
      </div>
    </main>
  );
}
