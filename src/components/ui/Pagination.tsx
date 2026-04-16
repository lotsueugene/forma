'use client';

import { CaretLeft, CaretRight } from '@phosphor-icons/react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function getPageNumbers(page: number, totalPages: number): (number | 'ellipsis')[] {
  const pages: (number | 'ellipsis')[] = [];

  // Always include first page
  pages.push(1);

  // Left ellipsis
  if (page - 1 > 3) {
    pages.push('ellipsis');
  }

  // Pages around current: page-1, page, page+1
  for (let i = page - 1; i <= page + 1; i++) {
    if (i > 1 && i < totalPages) {
      // Avoid duplicate with first/last and fill gap (e.g. 1 ... 3 -> 1 2 3)
      if (!pages.includes(i)) {
        // If there's an ellipsis and i === 2, replace the ellipsis
        if (i === 2 && pages[pages.length - 1] === 'ellipsis') {
          pages.pop();
        }
        pages.push(i);
      }
    }
  }

  // Right ellipsis
  if (page + 1 < totalPages - 2) {
    pages.push('ellipsis');
  } else if (page + 1 === totalPages - 2 && !pages.includes(totalPages - 1)) {
    // Fill gap instead of ellipsis (e.g. 8 ... 10 -> 8 9 10)
    pages.push(totalPages - 1);
  }

  // Always include last page
  if (totalPages > 1) {
    if (!pages.includes(totalPages)) {
      pages.push(totalPages);
    }
  }

  return pages;
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pageNumbers = getPageNumbers(page, totalPages);

  const btnBase =
    'flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed';
  const sizeSm = 'w-7 h-7 text-[11px] sm:w-8 sm:h-8 sm:text-xs';

  return (
    <div className="flex items-center justify-center gap-1">
      {/* Previous */}
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className={`${btnBase} ${sizeSm}`}
        aria-label="Previous page"
      >
        <CaretLeft size={14} />
      </button>

      {/* Page numbers */}
      {pageNumbers.map((p, i) =>
        p === 'ellipsis' ? (
          <span
            key={`ellipsis-${i}`}
            className={`flex items-center justify-center ${sizeSm} text-gray-400 select-none`}
          >
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`${sizeSm} flex items-center justify-center rounded-lg font-medium transition-colors ${
              p === page
                ? 'bg-safety-orange text-white border border-safety-orange'
                : `${btnBase}`
            }`}
          >
            {p}
          </button>
        )
      )}

      {/* Next */}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className={`${btnBase} ${sizeSm}`}
        aria-label="Next page"
      >
        <CaretRight size={14} />
      </button>
    </div>
  );
}
