// Posts database operations - barrel export
// Re-exports all post-related functions from domain-specific modules

// Core operations
export { createPost, getPostByIdWithUpvotes, getPostThread } from './core';

// Feed queries
export {
  getAllPostsWithUpvotes,
  getPaginatedPosts,
  getPostsByUserIdWithUpvotes,
  getLikedPostsByUserIdWithUpvotes,
} from './feed';

// Import for aggregate object
import * as core from './core';
import * as feed from './feed';

// Aggregate export for backwards compatibility with db.posts.* pattern
export const posts = {
  // Core operations
  createPost: core.createPost,
  getPostByIdWithUpvotes: core.getPostByIdWithUpvotes,
  getPostThread: core.getPostThread,
  // Feed queries
  getAllPostsWithUpvotes: feed.getAllPostsWithUpvotes,
  getPaginatedPosts: feed.getPaginatedPosts,
  getPostsByUserIdWithUpvotes: feed.getPostsByUserIdWithUpvotes,
  getLikedPostsByUserIdWithUpvotes: feed.getLikedPostsByUserIdWithUpvotes,
};
