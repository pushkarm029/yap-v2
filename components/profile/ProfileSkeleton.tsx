import FeedSkeleton from '@/components/posts/FeedSkeleton';

export function ProfileHeaderSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-32 bg-gray-200" />
      <div className="px-4 pb-4">
        <div className="flex justify-between items-end -mt-12 mb-3">
          <div className="w-24 h-24 bg-gray-300 rounded-full border-4 border-white" />
          <div className="h-9 bg-gray-200 rounded-full w-24" />
        </div>
        <div className="h-5 bg-gray-200 rounded w-32 mb-2" />
        <div className="h-4 bg-gray-100 rounded w-24 mb-3" />
        <div className="h-4 bg-gray-100 rounded w-full mb-2" />
        <div className="h-4 bg-gray-100 rounded w-2/3" />
      </div>
    </div>
  );
}

export function ProfileStatsSkeleton() {
  return (
    <div className="px-4 py-3 border-b border-gray-200 animate-pulse">
      <div className="flex gap-6">
        <div>
          <div className="h-5 bg-gray-200 rounded w-12 mb-1" />
          <div className="h-3 bg-gray-100 rounded w-10" />
        </div>
        <div>
          <div className="h-5 bg-gray-200 rounded w-8 mb-1" />
          <div className="h-3 bg-gray-100 rounded w-10" />
        </div>
        <div>
          <div className="h-5 bg-gray-200 rounded w-10 mb-1" />
          <div className="h-3 bg-gray-100 rounded w-10" />
        </div>
      </div>
    </div>
  );
}

export default function ProfileSkeleton() {
  return (
    <>
      <ProfileHeaderSkeleton />
      <ProfileStatsSkeleton />
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="h-4 bg-gray-100 rounded w-16" />
      </div>
      <FeedSkeleton count={3} />
    </>
  );
}
