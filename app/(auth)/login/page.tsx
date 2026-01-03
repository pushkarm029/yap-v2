'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { pageLogger } from '@/lib/logger';

function LoginContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/';
  const authError = searchParams?.get('error');

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  useEffect(() => {
    if (authError) {
      // Log technical details server-side while showing user-friendly messages
      pageLogger.error(
        {
          errorCode: authError,
          callbackUrl,
          sessionStatus: status,
        },
        `Authentication error: ${authError}`
      );

      switch (authError) {
        case 'OAuthSignin':
          setError('Could not connect to sign in. Please try again.');
          break;
        case 'OAuthCallback':
          setError('Sign in was interrupted. Please try again.');
          break;
        case 'OAuthCreateAccount':
          setError('Could not create your account. Please try again.');
          break;
        case 'OAuthAccountNotLinked':
          setError('This account is already in use.');
          break;
        case 'AccessDenied':
          setError('Access was denied. Please try again.');
          break;
        case 'Configuration':
          pageLogger.error({ authError }, 'Server configuration error');
          setError('Server configuration error. Please contact support.');
          break;
        default:
          setError('Something went wrong. Please try again.');
      }
    }
  }, [authError, callbackUrl, status]);

  const handleXSignIn = async () => {
    // Prevent double sign-in if already loading
    if (isLoading) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await signIn('twitter', {
        callbackUrl,
        redirect: true,
      });
    } catch (err) {
      pageLogger.error({ error: err }, 'Sign in error');
      setError('Sign in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Video Background Layer - Fixed positioning like Orb */}
      <div className="fixed bottom-0 left-0 top-0 h-screen w-full" style={{ opacity: 1 }}>
        <video
          muted
          disableRemotePlayback
          loop
          autoPlay
          playsInline
          className="h-screen w-full object-cover"
        >
          <source src="/auth_video.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Static Background Fallback - For reduced motion users */}
      <div className="auth-video-fallback fixed inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600" />

      {/* Content Layer - Fixed positioning */}
      <div className="fixed inset-0 flex h-screen w-full items-center justify-center">
        <div className="w-full max-w-md mx-4 sm:mx-6 md:mx-8">
          <div className="glass-light rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl">
            {/* Logo */}
            <div className="flex justify-center mb-3 sm:mb-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 relative">
                <Image
                  src="/logo.png"
                  alt="Yap.Network Logo"
                  width={80}
                  height={80}
                  priority
                  className="rounded-xl sm:rounded-2xl"
                />
              </div>
            </div>

            {/* App Name & Tagline */}
            <div className="text-center mb-6 sm:mb-8">
              <h1 className="text-brand-logo text-2xl sm:text-3xl md:text-4xl text-gray-900 mb-2">
                Yap.Network
              </h1>
              <p className="text-brand-subtitle text-gray-700 text-xs sm:text-sm md:text-base leading-relaxed px-2">
                Connect, share, and discover the conversations that matter
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm flex gap-2 sm:gap-3 mb-4 sm:mb-6">
                <span className="text-red-500 font-bold text-sm sm:text-base">⚠</span>
                <span className="flex-1">{error}</span>
              </div>
            )}

            {/* Sign Up Button - Responsive */}
            <button
              onClick={handleXSignIn}
              disabled={isLoading || status === 'loading'}
              aria-label="Continue with X/Twitter"
              className="text-brand-heading w-full flex items-center justify-center gap-2 sm:gap-3 bg-black hover:bg-gray-900 disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-full py-3 sm:py-4 px-5 sm:px-6 text-sm sm:text-base transition-all duration-200 ease-in-out active:scale-[0.98] shadow-lg hover:shadow-xl"
            >
              {isLoading || status === 'loading' ? (
                <>
                  <Loader2 size={20} className="sm:w-[22px] sm:h-[22px] animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Continue with X/Twitter</span>
              )}
            </button>

            {/* Footer Text - Responsive */}
            <p className="text-center text-[10px] sm:text-xs text-gray-600 mt-4 sm:mt-6 leading-relaxed px-2">
              By continuing, you agree to our{' '}
              <Link
                href="/terms"
                className="underline hover:text-gray-900 transition-colors font-medium"
              >
                Terms
              </Link>{' '}
              and{' '}
              <Link
                href="/privacy"
                className="underline hover:text-gray-900 transition-colors font-medium"
              >
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div>
          {/* Video Background Layer */}
          <div className="fixed bottom-0 left-0 top-0 h-screen w-full" style={{ opacity: 1 }}>
            <video
              muted
              disableRemotePlayback
              loop
              autoPlay
              playsInline
              className="h-screen w-full object-cover"
            >
              <source src="/auth_video.mp4" type="video/mp4" />
            </video>
          </div>

          {/* Static Background Fallback */}
          <div className="auth-video-fallback fixed inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600" />

          {/* Loading Content */}
          <div className="fixed inset-0 flex h-screen w-full items-center justify-center">
            <div className="w-full max-w-md mx-4 sm:mx-6 md:mx-8">
              <div className="glass-light rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl">
                <div className="flex justify-center mb-3 sm:mb-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 relative">
                    <Image
                      src="/logo.png"
                      alt="Yap.Network Logo"
                      width={80}
                      height={80}
                      priority
                      className="rounded-xl sm:rounded-2xl"
                    />
                  </div>
                </div>
                <h1 className="text-brand-logo text-2xl sm:text-3xl md:text-4xl text-gray-900 text-center mb-6 sm:mb-8">
                  Yap.Network
                </h1>
                <div className="flex justify-center">
                  <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 animate-spin text-gray-900" />
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
