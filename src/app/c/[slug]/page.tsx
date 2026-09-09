import { permanentRedirect } from "next/navigation";

/** Category boards moved to /category/<slug>; the old short path still resolves. */
export default async function LegacyCategoryRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/category/${slug}`);
}
