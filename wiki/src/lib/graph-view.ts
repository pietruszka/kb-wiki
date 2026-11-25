import { PAGE_TYPES, type PageType } from './page-types';
import { neighbourIds, type GraphEdge, type GraphNode } from './graph';

export type GraphFilter = {
  query: string;
  types: Readonly<Record<PageType, boolean>>;
  showOrphans: boolean;
};

export type Emphasis = 'idle' | 'active' | 'neighbour' | 'dim';

export type ViewTransform = {
  x: number;
  y: number;
  k: number;
};

const PAGE_TYPE_ORDER = Object.keys(PAGE_TYPES) as PageType[];

export function matchesQuery(node: GraphNode, query: string): boolean {
  const text = query.trim().toLowerCase();
  if (!text) return true;
  return (
    node.title.toLowerCase().includes(text) ||
    node.slug.toLowerCase().includes(text) ||
    node.tags.some((tag) => tag.toLowerCase().includes(text)) ||
    node.type.includes(text)
  );
}

export function isNodeVisible(node: GraphNode, filter: GraphFilter): boolean {
  if (!filter.types[node.type]) return false;
  if (!filter.showOrphans && node.degree === 0) return false;
  return matchesQuery(node, filter.query);
}

export function visibleNodes(nodes: readonly GraphNode[], filter: GraphFilter): GraphNode[] {
  return nodes.filter((node) => isNodeVisible(node, filter));
}

export function emphasisFor(id: string, active: string | null, neighbours: ReadonlySet<string>): Emphasis {
  if (!active) return 'idle';
  if (id === active) return 'active';
  if (neighbours.has(id)) return 'neighbour';
  return 'dim';
}

export function edgeEmphasis(
  edge: GraphEdge,
  active: string | null,
  neighbours: ReadonlySet<string>,
): Emphasis {
  if (!active) return 'idle';
  const other = edge.source === active ? edge.target : edge.target === active ? edge.source : null;
  if (other && neighbours.has(other)) return 'neighbour';
  return 'dim';
}

/** One line per pair, so a link in both directions is drawn once. */
export function undirectedEdges(edges: readonly GraphEdge[]): GraphEdge[] {
  const seen = new Set<string>();
  const lines: GraphEdge[] = [];
  for (const edge of edges) {
    const key = [edge.source, edge.target].sort().join('\0');
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(edge);
  }
  return lines;
}

export function activeNeighbours(edges: readonly GraphEdge[], active: string | null): Set<string> {
  return active ? neighbourIds(edges, active) : new Set();
}

export type TypeGroup = {
  type: PageType;
  nodes: GraphNode[];
};

/** Groups ordered by how linked they are, pages inside each group by degree. */
export function nodesByType(nodes: readonly GraphNode[]): TypeGroup[] {
  const buckets = new Map<PageType, GraphNode[]>();
  for (const node of nodes) {
    const list = buckets.get(node.type);
    if (list) list.push(node);
    else buckets.set(node.type, [node]);
  }
  const weight = (group: GraphNode[]) => group.reduce((sum, node) => sum + node.degree, 0);
  return [...buckets.entries()]
    .map(([type, members]) => ({
      type,
      nodes: [...members].sort((a, b) => b.degree - a.degree || a.title.localeCompare(b.title, 'en')),
    }))
    .sort((a, b) => weight(b.nodes) - weight(a.nodes) || PAGE_TYPE_ORDER.indexOf(a.type) - PAGE_TYPE_ORDER.indexOf(b.type));
}

export function fitTransform(
  nodes: readonly Pick<GraphNode, 'x' | 'y'>[],
  width: number,
  height: number,
  pad = 96,
): ViewTransform {
  if (nodes.length === 0 || width < 1 || height < 1) return { x: 0, y: 0, k: 1 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x);
    maxY = Math.max(maxY, node.y);
  }
  const spanX = Math.max(maxX - minX, 80);
  const spanY = Math.max(maxY - minY, 80);
  const k = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY, 1.6);
  const scale = Number.isFinite(k) && k > 0 ? k : 1;
  return {
    x: width / 2 - ((minX + maxX) / 2) * scale,
    y: height / 2 - ((minY + maxY) / 2) * scale,
    k: scale,
  };
}

export type Cardinal = 'left' | 'right' | 'up' | 'down';

/** Nearest page in that direction, in graph coordinates (up is decreasing y). */
export function nearestNode(
  nodes: readonly Pick<GraphNode, 'id' | 'x' | 'y'>[],
  id: string,
  direction: Cardinal,
): string | null {
  const origin = nodes.find((node) => node.id === id);
  if (!origin) return null;
  let best: { id: string; score: number } | null = null;
  for (const node of nodes) {
    if (node.id === id) continue;
    const dx = node.x - origin.x;
    const dy = node.y - origin.y;
    const forward =
      direction === 'left' ? -dx : direction === 'right' ? dx : direction === 'up' ? -dy : dy;
    if (forward <= 0.5) continue;
    const lateral = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx);
    const score = forward + lateral * 1.5;
    if (!best || score < best.score) best = { id: node.id, score };
  }
  return best?.id ?? null;
}

export function nodeRadius(degree: number): number {
  return 5.5 + Math.min(14, Math.max(0, degree)) * 1.2;
}

export function boundsOf(nodes: readonly Pick<GraphNode, 'x' | 'y'>[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x);
    maxY = Math.max(maxY, node.y);
  }
  return { minX, minY, maxX, maxY };
}
