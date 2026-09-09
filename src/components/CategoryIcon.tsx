import {
  Bitcoin,
  Code2,
  Cpu,
  Ellipsis,
  Newspaper,
  Radio,
  ShieldCheck,
  ShoppingCart,
  Vault,
  Wallet,
  type LucideProps,
} from "lucide-react";
import type { CategoryIconKey } from "@/lib/categories";

const ICONS: Record<CategoryIconKey, React.ComponentType<LucideProps>> = {
  wallet: Wallet,
  nostr: Radio,
  node: Cpu,
  code: Code2,
  cart: ShoppingCart,
  media: Newspaper,
  mining: Bitcoin,
  shield: ShieldCheck,
  vault: Vault,
  dots: Ellipsis,
};

export function CategoryIcon({
  icon,
  className,
}: {
  icon: CategoryIconKey;
  className?: string;
}) {
  const Icon = ICONS[icon] ?? Ellipsis;
  return <Icon className={className} strokeWidth={1.5} aria-hidden />;
}
