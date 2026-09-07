import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BoardScreen } from "@/components/BoardScreen";
import { loadBoard } from "@/lib/board";
import { CATEGORIES, getCategory } from "@/lib/categories";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  return { title: category ? `rankstr · ${category.label}` : "rankstr" };
}

export default async function CategoryBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ slug }, { page }] = await Promise.all([params, searchParams]);
  const category = getCategory(slug);
  if (!category) notFound();

  const view = await loadBoard({ categorySlug: category.slug, page: Number(page ?? 1) });

  return (
    <BoardScreen
      view={view}
      basePath={`/c/${category.slug}`}
      heading={category.label}
      blurb={`${category.blurb} Same rule as the main board: rank is the bid.`}
    />
  );
}
