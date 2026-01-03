'use client';

import { useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { LogOut, X } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { componentLogger } from '@/lib/logger';

export default function AuthButton() {
  const { data: session, status } = useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut({
        callbackUrl: '/login',
        redirect: true,
      });
    } catch (error) {
      componentLogger.error({ error }, 'Error signing out');
      setIsSigningOut(false);
    }
  };

  const handleSignIn = async () => {
    try {
      await signIn('twitter', {
        callbackUrl: '/',
        redirect: true,
      });
    } catch (error) {
      componentLogger.error({ error }, 'Error signing in');
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-gray-500">Loading...</span>
      </div>
    );
  }

  if (status === 'authenticated' && session?.user) {
    return (
      <div className="relative">
        {!showConfirm ? (
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
            <Avatar
              src={session.user.image || undefined}
              alt={session.user.name || 'User avatar'}
              size="small"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{session.user.name || 'User'}</p>
              <p className="text-sm text-gray-500 truncate">{session.user.email || 'No email'}</p>
            </div>
            <button
              onClick={() => setShowConfirm(true)}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-lg min-w-[280px]">
            <h3 className="font-medium text-gray-900 mb-2">Sign out?</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to sign out of your account?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-3 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex-1 px-3 py-2 text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors flex items-center justify-center gap-2"
              >
                {isSigningOut ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing out...
                  </>
                ) : (
                  <>
                    <LogOut size={16} />
                    Sign out
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleSignIn}
      className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-lg transition-colors"
    >
      <X size={20} />
      <span>Sign in with X</span>
    </button>
  );
}
