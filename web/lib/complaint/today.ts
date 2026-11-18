// "Today" for callers in India: the date in IST (UTC+5:30), whatever the server's clock zone.
export function istToday(now: Date = new Date()): string {
  return new Date(now.getTime() + 330 * 60000).toISOString().slice(0, 10);
}

// Current time in IST as "YYYY-MM-DDTHH:MM", for the prompt.
export function istNow(now: Date = new Date()): string {
  return new Date(now.getTime() + 330 * 60000).toISOString().slice(0, 16);
}
