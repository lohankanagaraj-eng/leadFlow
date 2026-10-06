import { useMemo, useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/utils/constants';
import { Loading, EmptyState, ErrorState, Pagination, SearchInput } from '@/components/ui';

/**
 * Advanced data table: client-side sort + optional server-driven search/filters.
 *
 * columns: [{ key, header, render?, sortable?, align?, className?, width? }]
 */
export default function DataTable({
  columns,
  rows = [],
  loading,
  error,
  onRetry,
  keyField = 'id',
  search,
  onSearch,
  searchPlaceholder,
  filters = null,
  toolbar = null,
  emptyTitle = 'No records found',
  emptyDescription,
  emptyAction,
  page,
  limit = 15,
  total,
  onPage,
  onRowClick,
  initialSort = null,
  className,
  stickyHeader = true,
}) {
  const [sort, setSort] = useState(initialSort);

  const sorted = useMemo(() => {
    if (!sort || !rows?.length) return rows;
    const { key, dir } = sort;
    return [...rows].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), undefined, { numeric: true });
      return dir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sort]);

  useEffect(() => { setSort(initialSort); /* eslint-disable-next-line */ }, [JSON.stringify(initialSort)]);

  const toggleSort = (key) => {
    setSort((s) => (s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' }));
  };

  const showToolbar = onSearch || filters || toolbar;

  return (
    <div className={cn('card overflow-hidden', className)}>
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          {onSearch && (
            <SearchInput value={search || ''} onChange={onSearch} placeholder={searchPlaceholder} className="w-full sm:w-72" />
          )}
          {filters}
          <div className="ml-auto flex items-center gap-2">{toolbar}</div>
        </div>
      )}

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : !sorted?.length ? (
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className={cn('bg-slate-50 dark:bg-slate-900/60', stickyHeader && 'sticky top-0 z-10')}>
              <tr>
                {columns.map((c) => (
                  <th key={c.key}
                    className={cn('th border-b border-slate-200 dark:border-slate-800', c.align === 'right' && 'text-right', c.className)}
                    style={{ width: c.width }}>
                    {c.sortable === false ? c.header : (
                      <button onClick={() => toggleSort(c.key)} className={cn('inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200', c.align === 'right' && 'w-full justify-end')}>
                        {c.header}
                        {sort?.key === c.key
                          ? (sort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
                          : <ChevronsUpDown size={12} className="opacity-40" />}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {sorted.map((row) => (
                <tr key={row[keyField]}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn('transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40',
                    onRowClick && 'cursor-pointer')}>
                  {columns.map((c) => (
                    <td key={c.key}
                      className={cn('td text-slate-600 dark:text-slate-300', c.align === 'right' && 'text-right', c.className)}>
                      {c.render ? c.render(row) : row[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {onPage && <Pagination page={page} limit={limit} total={total || rows?.length || 0} onPage={onPage} />}
    </div>
  );
}
