// StepIcon — matches the Figma "StepIconBase" design
// Current: filled purple circle with outer ring shadow
// Completed: filled purple circle with checkmark
// Upcoming: white circle with gray border

interface StepIconProps {
  state: 'current' | 'completed' | 'upcoming';
  size?: number;
}

export default function StepIcon({ state, size = 32 }: StepIconProps) {
  if (state === 'completed') {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-full bg-[#7F56D9] flex items-center justify-center shrink-0"
      >
        {/* Checkmark */}
        <svg
          width={size * 0.5}
          height={size * 0.5}
          viewBox="0 0 12 12"
          fill="none"
        >
          <path
            d="M2 6l3 3 5-5"
            stroke="#fff"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  if (state === 'current') {
    return (
      // Outer ring = box-shadow trick from Figma
      <div
        style={{
          width: size,
          height: size,
          boxShadow: '0 0 0 4px #F4EBFF',
        }}
        className="rounded-full bg-[#7F56D9] flex items-center justify-center shrink-0"
      >
        {/* Inner white dot */}
        <div
          style={{ width: size * 0.28, height: size * 0.28 }}
          className="rounded-full bg-white"
        />
      </div>
    );
  }

  // upcoming
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full border-2 border-[#D5D7DA] bg-white flex items-center justify-center shrink-0"
    >
      <div
        style={{ width: size * 0.28, height: size * 0.28 }}
        className="rounded-full bg-[#D5D7DA]"
      />
    </div>
  );
}
