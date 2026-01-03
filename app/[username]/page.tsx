'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ProfileHeader, ProfileStats, ProfileSkeleton } from '@/components/profile';
import { FeedSkeleton } from '@/components/posts';
import { ErrorState } from '@/components/ui';
import { PageHeader } from '@/components/layout';
import { useUserProfile } from '@/hooks/queries';

const ProfileFeed = dynamic(() => import('@/components/profile/ProfileFeed'), {
  ssr: false,
  loading: () => <FeedSkeleton count={3} />,
});

export default function UserProfilePage() {
  const { data: session } = useSession();
  const params = useParams();
  const username = params.username as string;

  // TanStack Query handles fetching, caching, and automatic refetching
  const { data: profile, isLoading, error, refetch } = useUserProfile(username);

  if (isLoading) {
    return (
      <>
        <PageHeader session={session} />
        <div className="pt-20 pb-20 lg:pt-0 lg:pb-0">
          <ProfileSkeleton />
        </div>
      </>
    );
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load profile';
    return <ErrorState message={errorMessage} onRetry={() => refetch()} />;
  }

  if (!profile) {
    return null;
  }

  const isOwner = session?.user?.id === profile.id;

  return (
    <>
      <PageHeader session={session} />
      <div className="pt-20 pb-20 lg:pt-0 lg:pb-0">
        <ProfileHeader
          profile={profile}
          isOwner={isOwner}
          isFollowing={profile.isFollowing}
          followerCount={profile.followerCount}
          followingCount={profile.followingCount}
        />
        <ProfileStats
          points={profile.points}
          streak={profile.streak}
          postsCount={profile.postsCount}
          votePower={profile.votePower}
        />

        {/* Yaps Section */}
        <ProfileFeed userId={profile.id} />
      </div>
    </>
  );
}
