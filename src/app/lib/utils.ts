// app/lib/utils.ts

// Helper: pad number to 2 digits
function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

// Convert a Date to a local YYYY-MM-DD string
function toLocalISODate(date: Date): string {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1); // 0-based
  const day = pad2(date.getDate());
  return `${year}-${month}-${day}`;
}

/**
 * Today in local time, formatted as "YYYY-MM-DD"
 */
export function getTodayLocalDate(): string {
  return toLocalISODate(new Date());
}

/**
 * Get the current week range using local time.
 * weekStart: Monday of this week (YYYY-MM-DD)
 * today: today's date (YYYY-MM-DD)
 */
export function getCurrentWeekRange(): { weekStart: string; today: string } {
  const today = new Date();
  const todayISO = toLocalISODate(today);

  // JS: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const jsDay = today.getDay();

  // We want Monday as week start.
  // If jsDay = 1 (Mon) -> diff = 0
  // If jsDay = 0 (Sun) -> diff = 6 (go back to previous Monday)
  const diffToMonday = (jsDay + 6) % 7;

  const weekStartDate = new Date(today);
  weekStartDate.setDate(today.getDate() - diffToMonday);

  const weekStartISO = toLocalISODate(weekStartDate);

  return {
    weekStart: weekStartISO,
    today: todayISO,
  };
}

  // Helpers for week math
  export const getPreviousWeekStart = (weekStart: string): string => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  }

  export const addDaysToDateString = (dateStr: string, days: number): string =>{
    const d = new Date(dateStr + "T00:00:00Z");
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

/**
 * Return info about the 7 days of the current week (Mon–Sun).
 * Each item has:
 * - dayName: "Monday", "Tuesday", ...
 * - dateLabel: short day label (e.g., "10" or "Oct 10")
 * - isToday: whether this date is today
 * - isoDate: "YYYY-MM-DD" for that day (used for check-ins)
 */
export function getCurrentWeekDays(): Array<{
  dayName: string;
  dateLabel: string;
  isToday: boolean;
  isoDate: string;
}> {
  const { weekStart, today } = getCurrentWeekRange();

  const weekStartDate = new Date(weekStart + "T00:00:00");
  const days: Array<{
    dayName: string;
    dateLabel: string;
    isToday: boolean;
    isoDate: string;
  }> = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStartDate);
    d.setDate(weekStartDate.getDate() + i);

    const isoDate = toLocalISODate(d);
    const dayName = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
    }).format(d);

    const dateLabel = new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
    }).format(d); // e.g. "Mar 10"

    days.push({
      dayName,
      dateLabel,
      isToday: isoDate === today,
      isoDate,
    });
  }

  return days;
}

export const normalizePhoneNumberToE164 = (raw: string): string | null => {
  // Very basic US-only assumption for now.
  const digits = raw.replace(/\D/g, "");

  if (!digits) return null;

  // 10 digits → treat as US number
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // 11 digits starting with 1 → +1XXXXXXXXXX
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  // If user already typed something like +44..., keep it if it has enough digits
  if (raw.trim().startsWith("+") && digits.length >= 8) {
    return `+${digits}`;
  }

  // If it doesn't match these, we fail gracefully
  return null;
}
