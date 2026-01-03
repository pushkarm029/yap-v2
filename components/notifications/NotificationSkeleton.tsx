export function NotificationSkeleton() {
  return (
    <div className="px-5 py-3 sm:py-4 border-b border-gray-200 last:border-b-0 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-gray-100 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="h-5 bg-gray-100 rounded w-3/4 mb-2" />
          <div className="h-4 bg-gray-50 rounded w-1/2 mb-2" />
          <div className="h-3 bg-gray-50 rounded w-1/4 mt-2.5" />
        </div>
      </div>
    </div>
  );
}
