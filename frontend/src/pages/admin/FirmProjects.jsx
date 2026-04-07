import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import Pagination from '../../components/Pagination'
import usePagination from '../../hooks/usePagination'
import CreateProjectModal from '../../components/modals/CreateProjectModal'
import Toast from '../../components/Toast'
import { firmsApi, projectsApi, formatDate } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

const FirmProjects = () => {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [firm, setFirm] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionError, setActionError] = useState(null)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState(null)
  const [archivingId, setArchivingId] = useState(null)
  const [toastMsg, setToastMsg] = useState('')
  const [showToast, setShowToast] = useState(false)

  const itemsPerPage = 12
  const initialPage = parseInt(searchParams.get('page') || '1', 10)
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedProjects,
    goToPage,
  } = usePagination(projects, itemsPerPage, initialPage)

  const handlePageChange = (page) => {
    goToPage(page)
    setSearchParams({ page: page.toString() })
  }

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([
      firmsApi.get(id),
      projectsApi.list(id),
    ])
      .then(([firmRes, projectsRes]) => {
        setFirm(firmRes.data)
        setProjects(projectsRes.data ?? [])
        goToPage(1)
        setSearchParams({ page: '1' })
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleArchive = async (projectId) => {
    setArchivingId(projectId)
    setActionError(null)
    try {
      await projectsApi.archive(projectId)
      const project = projects.find((p) => p.id === projectId)
      const wasArchived = project?.status === 'archived'
      setToastMsg(wasArchived ? 'Project unarchived' : 'Project archived')
      setShowToast(true)
      loadData()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setArchivingId(null)
    }
  }

  const handleDeleteRequest = (projectId) => {
    setActionError(null)
    setDeleteTargetId(projectId)
  }

  const handleDeleteConfirm = async () => {
    try {
      await projectsApi.delete(deleteTargetId)
      setDeleteTargetId(null)
      setToastMsg('Project deleted')
      setShowToast(true)
      loadData()
    } catch (err) {
      setActionError(err.message)
      setDeleteTargetId(null)
    }
  }

  const handleDeleteCancel = () => setDeleteTargetId(null)

  const handleProjectCreated = () => {
    loadData()
  }

  if (loading) {
    return (
      <div className="flex">
        <Sidebar role="admin" />
        <main className="ml-0 md:ml-[240px] min-h-screen bg-surface flex items-center justify-center flex-1 pt-16 md:pt-0">
          <p className="text-on-surface-variant animate-pulse">Loading projects…</p>
        </main>
      </div>
    )
  }

  if (error || !firm) {
    return (
      <div className="flex">
        <Sidebar role="admin" />
        <main className="ml-0 md:ml-[240px] min-h-screen bg-surface flex items-center justify-center flex-1 pt-16 md:pt-0">
          <p className="text-error">{error ?? 'Firm not found'}</p>
        </main>
      </div>
    )
  }

  return (
    <div className="flex">
      <Sidebar role="admin" />

      {/* TopNav */}
      <header className="fixed top-0 left-0 md:left-[240px] right-0 h-14 bg-surface flex justify-between items-center px-4 sm:px-8 lg:px-12 z-40">
        <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant pl-12 md:pl-0 flex-wrap">
          <Link to="/admin/firms" className="hover:text-primary transition-colors">Firms</Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <Link
            to={`/admin/firms/${id}`}
            className="hover:text-primary transition-colors truncate max-w-[100px] sm:max-w-none"
          >
            {firm.name}
          </Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-on-surface">Projects</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors">notifications</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="ml-0 md:ml-[240px] pt-14 min-h-screen bg-surface flex-1">
        <div className="px-4 sm:px-8 lg:px-12 py-6 lg:py-10 max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6 lg:mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-primary-container text-base">folder</span>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">{firm.name}</span>
              </div>
              <h1 className="text-2xl lg:text-4xl font-extrabold tracking-tight text-on-surface mb-2 lg:mb-3">
                Projects
              </h1>
              <div className="flex flex-wrap items-center gap-4 lg:gap-6 text-sm text-on-surface-variant">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">folder_open</span>
                  <span>{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                className="bg-primary-container text-white px-4 py-2 text-sm font-bold rounded-lg hover:bg-primary transition-colors flex items-center gap-2"
                onClick={() => setShowCreateModal(true)}
              >
                <span className="material-symbols-outlined text-base">add</span>
                Add Project
              </button>
            </div>
          </div>

          {/* Inline confirmation banner */}
          {deleteTargetId && (
            <div className="mb-4 p-4 bg-error-container text-on-error-container rounded-xl text-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg shrink-0">warning</span>
                <span>Permanently delete this project? <strong>This cannot be undone.</strong></span>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={handleDeleteCancel}
                  className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-3 py-1.5 rounded-lg bg-error text-white text-xs font-bold hover:brightness-110 transition-all"
                >
                  Delete Forever
                </button>
              </div>
            </div>
          )}

          {actionError && (
            <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-lg text-sm">
              {actionError}
            </div>
          )}

          {/* Empty state */}
          {projects.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">folder</span>
              <p className="text-sm text-on-surface-variant italic">
                No projects yet. Create the first project.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-1 bg-primary-container text-white px-4 py-2 text-sm font-bold rounded-lg hover:bg-primary transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-base">add</span>
                Add Project
              </button>
            </div>
          )}

          {/* Project Cards Grid */}
          {projects.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginatedProjects.map((project) => (
                <div
                  key={project.id}
                  className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-5 flex flex-col gap-4 transition-all hover:shadow-lg hover:shadow-black/5"
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-sm font-bold text-on-surface truncate">{project.name}</h3>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 ${
                          project.status === 'archived'
                            ? 'bg-surface-container-high text-on-surface-variant'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {project.status === 'archived' ? 'Archived' : 'Active'}
                        </span>
                      </div>
                      {project.description && (
                        <p className="text-xs text-on-surface-variant line-clamp-2">{project.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">confirmation_number</span>
                      <span>{project.ticket_count ?? 0} ticket{(project.ticket_count ?? 0) !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">calendar_today</span>
                      <span>{formatDate(project.created_at)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <button
                      onClick={() => navigate(`/admin/projects/${project.id}`)}
                      className="px-4 py-1.5 text-xs font-bold text-primary-container border border-primary-container/30 rounded-lg hover:bg-primary-container/5 transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                      View
                    </button>
                    <button
                      onClick={() => handleArchive(project.id)}
                      disabled={archivingId === project.id}
                      className="px-3 py-1.5 text-xs font-bold text-on-surface-variant border border-outline-variant/30 rounded-lg hover:bg-surface-container-low transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {project.status === 'archived' ? 'unarchive' : 'archive'}
                      </span>
                      {project.status === 'archived' ? 'Unarchive' : 'Archive'}
                    </button>
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleDeleteRequest(project.id)}
                        className="text-xs font-bold text-error hover:text-error/80 transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">delete_forever</span>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {projects.length > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              maxPageButtons={5}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        firmId={id}
        firmName={firm.name}
        onCreated={handleProjectCreated}
      />
      <Toast message={toastMsg} isVisible={showToast} onClose={() => setShowToast(false)} />
    </div>
  )
}

export default FirmProjects
