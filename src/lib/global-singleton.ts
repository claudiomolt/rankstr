/**
 * Process-wide singletons.
 *
 * Next.js compiles route handlers into separate bundles, so a plain
 * module-level `Map` is not actually shared between routes: a bid reserved by
 * one route would be invisible to the route that settles it. Anchoring the
 * in-process state to a `globalThis` symbol gives one instance per process,
 * which is what the no-database fallback and the mock rail need.
 */

const REGISTRY = Symbol.for("rankstr.singletons");

type Registry = Map<string, unknown>;

function registry(): Registry {
  const holder = globalThis as typeof globalThis & { [REGISTRY]?: Registry };
  if (!holder[REGISTRY]) holder[REGISTRY] = new Map();
  return holder[REGISTRY];
}

export function globalSingleton<T>(name: string, create: () => T): T {
  const store = registry();
  if (!store.has(name)) store.set(name, create());
  return store.get(name) as T;
}

/** Drop a singleton so the next read rebuilds it. Test helper. */
export function resetGlobalSingleton(name: string): void {
  registry().delete(name);
}
