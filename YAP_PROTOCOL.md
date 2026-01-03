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

| Rule | Protocol | Yap.Network App |
|------|----------|-----------------|
| Access | Anyone with YAP | Invite-only |
| Daily votes | 8 per wallet | Part of 8 total actions |
| Same-post voting | Allowed (up to 8x) | One vote per post |
| Self-voting | Allowed | Discouraged by UX |
| Purpose | Permissionless infra | Quality community |

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
|--------|-------------|-------------|----------------|
| Whale | 1,000,000 | 1,000,000 | 10% |
| Mid | 100,000 | 100,000 | 1% |
| Small | 10,000 | 10,000 | 0.1% |
| Empty | 0 | 0 | 0% |

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
        weight: Math.min(vote.embeddedWeight, currentBalance)
      });
    }
    // If balance is 0, vote is silently discarded
  }

  return validVotes;
}
```

**Comparison of approaches:**

| Approach | Complexity | Infrastructure | UX Impact |
|----------|------------|----------------|-----------|
| Staking contract | High | New contract, cooldowns | Lock-up required |
| Snapshot-based | Medium | Historical balance queries | None |
| **Claim-time validation** | **Low** | **Just current balance check** | **None** ✓ |

Claim-time validation is the simplest approach - no snapshot infrastructure, no staking contract. Just check current balance at distribution time.

---

#### Alternative: Snapshot-Based Weighting

*For reference, this was the previously discussed approach:*

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

### Daily Pool Allocation

```
Daily Pool = X YAP tokens (configured)

For each post:
  post_rewards = (sum of weighted votes for post) / (sum of all weighted votes) × Daily Pool

For each voter:
  voter_rewards = curator_share × their_contribution_to_winning_posts
```

### Distribution Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                     DAILY DISTRIBUTION CYCLE                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. SNAPSHOT (Every 24 hours)                                    │
│     • Read all vote transactions from chain                      │
│     • Group by voter, take first 8 chronologically               │
│     • Capture vote weight (YAP balance at vote time)             │
│                                                                  │
│  2. CALCULATE                                                    │
│     • Sum weighted votes per post                                │
│     • Calculate proportional share of daily pool                 │
│     • Split between author rewards and curator rewards           │
│                                                                  │
│  3. DISTRIBUTE                                                   │
│     • Build merkle tree of all rewards                           │
│     • Submit merkle root on-chain                                │
│     • Users claim their rewards via merkle proof                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

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
  const signatures = await connection.getSignaturesForAddress(
    VOTE_PROGRAM_ADDRESS,
    { minContextSlot: startSlot }
  );

  // Option B: Indexer (Helius, Triton) for scale
  const votes = await indexer.getTransactions({
    programId: VOTE_PROGRAM_ID,
    startTime,
    endTime
  });

  return votes;
}
```

#### 3. Vote Validation Rules

```typescript
function processVotes(rawVotes: Vote[]): ValidVote[] {
  // Group by voter
  const byVoter = groupBy(rawVotes, v => v.voter);

  // For each voter, take first 8 chronologically
  const validVotes = Object.values(byVoter).flatMap(votes =>
    votes
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, 8)
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
  if (!await isRegisteredUser(userId)) return false;

  // 2. Check total daily actions (posts + comments + votes)
  const todayActions = await getDailyActionCount(userId);
  if (todayActions >= 8) return false;

  // 3. One vote per post in our app
  if (await hasVotedPost(userId, postId)) return false;

  return true;
}
```

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

From Knockit: *"To solve the double spend the snapshot only makes a valid reward claim if the tokens are still in the address"*

### Why not staking or snapshots?

| Approach | Complexity | Why Not Preferred |
|----------|------------|-------------------|
| Staking | High | Requires new contract, lock-ups, cooldowns |
| Snapshot | Medium | Requires historical balance queries/indexer |
| **Claim-time** | **Low** | **Just check current balance at distribution** ✓ |

Claim-time validation achieves the same security with minimal complexity. Staking would only be needed for additional features like vote multipliers for longer lock-ups (veToken model).

---

## Conclusion

Yap's potential isn't as a single social app - it's as the social/rewards layer for Solana. By building a permissionless protocol where stake = influence, we create infrastructure that others can build upon. Yap.Network is our showcase app, but the real value is the protocol.

> "If we can build and scale the private Yap on top of this decentralized social layer - Yap DApp API for Solana - we have huge potential."

The path: Ship private launch → Prove the model → Build on-chain voting → Open the API → Grow the ecosystem.
