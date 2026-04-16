import Logo from '../Logo';

interface OnboardingLayoutProps {
  stepper: React.ReactNode;
  children: React.ReactNode;
}

export default function OnboardingLayout({ stepper, children }: OnboardingLayoutProps) {
  return (
    <div className="h-screen bg-white overflow-hidden flex flex-col">

      {/* ── Header row: logo left, empty right (same height on both sides) ── */}
      <div className="flex shrink-0">
        <div className="hidden lg:flex w-[280px] shrink-0 border-r border-gray-200 px-6 py-6 items-center">
          <Logo size="sm" />
        </div>
        {/* Right side header spacer */}
        <div className="hidden lg:block flex-1" />
        {/* Mobile logo */}
        <div className="lg:hidden px-6 py-5">
          <Logo size="sm" />
        </div>
      </div>

      {/* ── Content row: stepper left, form right — tops always aligned ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: stepper */}
        <div className="hidden lg:block w-[280px] shrink-0 border-r border-gray-200 px-6 pt-8 overflow-y-auto">
          {stepper}
        </div>

        {/* Right: form */}
        <div className="flex-1 flex justify-center px-8 pt-8 overflow-y-auto">
          <div className="w-full max-w-sm">
            {children}
          </div>
        </div>

      </div>

    </div>
  );
}
