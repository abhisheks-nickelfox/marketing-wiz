const TopNav = ({ title, user }) => {
  return (
    <header className="h-[56px] w-full sticky top-0 z-40 bg-white border-b border-gray-100 flex justify-between items-center px-8">
      <h2 className="font-['Inter'] font-semibold text-lg text-[#1a1c1b]">{title}</h2>
      <div className="flex items-center space-x-4">
        <button className="text-zinc-500 hover:bg-gray-50 rounded-full p-2 transition-all opacity-90 hover:opacity-100">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="text-zinc-500 hover:bg-gray-50 rounded-full p-2 transition-all opacity-90 hover:opacity-100">
          <span className="material-symbols-outlined">settings</span>
        </button>
        <div className="h-8 w-8 rounded-full bg-surface-container overflow-hidden ml-2 cursor-pointer border border-outline-variant/20">
          <div className="h-full w-full bg-primary-container flex items-center justify-center text-white font-bold text-sm">
            {user?.initials || 'U'}
          </div>
        </div>
      </div>
    </header>
  )
}

export default TopNav
