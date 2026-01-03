import { create } from 'zustand';

interface RewardsUIState {
  // Real-time counters (updated every second)
  livePool: bigint;
  liveCountdown: number;
  liveEstimate: bigint;
  dataFetchedAt: number;

  // UI state
  showShareInfo: boolean;

  // Claim transaction state
  claimStatus: 'idle' | 'claiming' | 'success' | 'error';
  claimError: string | null;
  lastClaimTx: string | null;

  // Actions - Real-time counters
  initializeCounters: (pool: bigint, countdown: number, estimate: bigint) => void;
  tickCountdown: () => void;
  updateLivePool: (pool: bigint) => void;
  updateLiveEstimate: (estimate: bigint) => void;

  // Actions - UI
  toggleShareInfo: () => void;
  setShowShareInfo: (show: boolean) => void;

  // Actions - Claim state
  startClaim: () => void;
  claimSuccess: (txHash: string) => void;
  claimFailed: (error: string) => void;
  resetClaimStatus: () => void;
}

// Pool grows ~31.7 YAP per second (1B vault / 31.5M seconds per year)
export const POOL_GROWTH_PER_SECOND = BigInt(31_709_791_983); // raw units (9 decimals)

export const useRewardsStore = create<RewardsUIState>((set) => ({
  // Initial state
  livePool: BigInt(0),
  liveCountdown: 0,
  liveEstimate: BigInt(0),
  dataFetchedAt: 0,

  showShareInfo: false,

  claimStatus: 'idle',
  claimError: null,
  lastClaimTx: null,

  // Real-time counter actions
  initializeCounters: (pool, countdown, estimate) =>
    set({
      livePool: pool,
      liveCountdown: countdown,
      liveEstimate: estimate,
      dataFetchedAt: Date.now(),
    }),

  tickCountdown: () =>
    set((state) => ({
      liveCountdown: Math.max(0, state.liveCountdown - 1),
      // Also grow the pool each second
      livePool: state.livePool + POOL_GROWTH_PER_SECOND,
    })),

  updateLivePool: (pool) => set({ livePool: pool }),
  updateLiveEstimate: (estimate) => set({ liveEstimate: estimate }),

  // UI actions
  toggleShareInfo: () => set((state) => ({ showShareInfo: !state.showShareInfo })),
  setShowShareInfo: (show) => set({ showShareInfo: show }),

  // Claim actions
  startClaim: () => set({ claimStatus: 'claiming', claimError: null }),
  claimSuccess: (txHash) => set({ claimStatus: 'success', lastClaimTx: txHash }),
  claimFailed: (error) => set({ claimStatus: 'error', claimError: error }),
  resetClaimStatus: () => set({ claimStatus: 'idle', claimError: null, lastClaimTx: null }),
}));
