import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Pill button. Every control on the board is fully rounded — that shape is the
 * single loudest thing in the reference visual system, so it is not optional.
 */
export const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-transparent font-semibold whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/80",
        soft: "bg-primary/15 text-primary hover:bg-primary/25",
        ghost: "hover:bg-muted hover:text-foreground dark:hover:bg-muted/50",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground dark:hover:bg-muted/50",
      },
      size: {
        sm: "h-7 px-2.5 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
        default: "h-11 px-5 text-sm [&_svg:not([class*='size-'])]:size-4",
        icon: "size-7 px-0 text-sm [&_svg:not([class*='size-'])]:size-4",
        bump: "size-6 px-0 text-sm [&_svg:not([class*='size-'])]:size-3",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
