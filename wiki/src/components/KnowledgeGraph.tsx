import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { countNoun } from '../lib/format';
import {
  linkDirection,
  linkedNodes,
  type GraphDocument,
  type GraphNode,
} from '../lib/graph';
import {
  activeNeighbours,
  boundsOf,
  edgeEmphasis,
  emphasisFor,
  fitTransform,
  nearestNode,
  nodeRadius,
  nodesByType,
  undirectedEdges,
  visibleNodes,
  type Cardinal,
  type Emphasis,
  type ViewTransform,
} from '../lib/graph-view';
import { sitePath } from '../lib/paths';
import { PAGE_TYPES, type PageType } from '../lib/page-types';
import { PAGE_TYPE_IDS } from '../lib/wiki-schema';
import PageMark from './PageMark';

const MIN_SCALE = 0.3;
const MAX_SCALE = 3.2;

type Props = {
  graph: GraphDocument;
  summaries: Record<string, string>;
};

type TypeFlags = Record<PageType, boolean>;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function pageHref(slug: string): string {
  return sitePath(`${slug}/`);
}

function NodeShape({ type, radius }: { type: PageType; radius: number }) {
  if (type === 'concept') {
    return <path d={`M0 ${-radius} L${radius} 0 L0 ${radius} L${-radius} 0 Z`} className="graph-node-shape" />;
  }
  const dashed = type === 'source';
  return (
    <circle
      r={radius}
      className="graph-node-shape"
      fill={dashed ? 'none' : 'currentColor'}
      stroke={dashed ? 'currentColor' : 'none'}
      strokeWidth={dashed ? 1.5 : 0}
      strokeDasharray={dashed ? '3 2.2' : undefined}
    />
  );
}

function Filters({
  testId,
  total,
  query,
  onQuery,
  types,
  counts,
  onToggleType,
  showOrphans,
  onToggleOrphans,
  shown,
}: {
  testId: string;
  total: number;
  query: string;
  onQuery: (value: string) => void;
  types: TypeFlags;
  counts: Record<PageType, number>;
  onToggleType: (type: PageType) => void;
  showOrphans: boolean;
  onToggleOrphans: () => void;
  shown: number;
}) {
  const inputId = `${testId.replaceAll('.', '-')}-text`;
  return (
    <div className="graph-filters" data-testid={testId}>
      <p className="graph-kicker">Graph.view</p>
      <p className="graph-stat">
        {shown === total
          ? `${countNoun(total, 'page', 'pages')}`
          : `${shown} of ${countNoun(total, 'page', 'pages')} shown`}
      </p>
      <label className="graph-search" htmlFor={inputId}>
        <span className="graph-search-mark" aria-hidden="true">
          /
        </span>
        <span className="visually-hidden">Filter pages</span>
        <input
          id={inputId}
          type="search"
          value={query}
          placeholder={`Filter ${total} pages`}
          autoComplete="off"
          data-testid={`${testId}.text`}
          onChange={(event) => onQuery(event.target.value)}
        />
      </label>
      <p className="graph-kicker graph-kicker-gap">Node type</p>
      <div className="graph-types">
        {PAGE_TYPE_IDS.map((type) => (
          <button
            key={type}
            type="button"
            className="graph-type"
            data-type={type}
            data-testid={`${testId}.type.${type}`}
            aria-pressed={types[type]}
            onClick={() => onToggleType(type)}
          >
            <PageMark type={type} />
            <span>{PAGE_TYPES[type].label}</span>
            <span className="graph-type-count">{counts[type]}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="graph-orphan"
        data-testid={`${testId}.orphans`}
        aria-pressed={showOrphans}
        onClick={onToggleOrphans}
      >
        Show orphans
      </button>
    </div>
  );
}

export default function KnowledgeGraph({ graph, summaries }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLElement>());
  const viewRef = useRef<ViewTransform>(fitTransform(graph.nodes, 1200, 720));
  const zoomAtRef = useRef<(clientX: number, clientY: number, factor: number) => void>(() => {});
  const drag = useRef<{ pointer: number; x: number; y: number; viewX: number; viewY: number } | null>(null);
  const fitted = useRef(false);

  const [view, setView] = useState<ViewTransform>(viewRef.current);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [panning, setPanning] = useState(false);
  const [query, setQuery] = useState('');
  const [showOrphans, setShowOrphans] = useState(true);
  const [types, setTypes] = useState<TypeFlags>({
    concept: true,
    comparison: true,
    entity: true,
    source: true,
  });
  const [active, setActive] = useState<string | null>(null);
  const defaultOpen = useMemo(
    () =>
      [...graph.nodes].sort((a, b) => b.degree - a.degree || a.title.localeCompare(b.title, 'en'))[0]?.id ??
      null,
    [graph.nodes],
  );
  const [expanded, setExpanded] = useState<string | null>(defaultOpen);

  const filter = { query, types, showOrphans };
  const shown = visibleNodes(graph.nodes, filter);
  const shownIds = new Set(shown.map((node) => node.id));
  const activeId = active && shownIds.has(active) ? active : null;
  const neighbours = activeNeighbours(graph.edges, activeId);
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const lines = undirectedEdges(graph.edges);
  const painted = [...shown].sort((a, b) => Number(a.id === activeId) - Number(b.id === activeId));
  const labelAll = shown.length <= 16;
  const selected = activeId ? byId.get(activeId) : undefined;
  const counts = Object.fromEntries(
    PAGE_TYPE_IDS.map((type) => [type, graph.nodes.filter((node) => node.type === type).length]),
  ) as Record<PageType, number>;
  const maxDegree = Math.max(1, ...graph.nodes.map((node) => node.degree));
  const groups = nodesByType(shown);
  const openId = expanded && shownIds.has(expanded) ? expanded : null;

  function commit(next: ViewTransform) {
    viewRef.current = next;
    setView(next);
  }

  function zoomAt(clientX: number, clientY: number, factor: number) {
    const stage = stageRef.current;
    const rect = stage?.getBoundingClientRect();
    const px = rect ? clientX - rect.left : 0;
    const py = rect ? clientY - rect.top : 0;
    const current = viewRef.current;
    const k = clamp(current.k * factor, MIN_SCALE, MAX_SCALE);
    if (k === current.k) return;
    const ratio = k / current.k;
    commit({ k, x: px - (px - current.x) * ratio, y: py - (py - current.y) * ratio });
  }

  zoomAtRef.current = zoomAt;

  function zoomCenter(factor: number) {
    const rect = stageRef.current?.getBoundingClientRect();
    const clientX = rect && rect.width > 0 ? rect.left + rect.width / 2 : 0;
    const clientY = rect && rect.height > 0 ? rect.top + rect.height / 2 : 0;
    zoomAt(clientX, clientY, factor);
  }

  function fit() {
    const stage = stageRef.current;
    const width = stage?.clientWidth ?? 0;
    const height = stage?.clientHeight ?? 0;
    commit(fitTransform(shown.length > 0 ? shown : graph.nodes, width || 1200, height || 720));
  }

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomAtRef.current(event.clientX, event.clientY, event.deltaY > 0 ? 1 / 1.12 : 1.12);
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    const measure = () => {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      setStageSize({ width, height });
      if (!fitted.current && width > 10 && height > 10) {
        fitted.current = true;
        const next = fitTransform(graph.nodes, width, height);
        viewRef.current = next;
        setView(next);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => {
      stage.removeEventListener('wheel', onWheel);
      observer.disconnect();
    };
  }, [graph.nodes]);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const target = event.target;
    if (target instanceof Element && target.closest('a, button, input, textarea, select, label')) return;
    drag.current = {
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      viewX: viewRef.current.x,
      viewY: viewRef.current.y,
    };
    setPanning(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || start.pointer !== event.pointerId) return;
    commit({
      ...viewRef.current,
      x: start.viewX + event.clientX - start.x,
      y: start.viewY + event.clientY - start.y,
    });
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (drag.current?.pointer !== event.pointerId) return;
    drag.current = null;
    setPanning(false);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      if (event.key === 'Escape') {
        setQuery('');
        setActive(null);
      }
      return;
    }
    if (event.key === 'Escape') {
      setQuery('');
      setActive(null);
      return;
    }
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      zoomCenter(1.2);
      return;
    }
    if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      zoomCenter(1 / 1.2);
      return;
    }
    const direction: Cardinal | undefined =
      event.key === 'ArrowLeft'
        ? 'left'
        : event.key === 'ArrowRight'
          ? 'right'
          : event.key === 'ArrowUp'
            ? 'up'
            : event.key === 'ArrowDown'
              ? 'down'
              : undefined;
    if (!direction) return;
    const slug =
      event.target instanceof Element ? event.target.closest('[data-slug]')?.getAttribute('data-slug') : null;
    if (!slug) return;
    const next = nearestNode(shown, slug, direction);
    if (!next) return;
    event.preventDefault();
    setActive(next);
    nodeRefs.current.get(next)?.focus();
  }

  function leaveMap(event: ReactMouseEvent<HTMLDivElement>) {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    if (mapRef.current?.contains(document.activeElement)) return;
    setActive(null);
  }

  const filterProps = {
    total: graph.nodes.length,
    query,
    onQuery: setQuery,
    types,
    counts,
    onToggleType: (type: PageType) => setTypes((current) => ({ ...current, [type]: !current[type] })),
    showOrphans,
    onToggleOrphans: () => setShowOrphans((current) => !current),
    shown: shown.length,
  };

  return (
    <div className="graph-app" data-testid="graph.app">
      <div
        className="graph-map"
        data-testid="graph.map"
        ref={mapRef}
        onMouseLeave={leaveMap}
        onKeyDown={onKeyDown}
      >
        <h1 className="visually-hidden">Graph</h1>
        <p className="visually-hidden" id="graph-help">
          Arrow keys move to the nearest page. Enter opens it. Plus and minus zoom. Drag empty space to pan.
        </p>
        <Filters testId="graph.map.filter" {...filterProps} />
        <div
          className={panning ? 'graph-stage is-panning' : 'graph-stage'}
          data-testid="graph.map.stage"
          ref={stageRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <svg
            className="graph-svg"
            data-testid="graph.map.viewport"
            data-pan-x={view.x}
            data-pan-y={view.y}
            data-k={view.k}
            role="group"
            aria-label="Wiki pages and the links between them"
            aria-describedby="graph-help"
          >
            <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
              <g aria-hidden="true">
                {lines.map((edge) => {
                  if (!shownIds.has(edge.source) || !shownIds.has(edge.target)) return null;
                  const source = byId.get(edge.source);
                  const target = byId.get(edge.target);
                  if (!source || !target) return null;
                  const emphasis: Emphasis = edgeEmphasis(edge, activeId, neighbours);
                  return (
                    <line
                      key={`${source.id}\0${target.id}`}
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      className="graph-edge"
                      data-emphasis={emphasis}
                    />
                  );
                })}
              </g>
              {painted.map((node) => {
                const emphasis = emphasisFor(node.id, activeId, neighbours);
                const radius = nodeRadius(node.degree) * (emphasis === 'active' ? 1.45 : 1);
                const showLabel = labelAll || emphasis === 'active' || emphasis === 'neighbour';
                return (
                  <a
                    key={node.id}
                    href={pageHref(node.slug)}
                    className="graph-node"
                    data-testid="graph.map.node"
                    data-slug={node.slug}
                    data-type={node.type}
                    data-emphasis={emphasis}
                    data-x={node.x}
                    data-y={node.y}
                    ref={(element) => {
                      if (element) nodeRefs.current.set(node.id, element);
                      else nodeRefs.current.delete(node.id);
                    }}
                    onMouseEnter={() => setActive(node.id)}
                    onFocus={() => setActive(node.id)}
                  >
                    <g transform={`translate(${node.x} ${node.y})`}>
                      <circle className="graph-node-hit" r={Math.max(radius + 8, 16)} />
                      <NodeShape type={node.type} radius={radius} />
                      {showLabel ? (
                        <text className="graph-label" x={radius + 14} y="0" dominantBaseline="middle">
                          {node.title}
                        </text>
                      ) : null}
                    </g>
                  </a>
                );
              })}
            </g>
          </svg>
          <div className="graph-zoom">
            <button type="button" data-testid="graph.map.zoom.in" aria-label="Zoom in" onClick={() => zoomCenter(1.2)}>
              +
            </button>
            <button
              type="button"
              data-testid="graph.map.zoom.out"
              aria-label="Zoom out"
              onClick={() => zoomCenter(1 / 1.2)}
            >
              −
            </button>
            <button type="button" data-testid="graph.map.zoom.fit" aria-label="Fit the graph" onClick={fit}>
              Fit
            </button>
          </div>
        </div>
        <Detail graph={graph} node={selected} summaries={summaries} shownIds={shownIds} />
        <Minimap nodes={graph.nodes} view={view} width={stageSize.width} height={stageSize.height} />
        <p className="graph-hint">
          <span>
            Zoom {view.k.toFixed(1)}× · drag to pan · arrows move · enter opens
          </span>
          <span>Layout precomputed at build</span>
        </p>
      </div>
      <div className="graph-list" data-testid="graph.list">
        <p className="graph-kicker">
          <span aria-hidden="true">// </span>Graph.view · list · under 768 px
        </p>
        <h1 className="graph-heading">Graph</h1>
        <p className="graph-lede">
          {countNoun(graph.nodes.length, 'page', 'pages')}, {countNoun(graph.edges.length, 'link', 'links')}. On a
          phone the map becomes this list, grouped by type and ordered by link count, from the same build-time graph.
        </p>
        <Filters testId="graph.list.filter" {...filterProps} />
        {shown.length === 0 ? (
          <p className="graph-empty" data-testid="graph.empty">
            No pages match this filter.
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.type} className="graph-group" data-testid="graph.list.group" data-type={group.type}>
              <header className="graph-group-head">
                <h2>{PAGE_TYPES[group.type].label}</h2>
                <span>{countNoun(group.nodes.length, 'page', 'pages')}</span>
              </header>
              <ul className="graph-rows">
                {group.nodes.map((node) => (
                  <ListRow
                    key={node.id}
                    graph={graph}
                    node={node}
                    maxDegree={maxDegree}
                    open={openId === node.id}
                    onToggle={() => setExpanded(openId === node.id ? null : node.id)}
                  />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

function Detail({
  graph,
  node,
  summaries,
  shownIds,
}: {
  graph: GraphDocument;
  node: GraphNode | undefined;
  summaries: Record<string, string>;
  shownIds: Set<string>;
}) {
  const summary = node ? summaries[node.slug] : undefined;
  const links = node ? linkedNodes(graph, node.id).filter((item) => shownIds.has(item.id)) : [];
  return (
    <aside className="graph-detail" data-testid="graph.detail" aria-live="polite">
      <p className="graph-kicker">Selected node</p>
      {node ? (
        <>
          <p className="graph-detail-type">
            <PageMark type={node.type} />
            <span data-type={node.type}>{PAGE_TYPES[node.type].label}</span>
            <span className="graph-status" data-status={node.status}>
              {node.status}
            </span>
          </p>
          <h2 className="graph-detail-title">{node.title}</h2>
          {summary ? <p className="graph-detail-summary">{summary}</p> : null}
          {node.tags.length > 0 ? (
            <ul className="graph-tags">
              {node.tags.map((tag) => (
                <li key={tag}>#{tag}</li>
              ))}
            </ul>
          ) : null}
          <p className="graph-kicker graph-kicker-gap">
            Connected · {countNoun(links.length, 'page', 'pages')}
          </p>
          {links.length === 0 ? (
            <p className="graph-muted">No linked pages.</p>
          ) : (
            <ul className="graph-detail-links">
              {links.map((link) => (
                <li key={link.id}>
                  <a href={pageHref(link.slug)} data-testid="graph.detail.neighbour" data-type={link.type}>
                    <PageMark type={link.type} />
                    <span>{link.title}</span>
                    <span className="graph-direction">{linkDirection(graph.edges, node.id, link.id)}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          <a className="graph-open" href={pageHref(node.slug)} data-testid="graph.detail.open">
            Open page
          </a>
        </>
      ) : (
        <p className="graph-detail-summary">Hover or focus a page. Enter opens it.</p>
      )}
    </aside>
  );
}

function ListRow({
  graph,
  node,
  maxDegree,
  open,
  onToggle,
}: {
  graph: GraphDocument;
  node: GraphNode;
  maxDegree: number;
  open: boolean;
  onToggle: () => void;
}) {
  const links = linkedNodes(graph, node.id);
  const preview = links.slice(0, 8);
  const extra = links.length - preview.length;
  return (
    <li className="graph-row" data-testid="graph.list.item" data-slug={node.slug} data-type={node.type}>
      <button type="button" className="graph-row-button" aria-expanded={open} onClick={onToggle}>
        <PageMark type={node.type} />
        <span className="graph-row-title">{node.title}</span>
        <span className="graph-row-count">{countNoun(node.degree, 'link', 'links')}</span>
        <span className="graph-meter" aria-hidden="true">
          <span style={{ width: `${(node.degree / maxDegree) * 100}%` }} />
        </span>
      </button>
      {open ? (
        <div className="graph-row-body">
          <p className="graph-kicker">Connected · {countNoun(links.length, 'page', 'pages')}</p>
          {preview.length === 0 ? (
            <p className="graph-muted">No linked pages.</p>
          ) : (
            <ul className="graph-chips">
              {preview.map((link) => (
                <li key={link.id}>
                  <a href={pageHref(link.slug)} data-testid="graph.list.neighbour" data-type={link.type}>
                    <PageMark type={link.type} />
                    {link.title}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {extra > 0 ? <p className="graph-muted">{extra} more on the page.</p> : null}
          <a className="graph-open" href={pageHref(node.slug)} data-testid="graph.list.open">
            Open page
          </a>
        </div>
      ) : null}
    </li>
  );
}

function Minimap({
  nodes,
  view,
  width,
  height,
}: {
  nodes: readonly GraphNode[];
  view: ViewTransform;
  width: number;
  height: number;
}) {
  const bounds = boundsOf(nodes);
  const span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY, 1);
  const pad = span * 0.18;
  const viewBox = `${bounds.minX - pad} ${bounds.minY - pad} ${bounds.maxX - bounds.minX + pad * 2} ${bounds.maxY - bounds.minY + pad * 2}`;
  const vx = -view.x / view.k;
  const vy = -view.y / view.k;
  return (
    <div className="graph-minimap" data-testid="graph.map.minimap" aria-hidden="true">
      <span className="graph-mini-label">Map</span>
      <svg viewBox={viewBox}>
        {width > 0 && height > 0 ? (
          <rect
            className="graph-mini-view"
            x={vx}
            y={vy}
            width={width / view.k}
            height={height / view.k}
            strokeWidth={span / 90}
          />
        ) : null}
        {nodes.map((node) => (
          <circle
            key={node.id}
            className="graph-mini-node"
            data-type={node.type}
            cx={node.x}
            cy={node.y}
            r={Math.max(span / 22, 4)}
          />
        ))}
      </svg>
    </div>
  );
}
