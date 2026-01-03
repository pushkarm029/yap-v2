# YAP Token Contract

Solana program for YAP token with merkle-based claims and time-based distribution rate limiting.

## Devnet Deployment

| Account        | Address                                        |
| -------------- | ---------------------------------------------- |
| Program        | `CP5uP8kmwMnRDLh2yfrbeZLByo2wNCUdmQqTz3bso5dy` |
| Mint           | `5aReSLCdNv2BdpcyWkMn42JMQNmCVpLdk7LnJMZwG3jB` |
| Config         | `DNYRtUQYUmRWob8RVSzMwoDZGEtu7DXHEpu67YPSXuxL` |
| Vault          | `r1KzCrhtzep8GNWtNbsYq6KJK4wH1XsDGB7vpbsvLnd`  |
| Pending Claims | `ER9pVFnqt1cREraHUKSNjSBp2gFDzoert7FEVr7U2vjQ` |
| Metadata       | `36n7ee7FH4h1n7PicgsQXotTfqHukTqmFUKrHiFWsuUm` |

**Token Metadata:** Currently hosted on GitHub Gist + catbox.moe (free). For mainnet, upload to Arweave:

```bash
ARWEAVE_NETWORK=mainnet bun run upload-metadata
```

Requires ~0.01 SOL in wallet for permanent storage.

## Architecture

```
[Mint] ──TriggerInflation──> [Vault] ──Distribute──> [Pending Claims] ──Claim──> [User ATA]
        (continuous)       (undistributed)  (rate-limited)    (unclaimed)      (with proof)

[User ATA] ──Burn──> [Mint] (supply reduction)
```

## Expected Workflow

**Setup (once):**

1. Deploy program
2. Call `Initialize` with merkle_updater address and inflation rate

**Daily distribution (cron job):**

1. Backend aggregates user points since last distribution
2. Calculate `available = elapsed * vault_balance / SECONDS_PER_YEAR`
3. Calculate each user's share: `user_tokens = (user_points / total_points) * available`
4. Build merkle tree with cumulative amounts per user
5. Call `Distribute(amount, merkle_root)` where amount = sum of new allocations

**User claims (on-demand):**

1. User requests claim from frontend
2. Backend returns proof and cumulative amount from current merkle tree
3. User calls `Claim(amount, proof)` - receives `amount - already_claimed`

**Inflation (continuous, admin-triggered):**

1. Admin calls `TriggerInflation` at any time
2. Mints proportional inflation based on elapsed time: `supply * rate * elapsed / (10000 * SECONDS_PER_YEAR)`
3. Can be called daily, weekly, quarterly, or yearly - inflation accrues continuously
4. Recommended: Call quarterly or yearly for simplicity

## Rate Limiting

```
available = (elapsed_seconds / SECONDS_PER_YEAR) * vault_balance
```

Backend calculates individual allocations (`user_points / total_points * available`), contract enforces total cap. Can be called anytime - no daily batch restrictions.

## Instructions

### Initialize

Creates mint, vault, pending_claims, config, and token metadata. Mints 1B tokens to vault.

| #   | Account          | Signer | Writable |
| --- | ---------------- | ------ | -------- |
| 0   | admin            | Yes    | Yes      |
| 1   | config           | No     | Yes      |
| 2   | mint             | No     | Yes      |
| 3   | vault            | No     | Yes      |
| 4   | pending_claims   | No     | Yes      |
| 5   | metadata         | No     | Yes      |
| 6   | system_program   | No     | No       |
| 7   | token_program    | No     | No       |
| 8   | metadata_program | No     | No       |
| 9   | rent             | No     | No       |

**Data:** `Initialize { merkle_updater: Pubkey, inflation_rate_bps: u16 }`

**Note:** Creates Metaplex token metadata with name "YAP Token", symbol "YAP".

---

### Distribute

Transfers tokens from vault to pending_claims, updates merkle root.

| #   | Account        | Signer | Writable |
| --- | -------------- | ------ | -------- |
| 0   | merkle_updater | Yes    | No       |
| 1   | config         | No     | Yes      |
| 2   | vault          | No     | Yes      |
| 3   | pending_claims | No     | Yes      |
| 4   | mint           | No     | No       |
| 5   | token_program  | No     | No       |

**Data:** `Distribute { amount: u64, merkle_root: [u8; 32] }`

```rust
elapsed = now - last_distribution_ts
available = elapsed * vault_balance / SECONDS_PER_YEAR
require!(amount <= available)
transfer(vault -> pending_claims, amount)
config.merkle_root = merkle_root
config.last_distribution_ts = now
```

**Edge cases:**

- `amount = 0`: Skips transfer, still updates merkle_root
- Rapid calls: Each resets `last_distribution_ts`, diminishing returns

---

### Claim

User claims tokens with merkle proof.

| #   | Account            | Signer | Writable |
| --- | ------------------ | ------ | -------- |
| 0   | user               | Yes    | Yes      |
| 1   | user_token_account | No     | Yes      |
| 2   | user_claim_status  | No     | Yes      |
| 3   | config             | No     | No       |
| 4   | pending_claims     | No     | Yes      |
| 5   | mint               | No     | No       |
| 6   | token_program      | No     | No       |
| 7   | system_program     | No     | No       |
| 8   | rent               | No     | No       |

**Data:** `Claim { amount: u64, proof: Vec<[u8; 32]> }`

```rust
leaf = keccak256("YAP_CLAIM_V1" || user || amount_le)
verify_proof(proof, merkle_root, leaf)
claimable = amount - claimed_amount  // cumulative
transfer(pending_claims -> user_ata, claimable)
```

**Edge cases:**

- First claim: Creates `UserClaimStatus` PDA, user pays ~0.001 SOL rent
- `amount` is cumulative total, not incremental

---

### TriggerInflation

Mints accrued inflation to vault. Admin only, uses continuous rate limiting.

| #   | Account       | Signer | Writable |
| --- | ------------- | ------ | -------- |
| 0   | admin         | Yes    | No       |
| 1   | config        | No     | Yes      |
| 2   | mint          | No     | Yes      |
| 3   | vault         | No     | Yes      |
| 4   | token_program | No     | No       |

```rust
elapsed = now - last_inflation_ts
require!(elapsed > 0)
inflation = current_supply * inflation_rate_bps * elapsed / (10000 * SECONDS_PER_YEAR)
require!(inflation > 0)
mint(inflation -> vault)
current_supply += inflation
last_inflation_ts = now
```

**Example:** At 10% annual rate, calling quarterly yields ~2.5% per call. Compounded over 4 quarters = ~10.38% total.

---

### Burn

Burns tokens and updates `current_supply` in config.

| #   | Account            | Signer | Writable |
| --- | ------------------ | ------ | -------- |
| 0   | user               | Yes    | No       |
| 1   | user_token_account | No     | Yes      |
| 2   | config             | No     | Yes      |
| 3   | mint               | No     | Yes      |
| 4   | token_program      | No     | No       |

_Note: Phase 2 will add per-user burn tracking._

---

### UpdateMerkleUpdater / UpdateInflationRate

Admin-only config updates. Inflation rate max 10000 bps (100%).

## Constants

| Constant         | Value      |
| ---------------- | ---------- |
| DECIMALS         | 9          |
| INITIAL_SUPPLY   | 1B tokens  |
| SECONDS_PER_YEAR | 31,536,000 |

## PDAs

| PDA               | Seeds                                     | Program  |
| ----------------- | ----------------------------------------- | -------- |
| Config            | `["config"]`                              | YAP      |
| Mint              | `["mint"]`                                | YAP      |
| Vault             | `["vault"]`                               | YAP      |
| Pending Claims    | `["pending_claims"]`                      | YAP      |
| User Claim Status | `["user_claim", user_pubkey]`             | YAP      |
| Metadata          | `["metadata", METADATA_PROGRAM_ID, mint]` | Metaplex |

## Build & Test

```bash
# Build the program
cargo build-sbf

# Deploy to devnet
solana program deploy target/deploy/yap.so

# Download Metaplex program for tests (one-time setup)
mkdir -p tests/fixtures
solana program dump metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s tests/fixtures/mpl_token_metadata.so --url mainnet-beta

# Run tests
bun test
```
