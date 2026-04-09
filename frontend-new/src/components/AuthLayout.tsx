import Logo from './Logo';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen w-full overflow-hidden">

      {/* ── Left: dark photo panel ───────────────────────────────────── */}
      <div className="hidden md:block w-[45%] shrink-0 relative">
        <img
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=900&q=80"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/50 to-black/30" />

        {/* Brand watermark bottom-left */}
        <div className="absolute bottom-8 left-8">
          <p className="text-white/70 text-xs font-medium">
            AI Wealth Connections
          </p>
        </div>
      </div>

      {/* ── Right: form panel ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-8 py-12 overflow-y-auto">
        <div className="w-full max-w-sm">

          {/* Logo — always shown in form panel */}
          <div className="mb-8">
            <Logo size="sm" />
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
