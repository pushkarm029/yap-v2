export default function UserCardSkeleton() {
  return (
    <div className="p-4 bg-white rounded-xl border border-gray-200 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-16" />
        </div>
        <div className="h-8 bg-gray-200 rounded-full w-20" />
      </div>
    </div>
  );
}
