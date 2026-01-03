'use client';

import Link from 'next/link';
import { HelpCircle, LogOut } from 'lucide-react';

interface BottomSectionProps {
  onClose: () => void;
  onSignOut: () => void;
}

/**
 * Bottom section with report bug and sign out
 */
export function BottomSection({ onClose, onSignOut }: BottomSectionProps) {
  return (
    <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0 space-y-1">
      <Link
        href="/feedback"
        onClick={onClose}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-black/5 transition-colors"
      >
        <HelpCircle size={20} className="text-gray-600" />
        <span className="text-sm font-medium text-gray-700">Help & Feedback</span>
      </Link>
      <button
        onClick={onSignOut}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-black/5 transition-colors"
      >
        <LogOut size={20} className="text-gray-600" />
        <span className="text-sm font-medium text-gray-700">Sign Out</span>
      </button>
    </div>
  );
}
