type StoreHour = { day: number; openMin: number; closeMin: number; closed: boolean };

function johannesburgClock(date: Date) {
  const parts = new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(value("weekday"));
  return { day, minutes: Number(value("hour")) * 60 + Number(value("minute")) };
}

export function isStoreOpenNow(
  hours: StoreHour[],
  options?: { temporaryClosed?: boolean; now?: Date },
) {
  if (options?.temporaryClosed || hours.length === 0) return false;
  const clock = johannesburgClock(options?.now || new Date());
  const today = hours.find((hour) => hour.day === clock.day);
  if (!today || today.closed) return false;
  if (today.closeMin > today.openMin) {
    return clock.minutes >= today.openMin && clock.minutes < today.closeMin;
  }
  return clock.minutes >= today.openMin || clock.minutes < today.closeMin;
}
