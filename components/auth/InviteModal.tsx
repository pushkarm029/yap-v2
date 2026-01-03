'use client';

import { useState } from 'react';
import { Loader2, X } from 'lucide-react';

interface InviteModalProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function InviteModal({ onSuccess, onCancel }: InviteModalProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      setError('Please enter an invite code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/invite/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        // Success - let parent handle reload
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError(data.error || 'Invalid invite code');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl relative">
        {/* Close button */}
        {onCancel && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        )}

        <h2 className="text-2xl font-bold text-gray-900 mb-2">Enter Invite Code</h2>
        <p className="text-gray-600 text-sm mb-6">
          Enter an invite code to start posting, commenting, and upvoting.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="YAP-XXXXXXXX"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm uppercase"
              disabled={isLoading}
              maxLength={20}
            />
            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading || !code.trim()}
            className="w-full bg-black hover:bg-gray-900 disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-full py-3 px-6 font-medium transition-all duration-150 ease-in-out active:scale-95 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Validating...</span>
              </>
            ) : (
              <span>Continue</span>
            )}
          </button>
        </form>

        <p className="text-xs text-gray-500 mt-4 text-center">
          Don&apos;t have a code? Get one from a friend already on Yap.
        </p>
      </div>
    </div>
  );
}
