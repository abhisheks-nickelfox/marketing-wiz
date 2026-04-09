import { TrendUp01 } from '@untitled-ui/icons-react';

const leftBars = [
  { label: 'Todo',       count: 57,  color: 'bg-chart-gray' },
  { label: 'Assigned',   count: 100, color: 'bg-chart-blue' },
  { label: 'Inprogress', count: 40,  color: 'bg-chart-purple' },
  { label: 'Revisions',  count: 64,  color: 'bg-chart-orange' },
];

const rightBars = [
  { label: 'Blocked',         count: 10, color: 'bg-chart-red' },
  { label: 'Internal Review', count: 40, color: 'bg-chart-yellow' },
  { label: 'Client Review',   count: 51, color: 'bg-chart-pink' },
  { label: 'Completed',       count: 51, color: 'bg-chart-green' },
];

const MAX = 100;
const barPx = (n: number) => Math.round((n / MAX) * 110);

interface BarRowProps { label: string; count: number; color: string }

function BarRow({ label, count, color }: BarRowProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-bold text-gray-500 w-24 shrink-0">{label}</span>
      <div className={`h-2.5 rounded-sm shrink-0 ${color}`} style={{ width: barPx(count) }} />
      <span className="text-[11px] text-gray-500 w-6 shrink-0">{count}</span>
    </div>
  );
}

export default function MetricCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex items-stretch gap-5 px-5 py-4">

      {/* Total number + trend */}
      <div className="flex flex-col gap-2 justify-center shrink-0 w-[90px]">
        <p className="text-[15px] font-semibold text-gray-900">Total Tasks</p>
        <p className="text-[28px] font-semibold text-gray-900 leading-none">413</p>
        <div className="flex items-center gap-1 text-success-700">
          <TrendUp01 width={14} height={14} />
          <span className="text-xs font-medium">15</span>
          <span className="text-xs font-medium text-gray-500">last mth</span>
        </div>
      </div>

      {/* Left bars */}
      <div className="flex flex-col gap-2.5 justify-center flex-1">
        {leftBars.map((b) => <BarRow key={b.label} {...b} />)}
      </div>

      <div className="w-px bg-gray-200 self-stretch shrink-0" />

      {/* Right bars */}
      <div className="flex flex-col gap-2.5 justify-center flex-1">
        {rightBars.map((b) => <BarRow key={b.label} {...b} />)}
      </div>

      <div className="w-px bg-gray-200 self-stretch shrink-0" />

      {/* Due Today + Assigned to you */}
      <div className="flex flex-col gap-3 justify-center shrink-0 w-28">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Due Today</p>
          <div className="flex items-center gap-1.5">
            <span className="text-[22px] font-bold text-gray-900 leading-none">62</span>
            <span className="flex items-center gap-0.5 text-success-700 text-xs font-medium">
              <TrendUp01 width={13} height={13} />9.2%
            </span>
          </div>
        </div>
        <div className="h-px bg-gray-200" />
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Assigned to you</p>
          <div className="flex items-center gap-1.5">
            <span className="text-[22px] font-bold text-gray-900 leading-none">86</span>
            <span className="flex items-center gap-0.5 text-success-700 text-xs font-medium">
              <TrendUp01 width={13} height={13} />9.2%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
