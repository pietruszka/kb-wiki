/** Content id for a path relative to the wiki collection directory. */
export function slugFromRelativePath(entry: string): string {
  const normalized = entry.replaceAll('\\', '/').replace(/^\.\//, '');
  return normalized.replace(/\.(mdx|md)$/i, '');
}
