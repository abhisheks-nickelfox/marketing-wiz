import { useState } from 'react';
import { ChevronRight, ChevronDown, Plus } from '@untitled-ui/icons-react';

// Untitled UI-style circle checkbox
const TaskDot = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="shrink-0">
    <circle cx="5" cy="5" r="4" stroke="#D0D5DD" strokeWidth="2"/>
  </svg>
);

// Avatar stack — 3 placeholder circles + +5 overflow + add button
function AvatarStack() {
  const colors = ['#D6BBFB', '#93C5FD', '#6EE7B7'];
  return (
    <div className="flex items-center">
      <div className="flex">
        {colors.map((bg, i) => (
          <div
            key={i}
            className="w-6 h-6 rounded-full border-2 border-white shrink-0"
            style={{ backgroundColor: bg, marginLeft: i === 0 ? 0 : '-6px', zIndex: colors.length - i, position: 'relative' }}
          />
        ))}
        <div
          className="w-6 h-6 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center shrink-0"
          style={{ marginLeft: '-6px', zIndex: 0, position: 'relative' }}
        >
          <span className="text-[10px] font-semibold text-gray-500">+5</span>
        </div>
      </div>
      <button
        className="w-6 h-6 rounded-full border border-dashed border-gray-300 bg-white flex items-center justify-center ml-2 shrink-0 text-gray-400 hover:border-gray-400 transition-colors"
        aria-label="Add assignee"
      >
        <Plus width={10} height={10} />
      </button>
    </div>
  );
}

interface Task { id: string; title: string; isParent?: boolean; children?: Task[] }

const TASKS: Task[] = [
  {
    id: '1',
    title: 'Website redesign  For AWP',
    isParent: true,
    children: [
      { id: '1-1', title: 'Home page design' },
      { id: '1-2', title: 'Copy Creation' },
      { id: '1-3', title: 'Meta Tags' },
    ],
  },
];

interface TaskRowProps { task: Task; depth?: number; expanded?: boolean; onToggle?: () => void }

function TaskRow({ task, depth = 0, expanded, onToggle }: TaskRowProps) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-25 transition-colors">

      <td className="py-2.5 pr-4">
        <div className="flex items-center gap-1.5" style={{ paddingLeft: depth > 0 ? `${depth * 20 + 8}px` : 0 }}>
          {task.isParent ? (
            <button onClick={onToggle} className="shrink-0 p-0.5 text-gray-400" aria-label={expanded ? 'Collapse' : 'Expand'}>
              {expanded
                ? <ChevronDown width={14} height={14} />
                : <ChevronRight width={14} height={14} />
              }
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <TaskDot />
          <span className={`text-[13px] font-semibold ${depth === 0 ? 'text-gray-900' : 'text-gray-700'}`}>
            {task.title}
          </span>
        </div>
      </td>

      <td className="py-2.5 pr-4"><AvatarStack /></td>

      <td className="py-2.5 pr-4">
        <span className="text-[11px] font-medium text-gray-700">Tomorrow</span>
      </td>

      {/* Priority — Untitled UI error palette */}
      <td className="py-2.5 pr-4">
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-error-50 text-error-700 border border-error-200">
          High
        </span>
      </td>

      {/* Status — Untitled UI gray palette */}
      <td className="py-2.5">
        <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-gray-50 text-gray-700 border border-gray-200">
          todo
        </span>
      </td>
    </tr>
  );
}

export default function TasksTable() {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['1']));

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  return (
    <div>
      <h2 className="text-[17px] font-semibold text-gray-900 mb-2">Your Tasks</h2>
      <p className="text-[15px] font-semibold text-gray-900 mb-2">ToDo</p>

      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="pb-2 pr-4 text-left text-[11px] font-semibold text-gray-700">Tasks</th>
            <th className="pb-2 pr-4 text-left text-[11px] font-semibold text-gray-700">Assignee</th>
            <th className="pb-2 pr-4 text-left text-[11px] font-semibold text-gray-700">Due date</th>
            <th className="pb-2 pr-4 text-left text-[11px] font-semibold text-gray-700">Priority</th>
            <th className="pb-2 text-left text-[11px] font-semibold text-gray-700">Status</th>
          </tr>
        </thead>
        <tbody>
          {TASKS.flatMap((task) => {
            const isExpanded = expandedIds.has(task.id);
            const rows = [
              <TaskRow key={task.id} task={task} expanded={isExpanded} onToggle={() => toggle(task.id)} />,
            ];
            if (isExpanded && task.children) {
              task.children.forEach((child) => rows.push(<TaskRow key={child.id} task={child} depth={1} />));
            }
            return rows;
          })}
        </tbody>
      </table>

      {/* Add Task */}
      <div className="flex items-center gap-2 pt-3">
        <button
          className="w-8 h-8 rounded-full border border-dashed border-gray-300 bg-white flex items-center justify-center shrink-0 text-gray-400 hover:border-gray-400 transition-colors"
          aria-label="Add task"
        >
          <Plus width={13} height={13} />
        </button>
        <button className="text-[13px] font-semibold text-brand-700 hover:text-brand-800 transition-colors">
          Add Task
        </button>
      </div>
    </div>
  );
}
