import { BoardScreen } from "@/components/BoardScreen";
import { loadBoard } from "@/lib/board";

export const dynamic = "force-dynamic";

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const view = await loadBoard({ page: Number(page ?? 1) });

  return (
    <BoardScreen
      view={view}
      basePath="/"
      heading="rankstr"
      blurb="Rank is the bid — nothing else. Pay sats over Lightning to stand above everyone else. Bitcoin and Nostr projects, no opaque algo."
    />
  );
}
