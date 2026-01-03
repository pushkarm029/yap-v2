'use client';

import UserCard from './UserCard';
import { LoadingState } from '../ui';
import { UserProfile } from '@/lib/database';

interface UserGridProps {
  readonly users: UserProfile[];
  readonly loading?: boolean;
}

export default function UserGrid({ users, loading = false }: UserGridProps) {
  if (loading) {
    return <LoadingState text="Loading users..." />;
  }

  if (users.length === 0) {
    return (
      <div className="text-center p-12 text-gray-500">
        <p className="text-lg font-medium">No users found</p>
        <p className="text-sm mt-1">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {users.map((user) => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}
