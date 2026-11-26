import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import PageMark from './PageMark';
import {
  SEARCH_OPEN_EVENT,
  SEARCH_SCOPES,
  flattenGroups,
  graphFocusHref,
  groupRows,
  loadPagefind,
  scopeCounts,
  searchWiki,
  type SearchGroup,
  type SearchOutcome,
  type SearchRow,
  type SearchScope,
} from '../lib/search';

type Props = {
  search?: (query: string) => Promise<SearchOutcome>;
  onNavigate?: (href: string) => void;
};

export default function SearchPalette({ search = searchWiki, onNavigate = defaultNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [scope, setScope] = useState<SearchScope>('all');
  const [cursor, setCursor] = useState(0);
  const [indexReady, setIndexReady] = useState<boolean | null>(search === searchWiki ? null : true);
  const [outcome, setOutcome] = useState<SearchOutcome | null>(null);
  const [pending, setPending] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const opened = useRef(false);
  const searchRef = useRef(search);
  searchRef.current = search;
  const titleId = useId();

  const rows = outcome?.status === 'ready' ? outcome.rows : [];
  const groups = outcome?.status === 'ready' ? groupRows(rows, scope) : [];
  const visible = flattenGroups(groups);
  const selected = Math.min(cursor, Math.max(0, visible.length - 1));
  const counts = scopeCounts(rows);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    const onOpen = () => setOpen(true);
    document.addEventListener('keydown', onKey);
    document.addEventListener(SEARCH_OPEN_EVENT, onOpen);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener(SEARCH_OPEN_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      opened.current = true;
      inputRef.current?.focus();
      return;
    }
    if (opened.current) triggerRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open || search !== searchWiki) return;
    let cancel = false;
    setIndexReady(null);
    void loadPagefind(import.meta.env.BASE_URL ?? '/').then((api) => {
      if (!cancel) setIndexReady(api !== null);
    });
    return () => {
      cancel = true;
    };
  }, [open, search]);

  useEffect(() => {
    const query = text.trim();
    if (!query || indexReady === false) {
      setOutcome(null);
      setPending(false);
      return;
    }
    setPending(true);
    let cancel = false;
    const timer = setTimeout(() => {
      void searchRef.current(query).then(
        (result) => {
          if (cancel) return;
          setOutcome(result);
          setPending(false);
          setCursor(0);
          if (result.status === 'unavailable') setIndexReady(false);
        },
        () => {
          if (cancel) return;
          setOutcome({ status: 'unavailable' });
          setIndexReady(false);
          setPending(false);
        },
      );
    }, 120);
    return () => {
      cancel = true;
      clearTimeout(timer);
    };
  }, [text, indexReady]);

  function close() {
    setOpen(false);
  }

  function go(href: string) {
    onNavigate(href);
  }

  function onInputKey(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      const direction = event.shiftKey ? -1 : 1;
      const index = SEARCH_SCOPES.findIndex((item) => item.id === scope);
      const next = SEARCH_SCOPES[(index + direction + SEARCH_SCOPES.length) % SEARCH_SCOPES.length];
      if (next) setScope(next.id);
      setCursor(0);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (visible.length === 0) return;
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setCursor((current) => (current + direction + visible.length) % visible.length);
      return;
    }
    if (event.key === 'Enter') {
      const row = visible[selected];
      if (!row) return;
      event.preventDefault();
      if ((event.metaKey || event.ctrlKey) && row.slug) {
        go(graphFocusHref(row.slug));
        return;
      }
      go(row.href);
    }
  }

  const dialog =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div className="search-layer">
            <div className="search-backdrop" data-testid="search.backdrop" onClick={close} />
            <div
              className="search-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              data-testid="search.dialog"
            >
              <h2 id={titleId} className="visually-hidden">
                Search the wiki
              </h2>
              <div className="search-bar">
                <SearchIcon />
                <input
                  ref={inputRef}
                  className="search-input"
                  type="search"
                  role="combobox"
                  aria-expanded="true"
                  aria-controls="search-results"
                  aria-autocomplete="list"
                  aria-activedescendant={visible[selected] ? resultId(selected) : undefined}
                  placeholder="Search pages, sources..."
                  value={text}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  data-testid="search.input"
                  onChange={(event) => {
                    setText(event.currentTarget.value);
                    setScope('all');
                  }}
                  onKeyDown={onInputKey}
                />
                {outcome?.status === 'ready' && text.trim() ? (
                  <p className="search-count" data-testid="search.meta">
                    {counts.all} {counts.all === 1 ? 'result' : 'results'} · {outcome.ms} ms
                  </p>
                ) : null}
                <button type="button" className="search-esc" tabIndex={-1} onClick={close}>
                  esc
                </button>
              </div>
              {indexReady === false || outcome?.status === 'unavailable' ? (
                <p className="search-note" role="status" data-testid="search.unavailable">
                  The search index is created when the site is built. It is not available from the dev server. Run
                  the build, then open the preview.
                </p>
              ) : indexReady === null ? (
                <p className="search-note" role="status" data-testid="search.loading">
                  Loading the search index…
                </p>
              ) : !text.trim() ? (
                <p className="search-note" data-testid="search.hint">
                  Search titles, page text, tags, and sections.
                </p>
              ) : pending && outcome === null ? (
                <p className="search-note" role="status" data-testid="search.loading">
                  Searching…
                </p>
              ) : (
                <>
                  <div className="search-scope" role="tablist" aria-label="Filter results" data-testid="search.scope">
                    {SEARCH_SCOPES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        role="tab"
                        tabIndex={-1}
                        aria-selected={scope === item.id}
                        data-testid={`search.scope.${item.id}`}
                        onClick={() => {
                          setScope(item.id);
                          setCursor(0);
                        }}
                      >
                        {item.label} <span className="search-scope-count">{counts[item.id]}</span>
                      </button>
                    ))}
                  </div>
                  {visible.length === 0 ? (
                    <p className="search-note" role="status" data-testid="search.empty">
                      No pages match that search.
                    </p>
                  ) : (
                    <div id="search-results" className="search-results" role="listbox" data-testid="search.results">
                      {groups.map((group) => (
                        <ResultGroup
                          key={group.id}
                          group={group}
                          offset={offsetOf(groups, group.id)}
                          selected={selected}
                          onHover={setCursor}
                          onOpen={go}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
              <footer className="search-foot">
                <div className="search-hints">
                  <span>
                    <kbd>↑</kbd>
                    <kbd>↓</kbd> navigate
                  </span>
                  <span>
                    <kbd>↵</kbd> open
                  </span>
                  <span>
                    <kbd>⌘</kbd>
                    <kbd>↵</kbd> show in graph
                  </span>
                  <span>
                    <kbd>tab</kbd> scope
                  </span>
                </div>
                <p className="search-engine">Pagefind · client-side · no API</p>
              </footer>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="search-trigger"
        data-testid="search.trigger"
        aria-keyshortcuts="Control+K Meta+K"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <SearchIcon />
        <span className="search-trigger-full">Search pages, sources...</span>
        <span className="search-trigger-short">Search</span>
        <kbd aria-hidden="true">⌘K</kbd>
      </button>
      {dialog}
    </>
  );
}

function ResultGroup({
  group,
  offset,
  selected,
  onHover,
  onOpen,
}: {
  group: SearchGroup;
  offset: number;
  selected: number;
  onHover: (index: number) => void;
  onOpen: (href: string) => void;
}) {
  return (
    <section className="search-group" aria-label={group.label}>
      <h3 className="search-group-label">{group.label}</h3>
      {group.rows.map((row, index) => {
        const position = offset + index;
        const active = position === selected;
        return (
          <div
            key={row.key}
            id={resultId(position)}
            role="option"
            aria-selected={active}
            className="search-row"
            data-testid="search.result"
            data-kind={row.kind}
            data-type={row.type ?? row.kind}
            data-href={row.href}
            data-selected={active ? 'true' : 'false'}
            onMouseEnter={() => onHover(position)}
            onClick={() => onOpen(row.href)}
          >
            <ResultMark row={row} />
            <div className="search-copy">
              <p className="search-title" dangerouslySetInnerHTML={{ __html: row.titleHtml }} />
              <p className="search-excerpt" dangerouslySetInnerHTML={{ __html: row.excerptHtml }} />
            </div>
            <div className="search-locator">
              <span className="search-path">{row.locator}</span>
              {active ? (
                <span className="search-open">
                  <OpenIcon /> open
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function ResultMark({ row }: { row: SearchRow }) {
  if ((row.kind === 'page' || row.kind === 'source') && row.type) {
    return (
      <span className="search-glyph" data-type={row.type}>
        <PageMark type={row.type} />
      </span>
    );
  }
  return (
    <span className="search-glyph" data-type={row.kind} aria-hidden="true">
      #
    </span>
  );
}

function SearchIcon() {
  return (
    <svg className="search-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <circle cx="7" cy="7" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.4 10.4 13.5 13.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function OpenIcon() {
  return (
    <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
      <path
        d="M3.2 8.8 8.8 3.2M5.2 3.2h3.6v3.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function resultId(index: number): string {
  return `search-result-${index}`;
}

function offsetOf(groups: SearchGroup[], id: string): number {
  let offset = 0;
  for (const group of groups) {
    if (group.id === id) return offset;
    offset += group.rows.length;
  }
  return 0;
}

function defaultNavigate(href: string) {
  window.location.assign(href);
}
