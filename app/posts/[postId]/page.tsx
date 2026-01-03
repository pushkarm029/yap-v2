import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/database';
import { PostDetailHeader, PostDetailView } from '@/components/posts';

interface PageProps {
  params: Promise<{ postId: string }>;
}

export default async function PostDetailPage({ params }: PageProps) {
  const { postId } = await params;
  const session = await auth();

  const post = await db.getPostByIdWithUpvotes(postId, session?.user?.id);

  if (!post) {
    notFound();
  }

  // Serialize the post for Client Component
  const serializedPost = {
    ...post,
    upvote_count: Number(post.upvote_count),
    comment_count: Number(post.comment_count),
    user_upvoted: Boolean(post.user_upvoted),
  };

  return (
    <>
      <PostDetailHeader />
      <div className="pt-20 lg:pt-16">
        <PostDetailView
          post={serializedPost}
          currentUserId={session?.user?.id}
          userAvatar={session?.user?.image}
        />
      </div>
    </>
  );
}
