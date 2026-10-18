export type Item = {
  code: string;
  name: string;
  province: string;
  areaKm2: number;
  hotspots: number;
  totalFrp: number;
  per1000km2: number;
  bounds: [[number, number], [number, number]];
};
export type SortKey = "hotspots" | "totalFrp" | "per1000km2";
export type Span = { min: number; max: number };
export type RangeHours = 24 | 48 | 168;

export type HotspotProps = {
  acquired_at: string;
  satellite: string;
  confidence: string;
  frp: number;
  bright_ti4: number;
  kabupaten: string;
  province: string;
};