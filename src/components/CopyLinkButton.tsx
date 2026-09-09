"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Copies an absolute link to the current listing. Resolves the origin in the browser. */
export function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={copy}
      className="h-9 px-4 text-sm"
      aria-label="Copy a link to this listing"
    >
      {copied ? <Check strokeWidth={2} /> : <Link2 strokeWidth={1.5} />}
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}
