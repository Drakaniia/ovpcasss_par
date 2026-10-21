const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;

/**
 * The links a stored message carries, for the admin view that hands a
 * verification or reset link over by hand (email spec §9.4). The text body
 * prints the action URL on its own line, so it is read from there rather than
 * scraped out of escaped HTML. A trailing full stop or bracket is punctuation,
 * not part of the address.
 */
export function linksInText(text: string): string[] {
  const found = text.match(URL_PATTERN) ?? [];
  const trimmed = found.map((url) => url.replace(/[.,;:!?)\]]+$/, ''));
  return [...new Set(trimmed)];
}
