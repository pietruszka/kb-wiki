/** Calendar date in UTC, so a YAML date does not shift with the build machine's zone. */
export function formatWikiDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function countNoun(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function sourceHostname(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '');
}
