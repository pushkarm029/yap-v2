'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { pageLogger } from '@/lib/logger';
import { useInviteCode } from '@/hooks/queries';

export default function UserInviteCode() {
  const [copied, setCopied] = useState(false);

  // TanStack Query handles fetching and caching
  const { data: code, isLoading: loading } = useInviteCode();

  const handleCopy = async () => {
    if (!code) return;

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(code.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Fallback for browsers without Clipboard API
        const textarea = document.createElement('textarea');
        textarea.value = code.code;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      pageLogger.error({ error: err }, 'Error copying code');
    }
  };

  if (loading) {
    return (
      <div className="glass-light rounded-2xl p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
          <div className="h-12 bg-gray-200 rounded mb-2" />
          <div className="h-10 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!code) return null;

  return (
    <div className="glass-light rounded-2xl space-y-3">
      <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
        <div className="text-center font-mono font-bold text-blue-600 text-lg tracking-wider">
          {code.code}
        </div>
      </div>

      <button
        onClick={handleCopy}
        className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-blue-600 active:scale-95 transition-all"
      >
        {copied ? (
          <>
            <Check size={16} />
            <span>Copied!</span>
          </>
        ) : (
          <>
            <Copy size={16} />
            <span>Copy Code</span>
          </>
        )}
      </button>
    </div>
  );
}
