export const getCurrentWeekRange = () => {
  const now = new Date();

  // 0 = Sun, 1 = Mon, ... 6 = Sat
  const day = now.getDay();
  const diffToMonday = (day + 6) % 7;

  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);

  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };

  const weekStart = fmt(monday);
  const today = fmt(now);

  return { weekStart, today };
}