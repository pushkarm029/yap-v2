'use client';

interface CircularProgressProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export default function CircularProgress({
  value,
  max,
  size = 20,
  strokeWidth = 2.5,
  className = '',
}: CircularProgressProps) {
  // Guard against division by zero
  const safeMax = max > 0 ? max : 1;
  const percentage = Math.min(Math.max((value / safeMax) * 100, 0), 100);

  // Guard against strokeWidth >= size
  const safeStrokeWidth = Math.max(1, Math.min(strokeWidth, size - 1));
  const radius = Math.max((size - safeStrokeWidth) / 2, 0);
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  // Color based on remaining actions
  const remaining = max - value;
  let colorClass = 'text-blue-500'; // Good (>4 left)

  if (remaining <= 1) {
    colorClass = 'text-red-500'; // Critical
  } else if (remaining <= 4) {
    colorClass = 'text-amber-500'; // Warning
  }

  return (
    <svg
      width={size}
      height={size}
      className={`transform -rotate-90 ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(percentage)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${value} of ${max} used`}
    >
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={safeStrokeWidth}
        className="text-gray-200"
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={safeStrokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className={`${colorClass} transition-all duration-500 ease-out`}
        style={{
          transitionProperty: 'stroke-dashoffset, stroke',
        }}
      />
    </svg>
  );
}
