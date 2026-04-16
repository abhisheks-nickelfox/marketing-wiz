import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SearchLg,
  FilterLines,
  X,
  Calendar,
  Clock,
  RefreshCw01,
  Plus,
  ChevronDown,
  Lightning01,
  UploadCloud01,
  Archive,
} from '@untitled-ui/icons-react';
import {
  transcriptsApi,
  firmsApi,
  promptsApi,
} from '../lib/api';
import type { Transcript, Firm, Prompt, Task } from '../lib/api';
import { formatDate, formatDurationSec, timeAgo } from '../lib/transcriptUtils';

type TimeFilter = 'all' | 'custom' | '30d' | '7d' | '24h';
type StatusTab = 'all' | 'to-process' | 'archived' | 'completed';

// ── Status badge ───────────────────────────────────────────────────────────────

function TranscriptStatusBadge({ transcript }: { transcript: Transcript }) {
  if (transcript.archived) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F5F5F5] text-[#757575] border border-[#BDBDBD]">
        Archived
      </span>
    );
  }
  if (transcript.source === 'fireflies' || transcript.source === 'api') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#E3F2FD] text-[#1565C0] border border-[#64B5F6]">
        API
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FFF3E0] text-[#E65100] border border-[#FFB74D]">
      To Process
    </span>
  );
}

// ── Filter panel ───────────────────────────────────────────────────────────────

interface FilterPanelProps {
  open: boolean;
  onClose: () => void;
  firms: Firm[];
  selectedFirmIds: string[];
  onFirmToggle: (id: string) => void;
  onClear: () => void;
}

function FilterPanel({
  open,
  onClose,
  firms,
  selectedFirmIds,
  onFirmToggle,
  onClear,
}: FilterPanelProps) {
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);

  const filtered = firms.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );
  const visible = showAll ? filtered : filtered.slice(0, 8);
  const remaining = filtered.length - 8;

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />
      <div
        className={`fixed inset-y-0 right-0 z-50 flex flex-col bg-white border-l border-[#E9EAEB] shadow-xl transition-transform duration-300 ease-in-out w-[320px] ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-[#E9EAEB]">
          <div>
            <h2 className="text-base font-semibold text-[#181D27]">Filters</h2>
            <p className="text-xs text-[#717680] mt-0.5">Apply filters to table data.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#717680] hover:text-[#414651] hover:bg-gray-100 transition-colors"
          >
            <X width={18} height={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-5">
            <p className="text-xs font-semibold text-[#414651] uppercase tracking-wider mb-3">
              Firms
            </p>
            <div className="flex items-center gap-2 border border-[#D5D7DA] rounded-lg px-3 py-2 bg-white mb-3">
              <SearchLg width={14} height={14} className="text-[#A4A7AE] shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search firms"
                className="flex-1 text-sm text-[#181D27] placeholder-[#A4A7AE] bg-transparent outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              {visible.map((firm) => (
                <label key={firm.id} className="flex items-center gap-2.5 py-1 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedFirmIds.includes(firm.id)}
                    onChange={() => onFirmToggle(firm.id)}
                    className="w-4 h-4 rounded accent-[#7F56D9] cursor-pointer shrink-0"
                  />
                  <span className="text-sm text-[#414651] group-hover:text-[#181D27] transition-colors">
                    {firm.name}
                  </span>
                </label>
              ))}
            </div>
            {!showAll && remaining > 0 && (
              <button
                onClick={() => setShowAll(true)}
                className="mt-2 text-sm font-medium text-[#7F56D9] hover:text-[#6941C6] transition-colors"
              >
                Show {remaining} more
              </button>
            )}
            {showAll && filtered.length > 8 && (
              <button
                onClick={() => setShowAll(false)}
                className="mt-2 text-sm font-medium text-[#7F56D9] hover:text-[#6941C6] transition-colors"
              >
                Show less
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 px-5 py-4 border-t border-[#E9EAEB]">
          <button
            onClick={() => { onClear(); setSearch(''); }}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-[#414651] border border-[#D5D7DA] rounded-lg bg-white hover:bg-gray-50 transition-colors"
          >
            Clear Filter
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-[#7F56D9] hover:bg-[#6941C6] rounded-lg transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </>
  );
}

// ── Add Transcript Modal ───────────────────────────────────────────────────────

interface AddTranscriptModalProps {
  open: boolean;
  onClose: () => void;
  firms: Firm[];
  onCreated: (t: Transcript) => void;
}

function AddTranscriptModal({ open, onClose, firms, onCreated }: AddTranscriptModalProps) {
  const [title, setTitle] = useState('');
  const [callDate, setCallDate] = useState('');
  const [durationMins, setDurationMins] = useState('');
  const [rawTranscript, setRawTranscript] = useState('');
  const [firmId, setFirmId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !callDate || !rawTranscript.trim()) {
      setError('Title, call date, and transcript text are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const created = await transcriptsApi.create({
        title: title.trim(),
        call_date: callDate,
        duration_sec: durationMins ? parseInt(durationMins, 10) * 60 : 0,
        raw_transcript: rawTranscript.trim(),
        firm_id: firmId || undefined,
      });
      onCreated(created);
      setTitle(''); setCallDate(''); setDurationMins(''); setRawTranscript(''); setFirmId('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create transcript.');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E9EAEB]">
          <h2 className="text-lg font-semibold text-[#181D27]">Add Transcript</h2>
          <button onClick={onClose} className="p-1 rounded text-[#717680] hover:bg-gray-100 transition-colors">
            <X width={20} height={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-[#414651] mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q1 Strategy Call"
              className="w-full border border-[#D5D7DA] rounded-lg px-3 py-2.5 text-sm text-[#181D27] placeholder-[#A4A7AE] outline-none focus:ring-2 focus:ring-[#7F56D9] focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#414651] mb-1.5">
                Call Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={callDate}
                onChange={(e) => setCallDate(e.target.value)}
                className="w-full border border-[#D5D7DA] rounded-lg px-3 py-2.5 text-sm text-[#181D27] outline-none focus:ring-2 focus:ring-[#7F56D9] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#414651] mb-1.5">Duration (minutes)</label>
              <input
                type="number"
                min="0"
                value={durationMins}
                onChange={(e) => setDurationMins(e.target.value)}
                placeholder="e.g. 55"
                className="w-full border border-[#D5D7DA] rounded-lg px-3 py-2.5 text-sm text-[#181D27] placeholder-[#A4A7AE] outline-none focus:ring-2 focus:ring-[#7F56D9] focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#414651] mb-1.5">Firm</label>
            <div className="relative">
              <select
                value={firmId}
                onChange={(e) => setFirmId(e.target.value)}
                className="w-full appearance-none border border-[#D5D7DA] rounded-lg px-3 py-2.5 text-sm text-[#181D27] outline-none focus:ring-2 focus:ring-[#7F56D9] focus:border-transparent bg-white"
              >
                <option value="">Select firm (optional)</option>
                {firms.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <ChevronDown width={16} height={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A4A7AE] pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#414651] mb-1.5">
              Transcript Text <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rawTranscript}
              onChange={(e) => setRawTranscript(e.target.value)}
              placeholder="Paste the full meeting transcript here..."
              rows={8}
              className="w-full border border-[#D5D7DA] rounded-lg px-3 py-2.5 text-sm text-[#181D27] placeholder-[#A4A7AE] outline-none focus:ring-2 focus:ring-[#7F56D9] focus:border-transparent resize-none"
            />
          </div>
        </form>
        <div className="flex items-center gap-3 px-6 py-4 border-t border-[#E9EAEB]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-[#414651] border border-[#D5D7DA] rounded-lg bg-white hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-[#7F56D9] hover:bg-[#6941C6] disabled:opacity-60 rounded-lg transition-colors"
          >
            {saving ? 'Creating…' : 'Create Transcript'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Processing Panel ───────────────────────────────────────────────────────────

interface ProcessingPanelProps {
  transcript: Transcript | null;
  open: boolean;
  onClose: () => void;
  firms: Firm[];
  prompts: Prompt[];
  onProcessed: (sessionId: string, firmId: string, tickets: Task[]) => void;
}

function ProcessingPanel({
  transcript,
  open,
  onClose,
  firms,
  prompts,
  onProcessed,
}: ProcessingPanelProps) {
  const [firmId, setFirmId] = useState('');
  const [primaryPromptId, setPrimaryPromptId] = useState('');
  const [secondaryPromptId, setSecondaryPromptId] = useState('');
  const [transcriptTab, setTranscriptTab] = useState<'paste' | 'fireflies'>('paste');
  const [transcriptText, setTranscriptText] = useState('');
  const [notes, setNotes] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (transcript && open) {
      setFirmId(transcript.firm_id ?? '');
      setTranscriptText(transcript.raw_transcript ?? '');
      setError('');
    }
  }, [transcript, open]);

  const primaryPrompt = prompts.find((p) => p.id === primaryPromptId);

  async function handleRun() {
    if (!firmId || !primaryPromptId) {
      setError('Please select a firm and a primary prompt.');
      return;
    }
    if (!transcript) return;
    setProcessing(true);
    setError('');
    try {
      const result = await transcriptsApi.process(transcript.id, {
        firm_id: firmId,
        prompt_id: primaryPromptId,
        text_notes: notes.trim() || undefined,
      });
      onProcessed(result.session_id, result.firm_id, result.tickets);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  async function handleFirefliesSync() {
    setSyncing(true);
    try {
      await transcriptsApi.sync();
    } finally {
      setSyncing(false);
    }
  }

  const summary = transcript?.raw_transcript ?? '';
  const SUMMARY_LIMIT = 260;
  const hasSummaryMore = summary.length > SUMMARY_LIMIT;

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />
      <div
        className={`fixed inset-y-0 right-0 z-50 flex flex-col bg-white border-l border-[#E9EAEB] shadow-xl transition-transform duration-300 ease-in-out w-[600px] ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-[#E9EAEB] shrink-0">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 flex-wrap min-w-0 pr-3">
              <h2 className="text-base font-semibold text-[#181D27] truncate">
                {transcript?.title ?? 'Processing'}
              </h2>
              {transcript && <TranscriptStatusBadge transcript={transcript} />}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded text-[#717680] hover:text-[#414651] hover:bg-gray-100 transition-colors shrink-0"
            >
              <X width={18} height={18} />
            </button>
          </div>
          <div className="flex items-center gap-4 text-sm text-[#535862]">
            <span className="flex items-center gap-1.5">
              <Calendar width={14} height={14} className="text-[#A4A7AE]" />
              {transcript?.call_date ? formatDate(transcript.call_date) : '—'}
            </span>
            {transcript?.duration_sec ? (
              <span className="flex items-center gap-1.5">
                <Clock width={14} height={14} className="text-[#A4A7AE]" />
                Duration {formatDurationSec(transcript.duration_sec)}
              </span>
            ) : null}
          </div>
          {/* Firm */}
          <div className="mt-3">
            <label className="block text-xs font-medium text-[#414651] mb-1">
              Firm <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={firmId}
                onChange={(e) => setFirmId(e.target.value)}
                className="w-full appearance-none border border-[#D5D7DA] rounded-lg px-3 py-2 text-sm text-[#181D27] outline-none focus:ring-2 focus:ring-[#7F56D9] focus:border-transparent bg-white"
              >
                <option value="">Select a firm…</option>
                {firms.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <ChevronDown width={16} height={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A4A7AE] pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">

          {/* ── Section 1: Transcript Summary ─────────────────────────── */}
          <div className="flex gap-4">
            <div className="shrink-0 w-8 h-8 rounded-full bg-[#F4EBFF] flex items-center justify-center mt-0.5">
              <Lightning01 width={16} height={16} className="text-[#7F56D9]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#181D27] mb-1">Transcript Summary</p>
              {summary ? (
                <div className="text-sm text-[#535862] leading-relaxed">
                  {summaryExpanded ? summary : summary.slice(0, SUMMARY_LIMIT)}
                  {hasSummaryMore && !summaryExpanded && (
                    <>
                      {'… '}
                      <button
                        onClick={() => setSummaryExpanded(true)}
                        className="text-[#7F56D9] hover:text-[#6941C6] font-medium"
                      >
                        Read more
                      </button>
                    </>
                  )}
                  {summaryExpanded && hasSummaryMore && (
                    <>
                      {' '}
                      <button
                        onClick={() => setSummaryExpanded(false)}
                        className="text-[#7F56D9] hover:text-[#6941C6] font-medium"
                      >
                        Show less
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[#A4A7AE] italic">No transcript content available.</p>
              )}
            </div>
          </div>

          <div className="border-t border-[#F2F4F7]" />

          {/* ── Section 2: Select Prompt ───────────────────────────────── */}
          <div className="flex gap-4">
            <div className="shrink-0 w-8 h-8 rounded-full bg-[#F4EBFF] flex items-center justify-center mt-0.5">
              <Lightning01 width={16} height={16} className="text-[#7F56D9]" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-3">
              <div>
                <p className="text-sm font-semibold text-[#181D27] mb-0.5">Select Prompt</p>
                <p className="text-xs text-[#717680]">Choose a primary and secondary prompt to define what gets extracted.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#414651] mb-1">
                  Primary Prompt <span className="text-[#A4A7AE] font-normal">①</span>
                </label>
                <div className="relative">
                  <select
                    value={primaryPromptId}
                    onChange={(e) => setPrimaryPromptId(e.target.value)}
                    className="w-full appearance-none border border-[#D5D7DA] rounded-lg px-3 py-2.5 text-sm text-[#181D27] outline-none focus:ring-2 focus:ring-[#7F56D9] focus:border-transparent bg-white"
                  >
                    <option value="">Project management</option>
                    {prompts.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown width={16} height={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A4A7AE] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#414651] mb-1">
                  Secondary Prompt <span className="text-[#A4A7AE] font-normal">②</span>
                </label>
                <div className="relative">
                  <select
                    value={secondaryPromptId}
                    onChange={(e) => setSecondaryPromptId(e.target.value)}
                    className="w-full appearance-none border border-[#D5D7DA] rounded-lg px-3 py-2.5 text-sm text-[#181D27] outline-none focus:ring-2 focus:ring-[#7F56D9] focus:border-transparent bg-white"
                  >
                    <option value="">Meeting notes</option>
                    {prompts
                      .filter((p) => p.id !== primaryPromptId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                  </select>
                  <ChevronDown width={16} height={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A4A7AE] pointer-events-none" />
                </div>
              </div>
              {/* Prompt description hint */}
              <div className="flex items-start gap-2 bg-[#F9FAFB] border border-[#F2F4F7] rounded-lg px-3 py-2.5">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-[#A4A7AE] mt-0.5 shrink-0">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8 7v4M8 5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <p className="text-xs text-[#535862] leading-relaxed">
                  {primaryPromptId && prompts.find((p) => p.id === primaryPromptId)
                    ? `Produces a structured summary of key decisions, follow-ups, and discussion points (${prompts.find((p) => p.id === primaryPromptId)?.type ?? 'general'}).`
                    : 'Produces a structured summary of key decisions, follow-ups, and discussion points.'}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-[#F2F4F7]" />

          {/* ── Section 3: Transcript Input ────────────────────────────── */}
          <div className="flex gap-4">
            <div className="shrink-0 w-8 h-8 rounded-full bg-[#F4EBFF] flex items-center justify-center mt-0.5">
              <Lightning01 width={16} height={16} className="text-[#7F56D9]" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-3">
              <div>
                <p className="text-sm font-semibold text-[#181D27] mb-0.5">Transcript Input</p>
                <p className="text-xs text-[#717680]">Choose a primary and secondary prompt to define what gets extracted.</p>
              </div>
              {/* Tabs */}
              <div className="flex border-b border-[#E9EAEB]">
                {(['paste', 'fireflies'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setTranscriptTab(tab)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      transcriptTab === tab
                        ? 'border-[#7F56D9] text-[#7F56D9]'
                        : 'border-transparent text-[#717680] hover:text-[#414651]'
                    }`}
                  >
                    {tab === 'paste' ? 'Paste Transcript' : 'Import from Fireflies'}
                  </button>
                ))}
              </div>
              {transcriptTab === 'paste' ? (
                <div>
                  <label className="block text-xs font-medium text-[#414651] mb-1">
                    Transcript Text <span className="text-[#A4A7AE] font-normal">①</span>
                  </label>
                  <textarea
                    value={transcriptText}
                    onChange={(e) => setTranscriptText(e.target.value)}
                    placeholder="Enter a description..."
                    rows={6}
                    className="w-full border border-[#D5D7DA] rounded-lg px-3 py-2.5 text-sm text-[#181D27] placeholder-[#A4A7AE] outline-none focus:ring-2 focus:ring-[#7F56D9] focus:border-transparent resize-none"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-6 border border-dashed border-[#D5D7DA] rounded-lg">
                  <p className="text-sm text-[#535862]">Pull the latest transcripts from Fireflies.ai</p>
                  <button
                    onClick={handleFirefliesSync}
                    disabled={syncing}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#7F56D9] hover:bg-[#6941C6] disabled:opacity-60 rounded-lg transition-colors"
                  >
                    <RefreshCw01 width={16} height={16} className={syncing ? 'animate-spin' : ''} />
                    {syncing ? 'Syncing…' : 'Sync Now'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="pl-12">
            <button
              onClick={() => setNotesOpen((v) => !v)}
              className="flex items-center gap-2 text-sm font-medium text-[#7F56D9] hover:text-[#6941C6] transition-colors"
            >
              <Plus width={16} height={16} />
              Add Notes if any
              <ChevronDown
                width={14} height={14}
                className={`transition-transform ${notesOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {notesOpen && (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes for the AI processor…"
                rows={4}
                className="mt-2 w-full border border-[#D5D7DA] rounded-lg px-3 py-2.5 text-sm text-[#181D27] placeholder-[#A4A7AE] outline-none focus:ring-2 focus:ring-[#7F56D9] focus:border-transparent resize-none"
              />
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Sticky footer */}
        <div className="px-6 py-4 border-t border-[#E9EAEB] shrink-0">
          <button
            onClick={handleRun}
            disabled={processing || !firmId || !primaryPromptId}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-[#7F56D9] hover:bg-[#6941C6] disabled:opacity-60 rounded-xl transition-colors"
          >
            <Lightning01 width={18} height={18} />
            {processing ? 'Processing…' : 'Run Processing'}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Transcript row ─────────────────────────────────────────────────────────────

interface TranscriptRowProps {
  transcript: Transcript;
  firms: Firm[];
  onClick: () => void;
  onArchive: () => void;
  archiving: boolean;
}

function TranscriptRow({ transcript, firms, onClick, onArchive, archiving }: TranscriptRowProps) {
  const firm = firms.find((f) => f.id === transcript.firm_id);
  const isArchived = transcript.archived;

  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-4 px-6 py-4 border-b border-[#F2F4F7] hover:bg-[#FAFAFA] transition-colors cursor-pointer ${isArchived ? 'opacity-60' : ''}`}
    >
      <div className="flex-1 min-w-0">
        {/* Title row */}
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-sm font-semibold text-[#181D27] truncate">{transcript.title}</span>
          <span className="text-xs text-[#A4A7AE] shrink-0">{timeAgo(transcript.created_at)}</span>
        </div>
        {/* Firm + description */}
        <p className="text-sm text-[#535862] truncate mb-2">
          {firm ? (
            <>
              <span className="font-medium text-[#414651]">{firm.name}</span>
              <span className="mx-1 text-[#D5D7DA]">·</span>
            </>
          ) : null}
          {transcript.call_date ? formatDate(transcript.call_date) : ''}
          {transcript.duration_sec ? ` · ${formatDurationSec(transcript.duration_sec)}` : ''}
        </p>
        {/* Badge */}
        <TranscriptStatusBadge transcript={transcript} />
      </div>
      {/* Right-side actions */}
      <div className="shrink-0 flex items-center gap-3">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onArchive(); }}
          disabled={archiving}
          title={isArchived ? 'Unarchive transcript' : 'Archive transcript'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50 ${
            isArchived
              ? 'text-[#7F56D9] bg-[#F4EBFF] hover:bg-[#EDE9FE]'
              : 'text-[#717680] bg-[#F2F4F7] hover:bg-[#E9EAEB]'
          }`}
        >
          <Archive width={13} height={13} />
          {archiving ? '…' : isArchived ? 'Unarchive' : 'Archive'}
        </button>
        <span className={`w-2 h-2 rounded-full inline-block ${isArchived ? 'bg-[#D5D7DA]' : 'bg-green-500'}`} aria-label={isArchived ? 'Archived' : 'Synced'} />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function TranscriptsFlowPage() {
  const navigate = useNavigate();

  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedFirmIds, setSelectedFirmIds] = useState<string[]>([]);

  const [processingOpen, setProcessingOpen] = useState(false);
  const [activeTranscript, setActiveTranscript] = useState<Transcript | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [tData, fData, pData] = await Promise.all([
          transcriptsApi.list('all'),
          firmsApi.list(),
          promptsApi.list(),
        ]);
        setTranscripts(tData);
        setFirms(fData);
        setPrompts(pData);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load transcripts.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function handleSync() {
    setSyncing(true);
    try {
      await transcriptsApi.sync();
      const fresh = await transcriptsApi.list('all');
      setTranscripts(fresh);
    } catch {
      // silently ignore sync errors on the list page
    } finally {
      setSyncing(false);
    }
  }

  function handleTranscriptClick(transcript: Transcript) {
    setActiveTranscript(transcript);
    setProcessingOpen(true);
  }

  function handleProcessed(sessionId: string, firmId: string, tickets: Task[]) {
    setProcessingOpen(false);
    if (activeTranscript) {
      navigate(`/transcripts/${activeTranscript.id}/tasks`, {
        state: {
          sessionId,
          firmId,
          tickets,
          transcript: activeTranscript,
        },
      });
    }
  }

  function handleCreated(t: Transcript) {
    setTranscripts((prev) => [t, ...prev]);
    setAddOpen(false);
  }

  async function handleArchiveTranscript(transcript: Transcript) {
    setArchivingId(transcript.id);
    try {
      const updated = await transcriptsApi.toggleArchive(transcript.id);
      setTranscripts((prev) => prev.map((t) => t.id === updated.id ? updated : t));
    } catch {
      // silently ignore
    } finally {
      setArchivingId(null);
    }
  }

  function toggleFirmFilter(id: string) {
    setSelectedFirmIds((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  }

  // ── Client-side filtering ──────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = transcripts;

    // Status tab
    if (statusTab === 'archived') {
      list = list.filter((t) => t.archived);
    } else if (statusTab === 'to-process') {
      list = list.filter((t) => !t.archived);
    } else if (statusTab === 'completed') {
      // No reliable way to tell from list API alone — show empty for now
      list = [];
    } else {
      // 'all' — show everything
    }

    // Time filter
    const now = Date.now();
    if (timeFilter === '24h') {
      list = list.filter((t) => now - new Date(t.created_at).getTime() < 86400000);
    } else if (timeFilter === '7d') {
      list = list.filter((t) => now - new Date(t.created_at).getTime() < 7 * 86400000);
    } else if (timeFilter === '30d') {
      list = list.filter((t) => now - new Date(t.created_at).getTime() < 30 * 86400000);
    } else if (timeFilter === 'custom' && dateFrom && dateTo) {
      const from = new Date(dateFrom).getTime();
      const to = new Date(dateTo).getTime() + 86400000;
      list = list.filter((t) => {
        const ts = new Date(t.created_at).getTime();
        return ts >= from && ts <= to;
      });
    }

    // Firm filter
    if (selectedFirmIds.length > 0) {
      list = list.filter((t) => t.firm_id && selectedFirmIds.includes(t.firm_id));
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q));
    }

    return list;
  }, [transcripts, statusTab, timeFilter, dateFrom, dateTo, selectedFirmIds, search]);

  const counts = useMemo(() => {
    const all = transcripts.length;
    const toProcess = transcripts.filter((t) => !t.archived).length;
    const archived = transcripts.filter((t) => t.archived).length;
    const completed = 0;
    return { all, toProcess, archived, completed };
  }, [transcripts]);

  const TIME_FILTERS: { key: TimeFilter; label: string }[] = [
    { key: 'all', label: 'All time' },
    { key: 'custom', label: 'Custom' },
    { key: '30d', label: '30 days' },
    { key: '7d', label: '7 days' },
    { key: '24h', label: '24 hours' },
  ];

  const STATUS_TABS: { key: StatusTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'to-process', label: 'To process', count: counts.toProcess },
    { key: 'archived', label: 'Archived', count: counts.archived },
    { key: 'completed', label: 'Completed', count: counts.completed },
  ];

  return (
    <main className="flex-1 min-w-0 overflow-y-auto bg-white relative">
      {/* Page header */}
      <div className="flex items-start justify-between px-6 pt-8 pb-5 border-b border-[#E9EAEB]">
        <div>
          <h1 className="text-2xl font-semibold text-[#181D27]">Transcripts Flow</h1>
          <p className="text-sm text-[#535862] mt-1">
            Manage your team members, roles, and access across projects.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-[#414651] bg-white border border-[#D5D7DA] rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            <RefreshCw01 width={16} height={16} className={`text-[#535862] ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-white bg-[#7F56D9] hover:bg-[#6941C6] rounded-lg shadow-sm transition-colors"
          >
            <Plus width={16} height={16} />
            Add Transcript
          </button>
        </div>
      </div>

      {/* Time filter tabs */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[#E9EAEB]">
        <div className="flex items-center gap-1">
          {TIME_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTimeFilter(key)}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                timeFilter === key
                  ? 'bg-white border border-[#D5D7DA] font-semibold text-[#181D27] shadow-sm'
                  : 'text-[#535862] hover:text-[#181D27] hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {timeFilter === 'custom' && (
          <div className="flex items-center gap-1 border border-[#D5D7DA] rounded-full px-3 py-1.5 bg-white">
            <Calendar width={14} height={14} className="text-[#A4A7AE] shrink-0" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-sm text-[#181D27] bg-transparent outline-none w-32"
            />
            <span className="text-[#A4A7AE] text-sm">–</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-sm text-[#181D27] bg-transparent outline-none w-32"
            />
          </div>
        )}
      </div>

      {/* Sub-tabs + search/filter */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-[#E9EAEB]">
        <div className="flex items-center gap-0">
          {STATUS_TABS.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setStatusTab(key)}
              className={`px-4 py-3 text-sm transition-colors border-b-2 -mb-px ${
                statusTab === key
                  ? 'border-[#7F56D9] text-[#7F56D9] font-semibold'
                  : 'border-transparent text-[#717680] hover:text-[#414651]'
              }`}
            >
              {label}{' '}
              <span className={`text-xs ${statusTab === key ? 'text-[#7F56D9]' : 'text-[#A4A7AE]'}`}>
                {count}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 border border-[#D5D7DA] rounded-lg px-3 py-2 bg-white">
            <SearchLg width={14} height={14} className="text-[#A4A7AE] shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transcripts…"
              className="text-sm text-[#181D27] placeholder-[#A4A7AE] bg-transparent outline-none w-48"
            />
          </div>
          <button
            onClick={() => setFilterOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-[#414651] bg-white border border-[#D5D7DA] rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
          >
            <FilterLines width={16} height={16} className="text-[#535862]" />
            Filter
            {selectedFirmIds.length > 0 && (
              <span className="ml-1 w-5 h-5 flex items-center justify-center text-[10px] font-bold bg-[#7F56D9] text-white rounded-full">
                {selectedFirmIds.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-sm text-[#A4A7AE]">
          Loading transcripts…
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-24">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <UploadCloud01 width={40} height={40} className="text-[#D5D7DA]" />
          <p className="text-sm font-medium text-[#535862]">No transcripts found</p>
          <p className="text-xs text-[#A4A7AE]">
            {search ? 'Try a different search term.' : 'Add a transcript or sync from Fireflies.'}
          </p>
        </div>
      ) : (
        <div>
          {filtered.map((t) => (
            <TranscriptRow
              key={t.id}
              transcript={t}
              firms={firms}
              onClick={() => handleTranscriptClick(t)}
              onArchive={() => handleArchiveTranscript(t)}
              archiving={archivingId === t.id}
            />
          ))}
        </div>
      )}

      {/* Filter slide-over */}
      <FilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        firms={firms}
        selectedFirmIds={selectedFirmIds}
        onFirmToggle={toggleFirmFilter}
        onClear={() => setSelectedFirmIds([])}
      />

      {/* Processing panel */}
      <ProcessingPanel
        transcript={activeTranscript}
        open={processingOpen}
        onClose={() => setProcessingOpen(false)}
        firms={firms}
        prompts={prompts}
        onProcessed={handleProcessed}
      />

      {/* Add transcript modal */}
      <AddTranscriptModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        firms={firms}
        onCreated={handleCreated}
      />
    </main>
  );
}
