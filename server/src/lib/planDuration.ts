type DurationUnit = "DAYS" | "MONTHS" | "YEARS";

/** Adds a plan-setting duration to a base date — shared by enrollment creation (to snapshot expiry dates) and anywhere else that needs the same math. */
export function addDuration(base: Date, value: number, unit: DurationUnit): Date {
  const result = new Date(base);
  if (unit === "DAYS") result.setDate(result.getDate() + value);
  else if (unit === "MONTHS") result.setMonth(result.getMonth() + value);
  else result.setFullYear(result.getFullYear() + value);
  return result;
}
