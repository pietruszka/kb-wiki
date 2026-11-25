export const NAV_ITEMS = [
  { id: 'index', label: 'Index', path: '/' },
  { id: 'graph', label: 'Graph', path: '/graph' },
  { id: 'log', label: 'Log', path: '/log' },
  { id: 'tags', label: 'Tags', path: '/tags' },
  { id: 'sources', label: 'Sources', path: '/sources' },
] as const;

export type NavId = (typeof NAV_ITEMS)[number]['id'];

export const GITHUB_URL = 'https://github.com/pietruszka/kb-wiki';
