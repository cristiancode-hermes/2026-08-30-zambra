/** Europe/Madrid helpers. Store UTC Date; compare with Date.now(). */

export function madridParts(d = new Date()): { y: number; m: number; day: number; h: number; min: number } {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]));
  return {
    y: Number(parts.year),
    m: Number(parts.month),
    day: Number(parts.day),
    h: Number(parts.hour),
    min: Number(parts.minute),
  };
}

/** Instant for a civil datetime in Europe/Madrid. */
export function madridDate(y: number, month: number, day: number, hour: number, minute = 0): Date {
  const guess = Date.UTC(y, month - 1, day, hour - 2, minute);
  for (const offset of [2, 1, 0]) {
    const cand = new Date(Date.UTC(y, month - 1, day, hour - offset, minute));
    const p = madridParts(cand);
    if (p.y === y && p.m === month && p.day === day && p.h === hour && p.min === minute) return cand;
  }
  return new Date(guess);
}

export function addMadridDays(base: Date, days: number): { y: number; m: number; day: number } {
  const p = madridParts(base);
  const utcNoon = Date.UTC(p.y, p.m - 1, p.day, 12) + days * 86400000;
  const n = new Date(utcNoon);
  const np = madridParts(n);
  return { y: np.y, m: np.m, day: np.day };
}

export function formatMadrid(d: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}
