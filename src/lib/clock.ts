// Injectable clock for time-based operations.
// Route ALL schedule, cutoff, "today", expiry, and late/on-time decisions
// through this seam instead of calling new Date() / Date.now() inline.
// Override in tests with setClock().

let clockFn: () => Date = () => new Date();

export function now(): Date {
  return clockFn();
}

export function nowTimestamp(): number {
  return now().getTime();
}

/** Override the clock for testing. Pass undefined to restore real time. */
export function setClock(fn: (() => Date) | undefined): void {
  clockFn = fn ?? (() => new Date());
}
