'use client';

import { memo } from 'react';
import ContentCard from '../content/ContentCard';
import type { PostWithUserAndUpvotes, Comment } from '@/types';

/** Posts and comments share the same card display */
type PostCardData = PostWithUserAndUpvotes | Comment;

interface PostCardProps {
  post: PostCardData;
  /** Optional override for expiry display (e.g., show parent post's expiry for comments) */
  expiryTimestamp?: string;
}

/**
 * Memoized post card - only re-renders when post data changes
 */
const PostCard = memo(
  function PostCard({ post, expiryTimestamp }: PostCardProps) {
    return (
      <ContentCard
        id={post.id}
        user={{
          id: post.user_id,
          name: post.name || 'Unknown User',
          username: post.username || 'unknown',
          avatar: post.image || undefined,
        }}
        content={post.content}
        imageUrl={post.image_url || undefined}
        timestamp={post.created_at}
        expiryTimestamp={expiryTimestamp}
        upvoteCount={post.upvote_count || 0}
        commentCount={post.comment_count || 0}
        userUpvoted={post.user_upvoted || false}
        variant="feed"
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.post.id === nextProps.post.id &&
      prevProps.post.upvote_count === nextProps.post.upvote_count &&
      prevProps.post.comment_count === nextProps.post.comment_count &&
      prevProps.post.user_upvoted === nextProps.post.user_upvoted &&
      prevProps.expiryTimestamp === nextProps.expiryTimestamp
    );
  }
);

export default PostCard;
