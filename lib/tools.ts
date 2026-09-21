// Small utility tools students actually reach for daily — original
// implementations, same idea as the "helper tools" popular study apps ship.

export type GpaEntry = {
  id: string;
  subjectName: string;
  score: number; // 0-20 (Iranian grading scale)
  units: number; // واحد / ضریب
};

export function calcGpa(entries: GpaEntry[]): number {
  const totalUnits = entries.reduce((sum, e) => sum + e.units, 0);
  if (totalUnits === 0) return 0;

  const weightedSum = entries.reduce((sum, e) => sum + e.score * e.units, 0);
  return Number((weightedSum / totalUnits).toFixed(2));
}

export type UnitCategory = "length" | "mass" | "volume";

const UNIT_FACTORS: Record<UnitCategory, Record<string, number>> = {
  // all factors relative to the base unit (meter / gram / liter)
  length: { میلی‌متر: 0.001, سانتی‌متر: 0.01, متر: 1, کیلومتر: 1000 },
  mass: { میلی‌گرم: 0.001, گرم: 1, کیلوگرم: 1000, تن: 1_000_000 },
  volume: { میلی‌لیتر: 0.001, لیتر: 1, "متر مکعب": 1000 },
};

export function unitOptions(category: UnitCategory): string[] {
  return Object.keys(UNIT_FACTORS[category]);
}

export function convertUnit(
  category: UnitCategory,
  from: string,
  to: string,
  value: number
): number {
  const factors = UNIT_FACTORS[category];
  if (!(from in factors) || !(to in factors)) return NaN;

  const inBase = value * factors[from];
  return Number((inBase / factors[to]).toFixed(6));
}
