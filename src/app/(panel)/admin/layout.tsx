import Link from "next/link";
import { SignOutButton, UserButton } from "@clerk/nextjs";
import { Marca } from "@/components/compartido/Marca";
import { esAdmin } from "@/lib/acceso";

export const dynamic = "force-dynamic";

/** Todo /admin: sesión de Clerk (middleware) + email de Aitor (aquí). */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await esAdmin())) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-ork-text">Esta cuenta no tiene acceso al panel.</p>
        <SignOutButton>
          <button className="rounded-lg border border-ork-border-hi px-4 py-2 text-ork-text">Salir</button>
        </SignOutButton>
      </main>
    );
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-ork-border bg-ork-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/admin" className="flex min-w-0 flex-col leading-tight">
            <Marca className="text-body-lg" />
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-ork-cyan">Diagnóstico</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/admin/nueva"
              className="rounded-lg bg-ork-cyan px-3 py-2 text-small font-medium text-ork-bg hover:bg-ork-cyan-hi"
            >
              Nueva invitación
            </Link>
            <UserButton />
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
