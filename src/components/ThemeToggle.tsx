"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem("rankstr-theme") as "dark" | "light" | null;
    const next = stored ?? "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.setAttribute("data-theme", next);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem("rankstr-theme", next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-none border border-border px-3 py-1.5 text-xs font-mono uppercase tracking-wide text-muted-foreground hover:border-primary hover:text-foreground"
    >
      {theme === "dark" ? "light" : "dark"}
    </button>
  );
}
