'use client';

import { useState, useEffect } from 'react';
import { Loader2, X } from 'lucide-react';
import { useProfile, useUpdateProfile } from '@/hooks/queries';

interface EditProfileDialogProps {
  onClose: () => void;
}

export function EditProfileDialog({ onClose }: EditProfileDialogProps) {
  const { data: profileData } = useProfile();
  const updateProfileMutation = useUpdateProfile();

  // Initialize with profile data (avoids setState in effect)
  const [name, setName] = useState(() => profileData?.name ?? '');
  const [error, setError] = useState<string | null>(null);

  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Name cannot be empty');
      return;
    }

    setError(null);

    updateProfileMutation.mutate(
      { name: name.trim() },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (err) => {
          setError(err.message || 'Failed to update profile');
        },
      }
    );
  };

  const saving = updateProfileMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X size={24} />
        </button>

        <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Profile</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your display name"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
              disabled={saving}
              maxLength={50}
            />
            <div className="flex justify-between mt-1">
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <span className="text-xs text-gray-400 ml-auto">{name.length}/50</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full py-3 font-medium transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
