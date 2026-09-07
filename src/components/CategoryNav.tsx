import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";

/** Category boards sit alongside the main board; the main board holds everything. */
export function CategoryNav({ active }: { active?: string | null }) {
  const itemClass = (isActive: boolean) =>
    "rounded-none border px-2 py-1 font-mono text-[10px] uppercase " +
    (isActive
      ? "border-primary text-primary"
      : "border-border text-muted-foreground hover:text-foreground");

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Categories">
      <Link href="/" className={itemClass(!active)}>
        all
      </Link>
      {CATEGORIES.map((category) => (
        <Link
          key={category.slug}
          href={`/c/${category.slug}`}
          className={itemClass(active === category.slug)}
        >
          {category.label}
        </Link>
      ))}
    </nav>
  );
}
