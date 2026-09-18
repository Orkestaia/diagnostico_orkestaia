import { SignOutButton, UserButton } from "@clerk/nextjs";
import { esAdmin } from "@/lib/acceso";

export const dynamic = "force-dynamic";

export default async function Panel() {
  if (!(await esAdmin())) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-ork-text">Esta cuenta no tiene acceso al panel.</p>
        <SignOutButton>
          <button className="rounded-lg border border-ork-border-hi px-4 py-2 text-ork-text">
            Salir
          </button>
        </SignOutButton>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-h3">Diagnósticos</h1>
        <UserButton />
      </header>
      <p className="mt-8">El listado y las invitaciones llegan en la fase 3.</p>
    </main>
  );
}
