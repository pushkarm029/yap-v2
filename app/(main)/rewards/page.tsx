'use client';

import { useSession } from 'next-auth/react';
import {
  ScoreSectionSkeleton,
  NextDropSectionSkeleton,
  WalletSectionSkeleton,
  YapSectionSkeleton,
  HistorySectionSkeleton,
} from '@/components/rewards/RewardsPageSkeleton';
import { PageHeader, DesktopHeader } from '@/components/layout';
import {
  ScoreSection,
  NextDropSection,
  WalletSection,
  YapSection,
  HistorySection,
} from '@/components/rewards/sections';

export default function RewardsPage() {
  const { data: session, status } = useSession();

  // Show loading skeleton while checking session
  if (status === 'loading') {
    return (
      <>
        <PageHeader session={session} />
        <DesktopHeader title="Rewards" position="sticky" />
        <div className="pt-20 pb-20 lg:pt-0 lg:pb-0">
          <ScoreSectionSkeleton />
          <NextDropSectionSkeleton />
          <WalletSectionSkeleton />
          <YapSectionSkeleton />
          <HistorySectionSkeleton />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader session={session} />
      <DesktopHeader title="Rewards" position="sticky" />

      <div className="pt-20 pb-20 lg:pt-0 lg:pb-0">
        {/* Each section loads independently */}
        <ScoreSection />
        <NextDropSection />
        <WalletSection />
        <YapSection />
        <HistorySection />

        {/* The Game */}
        <div className="px-5 py-4 text-xs text-gray-500 space-y-2">
          <p className="font-medium text-gray-700">The Game</p>
          <div className="space-y-1.5">
            <p>
              <span className="text-gray-700">1.</span> Post, comment, get upvotes → earn points
            </p>
            <p>
              <span className="text-gray-700">2.</span> Every midnight UTC → points convert to $YAP
            </p>
            <p>
              <span className="text-gray-700">3.</span> Claim your tokens on-chain
            </p>
          </div>
          <p className="text-gray-400 pt-1 text-[11px]">
            The more you earn before the drop, the bigger your share. Pool grows every second.
          </p>
        </div>
      </div>
    </>
  );
}
