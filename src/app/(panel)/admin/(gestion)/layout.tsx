import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Marca } from "@/components/compartido/Marca";

/** Cabecera del panel (listado e invitaciones). */
export default function GestionLayout({ children }: { children: React.ReactNode }) {
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
