// Vertical progress stepper matching the Figma left-panel design

import StepIcon from './StepIcon';

export interface Step {
  label: string;
  sublabel?: string;
}

interface OnboardingStepperProps {
  steps: Step[];
  currentStep: number; // 0-based
}

export default function OnboardingStepper({
  steps,
  currentStep,
}: OnboardingStepperProps) {
  return (
    <div className="flex flex-col gap-0">
      {steps.map((step, i) => {
        const state =
          i < currentStep
            ? 'completed'
            : i === currentStep
            ? 'current'
            : 'upcoming';

        const isLast = i === steps.length - 1;

        return (
          <div key={i} className="flex gap-4">
            {/* Icon + vertical connector */}
            <div className="flex flex-col items-center">
              <StepIcon state={state} size={32} />
              {!isLast && (
                <div
                  className={`w-0.5 flex-1 my-1 ${
                    i < currentStep ? 'bg-[#7F56D9]' : 'bg-[#E9EAEB]'
                  }`}
                  style={{ minHeight: 28 }}
                />
              )}
            </div>

            {/* Label */}
            <div className="pb-6 pt-1">
              <p
                className={`text-sm font-semibold leading-tight ${
                  state === 'upcoming'
                    ? 'text-[#A4A7AE]'
                    : 'text-[#181D27]'
                }`}
              >
                {step.label}
              </p>
              {step.sublabel && (
                <p className="text-xs text-[#717680] mt-0.5">{step.sublabel}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
