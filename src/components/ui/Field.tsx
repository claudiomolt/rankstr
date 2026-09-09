import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** 44px tall, 12px radius, white plate on the warm page. Matches the reference form row. */
const FIELD =
  "h-11 w-full min-w-0 rounded-xl border border-input bg-surface px-3 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

export function TextField({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD, className)} {...props} />;
}

/**
 * Native select with the platform chevron replaced by our own, so the control
 * picks up the theme instead of the user agent's default palette.
 */
export function SelectField({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative w-full">
      <select
        className={cn(FIELD, "cursor-pointer appearance-none pr-9 text-[13px]", className)}
        {...props}
      />
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
        strokeWidth={1.5}
        aria-hidden
      />
    </div>
  );
}
