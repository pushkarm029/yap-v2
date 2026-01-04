# Yap.Network

## A Decentralized Social Network with Native Token Incentives

WHITEPAPER for INTERNAL USE ONLY

## Mission

Our mission at Yap is to empower young entrepreneurs all around the world. We will accomplish this by building a fun, intuitive social media app with crypto token rewards.

## Abstract

Yap.Network presents a decentralized social network built on Solana that directly rewards content creators through a native token economy. Unlike traditional social platforms where corporations extract value from user-generated content, Yap.Network implements a token-based system where users earn $YAP tokens proportional to their (stake weighted) engagement and can utilize these tokens to enhance their platform experience. The system employs controlled scarcity through daily action limits, content expiration, and strategic token burn mechanisms to maintain economic balance while fostering genuine social interaction.

## 1\. Introduction

Social media platforms have become the primary means of digital communication and content sharing, yet the economic model remains fundamentally broken. Users generate billions of dollars in content value while platforms capture all economic benefits. Yap.Network addresses this asymmetry through token rewards via micro-incentives or granular vector rewards within a proof-of-participation or proof-of-contribution system where, for example, a simple comment can be rewarded with a $0.50 or $1.00 token payout making creating content and spending time on Yap akin to an actual job for young entrepreneurs, especially in developing countries. fostering, direct economic participation in the network.

The platform introduces several novel concepts:

- Time-limited content (7-day sunset) creating natural content turnover in the spirit of “stream of consciousness"
- Daily action limited to eight (8) actions per day; posts, comments, votes; preventing spam and promoting quality or thoughtfulness. In effect, creating a different kind of social network game that has never been seen before at scale.
- Token-based feature unlocking through strategic burning.
- Direct reward distribution, 100% social mining, with zero team allocation. The early users and winners in the ecosystem will act as rocket fuel for growth and future network virality.

## 2\. The Problem

### 2.1 Value Extraction

Traditional social media operates on an extractive model where:

- Users create content without compensation
- Platforms monetize through advertising and data sales
- Network effects benefit shareholders, not participants
- Content creators rely on indirect monetization methods

### 2.2 Centralized Control

Current platforms exhibit:

- Unilateral content moderation decisions
- Algorithm manipulation for engagement farming
- Data ownership residing with corporations
- No user participation in governance or economics

### 2.3 Misaligned Incentives

The advertising model creates perverse incentives:

- Engagement optimization over content quality
- Addiction mechanics over user wellbeing
- Echo chambers and polarization for retention
- No direct correlation between contribution and reward

## 3\. System Design

### 3.1 Core Mechanics

**Content Lifecycle**

- Posts automatically expire after 7 days
- Ephemeral nature encourages fresh content
- Permanent storage requires token burning

**Daily Action Limits**
Per 24-hour period (resets 2AM UTC):

- **8 total actions** per day (posts + comments + votes combined)
- First 8 actions by timestamp count
- Encourages thoughtful, quality engagement

**Stake-Weighted Voting**

Vote weight is proportional to token holdings:

```
vote_weight = YAP_tokens_in_wallet
```

Rewards earned = Σ(vote_weight of upvotes received)

| Voter | YAP Balance | Vote Weight |
| ----- | ----------- | ----------- |
| Whale | 1,000,000   | 1,000,000   |
| Mid   | 100,000     | 100,000     |
| Small | 10,000      | 10,000      |
| Empty | 0           | 0           |

**Why stake-weighted?**

- Spam prevention: 0 YAP wallet votes have 0 impact
- Skin in the game: Voters risk token value on their curation
- Economic alignment: Larger stakeholders have proportional influence

### 3.2 Invitation System

- The platform will likely remain invite-only in perpetuity ensuring real users and a hyper concentration of value which is KEY for achieving a MVV (Minimum Viable Value) of a $1 Million market cap.
- The two co-founders aim to “social mine” 20-30% of the token supply across a handful of Yap accounts before inviting in friends and ‘crypto native’ associates to help build, maintain, and bring the project to market.
- We see 20-30 people helping us put the finishing touches on the project and then help bring it to market, we will need:
  - App developers,
  - UI developers,
  - Social media and marketing help,
  - Industry players and connections,
  - Crypto native friends,
  - VC connections,
  - Diverse community management in different regions around the world.
- The 20-30 “initial core team” will support Yap in the spirit of decentralization how open source projects such as Bitcoin are brought into the world
- The team will be rewarded on Yap with Yap coins; think of a startup using Slack for project management but on Yap upvotes from the Founders and core team will allocate tokens.
- **As everything begins to work smoothly we will SLOWLY open up a gamified invitation system where the top power users each month with the longest daily active streak will each get invites.**
- At this point if the MVV (Minimum Viable Value) is sufficient we will think about charging $1 to $10 per month for all new users. Controlled growth ensures a killer Yap mafia/cabal well equipped to grow Yap to a top 100 project on CoinMarketCap.

MVV (Minimum Viable Value)

At $0.05 per Bitcoin in August 2010, over 1+ year since network inception, Bitcoin’s market cap was less than $200,000. Now the market cap stands at $2 Trillion. This is how healthy projects are launched.

| Market Cap                       | Rewards (per year) | Rewards (per day) | Users      | Rewards (per user per day) |
| :------------------------------- | :----------------- | :---------------- | :--------- | :------------------------- |
| $10,000                          | $1,000             | $2.75             | 2          | $1.35                      |
| $100,000                         | $10,000            | $27.50            | 10-20      | $2.75                      |
| $1,000,000 (MVV TARGET)          | $100,000           | $275              | 20-50      | $13.75                     |
| $2,000,000                       | $200,000           | $550              | 50-100     | $11                        |
| $5,000,000                       | $500,000           | $1,350            | 100-1000   | $13.50                     |
| $10,000,000 (GO-2-MARKET TARGET) | $1,000,000         | $2,750            | 1000-10000 | $2.75                      |

Wallets and amounts should be private. Users will be able to “feel” whales with their large stake weighted votes but likely even votes should be private.

**Invitation access is limited to (Top 5% \- 10%) power users.**

Steemit got too messy psychologically because everyone knew how much everyone was worth. It created lots of problems above and underneath the surface.

**THE KEY ACTION METRIC or KEY PERFORMANCE INDICATOR on Yap will be completing daily actions and growing the highest daily cumulative user streak.**

## 4\. Token Economics

### 4.1 Token Specifications

- **Symbol**: $YAP
- **Blockchain**: Solana (SPL Token2022 Standard)
- **Total Initial Supply**: 1,000,000,000 tokens distributed linearly over first year to “initial core team” via proof-of-contribution
- **Annual Inflation**: 10% (100,000,000 tokens/year)
- **Conversion**: 1 point \= 1 $YAP (fixed rate)

### 4.2 Distribution Model

Live contract with API that, in theory, other projects can build on is the purest way to launch the token and is preferred launch method to points and airdrop but it depends on resources and complexity.

**Daily Distribution Cycle (2:00 AM UTC)**

1. Read all vote transactions from past 24 hours
2. For each vote, check: does voter still have tokens?
3. Filter: first 8 votes per wallet (by timestamp)
4. Invalidate votes from wallets with 0 balance
5. Calculate rewards per author from valid votes
6. Update on-chain: author.claimableBalance += reward

**Claim-Time Validation (Double Accounting Prevention)**

The problem: With transferable tokens, the same YAP could vote multiple times:

```
Without protection:
10:00 AM    User A has 1M YAP, votes (weight: 1M)
11:00 AM    User A transfers 1M YAP to User B
12:00 PM    User B votes (weight: 1M)
Result:     2M total vote weight, but only 1M YAP exists ✗
```

The solution: At distribution time, verify voter still holds tokens:

```
With claim-time validation:
10:00 AM    User A votes (weight = 1M, embedded in tx)
11:00 AM    User A transfers 1M YAP to User B
12:00 PM    User B votes (weight = 1M, embedded in tx)

Distribution (checks current balances):
  User A: 0 YAP in wallet → vote INVALIDATED
  User B: 1M YAP in wallet → vote COUNTS
Result:     Only 1M weight for 1M tokens ✓
```

This approach is simpler than staking (no lock-up required) or snapshots (no historical queries needed). Gaming is unprofitable—if you transfer tokens after voting, your votes don't count.

**Transaction Economics (User Pays)**

All protocol participants pay their own Solana transaction fees:

| Action | Solana Cost | Daily Max (8 actions) |
| ------ | ----------- | --------------------- |
| Vote   | ~$0.001     | ~$0.008               |
| Post   | ~$0.001     | ~$0.008               |
| Claim  | ~$0.001     | once                  |

Monthly cost for active user: ~$0.25-0.50

**Why user pays:**

- Natural Sybil defense: Creating fake accounts costs SOL per action
- Zero protocol operational cost: No relayer, no gas tank, no subsidies
- Self-sustaining: Protocol works even if Yap.Network disappears
- If you have YAP, you almost certainly have SOL (you bought YAP on a DEX)

### 4.3 Inflation Mechanism

**Annual inflation distribution**:  
Annual_inflation \= Current_supply × 0.10

### 4.4 Virtual Balance System

To minimize transaction costs, the system implements lazy claiming:

Virtual_balance(user, t) \= Σ(Daily_rewards(user, i)) for i \= 1 to t

Where:  
Daily_rewards(user, day) \= (Points(user, day) / Total_points(day)) × Daily_inflation  
Daily_inflation \= Annual_inflation / 365

Users accumulate virtual balances off-chain, claiming on-chain only when needed.

## 5\. Token Utility & Burn Mechanisms

### 5.1 Content Permanence

**Evergreen Post \= 50% all rewards automatically burned**

**Remove Post Sunset**

- Standard: Posts expire after 7 days
- Permanent single post: 100 $YAP

**Economic impact**:  
Burn_rate_permanence \= Active_users × Avg_permanent_posts × Token_cost  
Expected_daily_burn \= 0.01 × Active_users × 10 $YAP

### 5.2 Feed Philosophy

- No algorithmic recommendations
- Users see only who they follow
- Pure, honest social media
- Explore and Discovery features planned for later stages

### 5.3 Design Principles

- Simplicity above all else
- Stake-weighted voting is free (no tipping required)
- Action limits are core to engagement and stickiness

## 6\. Smart Contract Architecture

### 6.1 Core Contracts (Anchor/Rust)

**Token Contract**

| // Simplified structurepub struct TokenAccount { pub mint: Pubkey, pub owner: Pubkey, pub amount: u64, pub delegate: Option\<Pubkey\>,}pub struct MintAccount { pub supply: u64, pub decimals: u8, pub mint_authority: Option\<Pubkey\>,} |
| :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

**Application Contract**

| pub struct UserAccount { pub wallet: Pubkey, pub points_balance: u64, pub virtual_balance: u64, pub last_claim: i64, pub total_burned: u64,}pub struct BurnRecord { pub user: Pubkey, pub amount: u64, pub burn_type: BurnType, pub timestamp: i64,} |
| :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

###

### 6.2 Reward Distribution

| // Daily reward calculationfn calculate_daily_rewards( user_points: u64, total_points: u64, daily_inflation: u64) \-\> u64 { (user_points \* daily_inflation) / total_points}// Virtual balance updatefn update_virtual_balance( user: &mut UserAccount, current_time: i64) { let days_elapsed \= (current_time \- user.last_claim) / 86400; let pending_rewards \= calculate_pending_rewards(user, days_elapsed); user.virtual_balance \+= pending_rewards;} |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |

## 7\. Supply Dynamics

Year 1: 1,000,000,000 $YAP
Year 2: 1,100,000,000 $YAP (10% inflation)
Year 3: 1,210,000,000 $YAP

Net supply formula: Previous_supply × 1.10 - Annual_burn
Equilibrium point: When Annual_burn = Annual_inflation

Daily distribution = Annual_inflation / 365

## 8\. Technical Design Rationale

This section explains the reasoning behind key technical choices.

### 8.1 Why Solana?

| Factor            | Solana       | Ethereum | Hive    |
| ----------------- | ------------ | -------- | ------- |
| Transaction speed | ~400ms       | ~12s     | ~3s     |
| Transaction cost  | ~$0.001      | ~$1-50   | Free    |
| DeFi ecosystem    | Large        | Largest  | None    |
| Smart contracts   | Yes (Anchor) | Yes      | Limited |

**Decision:** Solana provides the best balance of speed, cost, and ecosystem. Ethereum is too expensive for micro-transactions. Hive has no DeFi ecosystem for token liquidity.

### 8.2 Why Stake-Weighted Voting?

**Alternatives considered:**

| Approach           | Pros                                | Cons                             |
| ------------------ | ----------------------------------- | -------------------------------- |
| 1 vote = 1 point   | Simple                              | Sybil attackable (fake accounts) |
| Quadratic voting   | Fairer distribution                 | Complex, requires identity       |
| **Stake-weighted** | Sybil resistant, aligned incentives | Whale influence                  |

**Decision:** Stake-weighted voting provides Sybil resistance without requiring identity verification. Whales have more influence, but they also have more to lose—economic alignment.

### 8.3 Why Claim-Time Validation?

The double-accounting problem: Same tokens could vote multiple times if transferred between votes.

| Solution                  | Complexity | UX Impact        | Infrastructure       |
| ------------------------- | ---------- | ---------------- | -------------------- |
| Staking/Lock-up           | High       | Lock-up required | New contract         |
| Snapshot-based            | Medium     | None             | Historical queries   |
| **Claim-time validation** | Low        | None             | Current balance only |

**Decision:** Check if voter still holds tokens at distribution time. Simplest solution—no lock-up friction, no indexer dependency. Gaming is unprofitable.

### 8.4 Why User Pays Gas?

| Model             | Pros                           | Cons                            |
| ----------------- | ------------------------------ | ------------------------------- |
| **User pays**     | Self-sustaining, Sybil defense | Small friction                  |
| Gasless/Sponsored | Zero friction                  | Cost center, relayer dependency |

**Decision:** User pays ~$0.001 per action. This is negligible for anyone with meaningful YAP stake, provides natural Sybil defense, and requires zero operational infrastructure. Gasless remains a future option at app layer.

### 8.5 Why No Diminishing Returns on Repeat Votes?

Hive uses diminishing returns: voting for the same author repeatedly reduces weight.

| Approach                   | Pros                             | Cons                    |
| -------------------------- | -------------------------------- | ----------------------- |
| Diminishing returns        | Forces vote diversity            | Complex tracking        |
| **No diminishing returns** | Simple, allows conviction voting | Potential concentration |

**Decision:** Keep it simple. If a user believes strongly in one author, they can vote 8 times. May revisit if abuse patterns emerge.

### 8.6 Why No Downvotes?

| Platform | Downvotes? | Result                            |
| -------- | ---------- | --------------------------------- |
| Hive     | Yes        | Downvote wars, drama, user exodus |
| Reddit   | Yes        | Brigading, echo chambers          |
| **YAP**  | No         | Positive-sum only                 |

**Decision:** Protocol records only positive actions. Content can earn rewards; it cannot be punished. App layer handles content moderation via filtering, muting, and community reporting.

### 8.7 Why 8 Actions Per Day?

**Design goals:**

- Create scarcity (each action has value)
- Encourage thoughtfulness over spam
- Drive daily engagement (complete your 8)
- Enable streak-based gamification

**Why combined (not separate limits):**

- Simpler to understand
- Flexibility: all votes, all posts, or mix
- Single metric to track

### 8.8 Why Off-Chain Content + On-Chain Hash?

| Approach          | Storage Cost  | Flexibility | Verifiability |
| ----------------- | ------------- | ----------- | ------------- |
| Full on-chain     | Very high     | None        | Full          |
| **Hash on-chain** | Low (~$0.001) | High        | Full          |
| Fully off-chain   | Zero          | High        | None          |

**Decision:** Store content on IPFS/Arweave, store hash on Solana. Proves content unchanged at minimal cost. Allows flexible storage backends.

### 8.9 Why Two-Tier Architecture?

| Model        | Protocol                      | App                |
| ------------ | ----------------------------- | ------------------ |
| Monolithic   | N/A                           | Everything bundled |
| **Two-tier** | Permissionless infrastructure | Curated experience |

**Decision:** Separate protocol from app. Protocol is open—anyone can build. App (Yap.Network) adds curation. This enables ecosystem growth while maintaining quality.

### 8.10 Design Philosophy Summary

| Principle                             | Implementation                                       |
| ------------------------------------- | ---------------------------------------------------- |
| Simplicity over features              | No diminishing returns, no vesting, no curator split |
| Economic security over access control | Stake = weight, not whitelists                       |
| Self-sustaining over subsidized       | User pays gas                                        |
| Positive-sum over zero-sum            | No downvotes                                         |
| Open protocol, curated app            | Two-tier architecture                                |

## 9\. Security Considerations

### 9.1 Anti-Sybil Mechanisms

- Invite-only registration
- Daily action limits
- Points tied to genuine engagement
- Cost of creating fake engagement exceeds rewards

### 9.2 Smart Contract Security

- Multi-signature treasury controls
- Time-locked upgrade mechanisms
- Audited Anchor framework usage
- Immutable core token functions

### 9.3 User Safety

- Mute features for privacy and peace of mind
- If someone "mutes" another user, they won't see their posts or comments
- The muted user won't see the other person in search, posts, or comments

## 10\. Two-Tier Architecture

Yap is a **fat protocol** where value accrues at the protocol layer, not individual applications. The on-chain voting and rewards system is permissionless infrastructure that any application can build upon.

### 10.1 Protocol vs Application Layer

| Rule             | Protocol Layer                | Yap.Network App         |
| ---------------- | ----------------------------- | ----------------------- |
| Access           | Anyone with YAP               | Invite-only             |
| Daily votes      | 8 per wallet                  | Part of 8 total actions |
| Same-post voting | Allowed (up to 8x)            | One vote per post       |
| Self-voting      | Allowed                       | Allowed                 |
| Content expiry   | Evergreen (never expire)      | 7-day sunset            |
| Purpose          | Permissionless infrastructure | Quality community       |

**Protocol Layer (Open)**

- Smart contracts publicly deployed on Solana
- Token contract fully permissionless
- Reward distribution mechanisms transparent
- Burn functions accessible to any integrated app
- APIs documented and available

**Application Layer (Yap.Network)**

- Invite-only social platform
- Additional UX restrictions for quality
- Content moderation and filtering
- Curated community experience

**Key Principle**: No gatekeeping at the protocol level. The economics self-regulate. App-level restrictions exist for community curation, not economic security.

### 10.2 Open Contract Specifications

All core contracts remain open source and verifiable:

| // Public interface for third-party integrationpub trait YapProtocol { fn burn_tokens(amount: u64, burn_type: BurnType) \-\> Result\<()\>; fn calculate_rewards(points: u64) \-\> u64; fn verify_membership(wallet: Pubkey) \-\> bool;} |
| :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

Third-party developers can:

- Build alternative clients
- Create specialized tools (analytics, trading bots)
- Integrate $YAP into other protocols
- Develop complementary services

### 10.3 Invitation System

Invitations are enforced at the **application level**, not protocol level.

**Rationale:**

- Hyper-concentrates reward effectiveness during early growth
- Curated community maintains quality
- Protocol remains permissionless for third-party integrations

### 10.4 API Access Tiers

**Public APIs**

- Token balance queries
- Burn transaction history
- Points leaderboard (anonymized)
- Protocol statistics

**Authenticated APIs (Members Only)**

- Content posting
- Social interactions
- Full leaderboard with profiles
- Direct messaging

### 10.5 Third-Party Integration Scenarios

**Compatible Integrations**

- DEX liquidity pools for $YAP
- Wallet integrations
- Portfolio trackers
- DeFi protocols accepting $YAP

**Restricted Functions**

- Cannot bypass invitation requirements
- Cannot access member-only content
- Cannot mint points without genuine engagement

### 10.6 Economic Implications

This hybrid model creates:

- **Scarcity Premium**: Membership becomes valuable asset
- **Protocol Value**: Open contracts allow DeFi composability
- **Quality Preservation**: Curated community maintains standards
- **Innovation Layer**: Developers can build without permission

## 11\. V2: On-Chain Social Primitives

V2 transforms YAP into a fully on-chain social protocol. This is the next major milestone.

### 11.1 The Five Primitives

```
POST    = { author, contentHash, timestamp }           → Memo
COMMENT = { author, contentHash, timestamp, parentId } → Memo
VOTE    = { voter, targetHash, weight, timestamp }     → Memo
FOLLOW  = { follower, target, timestamp }              → Memo
PROFILE = { wallet, username, metadataHash }           → PDA (on-chain)
```

Five primitives. That's the entire social layer.

**Why PROFILE is a PDA (not memo):**
- Username uniqueness enforced on-chain (prevents impersonation)
- Portable identity across all YAP apps
- Only primitive worth the extra cost (~$0.002 rent)

### 11.2 How It Works

**Content Flow:**

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

### 11.3 What's On-Chain vs Off-Chain

| On-Chain (Solana)   | Off-Chain (IPFS/Arweave) |
| ------------------- | ------------------------ |
| Post/comment hashes | Actual text content      |
| Author wallet       | Images/media             |
| Timestamps          | Full content JSON        |
| Vote transactions   | User profile data        |
| Reward claims       |                          |

### 11.4 Why This Makes YAP a "Social Layer"

Any app that speaks this format = part of the network:

| App Type          | What They Post      | Why Integrate                    |
| ----------------- | ------------------- | -------------------------------- |
| Gaming app        | Achievement unlocks | Players earn YAP for milestones  |
| Prediction market | Trade predictions   | Good calls get upvoted, earn YAP |
| NFT platform      | Mint announcements  | Artists earn from engagement     |
| Trading bot       | Alpha calls         | Verified track record, earn YAP  |
| Yap.Network       | Social posts        | The flagship client              |

All posts live on the same chain. All votes flow to the same reward pool. One token economy, many apps.

### 11.5 Smart Contract Architecture

**Minimal Design: 1 Program + Memo Transactions**

V2 uses the simplest possible architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                      ON-CHAIN COMPONENTS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   YAP PROGRAM (Existing + V2)         MEMO PROGRAM (Built-in)   │
│   ───────────────────────────         ───────────────────────   │
│   • Token mint (YAP)                  • POST events             │
│   • Inflation minting                 • VOTE events             │
│   • Vault + Pending Claims            • COMMENT events          │
│   • Merkle-based distribution         • FOLLOW/UNFOLLOW events  │
│   • User claims                                                 │
│   • Token burns                       No custom program needed! │
│   • PROFILE PDA (V2)                  Just structured JSON in   │
│     └── username uniqueness           memo field of txs.        │
│     └── metadata hash pointer                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Why this is optimal:**

- 1 custom program (already built and tested)
- Social events use Solana's built-in Memo program
- Zero additional contract development for V2
- Minimal audit surface

**Social Event Format (Memo JSON):**

```
POST:     "YAP:{"v":1,"t":"post","h":"QmXyz..."}"
VOTE:     "YAP:{"v":1,"t":"vote","h":"QmXyz...","w":100000}"
COMMENT:  "YAP:{"v":1,"t":"comment","h":"QmAbc...","p":"QmXyz..."}"
FOLLOW:   "YAP:{"v":1,"t":"follow","a":"7xKXtg..."}"
UNFOLLOW: "YAP:{"v":1,"t":"unfollow","a":"7xKXtg..."}"
```

| Field | Meaning                                    |
| ----- | ------------------------------------------ |
| `v`   | Version (for upgrades)                     |
| `t`   | Type: post, vote, comment, follow/unfollow |
| `h`   | Content hash (IPFS CID)                    |
| `w`   | Weight (YAP balance at vote time)          |
| `p`   | Parent hash (for comments)                 |
| `a`   | Address (for follows)                      |

Vote weight is embedded at vote time but validated at distribution time (claim-time validation).

**PROFILE PDA Structure (On-Chain):**

```rust
pub struct Profile {
    pub wallet: Pubkey,           // Owner (32 bytes)
    pub username: [u8; 32],       // Unique on-chain, padded
    pub metadata_hash: [u8; 32],  // IPFS pointer (bio, avatar, etc.)
    pub bump: u8,
}
```

**Why PROFILE is worth the PDA cost:**
- Username uniqueness prevents impersonation
- Portable identity works across all YAP apps
- One-time cost (~$0.002 rent) for permanent benefit

**Cost per action:**
- Memo events: ~$0.001 (just tx fee)
- Profile creation: ~$0.002 (one-time rent)

### 11.6 Content Storage

**Decision: IPFS for V2**

| Option        | Cost       | Permanence     | Speed  | Decision      |
| ------------- | ---------- | -------------- | ------ | ------------- |
| IPFS (pinned) | ~Free      | Needs pinning  | Fast   | ✓ V2          |
| Arweave       | ~$0.01/KB  | Forever        | Slower | Future option |
| Bundlr        | ~$0.001/KB | Arweave-backed | Faster | Future option |

**Content Flow:**

```
User writes "gm everyone!"
        ↓
App uploads to IPFS → returns CID "QmXyz..."
        ↓
App submits Solana tx with hash
        ↓
On-chain: { author, contentHash: "QmXyz...", timestamp }
Off-chain: Actual content on IPFS
        ↓
Verification: Fetch IPFS, hash it, compare to on-chain
```

**Content Schema:**

```json
{
  "version": 1,
  "type": "post",
  "content": "gm everyone!",
  "media": [],
  "created_at": 1704067200
}
```

### 11.7 Indexing & Querying

**Decision: RPC for launch, Helius indexer for mainnet**

**Why Indexers Are Required:**

Raw Solana RPC cannot efficiently query "all votes for post X in last 24 hours." You'd have to fetch ALL transactions and filter locally. Indexers solve this.

**Multi-App Architecture (Public Data):**

```
┌─────────────────────────────────────────────────────────────────┐
│                      SOLANA BLOCKCHAIN                           │
│                                                                 │
│   All YAP memo transactions are PUBLIC                          │
│   The blockchain IS the API                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   ┌───────────┐     ┌───────────┐     ┌───────────┐
   │  Helius   │     │  Triton   │     │  Custom   │
   │  Indexer  │     │  Indexer  │     │  Indexer  │
   └───────────┘     └───────────┘     └───────────┘
         │                 │                 │
         ▼                 ▼                 ▼
   ┌───────────┐     ┌───────────┐     ┌───────────┐
   │Yap.Network│     │ Staking   │     │ Trading   │
   │  (App 1)  │     │ App (2)   │     │ App (3)   │
   └───────────┘     └───────────┘     └───────────┘
```

**This is what makes YAP a "social layer":**

| Data                            | Visibility      | Who Can Access      |
| ------------------------------- | --------------- | ------------------- |
| POST/VOTE/COMMENT/FOLLOW events | Public on-chain | Any app             |
| Indexer APIs (Helius, etc.)     | Public          | Anyone with API key |
| Vote history                    | Public          | Any app can query   |
| Reward claims                   | Public          | Any app can verify  |

**Third-party apps can:**

1. Use the same Helius API as Yap.Network
2. Run their own indexer (Geyser plugin)
3. Build their own UI on top of YAP social data
4. Submit social events that earn YAP rewards

**Why This Is a "True DApp":**

| Aspect               | Status                            |
| -------------------- | --------------------------------- |
| Source of truth      | On-chain transactions ✓           |
| Verifiable by anyone | Yes, fetch raw txs ✓              |
| Censorship resistant | Data on Solana ✓                  |
| Indexer replaceable  | Use any indexer or run your own ✓ |
| Multi-app compatible | Any app can read/write ✓          |

The indexer is a **convenience layer**, not a **trust layer**. The blockchain remains the source of truth. Yap.Network is just one client — the protocol is open to all.

---

## 11.8 Future Ideas (Post-V2)

These features may be explored after V2 is stable:

**Gasless Sponsorship**

- App-layer fee sponsorship for zero-friction UX
- Tradeoff: operational cost, centralization

**On-Chain Rule Enforcement**

- Move 8-vote limit from backend to smart contract
- Inspired by Lens Protocol's Rules system
- Tradeoff: less flexibility, more rigidity

## 12\. Roadmap & Growth Projections

### 12.1 Development Phases

**Phase 1: Foundation**

- Mobile PWA development
- Smart contract architecture
- Core social features (post, comment, vote)

**Phase 2: Private Launch**

- Invite-only deployment
- Initial core team (20-30 contributors)
- Iterate based on user feedback
- Target: Achieve MVV ($1M market cap)

**Phase 3: Mainnet & Token Launch**

- Token generation event (TGE)
- DEX liquidity initialization
- Merkle-based reward claims
- Target: 1,000+ active users

**Phase 4: Growth & Monetization**

- Controlled invitation expansion
- Third-party API documentation
- Ecosystem partnerships
- Target: $10M+ market cap

**Once MVV ($1M+ market cap) is achieved and users are earning meaningful rewards:**

| Tier      | Price     | Features                                                            |
| --------- | --------- | ------------------------------------------------------------------- |
| **Basic** | $5/month  | Full platform access, 8 daily actions, 7-day content sunset in UI   |
| **Gold**  | $10/month | Enhanced features + evergreen content (posts visible forever in UI) |

**Important clarification on content permanence:**

- On-chain: ALL posts and comments are evergreen (permanent on blockchain)
- UI layer: Basic users see 7-day sunset (stream of consciousness, focused rewards)
- Gold users: Posts remain visible in UI forever

This creates sustainable revenue while maintaining the core reward mechanics.

**Phase 5: V2 (Future)**

- On-chain social primitives
- On-chain rule enforcement
- Optional gasless sponsorship
- Open protocol ecosystem

### 12.2 Growth Projections

Invite-based controlled growth model:

| Week | Users | Invites | Paid Users | Monthly Revenue |
| ---- | ----- | ------- | ---------- | --------------- |
| 1    | 10    | 1       | 0          | $0              |
| 10   | 19    | 1       | 0          | $0              |
| 20   | 42    | 3       | 0          | $0              |
| 30   | 103   | 10      | 3          | $30             |
| 40   | 259   | 25      | 159        | $1,590          |
| 50   | 665   | 66      | 565        | $5,650          |
| 60   | 1,719 | 172     | 1,619      | $16,194         |
| 63   | 2,289 | 229     | 2,189      | $21,885         |

**Year 1 target: ~$262K annual subscription revenue**

## 13\. Conclusion

Yap.Network represents a fundamental shift in social media economics, returning value to content creators through direct token rewards and utility-driven burn mechanisms. By implementing controlled scarcity, time-limited content, and strategic token burning, the platform creates sustainable economic dynamics while maintaining authentic social interaction.

The zero team allocation and 100% community distribution ensure aligned incentives from inception. The lazy claiming mechanism reduces transaction costs while maintaining transparent reward tracking. With annual inflation fully distributed to active users and multiple burn utilities creating deflationary pressure, $YAP establishes itself as a true utility token powering decentralized social interaction.

---

## Appendix: Third-Party Integration

YAP is designed as the **social layer of Solana** — a permissionless protocol that rewards genuine social contribution. Any app can integrate.

### The Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      SOLANA BLOCKCHAIN                           │
│                  All social events are PUBLIC                    │
└─────────────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   ┌───────────┐     ┌───────────┐     ┌───────────┐
   │Yap.Network│     │ Gaming    │     │ Prediction│
   │  (App 1)  │     │ App (2)   │     │ Market (3)│
   └───────────┘     └───────────┘     └───────────┘
         │                 │                 │
         └─────────────────┴─────────────────┘
                           │
                           ▼
                   Same reward pool
                   Same token economy
```

### How Third-Party Apps Integrate

**Step 1: Submit social events**

Any app can submit memo transactions:

```
"YAP:{"v":1,"t":"post","h":"QmXyz..."}"
"YAP:{"v":1,"t":"vote","h":"QmXyz...","w":100000}"
```

**Step 2: Indexer reads all events**

Public data — any app can query via Helius or run their own indexer.

**Step 3: Keeper validates and distributes**

Daily distribution includes votes from ALL apps. One token economy, many apps.

**Step 4: Users claim rewards**

Authors earn YAP regardless of which app submitted the vote.

### What Third-Party Apps Can Do

| Action           | Permissionless? | How                    |
| ---------------- | --------------- | ---------------------- |
| Submit POSTs     | ✓               | Memo transaction       |
| Submit VOTEs     | ✓               | Memo transaction       |
| Read social data | ✓               | Public indexer or RPC  |
| Users earn YAP   | ✓               | Votes on their content |
| Claim rewards    | ✓               | Direct contract call   |
| Burn YAP         | ✓               | Standard SPL burn      |

### Example Integrations

| App Type               | What They Post      | Why Integrate                    |
| ---------------------- | ------------------- | -------------------------------- |
| **Gaming app**         | Achievement unlocks | Players earn YAP for milestones  |
| **Prediction market**  | Trade predictions   | Good calls get upvoted, earn YAP |
| **NFT platform**       | Mint announcements  | Artists earn from engagement     |
| **Trading bot**        | Alpha calls         | Verified track record, earn YAP  |
| **Content aggregator** | Curated posts       | Users earn from curation         |

### Why Use YAP Instead of Creating a Token?

| With Custom Token           | With YAP Integration           |
| --------------------------- | ------------------------------ |
| Bootstrap $50K liquidity    | Instant DEX liquidity          |
| 6 months to build community | Access to existing YAP holders |
| Tokenomics headaches        | Focus on product               |
| Token probably fails        | Proven token economy           |

### Anti-Gaming Measures

| Concern           | How It's Handled                   |
| ----------------- | ---------------------------------- |
| Zero-balance spam | Vote weight = 0, no impact         |
| Bot armies        | Need YAP stake to have weight      |
| Self-voting farms | Allowed, but proportional to stake |
| Double-accounting | Claim-time validation              |

The protocol trusts economics over access control. Gaming is possible but unprofitable.
