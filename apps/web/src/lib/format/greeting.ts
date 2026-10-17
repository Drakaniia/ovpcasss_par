const TIME_ZONE = 'Asia/Manila';

const hourFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  hourCycle: 'h23',
  timeZone: TIME_ZONE,
});

/** Time-of-day greeting in the office's time zone (UI spec §7.3). */
export function greetingFor(date: Date): string {
  const hour = Number(hourFormatter.format(date));
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
