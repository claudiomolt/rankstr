import { curatedActiveIndex } from "@/lib/seed";

export default function ActiveIndexPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold lowercase">active projects</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          <span className="font-mono text-[color:var(--rs-frost)]">curated</span> seed list — not algorithmic discovery, not traction metrics.
        </p>
      </div>
      <ul className="space-y-2">
        {curatedActiveIndex.map((entry) => (
          <li
            key={entry.id}
            className="border border-border bg-card px-4 py-3"
            style={{ borderLeft: "3px solid hsl(var(--primary))" }}
          >
            <div className="font-semibold">{entry.label}</div>
            {entry.url ? (
              <a className="font-mono text-xs text-[color:var(--rs-frost)] underline-offset-2 hover:underline" href={entry.url} rel="noreferrer">
                {entry.url}
              </a>
            ) : null}
            <p className="mt-1 text-sm text-muted-foreground">{entry.note}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
