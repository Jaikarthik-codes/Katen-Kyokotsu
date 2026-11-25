type NavLike = Partial<{
  hardwareConcurrency: number;
  deviceMemory: number;
  connection: { saveData?: boolean };
}>;

/** "low" for data-saver mode, under 4 GB of memory, or under 4 CPU cores. */
export function deviceTier(nav: NavLike = navigator as unknown as NavLike): "low" | "high" {
  if (nav.connection?.saveData) return "low";
  if (nav.deviceMemory !== undefined && nav.deviceMemory < 4) return "low";
  if ((nav.hardwareConcurrency ?? 8) < 4) return "low";
  return "high";
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}
