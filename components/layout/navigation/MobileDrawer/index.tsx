'use client';

import { useEffect, useRef, useMemo } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useDrawer } from '@/hooks/useDrawer';
import { useUserProfile, useLimitsQuery, useInviteCode } from '@/hooks/queries';
import { useRewardsPool, useRewardsScore } from '@/hooks/queries';
import { Z_INDEX, SAFE_AREAS, DURATION, EASING } from '@/lib/design/tokens';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { useCountdown } from './useCountdown';

import { ProfileSection } from './ProfileSection';
import { DailyActionsSection } from './DailyActionsSection';
import { RewardsSection } from './RewardsSection';
import { InviteSection } from './InviteSection';
import { BottomSection } from './BottomSection';
import { UnauthenticatedView } from './UnauthenticatedView';

const DIVIDER_CLASS = 'h-px bg-black/[0.04] mx-5';

/**
 * Mobile slide-out drawer with Frost design system
 *
 * Structure:
 * 1. Profile hero (top) - avatar, name, username, points + streak inline
 * 2. Daily actions - prominent progress bar
 * 3. Rewards - claim CTA (if available) + countdown
 * 4. Invite code - copy-able code
 * 5. Settings + Sign out (bottom)
 */
export default function MobileDrawer() {
  const { data: session, status } = useSession();
  const { isOpen, close } = useDrawer();
  const isDesktop = useIsDesktop();
  const username = session?.user?.username;

  // Data fetching
  const { data: profile, isLoading: isProfileLoading } = useUserProfile(username || '');
  const { data: limitsData, isLoading: isLimitsLoading } = useLimitsQuery();
  const { data: poolData } = useRewardsPool();
  const { data: scoreData } = useRewardsScore();
  const { data: inviteCode, isLoading: isInviteLoading } = useInviteCode();

  const limits = limitsData || { total: null };
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Countdown timer for next distribution
  const countdown = useCountdown(poolData?.nextDistributionIn);

  // Handle sign out
  function handleSignOut(): void {
    close();
    signOut({ callbackUrl: '/' });
  }

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Focus trap management
  useEffect(() => {
    if (!isOpen || !drawerRef.current) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement;

    const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(',');
      return Array.from(container.querySelectorAll(focusableSelectors));
    };

    const focusableElements = getFocusableElements(drawerRef.current);
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (firstFocusable) {
      firstFocusable.focus();
    }

    // Tab key focus trap (ESC handled by useDrawer hook)
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen]);

  // Calculate daily actions progress
  const actionsProgress = useMemo(() => {
    if (!limits.total) return { used: 0, limit: 10, remaining: 10, percent: 0 };
    const { used, limit } = limits.total;
    return {
      used,
      limit,
      remaining: limit - used,
      percent: Math.min((used / limit) * 100, 100),
    };
  }, [limits.total]);

  // Don't render on desktop or when closed
  if (!isOpen || isDesktop) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200"
        style={{ zIndex: Z_INDEX.overlay }}
        onClick={close}
        aria-hidden="true"
      />

      {/* Drawer Panel - Frost Design */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Main navigation menu"
        className="fixed inset-y-0 left-0 w-[280px] max-w-[80vw] bg-white shadow-2xl flex flex-col animate-slide-in"
        style={{
          zIndex: Z_INDEX.modal,
          paddingTop: SAFE_AREAS.top,
          paddingBottom: SAFE_AREAS.bottom,
        }}
      >
        {status === 'authenticated' ? (
          <>
            {/* Main Content - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              <ProfileSection
                user={{
                  name: session?.user?.name,
                  username: session?.user?.username,
                  image: session?.user?.image,
                }}
                profile={{
                  points: profile?.points,
                  streak: profile?.streak,
                  postsCount: profile?.postsCount,
                }}
                votePower={scoreData?.votePower}
                isLoading={isProfileLoading}
                onClose={close}
              />

              <div className={DIVIDER_CLASS} />

              <DailyActionsSection progress={actionsProgress} isLoading={isLimitsLoading} />

              <div className={DIVIDER_CLASS} />

              <RewardsSection
                pending={scoreData?.pending}
                poolSharePercent={poolData?.userSharePercent}
                countdown={countdown}
                onClose={close}
              />

              <div className={DIVIDER_CLASS} />

              <InviteSection code={inviteCode?.code} isLoading={isInviteLoading} />
            </div>

            <BottomSection onClose={close} onSignOut={handleSignOut} />
          </>
        ) : (
          <UnauthenticatedView onClose={close} />
        )}
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }

        .animate-slide-in {
          animation: slide-in ${DURATION.slow}ms ${EASING.default};
        }
      `}</style>
    </>
  );
}
