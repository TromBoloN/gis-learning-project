export const SATELLITES: Record<string, string> = {
  N: "Suomi NPP",
  N20: "NOAA-20",
  N21: "NOAA-21",
};
export const CONFIDENCE: Record<string, string> = {
  l: "Low",
  n: "Nominal",
  h: "High",
};
export const RANGES = [
  [24, "24 h"],
  [48, "48 h"],
  [168, "7 d"],
] as const;