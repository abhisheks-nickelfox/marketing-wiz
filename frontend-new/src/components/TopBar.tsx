import AccountCard from './AccountCard';

const AVATAR_SRC = 'https://www.figma.com/api/mcp/asset/2bd7682a-db86-48c0-bee2-2348c3783f33';

const CURRENT_USER = {
  name: 'Sienna Hewitt',
  email: 'sienna@aiwealth.com',
  avatar: AVATAR_SRC,
};

export default function TopBar() {
  return (
    <header className="h-[64px] shrink-0 flex items-center justify-end px-6 bg-white border-b border-[#E9EAEB]">
      <AccountCard
        user={CURRENT_USER}
        showSelectorChevron
        showOnlineDot
        asButton
      />
    </header>
  );
}
