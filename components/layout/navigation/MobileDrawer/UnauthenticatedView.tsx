'use client';

import Link from 'next/link';
import { User, LogIn } from 'lucide-react';

interface UnauthenticatedViewProps {
  onClose: () => void;
}

/**
 * View shown when user is not authenticated
 */
export function UnauthenticatedView({ onClose }: UnauthenticatedViewProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-5">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
          <User size={32} className="text-blue-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Welcome to Yap</h2>
        <p className="text-sm text-gray-600 mb-6">
          Sign in to earn rewards and join the conversation
        </p>
        <Link
          href="/login"
          onClick={onClose}
          className="inline-flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full py-2.5 px-6 font-medium transition-colors"
        >
          <LogIn size={18} />
          Sign In
        </Link>
      </div>
    </div>
  );
}
