# Yap.Network

Social media platform built with Next.js, TypeScript, and Turso.

## Setup

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run dev
```

## Tech Stack

- Next.js 15 + React 19
- TypeScript + Tailwind CSS
- Turso (SQLite)
- Cloudflare R2
- NextAuth.js (Twitter OAuth)
- Web Push API

## Environment Variables

```env
AUTH_SECRET=
AUTH_TWITTER_ID=
AUTH_TWITTER_SECRET=
NEXTAUTH_URL=

TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=

VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# Solana Integration
SOLANA_RPC_URL=           # RPC endpoint (defaults to devnet/mainnet public)
MERKLE_UPDATER_SECRET_KEY= # JSON array of keypair bytes for distribution
CRON_SECRET=               # Secret for authenticating cron requests
```

## Scripts

```bash
npm run dev         # Development
npm run build       # Build
npm run start       # Production
npm run lint        # ESLint
npm run db:migrate  # Migrations
```

## Features

- Posts & Comments
- Upvote system
- Daily action limit (8 total actions per day)
- Invite system
- Push notifications
- PWA support

## YAP Token Distribution

Users earn engagement points through posts/comments/upvotes. Points convert to YAP tokens via daily merkle distributions.

### How It Works

1. Users accumulate points through engagement
2. At distribution time: `user_yap = (user_points / total_points) × daily_pool`
3. Daily pool is rate-limited: `(elapsed_seconds × vault_balance) / seconds_per_year`
4. Users claim their YAP tokens on-chain with merkle proofs

### Running Distribution

**Manual (development):**

```bash
curl -X POST http://localhost:3000/api/cron/distribute \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Production (GitHub Actions):**
Distribution runs automatically at midnight UTC via GitHub Actions. See `.github/workflows/cron-distribute.yml`.

### Distribution Flow

1. Fetch all users with pending points and wallet addresses
2. Calculate each user's share of the rate-limited daily pool
3. Build merkle tree with cumulative amounts
4. Submit merkle root on-chain (transfers tokens from vault to pending_claims)
5. Store proofs in database for users to claim

## Notification System

Hybrid system combining real-time triggers with scheduled batch processing.

### Real-Time Notifications

Triggered immediately when events occur (no cron delay):

| Type                 | Trigger Event                                   | Location           |
| -------------------- | ----------------------------------------------- | ------------------ |
| `streak_milestone`   | User posts & hits 7/14/30/60/100/365 day streak | Post creation      |
| `points_milestone`   | Upvotes cross 100/500/1K/5K/10K threshold       | Upvote route       |
| `follower_milestone` | Followers cross 10/50/100/500/1K threshold      | Follow route       |
| `post_momentum`      | Post hits 10 upvotes within 6 hours             | Upvote route       |
| `daily_goal`         | User exhausts all daily actions                 | Post/upvote routes |

### Batch Notifications (Cron-Based)

Sent via GitHub Actions crons at fixed UTC times:

| Cron               | UTC Time  | Notifications                                                                     |
| ------------------ | --------- | --------------------------------------------------------------------------------- |
| `cron-distribute`  | 00:00     | distribution_complete, distribution_missed, distribution_nudge, actions_recharged |
| `cron-morning`     | 08:00     | engagement_nudge, claim_reminder                                                  |
| `cron-afternoon`   | 15:00     | expiring_popular                                                                  |
| `cron-evening`     | 18:00     | streak_broken                                                                     |
| `cron-maintenance` | 21:00     | wallet_connect, streak_warning (3h)                                               |
| `cron-urgent`      | 23:00     | streak_warning (1h)                                                               |
| `cron-weekly`      | Sun 10:00 | weekly_summary                                                                    |

### Features

- **Jitter Randomization**: Batch notifications shuffled and staggered (0-3s between sends) to feel less robotic
- **Rate Limiting**: Max 3 gamified notifications per day per user

### Notification Types

**Social (real-time):**

- `follow` - Someone followed you
- `upvote` - Someone upvoted your post
- `comment` - Someone commented on your post
- `reply` - Someone replied to your comment
- `mention` - Someone mentioned you in a post

**Gamified (batch + real-time):**

- `streak_warning` - Streak about to expire (3h/1h warnings)
- `streak_broken` - Your streak ended
- `streak_milestone` - Hit a streak milestone
- `points_milestone` - Hit an upvote milestone
- `follower_milestone` - Hit a follower milestone
- `daily_goal` - Completed all daily actions
- `post_momentum` - Post is trending
- `claim_reminder` - Unclaimed YAP tokens
- `engagement_nudge` - Inactive for 2+ days
- `wallet_connect` - Connect wallet before distribution
- `expiring_popular` - Popular post expiring soon
- `weekly_summary` - Weekly stats recap
- `actions_recharged` - Daily actions reset
- `distribution_complete` - YAP distribution received
- `distribution_missed` - Missed distribution (no wallet)
- `distribution_nudge` - Encourage posting for next distribution

## Deploy

Vercel recommended. Configure environment variables in project settings.

**Required GitHub Secrets for Crons:**

- `CRON_SECRET` - Secret for authenticating cron requests
- `PRODUCTION_URL` - Production URL (e.g., `https://yap.network`)
