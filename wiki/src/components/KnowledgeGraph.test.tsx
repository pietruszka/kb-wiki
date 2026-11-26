// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import type { GraphDocument, GraphNode } from '../lib/graph';
import { sitePath } from '../lib/paths';
import KnowledgeGraph from './KnowledgeGraph';

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

function node(partial: Pick<GraphNode, 'slug' | 'type' | 'degree' | 'x' | 'y'> & { title?: string }): GraphNode {
  return {
    id: partial.slug,
    slug: partial.slug,
    title: partial.title ?? partial.slug,
    type: partial.type,
    status: 'stable',
    tags: [],
    degree: partial.degree,
    x: partial.x,
    y: partial.y,
  };
}

const graph: GraphDocument = {
  seed: 42,
  ticks: 400,
  nodes: [
    node({ slug: 'alpha', title: 'Alpha', type: 'concept', degree: 2, x: 0, y: 0 }),
    node({ slug: 'beta', title: 'Beta', type: 'comparison', degree: 1, x: 80, y: 0 }),
    node({ slug: 'gamma', title: 'Gamma', type: 'entity', degree: 1, x: 0, y: 80 }),
    node({ slug: 'delta', title: 'Delta', type: 'source', degree: 0, x: -80, y: 0 }),
  ],
  edges: [
    { source: 'alpha', target: 'beta' },
    { source: 'alpha', target: 'gamma' },
  ],
};

function mapNode(slug: string): SVGElement {
  const found = document.querySelector(`[data-testid="graph.map.node"][data-slug="${slug}"]`);
  if (!(found instanceof SVGElement)) throw new Error(`missing map node ${slug}`);
  return found;
}

function renderGraph() {
  render(<KnowledgeGraph graph={graph} summaries={{ alpha: 'Alpha stays put.' }} />);
}

test('a focus query selects that page on the map', () => {
  window.history.replaceState(null, '', '/kb-wiki/graph?focus=gamma');
  renderGraph();
  expect(mapNode('gamma').dataset.emphasis).toBe('active');
});

test('the mobile list names every page, its link count, and its neighbours', () => {
  renderGraph();
  const list = screen.getByTestId('graph.list');
  expect(within(list).getAllByTestId('graph.list.item').map((item) => item.dataset.slug).sort()).toEqual([
    'alpha',
    'beta',
    'delta',
    'gamma',
  ]);
  expect(within(list).getByText('2 links')).toBeTruthy();
  expect(within(list).getByText('0 links')).toBeTruthy();
  expect(
    within(list)
      .getAllByTestId('graph.list.neighbour')
      .map((link) => link.textContent)
      .sort(),
  ).toEqual(['Beta', 'Gamma']);
  expect(within(list).getByTestId('graph.list.open').getAttribute('href')).toBe(sitePath('alpha/'));
});

test('the map draws the precomputed positions and links each node to its page', () => {
  renderGraph();
  expect(mapNode('beta').dataset.x).toBe('80');
  expect(mapNode('beta').dataset.y).toBe('0');
  expect(mapNode('delta').dataset.x).toBe('-80');
  expect(mapNode('gamma').getAttribute('href')).toBe(sitePath('gamma/'));
});

test('hover and focus highlight a node and its neighbours', () => {
  renderGraph();
  fireEvent.mouseEnter(mapNode('alpha'));
  expect(mapNode('alpha').dataset.emphasis).toBe('active');
  expect(mapNode('beta').dataset.emphasis).toBe('neighbour');
  expect(mapNode('gamma').dataset.emphasis).toBe('neighbour');
  expect(mapNode('delta').dataset.emphasis).toBe('dim');
  expect(screen.getByTestId('graph.detail').textContent).toContain('Alpha stays put.');
  expect(screen.getByTestId('graph.detail.open').getAttribute('href')).toBe(sitePath('alpha/'));

  fireEvent.focus(mapNode('beta'));
  expect(mapNode('beta').dataset.emphasis).toBe('active');
  expect(mapNode('alpha').dataset.emphasis).toBe('neighbour');
  expect(mapNode('delta').dataset.emphasis).toBe('dim');
});

test('arrow keys move to the nearest page', () => {
  renderGraph();
  mapNode('alpha').focus();
  fireEvent.keyDown(mapNode('alpha'), { key: 'ArrowRight' });
  expect(document.activeElement).toBe(mapNode('beta'));
  fireEvent.keyDown(mapNode('beta'), { key: 'ArrowLeft' });
  expect(document.activeElement).toBe(mapNode('alpha'));
  fireEvent.keyDown(mapNode('alpha'), { key: 'ArrowDown' });
  expect(document.activeElement).toBe(mapNode('gamma'));
});

test('the filter hides pages in the list and on the map', () => {
  renderGraph();
  fireEvent.change(screen.getByTestId('graph.list.filter.text'), { target: { value: 'beta' } });
  const list = screen.getByTestId('graph.list');
  expect(within(list).queryByText('Alpha')).toBeNull();
  expect(within(list).getByText('Beta')).toBeTruthy();
  expect(document.querySelector('[data-testid="graph.map.node"][data-slug="alpha"]')).toBeNull();
  expect(mapNode('beta')).toBeTruthy();

  fireEvent.change(screen.getByTestId('graph.list.filter.text'), { target: { value: '' } });
  fireEvent.click(screen.getByTestId('graph.list.filter.type.concept'));
  expect(within(list).queryByText('Alpha')).toBeNull();
  expect(within(list).getByText('Beta')).toBeTruthy();

  fireEvent.click(screen.getByTestId('graph.list.filter.type.concept'));
  fireEvent.click(screen.getByTestId('graph.list.filter.orphans'));
  expect(within(list).queryByText('Delta')).toBeNull();
  expect(within(list).getByText('Alpha')).toBeTruthy();
});

test('the map pans when empty space is dragged and zooms from the controls', () => {
  renderGraph();
  const viewport = screen.getByTestId('graph.map.viewport');
  const stage = screen.getByTestId('graph.map.stage');
  const beforePan = Number(viewport.dataset.panX);
  const beforeScale = Number(viewport.dataset.k);

  fireEvent.pointerDown(mapNode('alpha'), { clientX: 0, clientY: 0, button: 0, pointerId: 1 });
  fireEvent.pointerMove(stage, { clientX: 40, clientY: 0, button: 0, pointerId: 1 });
  expect(Number(viewport.dataset.panX)).toBeCloseTo(beforePan);

  fireEvent.pointerDown(stage, { clientX: 10, clientY: 10, button: 0, pointerId: 2 });
  fireEvent.pointerMove(stage, { clientX: 40, clientY: 10, button: 0, pointerId: 2 });
  expect(Number(viewport.dataset.panX) - beforePan).toBeCloseTo(30);

  fireEvent.click(screen.getByTestId('graph.map.zoom.in'));
  expect(Number(viewport.dataset.k)).toBeGreaterThan(beforeScale);
});
