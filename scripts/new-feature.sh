#!/bin/bash
# Create a new feature branch with isolated dev environment
# Usage: ./scripts/new-feature.sh <feature-name>

set -e

FEATURE_NAME=$1

if [ -z "$FEATURE_NAME" ]; then
  echo "Usage: ./scripts/new-feature.sh <feature-name>"
  echo "Example: ./scripts/new-feature.sh add-notifications"
  exit 1
fi

WORKTREE_PATH="../yap-$FEATURE_NAME"

echo "Creating worktree for feature: $FEATURE_NAME"

# Create worktree with new branch
git worktree add "$WORKTREE_PATH" -b "feature/$FEATURE_NAME"

cd "$WORKTREE_PATH"

# Set up environment
cp .env.example .env.local

# Assign unique port (3001-3999) for concurrent dev
PORT=$((3001 + RANDOM % 999))
echo "" >> .env.local
echo "# Unique port for this worktree" >> .env.local
echo "PORT=$PORT" >> .env.local

# Install dependencies
bun install

echo ""
echo "✓ Worktree created at: $WORKTREE_PATH"
echo "✓ Branch: feature/$FEATURE_NAME"
echo "✓ Dev server port: $PORT"
echo ""
echo "To start:"
echo "  cd $WORKTREE_PATH && bun run dev"
