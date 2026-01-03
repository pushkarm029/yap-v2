import UserCardSkeleton from './UserCardSkeleton';

interface UserGridSkeletonProps {
  count?: number;
}

export default function UserGridSkeleton({ count = 6 }: UserGridSkeletonProps) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <UserCardSkeleton key={`user-skeleton-${i}`} />
      ))}
    </div>
  );
}
