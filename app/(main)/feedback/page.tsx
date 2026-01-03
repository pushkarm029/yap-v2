'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Bug, MessageSquare, Camera, Check, AlertCircle, X, Loader2 } from 'lucide-react';
import { PageHeader, DesktopHeader } from '@/components/layout';
import { useDiagnosticInfo } from '@/hooks/useDiagnosticInfo';
import { useImageUpload } from '@/hooks/useImageUpload';
import type { BugReportType } from '@/lib/database/types';

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

export default function FeedbackPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const errorFromUrl = searchParams.get('error');
  const stackFromUrl = searchParams.get('stack');

  const [type, setType] = useState<BugReportType>('bug');
  const [description, setDescription] = useState('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);

  const {
    previewUrl,
    error: imageError,
    selectImage,
    removeImage,
    uploadImage,
    fileInputRef,
  } = useImageUpload();

  const diagnosticInfo = useDiagnosticInfo(
    errorFromUrl ? { message: errorFromUrl, stack: stackFromUrl ?? undefined } : undefined
  );

  useEffect(() => {
    if (errorFromUrl) {
      setDescription(`Error: ${errorFromUrl}\n\nWhat were you doing when this happened?\n`);
    }
  }, [errorFromUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await selectImage(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      setErrorMessage('Please describe the issue');
      return;
    }

    setSubmitStatus('submitting');
    setErrorMessage(null);

    try {
      let screenshotUrl: string | undefined;
      if (previewUrl) {
        screenshotUrl = (await uploadImage()) ?? undefined;
      }

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          description: description.trim(),
          screenshotUrl,
          includeDiagnostics,
          diagnosticInfo: includeDiagnostics ? diagnosticInfo : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback');
      }

      setReportId(data.id);
      setSubmitStatus('success');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong');
      setSubmitStatus('error');
    }
  };

  // Success state
  if (submitStatus === 'success') {
    return (
      <>
        <PageHeader session={session} />
        <DesktopHeader title="Help & Feedback" position="sticky" />
        <div className="pt-20 pb-20 lg:pt-0 lg:pb-0 flex items-center justify-center min-h-[60vh]">
          <div className="glass-light rounded-2xl p-8 text-center max-w-sm w-full shadow-lg border border-gray-200/50 mx-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Thank you!</h2>
            <p className="text-sm text-gray-600 mb-4">
              Your {type === 'bug' ? 'bug report' : 'feedback'} has been submitted.
            </p>
            {reportId && (
              <p className="text-xs text-gray-500 mb-5">
                Reference:{' '}
                <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                  #{reportId.slice(0, 8)}
                </code>
              </p>
            )}
            <button
              onClick={() => router.push('/')}
              className="px-5 py-2 bg-gray-900 text-white text-sm rounded-full hover:bg-gray-800 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader session={session} />
      <DesktopHeader title="Help & Feedback" position="sticky" />

      <div className="pt-20 pb-20 lg:pt-0 lg:pb-0">
        <div className="max-w-lg mx-auto p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type selector - SaaS style */}
            <div className="glass-light rounded-2xl p-1.5 border border-gray-200/50 flex gap-1">
              <button
                type="button"
                onClick={() => setType('bug')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  type === 'bug'
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Bug className="w-4 h-4" />
                Bug Report
              </button>
              <button
                type="button"
                onClick={() => setType('feedback')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  type === 'feedback'
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Feedback
              </button>
            </div>

            {/* Description */}
            <div className="glass-light rounded-2xl p-4 border border-gray-200/50 shadow-sm">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                {type === 'bug' ? 'What went wrong?' : 'Your feedback'}
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  type === 'bug'
                    ? 'Describe the issue you encountered...'
                    : 'Share your thoughts, suggestions, or ideas...'
                }
                rows={4}
                maxLength={5000}
                className="w-full px-3 py-2.5 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none text-sm"
              />
              <div className="flex justify-end mt-1">
                <span className="text-xs text-gray-400">{description.length}/5000</span>
              </div>
            </div>

            {/* Screenshot upload */}
            <div className="glass-light rounded-2xl p-4 border border-gray-200/50 shadow-sm">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              {previewUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-gray-200">
                  <Image
                    src={previewUrl}
                    alt="Screenshot preview"
                    width={400}
                    height={300}
                    className="w-full h-auto max-h-48 object-contain"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-colors"
                  >
                    <X size={14} className="text-white" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-gray-400 hover:bg-gray-50/50 transition-colors"
                >
                  <Camera className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                  <p className="text-sm text-gray-500">Add Screenshot</p>
                  <p className="text-xs text-gray-400 mt-0.5">Optional</p>
                </button>
              )}

              {imageError && <p className="text-xs text-red-500 mt-2">{imageError.message}</p>}
            </div>

            {/* Diagnostic info checkbox */}
            <label className="flex items-center gap-3 glass-light rounded-xl p-3 border border-gray-200/50 cursor-pointer hover:bg-white/80 transition-colors">
              <input
                type="checkbox"
                checked={includeDiagnostics}
                onChange={(e) => setIncludeDiagnostics(e.target.checked)}
                className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-700">Include diagnostic info</span>
                <p className="text-xs text-gray-500 truncate">Browser, device, and page context</p>
              </div>
            </label>

            {/* Error message */}
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{errorMessage}</span>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={submitStatus === 'submitting' || !description.trim()}
              className="w-full py-3 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {submitStatus === 'submitting' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit'
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
