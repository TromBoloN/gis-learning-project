export function fmt(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export function hoursAgo(d: Date): string {
  const h = Math.round((Date.now() - d.getTime()) / 36e5);
  return h < 1 ? "less than 1 h ago" : `${h} h ago`;
}

export const rangeLabel = (hours: number) => (hours === 168 ? "7 d" : `${hours} h`);