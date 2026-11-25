import { useEffect, useMemo, useRef, useState } from 'react';
import { groupCatalog, matchesCatalog, type CatalogCard, type CatalogFilter } from '../lib/catalog-view';
import { FILTER_CLEAR_EVENT, FILTER_EVENT, type FilterEventDetail } from '../lib/filter-events';
import { isPageType, PAGE_TYPES, type PageType } from '../lib/page-types';
import { PAGE_STATUSES, type PageStatus } from '../lib/wiki-schema';
import PageMark from './PageMark';

type Props = {
  pages: CatalogCard[];
  tags: string[];
  counts: Record<PageType, number>;
};

const EMPTY: CatalogFilter = { type: 'all', status: 'all', tag: '', text: '' };

function isStatus(value: string | null): value is PageStatus {
  return value !== null && (PAGE_STATUSES as readonly string[]).includes(value);
}

function readFilter(): CatalogFilter {
  const params = new URLSearchParams(window.location.search);
  const type = params.get('type');
  const status = params.get('status');
  return {
    type: type && isPageType(type) ? type : 'all',
    status: isStatus(status) ? status : 'all',
    tag: params.get('tag') ?? '',
    text: params.get('q') ?? '',
  };
}

function writeFilter(filter: CatalogFilter) {
  const params = new URLSearchParams();
  if (filter.type !== 'all') params.set('type', filter.type);
  if (filter.status !== 'all') params.set('status', filter.status);
  if (filter.tag) params.set('tag', filter.tag);
  if (filter.text.trim()) params.set('q', filter.text);
  const query = params.toString();
  const next = query ? `${window.location.pathname}?${query}` : window.location.pathname;
  window.history.replaceState(null, '', next);
}

export default function CatalogBrowser({ pages, tags, counts }: Props) {
  const [filter, setFilter] = useState<CatalogFilter>(EMPTY);
  const filterRef = useRef(filter);
  filterRef.current = filter;

  function commit(next: CatalogFilter) {
    filterRef.current = next;
    setFilter(next);
    writeFilter(next);
  }

  useEffect(() => {
    const initial = readFilter();
    filterRef.current = initial;
    setFilter(initial);
    const onText = (event: Event) => {
      const detail = (event as CustomEvent<FilterEventDetail>).detail;
      commit({ ...filterRef.current, text: detail?.text ?? '' });
    };
    document.addEventListener(FILTER_EVENT, onText);
    return () => document.removeEventListener(FILTER_EVENT, onText);
  }, []);

  const visible = useMemo(() => pages.filter((page) => matchesCatalog(page, filter)), [pages, filter]);
  const groups = groupCatalog(visible);
  const active = filter.type !== 'all' || filter.status !== 'all' || filter.tag !== '' || filter.text.trim() !== '';
  const types = Object.keys(PAGE_TYPES) as PageType[];

  function update(next: Partial<CatalogFilter>) {
    commit({ ...filterRef.current, ...next });
  }

  function clear() {
    commit(EMPTY);
    document.dispatchEvent(new CustomEvent(FILTER_CLEAR_EVENT));
  }

  return (
    <div data-testid="home.catalog">
      <div className="filter-row" data-testid="home.catalog.filter" role="group" aria-label="Filter by type">
        <button
          type="button"
          className="chip"
          aria-pressed={filter.type === 'all'}
          data-testid="home.catalog.filter.type"
          onClick={() => update({ type: 'all' })}
        >
          All <span className="chip-count">{pages.length}</span>
        </button>
        {types.map((type) => (
          <button
            key={type}
            type="button"
            className="chip"
            data-type={type}
            aria-pressed={filter.type === type}
            data-testid={`home.catalog.filter.type.${type}`}
            onClick={() => update({ type })}
          >
            <PageMark type={type} />
            {PAGE_TYPES[type].label} <span className="chip-count">{counts[type]}</span>
          </button>
        ))}
      </div>
      <div className="filter-row filter-row-secondary">
        <div className="filter-row" role="group" aria-label="Filter by status">
          <button
            type="button"
            className="chip"
            aria-pressed={filter.status === 'all'}
            data-testid="home.catalog.filter.status"
            onClick={() => update({ status: 'all' })}
          >
            Any status
          </button>
          {PAGE_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              className="chip"
              data-status={status}
              aria-pressed={filter.status === status}
              data-testid={`home.catalog.filter.status.${status}`}
              onClick={() => update({ status })}
            >
              {status}
            </button>
          ))}
        </div>
        <label className="tag-filter">
          <span className="visually-hidden">Tag</span>
          <select
            value={filter.tag}
            data-testid="home.catalog.filter.tag"
            onChange={(event) => update({ tag: event.currentTarget.value })}
          >
            <option value="">All tags</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>
        {active ? (
          <button type="button" className="chip" data-testid="home.catalog.filter.clear" onClick={clear}>
            Clear
          </button>
        ) : null}
      </div>
      <p className="catalog-count" aria-live="polite">
        {visible.length === 1 ? '1 page' : `${visible.length} pages`}
      </p>
      {groups.length === 0 ? (
        <p className="catalog-empty" data-testid="home.catalog.empty">
          No pages match this filter.
        </p>
      ) : (
        <div className="catalog-grid">
          {groups.map((group) => (
            <section
              key={group.type}
              className="catalog-group"
              data-type={group.type}
              data-testid="home.catalog.group"
              aria-labelledby={`catalog-${group.type}`}
            >
              <h3 id={`catalog-${group.type}`} className="catalog-group-title">
                <PageMark type={group.type} />
                {PAGE_TYPES[group.type].label}
                <span className="chip-count">{group.pages.length}</span>
              </h3>
              <ul className="catalog-list">
                {group.pages.map((page) => (
                  <li key={page.slug}>
                    <a className="catalog-link" href={page.href} data-testid="home.catalog.link">
                      <PageMark type={page.type} />
                      <span className="catalog-title">{page.title}</span>
                      <span className="catalog-links">{page.backlinks}</span>
                    </a>
                    <p className="catalog-summary">{page.summary}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
