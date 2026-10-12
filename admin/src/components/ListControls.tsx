import { useEffect, useMemo, useState } from 'react';

export const PAGE_SIZE = 10;

// Client-side search + pagination over a list already loaded in full.
// `getSearchText` returns the fields of an item that the search box should
// match against; matching is case-insensitive and every word typed must
// appear somewhere in those fields.
export function useSearchPagination<T>(items: T[], getSearchText: (item: T) => (string | null | undefined)[]) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return items;
    return items.filter((item) => {
      const haystack = getSearchText(item)
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return terms.every((t) => haystack.includes(t));
    });
    // getSearchText is expected to be a stable, pure field picker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  // A new search always starts from the first page.
  useEffect(() => {
    setPage(1);
  }, [query]);

  // Keep the page in range when the list shrinks (e.g. after a delete).
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return { query, setQuery, page: currentPage, setPage, totalPages, filtered, pageItems };
}

export function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="search-box">
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Search…'}
        aria-label="Search"
      />
      {value && (
        <button type="button" className="btn btn-small" onClick={() => onChange('')}>
          Clear
        </button>
      )}
    </div>
  );
}

// Renders nothing when everything fits on a single page.
export function Pagination({
  page,
  totalPages,
  totalItems,
  onChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onChange: (page: number) => void;
}) {
  if (totalItems <= PAGE_SIZE) return null;

  const first = (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, totalItems);

  return (
    <div className="pagination">
      <span className="pagination-info">
        Showing {first}&ndash;{last} of {totalItems}
      </span>
      <div className="pagination-buttons">
        <button type="button" className="btn btn-small" onClick={() => onChange(page - 1)} disabled={page <= 1}>
          &lsaquo; Prev
        </button>
        {pageNumbers(page, totalPages).map((n, i) =>
          n === null ? (
            <span key={`gap-${i}`} className="pagination-gap">
              &hellip;
            </span>
          ) : (
            <button
              key={n}
              type="button"
              className={`btn btn-small${n === page ? ' btn-primary' : ''}`}
              onClick={() => onChange(n)}
              aria-current={n === page ? 'page' : undefined}
            >
              {n}
            </button>
          )
        )}
        <button
          type="button"
          className="btn btn-small"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next &rsaquo;
        </button>
      </div>
    </div>
  );
}

// First, last, and a window around the current page, with null marking gaps.
function pageNumbers(page: number, totalPages: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let n = 1; n <= totalPages; n++) {
    if (n === 1 || n === totalPages || Math.abs(n - page) <= 1) {
      result.push(n);
    } else if (result[result.length - 1] !== null) {
      result.push(null);
    }
  }
  return result;
}
