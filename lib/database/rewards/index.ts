// Rewards database operations - barrel export
// Re-exports all rewards-related functions from domain-specific modules

// Wallet operations
export { saveUserWallet, getUserByWallet, getUsersWithWallets } from './wallet';

// Distribution operations
export {
  createDistribution,
  getLatestDistribution,
  submitDistribution,
  getDistributionRewards,
  getDistributableUsers,
  getTotalPendingPoints,
} from './distributions';

// Claims and user rewards
export {
  createUserReward,
  getUserRewards,
  getUserClaimableReward,
  getClaimableRewardByWallet,
  getRewardById,
  getUserDistributedTotal,
  getUserClaimedTotal,
  getUserUnclaimedTotal,
  createClaimEvent,
  getUserClaimEvents,
  claimEventExistsForTx,
  getBatchUnclaimedTotals,
} from './claims';

// Wallet snapshots and vote power
export {
  calculateVotePower,
  getWalletVotePower,
  getLatestWalletSnapshot,
  batchSaveWalletSnapshots,
} from './snapshots';

// Import for aggregate object
import * as wallet from './wallet';
import * as distributions from './distributions';
import * as claims from './claims';
import * as snapshots from './snapshots';

// Aggregate export for backwards compatibility with db.rewards.* pattern
export const rewards = {
  // Wallet
  saveUserWallet: wallet.saveUserWallet,
  getUserByWallet: wallet.getUserByWallet,
  getUsersWithWallets: wallet.getUsersWithWallets,
  // Distributions
  createDistribution: distributions.createDistribution,
  getLatestDistribution: distributions.getLatestDistribution,
  submitDistribution: distributions.submitDistribution,
  getDistributionRewards: distributions.getDistributionRewards,
  getDistributableUsers: distributions.getDistributableUsers,
  getTotalPendingPoints: distributions.getTotalPendingPoints,
  // Claims
  createUserReward: claims.createUserReward,
  getUserRewards: claims.getUserRewards,
  getUserClaimableReward: claims.getUserClaimableReward,
  getClaimableRewardByWallet: claims.getClaimableRewardByWallet,
  getRewardById: claims.getRewardById,
  getUserDistributedTotal: claims.getUserDistributedTotal,
  getUserClaimedTotal: claims.getUserClaimedTotal,
  getUserUnclaimedTotal: claims.getUserUnclaimedTotal,
  createClaimEvent: claims.createClaimEvent,
  getUserClaimEvents: claims.getUserClaimEvents,
  claimEventExistsForTx: claims.claimEventExistsForTx,
  getBatchUnclaimedTotals: claims.getBatchUnclaimedTotals,
  // Snapshots
  calculateVotePower: snapshots.calculateVotePower,
  getWalletVotePower: snapshots.getWalletVotePower,
  getLatestWalletSnapshot: snapshots.getLatestWalletSnapshot,
  batchSaveWalletSnapshots: snapshots.batchSaveWalletSnapshots,
};
