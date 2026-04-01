import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import Pagination from '../../components/Pagination'
import usePagination from '../../hooks/usePagination'
import { firmsApi, timeAgo } from '../../lib/api'

const FirmsList = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [firms, setFirms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    firmsApi
      .list()
      .then((res) => setFirms(res.data ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Filter firms based on search query
  const filtered = firms.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Pagination setup - 10 items per page
  const itemsPerPage = 10
  const initialPage = parseInt(searchParams.get('page') || '1', 10)
  const {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
  } = usePagination(filtered, itemsPerPage, initialPage)

  // Reset to page 1 when search query changes
  useEffect(() => {
    goToPage(1)
    setSearchParams({ page: '1' })
  }, [searchQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update URL when page changes
  const handlePageChange = (page) => {
    goToPage(page)
    setSearchParams({ page: page.toString() })
  }

  const totalTickets = firms.reduce((s, f) => s + (f.ticket_count ?? 0), 0)
  const totalPending = firms.reduce((s, f) => s + (f.pending_count ?? 0), 0)

  const handleExportCSV = () => {
    const rows = [
      ['Name', 'Total Tickets', 'Pending', 'Draft', 'Last Activity'],
      ...firms.map((f) => [
        f.name,
        f.ticket_count,
        f.pending_count,
        f.draft_count,
        f.last_activity ?? '',
      ]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'firms.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex">
      <Sidebar role="admin" />

      <div className="flex-1 flex flex-col min-h-screen ml-0 md:ml-[240px]">
      {/* TopNav */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md flex justify-between items-center px-4 sm:px-8 lg:px-12 h-14 lg:h-16">
        <div className="flex items-center gap-3 lg:gap-6 flex-1 pl-12 md:pl-0 min-w-0">
          <h2 className="text-base lg:text-lg font-bold text-[#111111] tracking-tight shrink-0">Firms</h2>
          <div className="relative w-full max-w-xs lg:max-w-md group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg group-focus-within:text-primary transition-colors">
              search
            </span>
            <input
              className="w-full bg-surface-container-low border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary-container outline-none transition-all"
              placeholder="Search firms..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-3 ml-3">
          <button className="text-gray-600 hover:text-orange-600 transition-all p-1">
            <span className="material-symbols-outlined">notifications</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="bg-surface-container-low flex-1">
        <div className="px-4 sm:px-8 lg:px-12 py-6 lg:py-10 max-w-[1400px]">

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 mb-6 lg:mb-10">
            <div>
              <h3 className="text-2xl lg:text-4xl font-extrabold text-on-surface tracking-tighter mb-1 lg:mb-2">Client Firms</h3>
              <p className="text-on-surface-variant font-medium max-w-xl leading-relaxed text-sm">
                Manage and monitor ticket activity across all client organizations.
              </p>
            </div>
            <Link
              to="/admin/firms/new"
              className="bg-primary-container text-white px-4 lg:px-6 py-2.5 rounded-lg font-bold text-sm tracking-tight flex items-center gap-2 hover:bg-primary transition-colors shadow-sm active:scale-95 duration-200 shrink-0 self-start sm:self-auto"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Add New Firm
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-5 mb-6 lg:mb-10">
            <div className="sm:col-span-2 bg-surface-container-lowest rounded-xl p-5 lg:p-8">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Overview</span>
              <h4 className="text-lg lg:text-2xl font-bold mt-1 tracking-tight">Active Ecosystem</h4>
              <div className="flex flex-wrap gap-6 lg:gap-14 mt-5 lg:mt-8">
                <div>
                  <p className="text-3xl lg:text-4xl font-black tracking-tighter text-on-surface">{firms.length}</p>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mt-1">Total Firms</p>
                </div>
                <div>
                  <p className="text-3xl lg:text-4xl font-black tracking-tighter text-on-surface">
                    {totalTickets >= 1000 ? `${(totalTickets / 1000).toFixed(1)}k` : totalTickets}
                  </p>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mt-1">Total Tickets</p>
                </div>
                <div>
                  <p className="text-3xl lg:text-4xl font-black tracking-tighter text-on-surface">{totalPending}</p>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mt-1">Pending</p>
                </div>
              </div>
            </div>
            <div className="bg-primary-container rounded-xl p-5 lg:p-8 text-white flex flex-col justify-between">
              <div>
                <h4 className="text-base lg:text-xl font-bold tracking-tight">Client Directory</h4>
                <p className="text-white/70 text-sm mt-2">
                  {firms.length} active organizations tracked.
                </p>
              </div>
              <div className="mt-5 flex items-center gap-2 text-white/80 text-sm">
                <span className="material-symbols-outlined text-sm">business</span>
                <span>{firms.length} firms total</span>
              </div>
            </div>
          </div>

          {/* Directory Panel */}
          <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 sm:px-6 lg:px-8 py-4 lg:py-5 flex justify-between items-center border-b border-surface-container-low">
              <h5 className="font-bold text-sm lg:text-base tracking-tight">Organization Directory</h5>
              <button
                className="text-primary text-sm font-bold flex items-center gap-1 hover:underline"
                onClick={handleExportCSV}
              >
                <span className="hidden sm:inline">Export CSV</span>
                <span className="material-symbols-outlined text-sm">download</span>
              </button>
            </div>

            {error && (
              <div className="px-6 py-4 bg-error-container text-on-error-container text-sm">{error}</div>
            )}

            {/* ── Mobile card list (xs only) ── */}
            <div className="sm:hidden divide-y divide-surface-container-low">
              {loading && (
                <div className="px-4 py-8 text-center text-on-surface-variant text-sm animate-pulse">
                  Loading firms…
                </div>
              )}
              {!loading && filtered.length === 0 && (
                <div className="px-4 py-8 text-center text-on-surface-variant text-sm">
                  No firms found
                </div>
              )}
              {paginatedItems.map((firm) => (
                <div key={firm.id} className="px-4 py-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                      <span className="material-symbols-outlined text-lg">business</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-on-surface text-sm truncate">{firm.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-on-surface-variant">
                          <span className="font-bold text-on-surface">{firm.ticket_count ?? 0}</span> tickets
                        </span>
                        <span className="inline-flex items-center gap-1 bg-tertiary-fixed text-on-tertiary-fixed-variant px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                          {firm.pending_count ?? 0} pending
                        </span>
                      </div>
                      {firm.last_activity && (
                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                          {timeAgo(firm.last_activity)}
                        </p>
                      )}
                    </div>
                  </div>
                  <Link
                    to={`/admin/firms/${firm.id}`}
                    className="shrink-0 bg-surface-container-high text-primary-container font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-primary-container hover:text-white transition-colors"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>

            {/* ── Desktop table (sm+) ── */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-high/50 text-on-surface-variant uppercase text-[10px] font-bold tracking-widest">
                    <th className="px-6 lg:px-8 py-4">Firm Name</th>
                    <th className="px-6 lg:px-8 py-4">Total Tickets</th>
                    <th className="px-6 lg:px-8 py-4">Pending</th>
                    <th className="px-6 lg:px-8 py-4 hidden md:table-cell">Draft</th>
                    <th className="px-6 lg:px-8 py-4 hidden lg:table-cell">Last Activity</th>
                    <th className="px-6 lg:px-8 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low">
                  {loading && (
                    <tr>
                      <td colSpan={6} className="px-8 py-8 text-center text-on-surface-variant animate-pulse">
                        Loading firms…
                      </td>
                    </tr>
                  )}
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-8 py-8 text-center text-on-surface-variant">
                        No firms found
                      </td>
                    </tr>
                  )}
                  {paginatedItems.map((firm) => (
                    <tr key={firm.id} className="hover:bg-surface-container-low transition-colors duration-200 group">
                      <td className="px-6 lg:px-8 py-4 lg:py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                            <span className="material-symbols-outlined text-lg">business</span>
                          </div>
                          <span className="font-bold text-on-surface">{firm.name}</span>
                        </div>
                      </td>
                      <td className="px-6 lg:px-8 py-4 lg:py-5 font-bold text-on-surface">{firm.ticket_count ?? 0}</td>
                      <td className="px-6 lg:px-8 py-4 lg:py-5">
                        <span className="inline-flex items-center gap-1.5 bg-tertiary-fixed text-on-tertiary-fixed-variant px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                          {firm.pending_count ?? 0}
                        </span>
                      </td>
                      <td className="px-6 lg:px-8 py-4 lg:py-5 hidden md:table-cell">
                        <span className="bg-surface-container-high text-on-surface-variant px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
                          {firm.draft_count ?? 0}
                        </span>
                      </td>
                      <td className="px-6 lg:px-8 py-4 lg:py-5 text-sm text-on-surface-variant hidden lg:table-cell">
                        {firm.last_activity ? timeAgo(firm.last_activity) : '—'}
                      </td>
                      <td className="px-6 lg:px-8 py-4 lg:py-5 text-right">
                        <Link
                          to={`/admin/firms/${firm.id}`}
                          className="text-primary-container font-bold text-xs uppercase tracking-tight hover:text-primary transition-colors"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 sm:px-6 lg:px-8 py-4 bg-surface-container-low/30 border-t border-surface-container-low flex justify-between items-center">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                Showing {paginatedItems.length > 0 ? ((currentPage - 1) * itemsPerPage + 1) : 0}-{(currentPage - 1) * itemsPerPage + paginatedItems.length} of {filtered.length} organizations
              </p>
            </div>

            {/* Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              maxPageButtons={5}
            />
          </div>

        </div>
      </main>
      </div>
    </div>
  )
}

export default FirmsList
