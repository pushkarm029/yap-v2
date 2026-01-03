export default function PostDetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="px-5 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gray-200 rounded-full" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-24 mb-1" />
            <div className="h-3 bg-gray-100 rounded w-16" />
          </div>
        </div>
        <div className="space-y-2 mb-4">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-5/6" />
          <div className="h-4 bg-gray-200 rounded w-4/6" />
        </div>
        <div className="h-48 bg-gray-100 rounded-2xl mb-4" />
        <div className="flex gap-4">
          <div className="h-8 bg-gray-100 rounded w-16" />
          <div className="h-3 bg-gray-100 rounded w-20 self-center" />
        </div>
      </div>
      <div className="px-5 py-4 border-b border-gray-200">
        <div className="flex gap-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full" />
          <div className="flex-1 h-10 bg-gray-100 rounded-full" />
        </div>
      </div>
    </div>
  );
}
