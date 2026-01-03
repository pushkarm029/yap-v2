'use client';

import { useRef } from 'react';
import { Zap } from 'lucide-react';
import { useOptimisticUpvote } from '@/hooks';
import LightningBurst from '@/components/animations/LightningBurst';

interface UpvoteButtonProps {
  postId: string;
  initialUpvoted: boolean;
  initialCount: number;
  onError?: (message: string) => void;
}

export default function UpvoteButton({
  postId,
  initialUpvoted,
  initialCount,
  onError,
}: UpvoteButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { upvoted, count, votePower, animationTrigger, toggle, clearAnimation } =
    useOptimisticUpvote({
      postId,
      initialUpvoted,
      initialCount,
      onError,
    });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggle();
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleClick}
        className={`
          relative flex items-center gap-1 px-2.5 py-1.5 rounded-full transition-all min-h-[36px] cursor-pointer
          ${upvoted ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}
        `}
        title={upvoted ? 'Remove upvote' : 'Upvote post'}
      >
        <Zap size={14} className={upvoted ? 'fill-current' : ''} />
        <span className="text-xs font-medium">{count.toFixed(2)}</span>
      </button>

      <LightningBurst
        trigger={animationTrigger}
        power={votePower}
        anchorRef={buttonRef}
        onComplete={clearAnimation}
      />
    </>
  );
}
