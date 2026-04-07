import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { firmsApi, projectsApi, ticketsApi, formatDate } from '../../lib/api'

export default function FirmDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [firm, setFirm] = useState(null)
  const [tickets, setTickets] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      firmsApi.get(id),
      ticketsApi.list({ firm_id: id }),
      projectsApi.list(id),
    ])
      .then(([firmRes, ticketsRes, projectsRes]) => {
        setFirm(firmRes.data)
        setTickets(ticketsRes.data ?? [])
        setProjects(projectsRes.data ?? [])
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="flex">
      <Sidebar role="admin" />
      <main className="ml-0 md:ml-[240px] flex-1 min-h-screen bg-surface flex items-center justify-center pt-16 md:pt-0">
        <p className="text-on-surface-variant animate-pulse">Loading…</p>
      </main>
    </div>
  )

  if (error || !firm) return (
    <div className="flex">
      <Sidebar role="admin" />
      <main className="ml-0 md:ml-[240px] flex-1 min-h-screen bg-surface flex items-center justify-center pt-16 md:pt-0">
        <p className="text-error">{error ?? 'Firm not found'}</p>
      </main>
    </div>
  )

  // ── Derived counts ─────────────────────────────────────────────────────────
  const activeTickets = tickets.filter((t) => !t.archived)
  const unassigned    = activeTickets.filter((t) => !t.assignee_id && t.status !== 'discarded')
  const draft         = activeTickets.filter((t) => t.status === 'draft').length
  const inProgress    = activeTickets.filter((t) => t.status === 'in_progress').length
  const resolved      = activeTickets.filter((t) => t.status === 'resolved').length
  const inReview      = activeTickets.filter((t) => ['internal_review','client_review','compliance_review'].includes(t.status)).length
  const approved      = activeTickets.filter((t) => t.status === 'approved').length
  const activeProjects   = projects.filter((p) => p.status === 'active').length
  const archivedProjects = projects.filter((p) => p.status === 'archived').length

  return (
    <div className="flex">
      <Sidebar role="admin" />

      {/* Top bar */}
      <header className="fixed top-0 left-0 md:left-[240px] right-0 h-14 bg-surface z-40 flex items-center justify-between px-4 sm:px-8 lg:px-12">
        <div className="flex items-center gap-3 pl-12 md:pl-0">
          <button
            onClick={() => navigate('/admin/firms')}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-low transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
          <div className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant">
            <Link to="/admin/firms" className="hover:text-primary transition-colors">Firms</Link>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="text-on-surface font-semibold truncate max-w-[160px] sm:max-w-none">{firm.name}</span>
          </div>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors">notifications</span>
      </header>

      <main className="ml-0 md:ml-[240px] pt-14 min-h-screen bg-surface flex-1">
        <div className="px-4 sm:px-8 lg:px-12 py-8 lg:py-12 max-w-5xl mx-auto">

          {/* Firm header */}
          <div className="mb-10">
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface mb-2">{firm.name}</h1>
            <div className="flex flex-wrap items-center gap-5 text-sm text-on-surface-variant">
              {firm.contact_name  && <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-base">person</span>{firm.contact_name}</span>}
              {firm.contact_email && <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-base">mail</span>{firm.contact_email}</span>}
              <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-base">calendar_today</span>Added {formatDate(firm.created_at)}</span>
            </div>
          </div>

          {/* ── Three navigation cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

            {/* ── Card 1: All Tickets ── */}
            <button
              onClick={() => navigate(`/admin/firms/${id}/tickets`)}
              className="group bg-surface-container-lowest rounded-2xl p-6 flex flex-col gap-5 text-left hover:shadow-lg hover:shadow-black/8 hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-600 text-xl">confirmation_number</span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant/40 group-hover:text-primary-container transition-colors">arrow_forward</span>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">All Tickets</p>
                <p className="text-4xl font-extrabold tracking-tight text-on-surface">{activeTickets.length}</p>
              </div>

              <div className="flex flex-col gap-1.5 pt-1 border-t border-outline-variant/10">
                {[
                  { label: 'Draft',       value: draft,      color: 'text-on-surface-variant' },
                  { label: 'In Progress', value: inProgress, color: 'text-blue-600' },
                  { label: 'In Review',   value: inReview,   color: 'text-violet-600' },
                  { label: 'Resolved',    value: resolved,   color: 'text-teal-600' },
                  { label: 'Approved',    value: approved,   color: 'text-emerald-600' },
                ].filter((s) => s.value > 0).map((s) => (
                  <div key={s.label} className="flex items-center justify-between text-xs">
                    <span className="text-on-surface-variant">{s.label}</span>
                    <span className={`font-bold ${s.color}`}>{s.value}</span>
                  </div>
                ))}
                {activeTickets.length === 0 && (
                  <p className="text-xs text-on-surface-variant/50 italic">No tickets yet</p>
                )}
              </div>
            </button>

            {/* ── Card 2: Unassigned ── */}
            <button
              onClick={() => navigate(`/admin/firms/${id}/unassigned`)}
              className="group bg-surface-container-lowest rounded-2xl p-6 flex flex-col gap-5 text-left hover:shadow-lg hover:shadow-black/8 hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${unassigned.length > 0 ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                  <span className={`material-symbols-outlined text-xl ${unassigned.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {unassigned.length > 0 ? 'person_off' : 'check_circle'}
                  </span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant/40 group-hover:text-primary-container transition-colors">arrow_forward</span>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Unassigned</p>
                <p className={`text-4xl font-extrabold tracking-tight ${unassigned.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {unassigned.length}
                </p>
              </div>

              <div className="flex flex-col gap-1.5 pt-1 border-t border-outline-variant/10">
                {unassigned.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-on-surface-variant">Need assignment</span>
                      <span className="font-bold text-amber-600">{unassigned.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-on-surface-variant">Draft tickets</span>
                      <span className="font-bold text-on-surface-variant">{draft}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-emerald-600 font-medium">All tickets are assigned</p>
                )}
              </div>
            </button>

            {/* ── Card 3: Projects ── */}
            <button
              onClick={() => navigate(`/admin/firms/${id}/projects`)}
              className="group bg-surface-container-lowest rounded-2xl p-6 flex flex-col gap-5 text-left hover:shadow-lg hover:shadow-black/8 hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary-container text-xl">folder</span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant/40 group-hover:text-primary-container transition-colors">arrow_forward</span>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Projects</p>
                <p className="text-4xl font-extrabold tracking-tight text-on-surface">{projects.length}</p>
              </div>

              <div className="flex flex-col gap-1.5 pt-1 border-t border-outline-variant/10">
                {projects.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-on-surface-variant">Active</span>
                      <span className="font-bold text-emerald-600">{activeProjects}</span>
                    </div>
                    {archivedProjects > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-on-surface-variant">Archived</span>
                        <span className="font-bold text-on-surface-variant">{archivedProjects}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-on-surface-variant/50 italic">No projects yet</p>
                )}
              </div>
            </button>

          </div>
        </div>
      </main>
    </div>
  )
}
