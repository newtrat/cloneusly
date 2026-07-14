const MONTH_KEY_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getZonedParts(date: Date, timeZone: string): DateParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = getZonedParts(date, timeZone);
  const representedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return representedAsUtc - Math.floor(date.getTime() / 1_000) * 1_000;
}

function zonedMidnightToUtc(
  year: number,
  month: number,
  day: number,
  timeZone: string,
): Date {
  const localAsUtc = Date.UTC(year, month - 1, day);
  let result = new Date(
    localAsUtc - getTimeZoneOffsetMs(new Date(localAsUtc), timeZone),
  );
  result = new Date(localAsUtc - getTimeZoneOffsetMs(result, timeZone));
  return result;
}

export function parseMonthKey(value: string): {
  year: number;
  month: number;
} | null {
  const match = MONTH_KEY_PATTERN.exec(value);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) };
}

export function getCompanyMonthKey(date: Date, timeZone: string): string {
  const { year, month } = getZonedParts(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function getCalendarMonthRange(
  monthKey: string,
  timeZone: string,
): { start: Date; end: Date } {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) throw new Error(`Invalid achievement month: ${monthKey}`);

  const nextMonth = parsed.month === 12 ? 1 : parsed.month + 1;
  const nextYear = parsed.month === 12 ? parsed.year + 1 : parsed.year;

  return {
    start: zonedMidnightToUtc(parsed.year, parsed.month, 1, timeZone),
    end: zonedMidnightToUtc(nextYear, nextMonth, 1, timeZone),
  };
}

export function shiftMonthKey(monthKey: string, offset: number): string {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) throw new Error(`Invalid achievement month: ${monthKey}`);
  const shifted = new Date(Date.UTC(parsed.year, parsed.month - 1 + offset, 1));
  return `${shifted.getUTCFullYear()}-${String(
    shifted.getUTCMonth() + 1,
  ).padStart(2, "0")}`;
}
