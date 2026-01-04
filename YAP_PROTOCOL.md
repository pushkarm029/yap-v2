# YAP Protocol Vision

> Yap is not just an app. It's a decentralized social protocol layer for Solana.

## Executive Summary

Yap is a **fat protocol** architecture where the value accrues at the protocol layer, not individual applications. The on-chain voting and rewards system is a permissionless foundation that any application can build upon. Yap.Network (our private app) is the first client, but the real moat is becoming the social/rewards layer for the Solana ecosystem.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                    YAP PROTOCOL (On-Chain, Permissionless)                  │
│                                                                             │
│   • Any wallet holding YAP tokens can participate                           │
│   • Vote weight = proportional to YAP holdings                              │
│   • Up to 8 votes per wallet per day                                        │
│   • Daily rewards pool distributed proportionally                           │
│   • Fully transparent, auditable on Solana                                  │
│   • Open API for third-party integration                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ▲
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
┌───────────────────▼───────────────┐ ┌────────────────▼────────────────────┐
│                                   │ │                                     │
│      YAP.NETWORK (Private App)    │ │     THIRD-PARTY APPS (Future)       │
│                                   │ │                                     │
│   • Invite-only access            │ │   • Staking/Yield Apps              │
│   • 8 total daily actions         │ │   • Content Aggregators             │
│     (posts + comments + votes)    │ │   • Automated Voting Bots           │
│   • One vote per post             │ │   • Social Trading Platforms        │
│   • Curated community UX          │ │   • Creator Monetization Tools      │
│   • Quality-focused restrictions  │ │   • DeFi Integrations               │
│                                   │ │                                     │
└───────────────────────────────────┘ └─────────────────────────────────────┘
```

---

## Two-Tier System

### Tier 1: Protocol Layer (On-Chain)

The protocol layer is **permissionless**. Anyone with a Solana wallet holding YAP tokens can:

1. **Create posts** - Content anchored on-chain
2. **Vote on posts** - Up to 8 votes per day
3. **Earn rewards** - Proportional to votes received, weighted by voter stake

**Key principle**: No gatekeeping at the protocol level. The economics self-regulate.

### Tier 2: Application Layer (Off-Chain Restrictions)

Individual apps built on the protocol can impose their own rules:

| Rule             | Protocol             | Yap.Network App         |
| ---------------- | -------------------- | ----------------------- |
| Access           | Anyone with YAP      | Invite-only             |
| Daily votes      | 8 per wallet         | Part of 8 total actions |
| Same-post voting | Allowed (up to 8x)   | One vote per post       |
| Self-voting      | Allowed              | Discouraged by UX       |
| Purpose          | Permissionless infra | Quality community       |

**Why restrictions at app level?**

> "The off-chain limitations are implemented for social engineering purposes - to build the best possible initial early community of power users who will work for their bags, and to concentrate the rewards to grow Yap."

---

## Economic Model

### Vote Weight = Token Holdings

There is no artificial "voting power" formula. Your vote weight IS your stake:

```
vote_weight = yap_tokens_in_wallet
```

**Examples:**

| Holder | YAP Balance | Vote Weight | % of 10M Total |
| ------ | ----------- | ----------- | -------------- |
| Whale  | 1,000,000   | 1,000,000   | 10%            |
| Mid    | 100,000     | 100,000     | 1%             |
| Small  | 10,000      | 10,000      | 0.1%           |
| Empty  | 0           | 0           | 0%             |

### Transaction Economics (User Pays)

> **📝 Added Jan 4, 2026**: All protocol participants pay their own transaction fees.

**The Pure Model:**

| Action | Solana Cost | Daily Max (8 actions) |
| ------ | ----------- | --------------------- |
| Vote   | ~$0.001     | ~$0.008               |
| Post   | ~$0.001     | ~$0.008               |
| Claim  | ~$0.001     | once                  |

**Monthly cost for active user: ~$0.25-0.50**

This is negligible for anyone with meaningful YAP stake.

**Why User Pays:**

```
┌─────────────────────────────────────────────────────────────┐
│                    THE FILTER EFFECT                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  To participate in YAP you need:                            │
│  1. YAP tokens (stake requirement)                          │
│  2. SOL for gas (transaction fees)                          │
│                                                             │
│  If you have YAP, you almost certainly have SOL             │
│  (you bought YAP on a DEX, which requires SOL)              │
│                                                             │
│  This isn't onboarding crypto-naive users.                  │
│  This is a protocol for people already in the ecosystem.    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Benefits:**

1. **Natural Sybil Defense** - Creating fake accounts costs SOL per action
2. **Zero Protocol Operational Cost** - No relayer, no gas tank, no subsidies
3. **True Permissionlessness** - No dependency on anyone sponsoring fees
4. **Self-Sustaining** - Protocol works even if Yap.Network (the app) disappears

**Fee Spike Tolerance:**

During Solana congestion, fees may spike 10-100x temporarily. At $0.10/vote, 8 daily votes = $0.80. Still acceptable for any meaningful stakeholder. The protocol accepts this as a feature, not a bug - it naturally throttles activity during network stress.

**Future: Gasless Sponsorship (Optional)**

The protocol can later support gasless transactions via fee sponsorship:

```
┌─────────────────────────────────────────────────────────────┐
│                 GASLESS UPGRADE PATH                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Current: User pays SOL for each transaction                │
│                                                             │
│  Future Option: App sponsors gas                            │
│  • User signs transaction                                   │
│  • Relayer submits and pays SOL                             │
│  • App funds relayer from treasury/revenue                  │
│                                                             │
│  Benefits:                                                  │
│  • Zero-friction UX (like Lens)                             │
│  • Lower barrier for new users                              │
│  • App controls cost (can add limits)                       │
│                                                             │
│  Tradeoffs:                                                 │
│  • Operational cost for app                                 │
│  • Centralization (relayer dependency)                      │
│  • Weaker Sybil defense (no gas cost per action)            │
│                                                             │
│  Implementation: Solana's Durable Nonces + Relayer service  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

This is an **app-level choice**, not a protocol change. The protocol always accepts valid signed transactions regardless of who pays gas. Individual apps (like Yap.Network) can choose to sponsor fees for their users.

---

### Spam Prevention Through Economics

**Q: What about spam from random wallets?**

A: Spam is only a problem when it's costless. At the protocol level:

- **0 YAP wallet spams 1000 votes** → 0 weight × 1000 = 0 impact
- **YAP holder votes** → Has stake, legitimate participant
- **Bot army with no YAP** → Zero cumulative weight, ignored by economics

The protocol doesn't need to "prevent" spam. It makes spam economically irrelevant.

### Double Accounting Prevention

**The Problem**: With transferable tokens, the same YAP could be used to vote multiple times:

```
Without protection:
─────────────────────────────────────────────────────────────────
10:00 AM    User A has 1M YAP, votes for Post X (weight: 1M)
11:00 AM    User A transfers 1M YAP to User B
12:00 PM    User B votes for Post Y (weight: 1M)
─────────────────────────────────────────────────────────────────
Result:     2M total vote weight used, but only 1M YAP exists ✗
```

---

> **📝 UPDATE (Jan 3, 2026 10:30 PM)**: After further discussion with Knockit, the preferred solution is **Claim-Time Validation** - simpler than snapshot-based and requires no additional infrastructure.

---

#### Solution: Claim-Time Validation (PREFERRED)

From Knockit:

> "To solve the double spend the snapshot only makes a valid reward claim if the tokens are still in the address"

**How it works:**

```
┌─────────────────────────────────────────────────────────────────┐
│                 CLAIM-TIME VALIDATION                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. VOTE                                                        │
│     User submits vote transaction                               │
│     Weight = YAP balance at vote time (embedded in tx)          │
│                                                                 │
│  2. DISTRIBUTION                                                │
│     For each vote, check: does voter still have tokens?         │
│     • YES → vote counts with embedded weight                    │
│     • NO  → vote invalidated (doesn't count)                    │
│                                                                 │
│  3. CLAIM                                                       │
│     Rewards only claimable if tokens still in wallet            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Why it works:**

```
With claim-time validation:
─────────────────────────────────────────────────────────────────
10:00 AM    User A votes (weight = 1M, embedded in tx)
11:00 AM    User A transfers 1M YAP to User B
12:00 PM    User B votes (weight = 1M, embedded in tx)

Distribution time (checks current balances):
  User A: 0 YAP in wallet → vote INVALIDATED
  User B: 1M YAP in wallet → vote COUNTS
─────────────────────────────────────────────────────────────────
Result:     Only User B's vote counts (1M weight)
            Total: 1M weight for 1M tokens ✓
```

Gaming is unprofitable. If you transfer tokens after voting, your votes don't count.

**Implementation:**

```typescript
// At distribution, validate each vote
async function processVotes(votes: Vote[]): Promise<ValidVote[]> {
  const validVotes: ValidVote[] = [];

  for (const vote of votes) {
    // Check if voter still has tokens
    const currentBalance = await getTokenBalance(vote.voter);

    if (currentBalance > 0) {
      // Vote counts - use embedded weight or current balance (whichever is lower)
      validVotes.push({
        ...vote,
        weight: Math.min(vote.embeddedWeight, currentBalance),
      });
    }
    // If balance is 0, vote is silently discarded
  }

  return validVotes;
}
```

**Comparison of approaches:**

| Approach                  | Complexity | Infrastructure                 | UX Impact        |
| ------------------------- | ---------- | ------------------------------ | ---------------- |
| Staking contract          | High       | New contract, cooldowns        | Lock-up required |
| Snapshot-based            | Medium     | Historical balance queries     | None             |
| **Claim-time validation** | **Low**    | **Just current balance check** | **None** ✓       |

Claim-time validation is the simplest approach - no snapshot infrastructure, no staking contract. Just check current balance at distribution time.

---

#### Alternative: Snapshot-Based Weighting

_For reference, this was the previously discussed approach:_

```
┌─────────────────────────────────────────────────────────────────┐
│                   SNAPSHOT-BASED PROTOCOL                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  00:00 UTC   SNAPSHOT: Record all YAP wallet balances           │
│  00:00-23:59 VOTING: All votes use snapshot balance as weight   │
│  24:00 UTC   DISTRIBUTION: Process with snapshot weights        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

This approach locks weight at snapshot time rather than checking at distribution. Both prevent double accounting, but claim-time validation is simpler to implement.

---

### The Staking App Use Case

This is explicitly allowed and even encouraged:

> "Someone could build a staking app that makes one post and votes it 7 times per day so all rewards flow back to the user."

**How it works:**

1. User deposits YAP into staking app
2. App creates daily post on their behalf
3. App votes for the post 7 times (within 8/day limit)
4. Rewards proportional to stake flow back to user
5. Effectively "yield farming via voting"

**Why allow this?**

- User has skin in the game (YAP locked in app)
- Vote weight proportional to stake
- No unfair advantage - just automated participation
- Enables passive income for holders

---

## Rewards Distribution

> **📝 Updated Jan 4, 2026 12:15 AM**: Clarified after discussion with Knockit - Direct Distribution model, 24-hour cycles, permissionless forever-claimable rewards.

### Protocol vs App Layer

| Aspect         | Protocol Level                | App Level (Yap.Network) |
| -------------- | ----------------------------- | ----------------------- |
| Content expiry | **Evergreen** (never expire)  | 7-day sunset            |
| Payout cycle   | **24 hours**                  | Same                    |
| Vote limit     | **First 8 by timestamp**      | Part of 8 total actions |
| Claim expiry   | **Never** (claimable forever) | Same                    |

### Daily Pool Allocation

```
Daily Pool = Annual Inflation / 365

For each post:
  post_rewards = (sum of weighted votes for post) / (sum of all weighted votes) × Daily Pool

Author receives 100% of post rewards (no curator split at protocol level)
```

### Distribution Flow (Direct Distribution)

```
┌──────────────────────────────────────────────────────────────────┐
│                     DAILY DISTRIBUTION CYCLE                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  THROUGHOUT DAY:                                                 │
│  • Users post (content hash on-chain)                            │
│  • Users vote (vote tx on-chain, weight embedded)                │
│                                                                  │
│  2:00 AM UTC - SNAPSHOT:                                         │
│  • Read all vote transactions from past 24 hours                 │
│  • For each vote, check: does voter still have tokens?           │
│  • Filter: first 8 votes per wallet (by timestamp)               │
│  • Invalidate votes from wallets with 0 balance                  │
│                                                                  │
│  DISTRIBUTION (Keeper runs after snapshot):                      │
│  • Calculate rewards per author from valid votes                 │
│  • Update on-chain: author.claimableBalance += reward            │
│  • No expiry - balances accumulate forever                       │
│                                                                  │
│  CLAIM (User-initiated, anytime):                                │
│  • Author calls claim() on distribution contract                 │
│  • Receives all accumulated claimable tokens                     │
│  • Permissionless, no time limit                                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Why Direct Distribution (Not Merkle)

| Approach                | Pros                                | Cons                                    |
| ----------------------- | ----------------------------------- | --------------------------------------- |
| Merkle Claims           | Gas efficient                       | Requires off-chain infra, proofs expire |
| NFT Receipts            | Fully on-chain                      | More transactions, complex              |
| **Direct Distribution** | **Simple, permissionless, forever** | **Keeper infrastructure needed**        |

Direct Distribution was chosen because:

- Rewards are **claimable forever** (like DeFi lending receipts)
- Users can **batch claim** multiple days at once
- No proof management or expiry concerns
- Simple contract logic: just update a balance, let users withdraw

---

## Technical Implementation

### On-Chain Components

#### 1. Vote Transaction Format

```typescript
// Vote as a Solana transaction with memo
{
  programId: MEMO_PROGRAM_ID,
  data: {
    action: "yap_vote",
    version: 1,
    postId: "abc123",           // Content identifier
    weight: 1000000,            // Voter's YAP balance at tx time
    timestamp: 1704067200       // Unix timestamp
  }
}
```

#### 2. Reading Votes (Distribution)

```typescript
// Query all vote transactions for the period
async function getVotesForPeriod(startTime: number, endTime: number) {
  // Option A: Direct RPC query
  const signatures = await connection.getSignaturesForAddress(VOTE_PROGRAM_ADDRESS, {
    minContextSlot: startSlot,
  });

  // Option B: Indexer (Helius, Triton) for scale
  const votes = await indexer.getTransactions({
    programId: VOTE_PROGRAM_ID,
    startTime,
    endTime,
  });

  return votes;
}
```

#### 3. Vote Validation Rules

```typescript
function processVotes(rawVotes: Vote[]): ValidVote[] {
  // Group by voter
  const byVoter = groupBy(rawVotes, (v) => v.voter);

  // For each voter, take first 8 chronologically
  const validVotes = Object.values(byVoter).flatMap((votes) =>
    votes.sort((a, b) => a.timestamp - b.timestamp).slice(0, 8)
  );

  return validVotes;
}
```

### Off-Chain Components (Yap.Network App)

#### Additional Restrictions

```typescript
// App-level validations (not protocol level)
async function canUserVote(userId: string, postId: string): Promise<boolean> {
  // 1. User must be registered (invite-only)
  if (!(await isRegisteredUser(userId))) return false;

  // 2. Check total daily actions (posts + comments + votes)
  const todayActions = await getDailyActionCount(userId);
  if (todayActions >= 8) return false;

  // 3. One vote per post in our app
  if (await hasVotedPost(userId, postId)) return false;

  return true;
}
```

---

## Indexer Architecture (True DApp Pattern)

> **📝 Added Jan 4, 2026**: Documenting why events + indexer is the standard decentralized application pattern.

### Why Indexers?

Raw Solana RPC cannot efficiently query historical data:

```
You want: "All votes for post QmXyz in last 24 hours"

Raw RPC can only:
- getTransaction(signature)     ← Need exact tx hash
- getSignaturesForAddress()     ← Returns ALL txs, no filtering

You'd have to fetch millions of transactions and filter locally.
This doesn't scale.
```

**Solution: Indexers watch the blockchain and build queryable databases.**

### The Standard DApp Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      SOLANA BLOCKCHAIN                           │
│  Transactions confirmed, events emitted                          │
│  (Source of truth - immutable, verifiable)                       │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ ~500ms (Geyser plugin)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     HELIUS INDEXER                               │
│                                                                 │
│  • Streams all transactions in real-time                        │
│  • Parses events using program IDL                              │
│  • Stores in queryable database                                 │
│  • Provides REST API + webhooks                                 │
│                                                                 │
│  (Convenience layer - replaceable, not trusted)                 │
└─────────────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
    ┌─────────┐      ┌──────────┐      ┌──────────┐
    │   APP   │      │  KEEPER  │      │ ANALYTICS│
    │ Show UI │      │ Daily    │      │ Dashboards│
    │         │      │ distro   │      │          │
    └─────────┘      └──────────┘      └──────────┘
```

### Who Uses This Pattern?

| Protocol       | Indexer | What They Index           |
| -------------- | ------- | ------------------------- |
| **Jupiter**    | Helius  | Swaps, routes, prices     |
| **Magic Eden** | Helius  | NFT sales, listings, bids |
| **Tensor**     | Helius  | NFT trades, collections   |
| **Marinade**   | Triton  | Stake transactions        |

**Every major Solana protocol uses indexers.** This is the standard, not an exception.

### Why This Is Still a "True DApp"

| Aspect               | Phase 1 (Current)      | V2 (Events + Indexer)   |
| -------------------- | ---------------------- | ----------------------- |
| Source of truth      | Database (centralized) | **Blockchain** ✓        |
| Verifiable           | Trust our server       | **Anyone can verify** ✓ |
| Censorship resistant | No                     | **Yes** ✓               |
| Indexer dependency   | N/A                    | Replaceable ✓           |
| Survives if Yap dies | No                     | **Yes** ✓               |

**The indexer is a convenience layer, not a trust layer.**

```
┌─────────────────────────────────────────────────────────────┐
│              DECENTRALIZATION SPECTRUM                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Phase 1          V2 (Events)           Pure PDAs           │
│  ────────         ───────────           ─────────           │
│  Centralized      Decentralized Data    Fully On-Chain      │
│                                                             │
│  Database         Blockchain            Blockchain          │
│  Your server      + Indexer layer       + Direct RPC        │
│                                                             │
│  ❌ Not DApp      ✓ True DApp           ✓✓ Maximum DApp     │
│                   (standard pattern)    (150x more expensive)│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

V2 is the **industry-standard decentralization level** - same as Jupiter, Uniswap, OpenSea.

### Distribution Keeper Flow (Using Indexer)

```typescript
// Daily distribution job (2 AM UTC)
async function distributeRewards() {
  // 1. Query all votes from last 24 hours via Helius
  const votes = await helius.getParsedTransactions({
    programId: YAP_VOTE_PROGRAM,
    startTime: yesterdayUTC,
    endTime: todayUTC,
    eventType: 'VoteCreated',
  });

  // 2. Helius returns parsed, structured data:
  // [
  //   { voter: "7xKX...", targetHash: "QmXyz", weight: 100000, ts: ... },
  //   { voter: "9aBC...", targetHash: "QmXyz", weight: 50000, ts: ... },
  // ]

  // 3. Validate: first 8 per wallet, check current balances
  const validVotes = await validateVotes(votes);

  // 4. Calculate rewards per author
  const rewards = calculateRewards(validVotes);

  // 5. Submit distribution transaction on-chain
  await distributeOnChain(rewards);
}
```

### Indexer Redundancy

If Helius goes down:

1. Use Triton, Shyft, or other indexer
2. Run your own Geyser plugin
3. Query raw RPC (slow but works)

**The blockchain is the source of truth.** Indexers just make it fast to query.

---

## Third-Party Integration

### DApp API Vision

Any application can build on the Yap protocol by:

1. **Reading vote transactions** - Public on Solana
2. **Submitting votes** - Any wallet can send vote tx
3. **Querying rewards** - Merkle proofs are public
4. **Building custom UX** - Different rules, same protocol

### Example: Staking App Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      STAKING APP EXAMPLE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User deposits 100,000 YAP                                      │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────┐                        │
│  │      STAKING APP CONTRACT           │                        │
│  │                                     │                        │
│  │  • Holds user YAP                   │                        │
│  │  • Creates daily post               │                        │
│  │  • Votes 7x on own post             │                        │
│  │  • Claims rewards                   │                        │
│  │  • Distributes to stakers           │                        │
│  │                                     │                        │
│  └─────────────────────────────────────┘                        │
│         │                                                       │
│         ▼                                                       │
│  User receives proportional rewards (passive yield)             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Example: Content Aggregator

```
┌─────────────────────────────────────────────────────────────────┐
│                    AGGREGATOR APP EXAMPLE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  • Curates best content from Yap protocol                       │
│  • Different UI/UX than Yap.Network                             │
│  • May have different voting rules                              │
│  • Same underlying rewards/economics                            │
│  • Adds value through curation, not fragmentation               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phased Roadmap

### Phase 1: Private Launch (Current)

**Architecture**: Off-chain voting, on-chain distribution

```
User → API → Database → Cron → Merkle Tree → Chain → Claim
```

**Features**:

- Invite-only access
- 8 daily actions (posts + comments + votes)
- Curated community experience
- Fast, free voting (good UX)

**Purpose**: Build initial power user community, iterate on product

### Phase 2: On-Chain Voting Layer

**Architecture**: On-chain voting, on-chain distribution

```
User → Solana Vote Tx → Indexer → Distribution → Merkle → Claim
```

**Features**:

- Permissionless voting at protocol level
- Session keys for seamless UX (Jupiter-style)
- Any wallet with YAP can participate
- Transparent, auditable votes

**Purpose**: Establish the protocol foundation

### Phase 3: DApp API / Third-Party Apps

**Architecture**: Open protocol, multiple clients

```
                    ┌─── Yap.Network
                    │
Protocol Layer ─────┼─── Staking App
                    │
                    └─── Third-Party Apps
```

**Features**:

- Public API documentation
- Developer tools and SDKs
- Reference implementations
- Ecosystem grants/incentives

**Purpose**: Network effects, ecosystem growth

### Phase 4: On-Chain Rule Enforcement (Future)

> **📝 Added Jan 4, 2026**: Inspired by Lens Protocol's Rules system.

**Current State**: Rules enforced at app layer

```
User → App validates (8 actions?) → Submit tx → Chain accepts anything
```

**Future State**: Rules enforced at protocol layer

```
User → Submit tx → Contract validates (8 actions?) → Accept/Reject
```

**What This Enables:**

| Rule                  | Current (App-Layer)               | Future (On-Chain)               |
| --------------------- | --------------------------------- | ------------------------------- |
| 8 votes/day limit     | Backend check, bypassable via RPC | Smart contract rejects 9th vote |
| Minimum stake to vote | Backend check                     | Contract checks balance         |
| Vote weight cap       | Backend calculation               | Contract enforces max weight    |
| Cooldown periods      | Database timestamp                | On-chain block height check     |

**Why This Matters:**

```
┌─────────────────────────────────────────────────────────────┐
│              ON-CHAIN RULE ENFORCEMENT                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  App-layer enforcement:                                     │
│  • Bypassable via direct RPC calls                          │
│  • "Trust us" security model                                │
│  • Different apps can have different rules                  │
│                                                             │
│  On-chain enforcement:                                      │
│  • Unhackable (code is law)                                 │
│  • Trustless verification                                   │
│  • Protocol-level guarantees                                │
│  • All apps share same base rules                           │
│                                                             │
│  Tradeoff: Less flexibility, more rigidity                  │
│  But: Core rules (like 8/day limit) should be rigid         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Implementation (Solana Program):**

```rust
// Pseudo-code for on-chain vote validation
pub fn process_vote(ctx: Context<Vote>, post_hash: [u8; 32]) -> Result<()> {
    let voter = &ctx.accounts.voter;
    let vote_counter = &mut ctx.accounts.vote_counter;

    // Check: Is this a new day?
    let current_day = Clock::get()?.unix_timestamp / 86400;
    if vote_counter.last_day != current_day {
        vote_counter.count = 0;
        vote_counter.last_day = current_day;
    }

    // Enforce: 8 votes per day max
    require!(vote_counter.count < 8, ErrorCode::DailyLimitReached);

    // Check: Does voter have YAP tokens?
    let yap_balance = get_token_balance(voter)?;
    require!(yap_balance > 0, ErrorCode::NoStake);

    // Record vote with embedded weight
    emit!(VoteEvent {
        voter: voter.key(),
        post_hash,
        weight: yap_balance,
        timestamp: Clock::get()?.unix_timestamp,
    });

    vote_counter.count += 1;
    Ok(())
}
```

**Phased Rollout:**

1. **Phase 4a**: Deploy read-only rule contract (validates but doesn't enforce)
2. **Phase 4b**: Shadow mode (logs violations, doesn't block)
3. **Phase 4c**: Enforcement mode (contract rejects invalid transactions)

This preserves the current "protocol accepts everything, app filters" model while building toward trustless enforcement.

---

## Key Design Principles

### 1. Protocol First, App Second

The protocol must work independently of any specific app. Our app is one implementation, not THE implementation.

### 2. Economic Security, Not Access Control

Spam and abuse are handled through economics (stake = weight), not gatekeeping (whitelists, rate limits). At the protocol level, everyone can participate; the economics ensure fairness.

### 3. Transparency Over Trust

Votes on-chain mean anyone can verify. No "trust our backend" required. This is essential for third-party apps to build with confidence.

### 4. Composability

The protocol should be a building block. Staking apps, aggregators, trading tools - all should be able to compose with Yap's social layer.

### 5. Curated Apps on Open Protocol

Individual apps (like Yap.Network) can impose restrictions for UX/community purposes. These are app-level choices, not protocol-level constraints.

---

## Explicit Design Decisions

> **📝 Added Jan 4, 2026**: Documenting key design choices that prioritize simplicity over marginal optimization.

### What YAP Protocol Does NOT Have

| Feature                 | Status      | Rationale                                                                                                        |
| ----------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------- |
| **Diminishing Returns** | ❌ Not used | Voting 8 times on same author = 8x weight. Simpler math, no interaction tracking needed. May revisit if abused.  |
| **Vesting/Lockups**     | ❌ Not used | Rewards are instantly claimable. No unlock schedules. Claim-time validation already prevents gaming.             |
| **Downvotes**           | ❌ Never    | Protocol is positive-sum only. No negative actions. App layer handles content curation via filtering, not votes. |
| **Fee Sponsorship**     | ❌ Not used | Users pay their own gas. No relayers, no subsidies. Self-sustaining protocol.                                    |
| **Vote Weight Decay**   | ❌ Not used | No penalty for voting frequently. 8 votes = 8 votes.                                                             |
| **Curator Rewards**     | ❌ Not used | 100% to author. No split. Simpler economics.                                                                     |

### Design Philosophy: The Simplicity Stack

```
┌─────────────────────────────────────────────────────────────┐
│              YAP PROTOCOL SIMPLICITY STACK                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ❌ No diminishing returns  →  Simpler vote math            │
│  ❌ No vesting              →  No lockup logic              │
│  ❌ No downvotes            →  No negative sum dynamics     │
│  ❌ No fee sponsorship      →  No relayer infrastructure    │
│  ❌ No curator split        →  Simpler reward distribution  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ✓ Stake = weight           →  One number                   │
│  ✓ User pays gas            →  Self-sustaining              │
│  ✓ Instant claims           →  Best UX                      │
│  ✓ Claim-time validation    →  Minimal infrastructure       │
│                                                             │
│  Result: Minimum viable social layer                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Comparison to Hive

| Feature          | Hive                      | YAP Protocol                  |
| ---------------- | ------------------------- | ----------------------------- |
| Transaction fees | Zero (Resource Credits)   | User pays SOL                 |
| Vote decay       | Yes (diminishing returns) | No                            |
| Reward vesting   | Yes (13-week power down)  | No (instant)                  |
| Downvotes        | Yes                       | No                            |
| Curator rewards  | Yes (50%)                 | No (100% to author)           |
| Inflation source | Native blockchain         | Fixed token supply            |
| Content storage  | On-chain                  | Off-chain (IPFS/Arweave hash) |

### Comparison to Lens

> **📝 Added Jan 4, 2026**: Lens Protocol research insights.

| Feature          | Lens Protocol                | YAP Protocol                   |
| ---------------- | ---------------------------- | ------------------------------ |
| Blockchain       | ZKsync (Ethereum L2)         | Solana                         |
| Transaction fees | GHO stablecoin (~$0.01-0.05) | SOL (~$0.001)                  |
| Fee sponsorship  | Native (apps can sponsor)    | Future option (not default)    |
| Reward mechanism | None built-in (collect fees) | Daily pool distribution        |
| Rule enforcement | On-chain (Rules contracts)   | App-layer now, on-chain future |
| Content storage  | Grove nodes (deletable)      | IPFS/Arweave (permanent)       |
| Onboarding       | Email/phone (Web2-like)      | Wallet-only (crypto-native)    |
| Account model    | Profile NFTs                 | Wallet = identity              |

**What YAP Borrows from Lens:**

| Lens Feature                          | YAP Adoption               | Status |
| ------------------------------------- | -------------------------- | ------ |
| On-chain rule enforcement             | Phase 4 roadmap            | Future |
| Gasless sponsorship                   | Optional app-layer feature | Future |
| Modular primitives (POST, VOTE, etc.) | Core protocol design       | Now    |

**What YAP Intentionally Differs On:**

| Lens Approach             | YAP Approach             | Rationale                  |
| ------------------------- | ------------------------ | -------------------------- |
| No built-in rewards       | Daily reward pool        | Core value prop is earning |
| Collect = monetization    | Vote = reward allocation | Social signal, not payment |
| Deletable content (Grove) | Permanent hashes         | On-chain = forever         |
| Profile NFTs              | Wallet = identity        | Simpler, no NFT overhead   |

YAP intentionally diverges from Hive's complexity. The goal is the **simplest efficient social layer**, not the most feature-complete.

### Why No Downvotes (Ever)

Downvotes introduce:

1. **Negative sum dynamics** - Users can destroy value, not just allocate it
2. **Brigading attacks** - Coordinated downvote campaigns
3. **Chilling effects** - Users avoid controversial content
4. **Complex game theory** - Downvote wars, revenge cycles

YAP's solution: **App-layer curation, not protocol-level negation.**

The app can:

- Hide content based on reports
- Deprioritize low-quality posts
- Shadowban abusive users
- Filter by community standards

But the protocol only records positive actions. Content can earn rewards; it cannot be punished.

---

## FAQ

### Why allow self-voting?

At the protocol level, self-voting is economically equivalent to holding tokens. If you self-vote with 1M YAP, you're allocating rewards based on your 1M YAP stake - which you could have done by voting for anything. The protocol doesn't care; the economics balance.

### What stops vote buying?

Nothing at the protocol level - and that's intentional. Vote buying means paying for influence, which requires capital. Capital = stake = you're a participant. The protocol is designed to make all forms of "buying influence" equivalent to holding tokens.

### How do new users participate with 0 YAP?

At the protocol level: They can vote, but with 0 weight. They earn by creating content that YAP holders vote for.

At the app level (Yap.Network): They're invited, they create quality content, they earn YAP, they gain weight over time. The app's restrictions help new users bootstrap.

### What if one entity accumulates majority stake?

Protocol-level concern. Same as any token-weighted system. Mitigations include:

- Curation rewards incentivizing discovery of good content
- Diverse content creation (can't vote for yourself indefinitely)
- Community governance evolution over time

### Why not fully on-chain posts too?

Storage costs. Post content can be off-chain (IPFS, Arweave, or centralized) with on-chain anchors (hashes). Votes are small; content is large. Pragmatic hybrid approach.

### How is double accounting prevented without staking?

> **📝 Updated Jan 3, 2026**: Claim-time validation is the preferred approach.

**Claim-time validation**: Votes embed weight at vote time, but at distribution, we check if the voter still holds tokens. If they transferred their tokens away, their votes are invalidated. This is simpler than snapshot-based weighting and requires no additional infrastructure - just a current balance check.

From Knockit: _"To solve the double spend the snapshot only makes a valid reward claim if the tokens are still in the address"_

### Why not staking or snapshots?

| Approach       | Complexity | Why Not Preferred                                |
| -------------- | ---------- | ------------------------------------------------ |
| Staking        | High       | Requires new contract, lock-ups, cooldowns       |
| Snapshot       | Medium     | Requires historical balance queries/indexer      |
| **Claim-time** | **Low**    | **Just check current balance at distribution** ✓ |

Claim-time validation achieves the same security with minimal complexity. Staking would only be needed for additional features like vote multipliers for longer lock-ups (veToken model).

---

## On-Chain Social Primitives

> **📝 Added Jan 3, 2026 11:45 PM**: On-chain posting architecture to complement the voting layer.

### The Core Insight

A post is fundamentally: **WHO** + **WHAT** + **WHEN**

Full content on Solana is expensive. Solution: store content off-chain, store _proof_ on-chain.

```
┌─────────────────────────────────────────────────────────────────┐
│                    ON-CHAIN POST                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   {                                                             │
│     author: "7xKXtg2...",        ← WHO (wallet pubkey)          │
│     contentHash: "QmXyz...",     ← WHAT (IPFS/Arweave hash)     │
│     timestamp: 1704067200        ← WHEN (unix timestamp)        │
│   }                                                             │
│                                                                 │
│   Size: ~100 bytes | Cost: ~$0.001                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

The content hash is a fingerprint. If content changes, hash changes. Provably immutable.

### The Four Primitives

```
┌─────────────────────────────────────────────────────────────────┐
│                    YAP PROTOCOL PRIMITIVES                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   POST      = { author, contentHash, timestamp }                │
│   COMMENT   = { author, contentHash, timestamp, parentId }      │
│   VOTE      = { voter, targetHash, weight, timestamp }          │
│   FOLLOW    = { follower, target, timestamp }                   │
│                                                                 │
│   All on-chain. All verifiable. All composable.                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Four primitives. That's the entire social layer.

### Content Flow

```
User writes "gm everyone!"
        ↓
App uploads text to IPFS → returns hash "QmXyz..."
        ↓
App submits Solana tx: { author, contentHash, timestamp }
        ↓
Post exists on-chain (proof)
Content exists on IPFS (data)
        ↓
Anyone can verify: fetch from IPFS, hash it, compare to on-chain
```

### What's On-Chain vs Off-Chain

| On-Chain (Solana)   | Off-Chain (IPFS/Arweave/CDN) |
| ------------------- | ---------------------------- |
| Post/comment hashes | Actual text content          |
| Author wallet       | Images/media                 |
| Timestamps          | Full content JSON            |
| Vote transactions   | User profile data            |
| Reward claims       |                              |

### Why This Makes Yap a "Social Layer"

Any app that speaks this format = part of the network:

| App Type          | What They Post      | Why Integrate                    |
| ----------------- | ------------------- | -------------------------------- |
| Gaming app        | Achievement unlocks | Players earn YAP for milestones  |
| Prediction market | Trade predictions   | Good calls get upvoted, earn YAP |
| NFT platform      | Mint announcements  | Artists earn from engagement     |
| Trading bot       | Alpha calls         | Verified track record, earn YAP  |
| Yap.Network       | Social posts        | The flagship client              |

All posts live on the same chain. All votes flow to the same reward pool. One token economy, many apps.

### Implementation

```typescript
// Post transaction structure
interface PostTransaction {
  author: PublicKey; // Wallet that created the post
  contentHash: string; // IPFS CID or Arweave TX ID
  parentHash?: string; // null for post, hash for comment
  timestamp: number; // Unix timestamp
}

// Submit post on-chain
async function submitPost(content: string): Promise<string> {
  // 1. Upload content to IPFS/Arweave
  const contentHash = await uploadToIPFS(content);

  // 2. Submit transaction with hash
  const tx = await sendTransaction({
    instruction: 'post',
    data: {
      contentHash,
      timestamp: Date.now(),
    },
  });

  return tx.signature;
}
```

### Third-Party Integration

Any app can:

1. **Submit posts** - Same transaction format, recorded on-chain
2. **Read posts** - Query Solana for all post transactions
3. **Submit votes** - Vote on any content hash
4. **Claim rewards** - If their users receive votes, they earn

The protocol doesn't care which app submitted the post. Votes and rewards work the same way across all apps.

---

## Edge Cases & Attack Vectors

> **📝 Added Jan 4, 2026 12:30 AM**: Analysis of potential issues arising from permissionless protocol + curated app architecture.

### The Core Tension

```
PROTOCOL (Permissionless)          APP (Yap.Network)
─────────────────────────          ─────────────────────
• Anyone can vote via RPC    vs    • Invite-only
• Posts are evergreen        vs    • 7-day sunset
• No invite check            vs    • Curated community
• 8 votes per wallet         vs    • 8 total actions
```

App restrictions are **suggestions**, not protocol-enforced. Direct RPC interaction bypasses all app-level rules.

### Issue Analysis

#### Acceptable Issues (Economically Unviable)

| Issue                  | Why It's OK                                                                                                                                                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Post Sunset Bypass** | Voting on "expired" posts via RPC is allowed. However, vote weight is proportional to stake. Attacking old posts requires holding YAP, and rewards are proportional - no outsized gains from gaming old content. The economics self-correct. |
| **Invite Bypass**      | Non-invited users can vote via RPC, but with 0 YAP they have 0 weight. To have meaningful impact, they need to buy YAP = skin in the game. The invite system is for community curation, not economic security.                               |
| **Self-Vote Farms**    | Allowed at protocol level. But claim-time validation means you must hold tokens at distribution. Self-voting with borrowed tokens doesn't work. Self-voting with owned tokens = you're just allocating your own stake.                       |
| **Vote Stacking**      | Voting 8 times on same post is allowed. But total weight is still capped by your holdings. No economic advantage over spreading votes.                                                                                                       |
| **Wallet Rotation**    | Using N wallets for N×8 votes splits your weight. Total influence unchanged. Just more transactions (costs you gas).                                                                                                                         |

#### Serious Issues (Require Mitigation)

| Issue                        | Risk                                      | Mitigation Strategy                                                            |
| ---------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------ |
| **Keeper Failure**           | Distribution stops if keeper goes offline | Multiple redundant keepers, Clockwork automation, on-chain fallback            |
| **Keeper Compromise**        | Attacker controls reward distribution     | Multi-sig keeper, time-locked updates, community monitoring                    |
| **RPC/Indexer Manipulation** | Wrong votes counted                       | Multiple RPC sources, cross-validation, on-chain event logs as source of truth |
| **Content Hash Spam**        | Protocol state bloat                      | Rate limiting at RPC level, minimum stake to post, storage rent                |

#### Infrastructure Hardening Plan

```
┌─────────────────────────────────────────────────────────────────┐
│                 INFRASTRUCTURE RESILIENCE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  KEEPER REDUNDANCY:                                             │
│  • Primary: Clockwork automation (decentralized cron)           │
│  • Backup: Self-hosted keeper with monitoring                   │
│  • Fallback: Manual distribution via multi-sig                  │
│                                                                 │
│  DATA INTEGRITY:                                                │
│  • Source of truth: On-chain transaction logs                   │
│  • Multiple RPC endpoints for cross-validation                  │
│  • Indexer (Helius) as optimization, not dependency             │
│                                                                 │
│  MONITORING:                                                    │
│  • Alert on missed distributions                                │
│  • Track keeper wallet balance                                  │
│  • Community dashboard for transparency                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Non-Issues (By Design)

| Concern                     | Why It's Not a Problem                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Flash Loan Voting**       | Claim-time validation requires holding tokens at snapshot. Flash loans repay in same block.                                                 |
| **Deleted Content Earning** | If author deletes from app but hash exists, votes still count. This is a feature - content ownership is permanent. Author can always claim. |
| **MEV/Vote Ordering**       | Solana's speed (~400ms blocks) minimizes MEV. All 8 votes from a wallet count regardless of order.                                          |
| **Unclaimed Balance Bloat** | Acceptable long-term tradeoff for "claimable forever" UX. Can implement cleanup incentives later if needed.                                 |

### Design Philosophy

> **Principle**: The protocol trusts economics over access control.

Instead of trying to prevent every edge case via restrictions, we rely on:

1. **Stake requirements** - Must hold YAP to have influence
2. **Claim-time validation** - Must still hold at distribution
3. **Proportional rewards** - No outsized gains from gaming
4. **Transparency** - All actions on-chain, auditable

The app layer handles community curation. The protocol layer handles economic security.

---

## Conclusion

Yap's potential isn't as a single social app - it's as the social/rewards layer for Solana. By building a permissionless protocol where stake = influence, we create infrastructure that others can build upon. Yap.Network is our showcase app, but the real value is the protocol.

> "If we can build and scale the private Yap on top of this decentralized social layer - Yap DApp API for Solana - we have huge potential."

The path: Ship private launch → Prove the model → Build on-chain voting → Open the API → Grow the ecosystem.
