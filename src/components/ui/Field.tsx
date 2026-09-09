import { cn } from "@/lib/utils";

/** 44px tall, 12px radius, white plate on the warm page. Matches the reference form row. */
const FIELD =
  "h-11 w-full min-w-0 rounded-xl border border-input bg-surface px-3 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

export function TextField({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD, className)} {...props} />;
}

export function SelectField({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        FIELD,
        "cursor-pointer appearance-none bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-9 text-[13px]",
        "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2367625d%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')]",
        className,
      )}
      {...props}
    />
  );
}
