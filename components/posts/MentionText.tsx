'use client';

import Link from 'next/link';

interface MentionTextProps {
  content: string;
}

export default function MentionText({ content }: MentionTextProps) {
  // Split by @mentions while preserving the mentions
  const parts = content.split(/(@\w+)/g);

  return (
    <p className="font-normal whitespace-pre-wrap break-words">
      {parts.map((part, index) => {
        if (part.startsWith('@')) {
          const username = part.slice(1);
          return (
            <Link
              key={index}
              href={`/${username}`}
              className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </Link>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </p>
  );
}
