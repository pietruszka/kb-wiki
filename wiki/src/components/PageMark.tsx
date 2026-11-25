import { PAGE_TYPES, isPageType, type PageType } from '../lib/page-types';

type Props = {
  type: PageType;
};

/** Compact page-type glyph. The paths match PageTypeBadge. */
export default function PageMark({ type }: Props) {
  if (!isPageType(type)) return null;
  const pageType = PAGE_TYPES[type];
  return (
    <svg
      className="page-mark"
      viewBox="0 0 12 12"
      width="12"
      height="12"
      aria-hidden="true"
      data-type={type}
      data-glyph={pageType.glyph}
    >
      {type === 'concept' && <path d="M6 0.75 11.1 6 6 11.25 0.9 6Z" fill="currentColor" />}
      {type === 'entity' && <circle cx="6" cy="6" r="3.1" fill="currentColor" />}
      {type === 'comparison' && (
        <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M0.8 3.2h7.6" />
          <path d="M6.4 1.2 9.2 3.2 6.4 5.2" />
          <path d="M11.2 8.8H3.6" />
          <path d="M5.6 6.8 2.8 8.8 5.6 10.8" />
        </g>
      )}
      {type === 'source' && (
        <g fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
          <rect x="1.3" y="1.3" width="9.4" height="9.4" />
          <path d="M2.4 4.4h7.2M2.4 6.5h7.2M2.4 8.6h7.2" />
        </g>
      )}
    </svg>
  );
}
