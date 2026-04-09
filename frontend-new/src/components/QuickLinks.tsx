import { UserPlus01, ClockCheck, UserPlus02, File02 } from '@untitled-ui/icons-react';

const links = [
  { label: 'Add a Client',       sub: 'Add yourself or import', icon: <UserPlus01 width={20} height={20} /> },
  { label: 'View Timesheets',    sub: 'Add yourself or import', icon: <ClockCheck width={20} height={20} /> },
  { label: 'Invite a teammate',  sub: 'Add yourself or import', icon: <UserPlus02 width={20} height={20} /> },
  { label: 'Manage Transcripts', sub: 'Add yourself or import', icon: <File02 width={20} height={20} /> },
];

export default function QuickLinks() {
  return (
    <div>
      <h2 className="text-[17px] font-semibold text-gray-900 mb-3">Quick Links</h2>
      <div className="grid grid-cols-4 gap-3">
        {links.map((link) => (
          <button
            key={link.label}
            className="flex items-start gap-3 border border-gray-200 rounded-xl p-3.5 bg-white text-left hover:shadow-sm transition-shadow"
          >
            {/* Untitled UI icon button style */}
            <div className="w-10 h-10 rounded-lg bg-white border border-gray-300 flex items-center justify-center shrink-0 text-gray-500 shadow-[inset_0_-2px_0_rgba(16,24,40,0.05),inset_0_0_0_1px_rgba(16,24,40,0.18)]">
              {link.icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 leading-tight mb-0.5">{link.label}</p>
              <p className="text-xs text-gray-500">{link.sub}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
