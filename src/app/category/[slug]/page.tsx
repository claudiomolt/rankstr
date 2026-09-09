import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BoardScreen } from "@/components/BoardScreen";
import { CategoryRail } from "@/components/CategoryRail";
import { loadBoard } from "@/lib/board";
import { getCategory } from "@/lib/categories";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  return { title: category ? `${category.label} · rankstr` : "rankstr" };
}

export default async function CategoryBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; board?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const category = getCategory(slug);
  if (!category) notFound();

  const window = query.board === "today" ? "today" : "all-time";
  const view = await loadBoard({
    categorySlug: category.slug,
    page: Number(query.page ?? 1),
    window,
  });

  const base = `/category/${category.slug}`;

  return (
    <>
      <h1 className="sr-only">{category.label}</h1>
      <CategoryRail active={category.slug} />
      <div className="mt-5 md:mt-6">
        <BoardScreen
          view={view}
          basePath={window === "today" ? `${base}?board=today` : base}
          allTimeHref={base}
          todayHref={`${base}?board=today`}
        />
      </div>
    </>
  );
}
