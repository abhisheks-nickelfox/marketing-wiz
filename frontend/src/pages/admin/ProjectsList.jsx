import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import Pagination from '../../components/Pagination'
import usePagination from '../../hooks/usePagination'
import CreateProjectModal from '../../components/modals/CreateProjectModal'
import Toast from '../../components/Toast'
import { projectsApi, firmsApi, formatDate } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

const ProjectsList = () => {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'
  const [searchParams, setSearchParams] = useSearchParams()

  const [firms, setFirms] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [firmsLoading, setFirmsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [firmFilter, setFirmFilter] = useState(() => searchParams.get('firm_id') ?? 'all')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null) // project to confirm delete
  const [deleting, setDeleting] = useState(false)
  const [archivingId, setArchivingId] = useState(null)

  const [toastMsg, setToastMsg] = useState('')
  const [showToast, setShowToast] = useState(false)

  // Pagination
  const itemsPerPage = 10
  const initialPage = parseInt(searchParams.get('page') || '1', 10)

  // Client-side search filter
  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

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

  const handlePageChange = (page) => {
    goToPage(page)
    setSearchParams({ page: page.toString() })
  }

  // Load firms on mount for filter dropdown
  useEffect(() => {
    firmsApi
      .list()
      .then((res) => setFirms(res.data ?? []))
      .catch(() => {})
      .finally(() => setFirmsLoading(false))
  }, [])

  // Fetch projects when firm filter changes
  const fetchProjects = (fid) => {
    setLoading(true)
    setError(null)
    const apiCall = fid && fid !== 'all'
      ? projectsApi.list(fid)
      : projectsApi.listAll()
    apiCall
      .then((res) => {
        setProjects(res.data ?? [])
        goToPage(1)
        setSearchParams({ page: '1' })
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchProjects(firmFilter)
  }, [firmFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleProjectCreated = (newProject) => {
    setToastMsg(`Project "${newProject?.name ?? 'Project'}" created`)
    setShowToast(true)
    fetchProjects(firmFilter)
  }

  const handleArchive = async (project) => {
    setArchivingId(project.id)
    try {
      await projectsApi.archive(project.id)
      const label = project.archived ? 'unarchived' : 'archived'
      setToastMsg(`Project ${label}`)
      setShowToast(true)
      fetchProjects(firmFilter)
    } catch (err) {
      setError(err.message)
    } finally {
      setArchivingId(null)
    }
  }

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      await projectsApi.delete(deleteConfirm.id)
      setDeleteConfirm(null)
      setToastMsg('Project deleted')
      setShowToast(true)
      fetchProjects(firmFilter)
    } catch (err) {
      // Backend returns 400 if the project has tickets
      setError(err.message)
      setDeleteConfirm(null)
    } finally {
      setDeleting(false)
    }
  }

  const getStatusBadge = (project) => {
    if (project.archived) return { label: 'Archived', style: 'bg-surface-container-high text-on-surface-variant' }
    return { label: 'Active', style: 'bg-emerald-100 text-emerald-700' }
  }

  return (
    <div className="flex">
      <Sidebar role="admin" />

      <div className="flex-1 flex flex-col min-h-screen ml-0 md:ml-[240px]">
        {/* TopNav */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md flex justify-between items-center px-4 sm:px-8 lg:px-12 h-14 lg:h-16">
          <div className="flex items-center gap-3 lg:gap-6 flex-1 pl-12 md:pl-0 min-w-0">
            <h2 className="text-base lg:text-lg font-bold text-[#111111] tracking-tight shrink-0">Projects</h2>
            <div className="relative w-full max-w-xs lg:max-w-md group">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg group-focus-within:text-primary transition-colors">
                search
              </span>
              <input
                className="w-full bg-surface-container-low border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary-container outline-none transition-all"
                placeholder="Search projects..."
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
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 mb-6 lg:mb-8">
              <div>
                <h3 className="text-2xl lg:text-4xl font-extrabold text-on-surface tracking-tighter mb-1 lg:mb-2">Projects</h3>
                <p className="text-on-surface-variant font-medium max-w-xl leading-relaxed text-sm">
                  Organise tickets into projects scoped to each client firm.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-primary-container text-white px-4 lg:px-6 py-2.5 rounded-lg font-bold text-sm tracking-tight flex items-center gap-2 hover:bg-primary transition-colors shadow-sm active:scale-95 duration-200 shrink-0 self-start sm:self-auto"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                New Project
              </button>
            </div>

            {/* Firm Filter */}
            <div className="mb-6">
              <div className="flex flex-col gap-1.5 max-w-xs">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Filter by Firm
                </label>
                <select
                  className="bg-surface-container-lowest border-none rounded-lg text-sm px-4 py-2.5 focus:ring-2 focus:ring-primary-container/20"
                  value={firmFilter}
                  onChange={(e) => setFirmFilter(e.target.value)}
                  disabled={firmsLoading}
                >
                  <option value="all">All Firms</option>
                  {firms.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-lg text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-base shrink-0">error</span>
                {error}
              </div>
            )}

            {/* Delete Confirmation Banner */}
            {deleteConfirm && (
              <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-xl text-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg shrink-0">warning</span>
                  <span>
                    Permanently delete <strong>{deleteConfirm.name}</strong>?{' '}
                    This cannot be undone.
                  </span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    disabled={deleting}
                    className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirmed}
                    disabled={deleting}
                    className="px-3 py-1.5 rounded-lg bg-error text-white text-xs font-bold hover:brightness-110 transition-all disabled:opacity-60"
                  >
                    {deleting ? 'Deleting…' : 'Delete Forever'}
                  </button>
                </div>
              </div>
            )}

            {/* Projects Table */}
            <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[640px]">
                  <thead>
                    <tr className="bg-surface-container-high/50 text-on-surface-variant uppercase text-[10px] font-bold tracking-widest">
                      <th className="px-6 lg:px-8 py-4">Name</th>
                      <th className="px-6 lg:px-8 py-4">Firm</th>
                      <th className="px-6 lg:px-8 py-4 hidden md:table-cell">Tickets</th>
                      <th className="px-6 lg:px-8 py-4 hidden lg:table-cell">Created</th>
                      <th className="px-6 lg:px-8 py-4">Status</th>
                      <th className="px-6 lg:px-8 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-low">
                    {loading && (
                      <tr>
                        <td colSpan={6} className="px-8 py-8 text-center text-on-surface-variant animate-pulse">
                          Loading projects…
                        </td>
                      </tr>
                    )}
                    {!loading && filtered.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-8 py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">folder_open</span>
                            <p className="text-on-surface-variant text-sm font-medium">
                              {searchQuery ? 'No projects match your search.' : 'No projects yet.'}
                            </p>
                            {!searchQuery && (
                              <button
                                onClick={() => setShowCreateModal(true)}
                                className="mt-1 text-primary-container font-bold text-sm hover:underline"
                              >
                                + New Project
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    {!loading && paginatedItems.map((project) => {
                      const statusBadge = getStatusBadge(project)
                      return (
                        <tr
                          key={project.id}
                          className="hover:bg-surface-container-low transition-colors duration-200 group"
                        >
                          <td className="px-6 lg:px-8 py-4 lg:py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                                <span className="material-symbols-outlined text-lg">folder</span>
                              </div>
                              <span className="font-bold text-on-surface">{project.name}</span>
                            </div>
                          </td>
                          <td className="px-6 lg:px-8 py-4 lg:py-5 text-sm text-on-surface-variant">
                            {project.firm_name ?? project.firms?.name ?? '—'}
                          </td>
                          <td className="px-6 lg:px-8 py-4 lg:py-5 hidden md:table-cell">
                            <span className="font-bold text-on-surface">
                              {project.ticket_count ?? 0}
                            </span>
                          </td>
                          <td className="px-6 lg:px-8 py-4 lg:py-5 text-sm text-on-surface-variant hidden lg:table-cell">
                            {formatDate(project.created_at)}
                          </td>
                          <td className="px-6 lg:px-8 py-4 lg:py-5">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${statusBadge.style}`}>
                              {statusBadge.label}
                            </span>
                          </td>
                          <td className="px-6 lg:px-8 py-4 lg:py-5 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <Link
                                to={`/admin/projects/${project.id}`}
                                className="text-primary-container font-bold text-xs uppercase tracking-tight hover:text-primary transition-colors"
                              >
                                View
                              </Link>
                              <button
                                onClick={() => handleArchive(project)}
                                disabled={archivingId === project.id}
                                className="text-on-surface-variant hover:text-on-surface transition-colors text-xs font-bold disabled:opacity-50"
                                title={project.archived ? 'Unarchive' : 'Archive'}
                              >
                                <span className="material-symbols-outlined text-base">
                                  {project.archived ? 'unarchive' : 'archive'}
                                </span>
                              </button>
                              {isSuperAdmin && (
                                <button
                                  onClick={() => setDeleteConfirm(project)}
                                  className="text-error hover:text-error/80 transition-colors text-xs font-bold"
                                  title="Delete project"
                                >
                                  <span className="material-symbols-outlined text-base">delete_forever</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="px-4 sm:px-6 lg:px-8 py-4 bg-surface-container-low/30 border-t border-surface-container-low flex justify-between items-center">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  Showing {paginatedItems.length > 0 ? ((currentPage - 1) * itemsPerPage + 1) : 0}–{(currentPage - 1) * itemsPerPage + paginatedItems.length} of {filtered.length} project{filtered.length !== 1 ? 's' : ''}
                </p>
              </div>

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

      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        firms={firms}
        onCreated={handleProjectCreated}
      />

      <Toast message={toastMsg} isVisible={showToast} onClose={() => setShowToast(false)} />
    </div>
  )
}

export default ProjectsList
