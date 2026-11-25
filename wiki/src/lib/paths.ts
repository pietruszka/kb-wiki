/** Prefix an in-site path with Astro's `base`. */
export function sitePath(path: string, base: string = import.meta.env.BASE_URL ?? '/'): string {
  const prefix = base.endsWith('/') ? base.slice(0, -1) : base;
  if (path === '/' || path === '') return `${prefix}/`;
  return `${prefix}/${path.replace(/^\//, '')}`;
}
