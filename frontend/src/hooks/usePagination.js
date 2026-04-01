import { useState, useMemo, useEffect } from 'react'

/**
 * Custom hook for managing pagination state and logic
 * 
 * @param {Array} items - The array of items to paginate
 * @param {number} itemsPerPage - Number of items to display per page
 * @param {number} initialPage - Initial page number (default: 1)
 * @returns {Object} Pagination state and controls
 */
function usePagination(items, itemsPerPage, initialPage = 1) {
  const [currentPage, setCurrentPage] = useState(initialPage)

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(items.length / itemsPerPage))
  }, [items.length, itemsPerPage])

  // Reset to page 1 if current page exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1)
    }
  }, [currentPage, totalPages])

  // Calculate start and end indices
  const startIndex = useMemo(() => {
    return (currentPage - 1) * itemsPerPage
  }, [currentPage, itemsPerPage])

  const endIndex = useMemo(() => {
    return Math.min(startIndex + itemsPerPage, items.length)
  }, [startIndex, itemsPerPage, items.length])

  // Get paginated items
  const paginatedItems = useMemo(() => {
    return items.slice(startIndex, endIndex)
  }, [items, startIndex, endIndex])

  // Navigation functions
  const goToPage = (page) => {
    const pageNumber = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(pageNumber)
  }

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  return {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
    nextPage,
    previousPage,
    startIndex,
    endIndex,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  }
}

export default usePagination
