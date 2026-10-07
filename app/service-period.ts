export function servicePeriod(start: string, end: string, today: string) {
  const day = 86400000;
  const startDay = Date.parse(start) / day;
  const endDay = Date.parse(end) / day;
  const currentDay = Date.parse(today) / day;
  const total = Math.max(0, endDay - startDay);
  const elapsed = Math.min(total, Math.max(0, currentDay - startDay));
  const remaining = Math.max(0, endDay - Math.max(currentDay, startDay));
  const phase = currentDay < startDay ? 'upcoming' : currentDay > endDay ? 'ended' : 'active';
  const value = phase === 'upcoming' ? startDay - currentDay : phase === 'ended' ? currentDay - endDay : endDay - currentDay;
  return { total, elapsed, remaining, phase, value,
    percent: total > 0 ? elapsed / total * 100 : currentDay < startDay ? 0 : 100,
    marker: phase === 'active' && total > 0,
  };
}
