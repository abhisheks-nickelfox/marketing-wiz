import { ChevronRight, ChevronDown } from '@untitled-ui/icons-react';

export default function Header() {
  return (
    <div className="flex items-start justify-between gap-4 px-8 pt-6 pb-0">

      {/* Left: breadcrumb + page title */}
      <div>
        <nav className="flex items-center gap-1 mb-3">
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-md border border-gray-200 bg-warning-200 shrink-0" />
            <span className="text-[13px] font-semibold text-gray-500 px-2 py-1 rounded-md">
              Sienna Hewitt
            </span>
          </div>
          <ChevronRight width={16} height={16} className="text-gray-400" />
          <span className="text-[13px] font-semibold text-gray-600 bg-gray-50 px-2 py-1 rounded-md">
            Dashboard
          </span>
        </nav>

        <h1 className="text-[22px] font-semibold text-gray-900 leading-snug mb-1">
          Welcome back, Sienna
        </h1>
        <p className="text-sm text-gray-500">
          Here's an overview of your site traffic and recently active users.
        </p>
      </div>

      {/* Right: account card */}
      <div className="shrink-0 flex items-center gap-2.5 border border-gray-200 rounded-xl px-3 py-2.5 bg-white cursor-pointer relative min-w-[220px]">
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full border border-gray-200 bg-warning-200" />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success-500 rounded-full border-2 border-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-gray-900 leading-tight">Sienna Hewitt</p>
          <p className="text-xs text-gray-500 leading-tight">sienna@aiwealth.com</p>
        </div>
        <ChevronDown width={16} height={16} className="text-gray-400 absolute top-2 right-2" />
      </div>
    </div>
  );
}
