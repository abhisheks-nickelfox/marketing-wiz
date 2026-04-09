interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  stacked?: boolean; // logo + text side-by-side (false) or stacked (true)
}

export default function Logo({ size = 'md', stacked = false }: LogoProps) {
  const iconSize = size === 'sm' ? 40 : size === 'md' ? 48 : 60;
  const textSize = size === 'sm' ? 'text-base' : size === 'md' ? 'text-lg' : 'text-2xl';
  const subSize  = size === 'sm' ? 'text-[11px]' : size === 'md' ? 'text-xs' : 'text-sm';

  const icon = (
    <div
      className="rounded-full bg-blue-600 flex items-center justify-center shrink-0"
      style={{ width: iconSize, height: iconSize }}
    >
      {/* Lightning bolt — matches the Figma logo */}
      <svg
        width={iconSize * 0.5}
        height={iconSize * 0.58}
        viewBox="0 0 24 28"
        fill="none"
      >
        <path
          d="M14 2L4 16h8l-2 10 12-16h-8l2-8z"
          fill="white"
          stroke="white"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );

  if (stacked) {
    return (
      <div className="flex flex-col items-center gap-2">
        {icon}
        <div className="text-center">
          <p className={`${textSize} font-bold text-gray-900 leading-tight`}>AI Wealth</p>
          <p className={`${subSize} text-gray-500 leading-tight`}>Connections</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      {icon}
      <div>
        <p className={`${textSize} font-bold text-gray-900 leading-tight`}>AI Wealth</p>
        <p className={`${subSize} text-gray-500 leading-tight`}>Connections</p>
      </div>
    </div>
  );
}
