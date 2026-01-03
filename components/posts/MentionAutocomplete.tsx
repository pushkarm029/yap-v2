'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Avatar from '@/components/ui/Avatar';
import { useUserSearch, type UserSearchResult } from '@/hooks/queries';

interface MentionAutocompleteProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onSelect: (username: string) => void;
}

export default function MentionAutocomplete({ textareaRef, onSelect }: MentionAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce the query to avoid excessive API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedQuery(mentionQuery), 150);
    return () => clearTimeout(timeoutId);
  }, [mentionQuery]);

  const { data } = useUserSearch(debouncedQuery);
  const users = useMemo<UserSearchResult[]>(() => data?.users || [], [data?.users]);

  // Reset selected index when users change
  useEffect(() => {
    setSelectedIndex(0);
  }, [users.length]);

  // Detect @ mentions and extract query
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleInput = () => {
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = textarea.value.slice(0, cursorPos);

      // Find the last @ symbol before cursor
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');

      if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);

        // Check if there's a space after @ (which means mention is complete)
        if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
          setMentionQuery(textAfterAt);
          setIsVisible(true);
          return;
        }
      }

      setIsVisible(false);
      setMentionQuery('');
    };

    textarea.addEventListener('input', handleInput);
    textarea.addEventListener('click', handleInput);
    textarea.addEventListener('keyup', handleInput);

    return () => {
      textarea.removeEventListener('input', handleInput);
      textarea.removeEventListener('click', handleInput);
      textarea.removeEventListener('keyup', handleInput);
    };
  }, [textareaRef]);

  const handleSelectUser = useCallback(
    (user: UserSearchResult) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = textarea.value.slice(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');

      if (lastAtIndex !== -1) {
        const textBefore = textarea.value.slice(0, lastAtIndex + 1);
        const textAfter = textarea.value.slice(cursorPos);
        const newValue = textBefore + user.username + ' ' + textAfter;

        onSelect(newValue);

        // Set cursor position after the inserted username
        setTimeout(() => {
          const newCursorPos = lastAtIndex + 1 + user.username.length + 1;
          textarea.focus();
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
      }

      setIsVisible(false);
      setMentionQuery('');
    },
    [textareaRef, onSelect]
  );

  // Handle keyboard navigation
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || !isVisible || users.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % users.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + users.length) % users.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (users.length > 0) {
          e.preventDefault();
          handleSelectUser(users[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsVisible(false);
      }
    };

    textarea.addEventListener('keydown', handleKeyDown);
    return () => textarea.removeEventListener('keydown', handleKeyDown);
  }, [textareaRef, isVisible, users, selectedIndex, handleSelectUser]);

  if (!isVisible || users.length === 0) return null;

  return (
    <div
      ref={dropdownRef}
      className="fixed bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50"
      style={{
        width: '280px',
        bottom: 'auto',
      }}
    >
      {users.map((user, index) => (
        <div
          key={user.id}
          onClick={() => handleSelectUser(user)}
          onMouseEnter={() => setSelectedIndex(index)}
          className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
            index === selectedIndex ? 'bg-gray-100' : 'hover:bg-gray-50'
          }`}
        >
          <Avatar src={user.image || undefined} alt={user.name} size="small" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{user.name}</div>
            <div className="text-xs text-gray-500 truncate">@{user.username}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
