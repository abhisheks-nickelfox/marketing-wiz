import { ChevronSelectorVertical } from '@untitled-ui/icons-react';

const AVATAR_SRC = 'https://www.figma.com/api/mcp/asset/2bd7682a-db86-48c0-bee2-2348c3783f33';

export default function TopBar() {
  return (
    <header className="h-[64px] shrink-0 flex items-center justify-end px-6 bg-white border-b border-[#E9EAEB]">
      {/* Account card */}
      <button className="flex items-center gap-3 bg-white border border-[#E9EAEB] rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors relative min-w-[220px]">
        {/* Avatar with online dot */}
        <div className="relative shrink-0">
          <img
            src={AVATAR_SRC}
            alt="Sienna Hewitt"
            className="w-10 h-10 rounded-full object-cover border border-[rgba(0,0,0,0.08)]"
            style={{ backgroundColor: '#E9DCBB' }}
          />
          <span className="absolute bottom-[-1px] right-[-1px] w-[10px] h-[10px] bg-[#17B26A] rounded-[5px] border-[1.5px] border-white" />
        </div>
        {/* Name + email */}
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-[#181D27] leading-5">Sienna Hewitt</p>
          <p className="text-sm text-[#535862] leading-5">sienna@aiwealth.com</p>
        </div>
        {/* Chevron selector */}
        <ChevronSelectorVertical width={16} height={16} className="text-[#717680] shrink-0" />
      </button>
    </header>
  );
}
