'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Search } from 'lucide-react';
import { UserGrid, UserGridSkeleton } from '@/components/users';
import { PageHeader, DesktopHeader } from '@/components/layout';
import { useSuggestedUsers, usePopularUsers, useNewestUsers, useUserSearch } from '@/hooks/queries';

type TabType = 'suggested' | 'popular' | 'new';

function ExploreHeader() {
  const { data: session } = useSession();
  return (
    <>
      <PageHeader session={session} />
      <DesktopHeader title="Explore" position="fixed" />
    </>
  );
}

export default function ExplorePage() {
  const [activeTab, setActiveTab] = useState<TabType>('suggested');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const { status } = useSession();

  // Debounce search query (400ms)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const isSearching = debouncedSearchQuery.length > 0;

  // TanStack Query hooks - each only fetches when enabled
  const suggestedQuery = useSuggestedUsers();
  const popularQuery = usePopularUsers();
  const newestQuery = useNewestUsers();
  const searchQueryResult = useUserSearch(debouncedSearchQuery);

  // Determine which query to use based on state
  const getActiveQuery = () => {
    if (isSearching) {
      return searchQueryResult;
    }
    switch (activeTab) {
      case 'popular':
        return popularQuery;
      case 'new':
        return newestQuery;
      case 'suggested':
      default:
        return suggestedQuery;
    }
  };

  const activeQuery = getActiveQuery();
  const users = activeQuery.data?.users || [];
  const loading = activeQuery.isLoading;
  const error = activeQuery.error ? 'Failed to load users. Please try again.' : null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled by the debounced effect above
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'suggested', label: 'Suggested' },
    { key: 'popular', label: 'Popular' },
    { key: 'new', label: 'New Users' },
  ];

  // Show loading skeleton while checking session
  if (status === 'loading') {
    return (
      <>
        <ExploreHeader />
        <div className="pt-20 lg:pt-16 p-4">
          <div className="h-12 bg-gray-100 rounded-full mb-6 animate-pulse" />
          <UserGridSkeleton count={6} />
        </div>
      </>
    );
  }

  return (
    <>
      <ExploreHeader />

      <div className="pt-20 lg:pt-16 p-4 space-y-6">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search by name or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 text-base"
              style={{ fontSize: '16px' }}
            />
          </div>
        </form>

        {/* Tabs - Hidden when searching */}
        {!searchQuery.trim() && (
          <div className="relative border-b border-gray-200">
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-all relative ${
                    activeTab === tab.key ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.key && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        {error && (
          <div className="text-center p-8">
            <div className="text-red-600 mb-2">{error}</div>
          </div>
        )}

        {loading && <UserGridSkeleton count={6} />}

        {!loading && !error && !searchQuery.trim() && users.length === 0 && (
          <div className="text-center p-12 text-gray-500">
            <Search className="mx-auto mb-4 text-gray-300" size={48} />
            <p className="text-lg font-medium">No users to show</p>
            <p className="text-sm mt-2">Try searching for users or check back later</p>
          </div>
        )}

        {!loading && !error && searchQuery.trim() && users.length === 0 && (
          <div className="text-center p-12 text-gray-500">
            <p className="text-lg font-medium">No users found</p>
            <p className="text-sm mt-2">No results for &quot;{searchQuery}&quot;</p>
          </div>
        )}

        {!loading && !error && users.length > 0 && <UserGrid users={users} loading={loading} />}
      </div>
    </>
  );
}
