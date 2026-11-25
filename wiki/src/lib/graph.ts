import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import type { PageType } from './page-types';
import type { PageStatus } from './wiki-schema';
import { assertKnownWikilinks, extractWikilinks } from './wikilinks';

/**
 * Design frame 03: d3-force runs at build (400 ticks, seed 42) and the
 * browser only pans, zooms, and highlights. The generator is the one
 * d3-force uses, started at that seed so two builds write the same coordinates.
 */
export const GRAPH_SEED = 42;
export const GRAPH_TICKS = 400;

const LCG_A = 1664525;
const LCG_C = 1013904223;
const LCG_M = 4294967296;

export function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => (state = (LCG_A * state + LCG_C) % LCG_M) / LCG_M;
}

export type GraphSource = {
  slug: string;
  title: string;
  type: PageType;
  status: PageStatus;
  tags: readonly string[];
  body: string;
  file: string;
};

export type GraphNode = {
  id: string;
  slug: string;
  title: string;
  type: PageType;
  status: PageStatus;
  tags: string[];
  degree: number;
  x: number;
  y: number;
};

export type GraphEdge = {
  source: string;
  target: string;
};

export type GraphDocument = {
  seed: number;
  ticks: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type GraphNeighbour = {
  slug: string;
  title: string;
  type: PageType;
  href: string;
};

type SimNode = SimulationNodeDatum & { id: string };

/** One directed edge per wikilink target in a body. Repeats and self-links drop out. */
export function graphEdges(pages: readonly GraphSource[]): GraphEdge[] {
  const known = new Set(pages.map((page) => page.slug));
  const edges: GraphEdge[] = [];
  const ordered = [...pages].sort((a, b) => a.slug.localeCompare(b.slug, 'en'));
  for (const page of ordered) {
    for (const target of assertKnownWikilinks(extractWikilinks(page.body), known, page.file)) {
      if (target === page.slug) continue;
      edges.push({ source: page.slug, target });
    }
  }
  edges.sort((a, b) => a.source.localeCompare(b.source, 'en') || a.target.localeCompare(b.target, 'en'));
  return edges;
}

/** Distinct other pages connected in either direction. */
export function degreeOf(edges: readonly GraphEdge[], id: string): number {
  const neighbours = new Set<string>();
  for (const edge of edges) {
    if (edge.source === id) neighbours.add(edge.target);
    if (edge.target === id) neighbours.add(edge.source);
  }
  neighbours.delete(id);
  return neighbours.size;
}

export function neighbourIds(edges: readonly GraphEdge[], id: string): Set<string> {
  const neighbours = new Set<string>();
  for (const edge of edges) {
    if (edge.source === id) neighbours.add(edge.target);
    else if (edge.target === id) neighbours.add(edge.source);
  }
  neighbours.delete(id);
  return neighbours;
}

export type LinkDirection = 'links to' | 'linked from' | 'both ways';

export function linkDirection(edges: readonly GraphEdge[], from: string, to: string): LinkDirection {
  const out = edges.some((edge) => edge.source === from && edge.target === to);
  const inbound = edges.some((edge) => edge.source === to && edge.target === from);
  if (out && inbound) return 'both ways';
  if (out) return 'links to';
  return 'linked from';
}

function roundCoord(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}

function layout(nodes: readonly GraphNode[], edges: readonly GraphEdge[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  if (nodes.length === 0) return positions;

  const simNodes: SimNode[] = nodes.map((node) => ({ id: node.id }));
  const links: SimulationLinkDatum<SimNode>[] = edges.map((edge) => ({
    source: edge.source,
    target: edge.target,
  }));
  // The constructor starts a timer. Stop it before any tick so a stray
  // timer cannot add a 401st step between builds.
  const simulation = forceSimulation<SimNode>(simNodes).stop();
  simulation
    .force(
      'link',
      forceLink<SimNode, SimulationLinkDatum<SimNode>>(links)
        .id((node) => node.id)
        .distance(120)
        .strength(0.4),
    )
    .force('charge', forceManyBody<SimNode>().strength(-260))
    .force('center', forceCenter<SimNode>(0, 0))
    .force('collide', forceCollide<SimNode>().radius(32))
    .randomSource(lcg(GRAPH_SEED));

  for (let tick = 0; tick < GRAPH_TICKS; tick += 1) simulation.tick();

  for (const node of simNodes) {
    const x = node.x;
    const y = node.y;
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error(`Graph layout did not place ${node.id}`);
    }
    positions.set(node.id, { x: roundCoord(x), y: roundCoord(y) });
  }
  return positions;
}

/** Pages, wikilink edges, and baked coordinates. The same input always returns the same document. */
export function buildGraph(pages: readonly GraphSource[]): GraphDocument {
  const edges = graphEdges(pages);
  const nodes: GraphNode[] = [...pages]
    .sort((a, b) => a.slug.localeCompare(b.slug, 'en'))
    .map((page) => ({
      id: page.slug,
      slug: page.slug,
      title: page.title,
      type: page.type,
      status: page.status,
      tags: [...page.tags],
      degree: degreeOf(edges, page.slug),
      x: 0,
      y: 0,
    }));
  const positions = layout(nodes, edges);
  return {
    seed: GRAPH_SEED,
    ticks: GRAPH_TICKS,
    nodes: nodes.map((node) => {
      const position = positions.get(node.id) ?? { x: 0, y: 0 };
      return { ...node, x: position.x, y: position.y };
    }),
    edges,
  };
}

export function linkedNodes(graph: GraphDocument, slug: string): GraphNode[] {
  const ids = neighbourIds(graph.edges, slug);
  return graph.nodes
    .filter((node) => ids.has(node.id))
    .sort((a, b) => a.title.localeCompare(b.title, 'en') || a.slug.localeCompare(b.slug, 'en'));
}
