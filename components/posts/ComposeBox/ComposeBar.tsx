'use client';

import Avatar from '@/components/ui/Avatar';

interface ComposeBarProps {
  userImage?: string | null;
  userName?: string | null;
  onExpand: () => void;
}

/**
 * Desktop collapsed compose bar
 * Hidden on mobile (uses FAB from MobileNav)
 */
export function ComposeBar({ userImage, userName, onExpand }: ComposeBarProps) {
  return (
    <div className="hidden lg:block fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-[720px] bg-white border border-gray-200 rounded-2xl shadow-lg z-30">
      <div className="flex items-center gap-3 p-3 px-4">
        <Avatar src={userImage || undefined} alt={userName || 'Your avatar'} size="small" />
        <div
          onClick={onExpand}
          className="flex-1 px-4 py-3 bg-gray-50 rounded-full cursor-pointer hover:bg-gray-100 transition-colors"
        >
          <div className="text-gray-500 text-base font-normal tracking-tight">
            What&apos;s happening?
          </div>
        </div>
        <button
          onClick={onExpand}
          className="px-4 py-2 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600 transition-colors"
        >
          Yap
        </button>
      </div>
    </div>
  );
}
