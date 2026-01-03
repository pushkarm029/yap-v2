'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function PostDetailHeader() {
  const router = useRouter();

  return (
    <>
      {/* Mobile Header - Capsule */}
      <div
        className="fixed top-0 left-0 right-0 px-4 py-3 z-[100] lg:hidden"
        style={{ paddingTop: `calc(0.75rem + var(--safe-area-inset-top, 0px))` }}
      >
        <div className="glass-light rounded-full shadow-lg p-2 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors active:scale-95 flex-shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <h1 className="text-base font-semibold text-gray-900">Post</h1>
          <div className="w-10 h-10 flex-shrink-0" />
        </div>
      </div>

      {/* Desktop Header */}
      <div
        className="hidden lg:block fixed top-0 left-0 right-0 glass-light shadow-sm p-4 z-[100]"
        style={{ paddingTop: `calc(1rem + var(--safe-area-inset-top, 0px))` }}
      >
        <div className="flex items-center gap-4 max-w-[720px] mx-auto">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">Post</h1>
        </div>
      </div>
    </>
  );
}
