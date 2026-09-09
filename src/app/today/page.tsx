import type { Metadata } from "next";
import { BoardScreen } from "@/components/BoardScreen";
import { CategoryRail } from "@/components/CategoryRail";
import { loadBoard } from "@/lib/board";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Today · rankstr" };

export default async function TodayBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const view = await loadBoard({ page: Number(page ?? 1), window: "today" });

  return (
    <>
      <h1 className="sr-only">Today on rankstr</h1>
      <CategoryRail active={null} />
      <div className="mt-5 md:mt-6">
        <BoardScreen view={view} basePath="/today" allTimeHref="/" todayHref="/today" />
      </div>
    </>
  );
}
