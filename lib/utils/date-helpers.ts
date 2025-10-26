import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";

export type DateRangeType = "today" | "week" | "month" | "year";
export type GranularityType = "hourly" | "daily" | "monthly";

export interface DateRange {
  start: Date;
  end: Date;
  granularity: GranularityType;
}

export function getDateRange(range: DateRangeType): DateRange {
  const now = new Date();

  switch (range) {
    case "today":
      return {
        start: startOfDay(now),
        end: endOfDay(now),
        granularity: "hourly",
      };
    case "week":
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }), // Monday
        end: endOfWeek(now, { weekStartsOn: 1 }),
        granularity: "daily",
      };
    case "month":
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
        granularity: "daily",
      };
    case "year":
      return {
        start: startOfYear(now),
        end: endOfYear(now),
        granularity: "monthly",
      };
    default:
      return {
        start: startOfDay(now),
        end: endOfDay(now),
        granularity: "hourly",
      };
  }
}
