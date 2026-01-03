'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import UserInviteCode from './UserInviteCode';
import { Show } from '@/lib/design';
import { LAYOUT } from '@/lib/design/tokens';

/**
 * Desktop right sidebar with invite codes and info boxes.
 * Only visible at lg breakpoint and above.
 */
export default function RightSidebar() {
  const { status } = useSession();

  return (
    <Show above="lg">
      <aside className="p-4 space-y-4" style={{ width: LAYOUT.rightSidebarWidth }}>
        {/* Invite Code for authenticated users, or Sign In prompt */}
        {status === 'authenticated' ? (
          <UserInviteCode />
        ) : (
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
            <h2 className="text-lg font-semibold tracking-tight mb-2 text-gray-900">
              Join Yap.Network
            </h2>
            <p className="text-sm text-gray-700 mb-3">
              Sign in with an invite code to start posting, commenting, and upvoting!
            </p>
            <Link
              href="/login"
              className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 px-4 font-medium transition-colors"
            >
              Sign In
            </Link>
          </div>
        )}

        {/* Welcome Box */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h2 className="text-lg font-semibold tracking-tight mb-3 text-gray-900 flex items-center justify-center gap-1">
            Welcome
            <span className="text-xl">✨</span>
          </h2>
          <div className="text-gray-700 text-sm leading-relaxed text-center space-y-2">
            <p>
              <span className="font-semibold text-blue-600">Vote</span> on tweets
              <br />
              to earn rewards 🎁
            </p>
            <p>
              The more you upvote tweets
              <br />
              that other people upvote,
              <br />
              the more rewards you earn
            </p>
            <p>
              Stake to increase rewards,
              <br />
              clout, and influence on feeds
            </p>
          </div>
        </div>

        {/* Mobile App Box */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h2 className="text-lg font-semibold tracking-tight mb-3 text-gray-900 flex items-center justify-center gap-1">
            Mobile App
            <span className="text-xl">📱</span>
          </h2>
          <div className="text-gray-700 text-sm leading-relaxed text-center space-y-2">
            <p>
              Get a smooth on-the-go
              <br />
              experience
            </p>
            <p>
              Visit <span className="font-semibold text-blue-600">yap.network</span>
              <br />
              on your mobile browser
              <br />
              to install the app
            </p>
          </div>
        </div>
      </aside>
    </Show>
  );
}
