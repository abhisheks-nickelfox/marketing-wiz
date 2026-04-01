import PropTypes from 'prop-types'

/**
 * Reusable Pagination Component
 * 
 * @param {number} currentPage - Current active page
 * @param {number} totalPages - Total number of pages
 * @param {function} onPageChange - Callback when page changes
 * @param {number} maxPageButtons - Maximum number of page buttons to show (default: 5)
 */
const Pagination = ({ currentPage, totalPages, onPageChange, maxPageButtons = 5 }) => {
  // Don't render if there's only one page or no pages
  if (totalPages <= 1) return null

  // Calculate page numbers to display
  const getPageNumbers = () => {
    const pages = []
    
    if (totalPages <= maxPageButtons) {
      // Show all pages if total is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Calculate range around current page
      const halfMax = Math.floor(maxPageButtons / 2)
      let startPage = Math.max(1, currentPage - halfMax)
      let endPage = Math.min(totalPages, currentPage + halfMax)

      // Adjust if we're near the start or end
      if (currentPage <= halfMax) {
        endPage = maxPageButtons
      } else if (currentPage >= totalPages - halfMax) {
        startPage = totalPages - maxPageButtons + 1
      }

      // Add first page and ellipsis if needed
      if (startPage > 1) {
        pages.push(1)
        if (startPage > 2) {
          pages.push('ellipsis-start')
        }
      }

      // Add page numbers in range
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i)
      }

      // Add ellipsis and last page if needed
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pages.push('ellipsis-end')
        }
        pages.push(totalPages)
      }
    }

    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <nav 
      className="flex items-center justify-center gap-1 sm:gap-2 py-4" 
      aria-label="Pagination navigation"
    >
      {/* Previous Button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Go to previous page"
        className={`
          flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-bold transition-all
          ${currentPage === 1
            ? 'opacity-50 cursor-not-allowed bg-surface-container-low text-on-surface-variant'
            : 'bg-surface-container-low text-on-surface hover:bg-surface-container active:scale-95'
          }
        `}
      >
        <span className="material-symbols-outlined text-base">chevron_left</span>
        <span className="hidden sm:inline">Previous</span>
      </button>

      {/* Page Numbers */}
      <div className="flex items-center gap-1">
        {pageNumbers.map((page, index) => {
          if (typeof page === 'string' && page.startsWith('ellipsis')) {
            return (
              <span
                key={page}
                className="px-2 text-on-surface-variant"
                aria-hidden="true"
              >
                ...
              </span>
            )
          }

          const isActive = page === currentPage

          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              aria-label={`Go to page ${page}`}
              aria-current={isActive ? 'page' : undefined}
              className={`
                min-w-[36px] h-9 px-3 rounded-lg text-sm font-bold transition-all
                ${isActive
                  ? 'bg-primary-container text-white shadow-sm'
                  : 'bg-surface-container-low text-on-surface hover:bg-surface-container active:scale-95'
                }
              `}
            >
              {page}
            </button>
          )
        })}
      </div>

      {/* Next Button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Go to next page"
        className={`
          flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-bold transition-all
          ${currentPage === totalPages
            ? 'opacity-50 cursor-not-allowed bg-surface-container-low text-on-surface-variant'
            : 'bg-surface-container-low text-on-surface hover:bg-surface-container active:scale-95'
          }
        `}
      >
        <span className="hidden sm:inline">Next</span>
        <span className="material-symbols-outlined text-base">chevron_right</span>
      </button>
    </nav>
  )
}

Pagination.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  maxPageButtons: PropTypes.number,
}

export default Pagination
