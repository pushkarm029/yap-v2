'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { pageLogger } from '@/lib/logger';

interface InviteSectionProps {
  code?: string;
  isLoading: boolean;
}

const SECTION_HEADER_CLASS =
  'text-[11px] font-semibold tracking-wide uppercase text-slate-500 mb-3';

/**
 * Invite code section with copy functionality
 */
export function InviteSection({ code, isLoading }: InviteSectionProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async (): Promise<void> => {
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      pageLogger.error({ error: err }, 'Error copying invite code');
    }
  };

  return (
    <div className="px-5 py-4">
      <p className={SECTION_HEADER_CLASS}>Invite Friends</p>
      {isLoading ? (
        <div className="h-10 bg-gray-200/50 rounded-lg animate-pulse" />
      ) : code ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-100/80 rounded-lg px-3 py-2">
            <span className="font-mono text-sm font-semibold text-gray-700 tracking-wider">
              {code}
            </span>
          </div>
          <button
            onClick={handleCopyCode}
            className="w-10 h-10 rounded-lg bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors active:scale-95"
            aria-label="Copy invite code"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>
      ) : null}
    </div>
  );
}
