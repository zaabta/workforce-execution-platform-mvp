const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

/** Parses simple duration strings like '15m', '7d', '900s' into seconds. */
export function parseDurationToSeconds(value: string): number {
  const match = /^(\d+)\s*(s|m|h|d)$/i.exec(value.trim());
  if (!match) {
    const asNumber = Number(value);
    if (!Number.isNaN(asNumber)) return asNumber;
    throw new Error(`Invalid duration format: ${value}`);
  }
  const [, amount, unit] = match;
  return Number(amount) * UNIT_SECONDS[unit.toLowerCase()];
}
