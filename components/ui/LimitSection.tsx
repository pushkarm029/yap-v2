import CircularProgress from './CircularProgress';
import { DailyLimit } from '@/lib/database';

interface LimitSectionProps {
  title: string;
  limit: DailyLimit;
  size?: number;
  strokeWidth?: number;
}

export default function LimitSection({
  title,
  limit,
  size = 32,
  strokeWidth = 3,
}: LimitSectionProps) {
  const getBarColor = () => {
    if (limit.remaining <= 1) {
      return 'bg-red-500';
    } else if (limit.remaining <= 4) {
      return 'bg-amber-500';
    }
    return 'bg-blue-500';
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <CircularProgress
          value={limit.used}
          max={limit.limit}
          size={size}
          strokeWidth={strokeWidth}
        />
        <div>
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <p className="text-xs text-gray-500">
            {limit.used}/{limit.limit} used
          </p>
        </div>
      </div>
      <div className="flex-1 max-w-[200px] mx-4">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getBarColor()}`}
            style={{
              width: `${limit.limit > 0 ? (limit.used / limit.limit) * 100 : 0}%`,
            }}
          />
        </div>
      </div>
      <span className="text-sm font-medium text-gray-700">{limit.remaining} left</span>
    </div>
  );
}
