use solana_program::{hash::hash, pubkey::Pubkey};

/// Compute leaf hash: hash(wallet || amount)
pub fn compute_leaf(wallet: &Pubkey, amount: u64) -> [u8; 32] {
    let mut data = Vec::with_capacity(40);
    data.extend_from_slice(wallet.as_ref());
    data.extend_from_slice(&amount.to_le_bytes());
    hash(&data).to_bytes()
}

/// Verify merkle proof
pub fn verify_proof(root: &[u8; 32], leaf: &[u8; 32], proof: &[[u8; 32]]) -> bool {
    let mut computed = *leaf;

    for sibling in proof {
        computed = if computed <= *sibling {
            hash_pair(&computed, sibling)
        } else {
            hash_pair(sibling, &computed)
        };
    }

    computed == *root
}

/// Hash two nodes together (sorted)
fn hash_pair(left: &[u8; 32], right: &[u8; 32]) -> [u8; 32] {
    let mut combined = [0u8; 64];
    combined[..32].copy_from_slice(left);
    combined[32..].copy_from_slice(right);
    hash(&combined).to_bytes()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_leaf_hash() {
        let wallet = Pubkey::new_unique();
        let amount = 1000u64;
        let leaf = compute_leaf(&wallet, amount);
        assert_eq!(leaf.len(), 32);
    }
}
