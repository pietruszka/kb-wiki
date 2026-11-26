import { useEffect, useState } from 'react';
import { FILTER_CLEAR_EVENT, FILTER_EVENT } from '../lib/filter-events';
import { SEARCH_OPEN_EVENT } from '../lib/search';

type Props = {
  placeholder: string;
};

export default function HomeSearch({ placeholder }: Props) {
  const [text, setText] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setText(params.get('q') ?? '');
    const onClear = () => setText('');
    document.addEventListener(FILTER_CLEAR_EVENT, onClear);
    return () => document.removeEventListener(FILTER_CLEAR_EVENT, onClear);
  }, []);

  return (
    <form
      className="home-search"
      role="search"
      data-testid="home.filter"
      onSubmit={(event) => event.preventDefault()}
    >
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <circle cx="7" cy="7" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M10.4 10.4 13.5 13.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <label className="home-search-label">
        <span className="visually-hidden">Filter the catalog</span>
        <input
          type="search"
          name="q"
          value={text}
          placeholder={placeholder}
          autoComplete="off"
          data-testid="home.filter.query"
          onChange={(event) => {
            const value = event.currentTarget.value;
            setText(value);
            const params = new URLSearchParams(window.location.search);
            if (value.trim()) params.set('q', value);
            else params.delete('q');
            const query = params.toString();
            const next = query ? `${window.location.pathname}?${query}` : window.location.pathname;
            window.history.replaceState(null, '', next);
            document.dispatchEvent(new CustomEvent(FILTER_EVENT, { detail: { text: value } }));
          }}
        />
      </label>
      <button
        type="button"
        className="home-search-kbd"
        data-testid="home.filter.search"
        onClick={() => document.dispatchEvent(new Event(SEARCH_OPEN_EVENT))}
      >
        <span className="visually-hidden">Open search</span>
        <kbd aria-hidden="true">⌘K</kbd>
      </button>
    </form>
  );
}
