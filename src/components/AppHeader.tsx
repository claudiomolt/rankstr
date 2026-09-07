import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export function AppHeader() {
  return (
    <header className="flex items-center justify-between border-b border-border bg-[hsl(var(--secondary))] px-4 py-3" style={{ borderLeft: "3px solid hsl(var(--primary))" }}>
      <div className="flex items-center gap-6">
        <Link href="/" className="font-display text-xl font-semibold tracking-tight lowercase">
          rankstr
          <span className="ml-1 inline-block h-2 w-2 bg-primary align-middle" aria-hidden />
        </Link>
        <nav className="flex gap-4 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">board</Link>
          <Link href="/active" className="hover:text-foreground">active</Link>
          <Link href="/rules" className="hover:text-foreground">rules</Link>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden font-mono text-[10px] uppercase tracking-widest text-[color:var(--rs-frost)] sm:inline">live</span>
        <ThemeToggle />
      </div>
    </header>
  );
}
