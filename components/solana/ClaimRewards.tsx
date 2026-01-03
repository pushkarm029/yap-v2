'use client';

import { useState, useCallback, useRef } from 'react';
import { useWallet } from './WalletProvider';
import { Transaction, SystemProgram, SYSVAR_RENT_PUBKEY, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { Loader2, CheckCircle, AlertCircle, ExternalLink, Coins, Wallet } from 'lucide-react';
import {
  getExplorerTxUrl,
  YAP_PROGRAM_ID,
  getConfigPda,
  getMintPda,
  getPendingClaimsPda,
  getUserClaimPda,
  buildClaimInstructionData,
} from '@/lib/solana';

interface ClaimRewardsProps {
  rewardId: string;
  onSuccess?: (signature: string) => void;
  onError?: (error: Error) => void;
}

type ClaimStatus = 'idle' | 'fetching' | 'signing' | 'confirming' | 'success' | 'error';

// Error types for better user feedback
type ErrorType = 'wallet' | 'balance' | 'rejected' | 'timeout' | 'network' | 'unknown';

// Configuration
const MIN_SOL_FOR_TX = 0.005 * LAMPORTS_PER_SOL; // ~5000 lamports for tx fees
const CONFIRM_TIMEOUT_MS = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

/**
 * Classify error type for appropriate user messaging
 */
function classifyError(error: unknown): { type: ErrorType; message: string } {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // User rejected transaction in wallet
  if (
    lowerMessage.includes('user rejected') ||
    lowerMessage.includes('rejected the request') ||
    lowerMessage.includes('user denied') ||
    lowerMessage.includes('cancelled')
  ) {
    return { type: 'rejected', message: 'Transaction cancelled' };
  }

  // Timeout errors
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return { type: 'timeout', message: 'Transaction timed out - please try again' };
  }

  // Network/connection errors
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('connection') ||
    lowerMessage.includes('fetch') ||
    lowerMessage.includes('failed to fetch')
  ) {
    return { type: 'network', message: 'Network error - please check your connection' };
  }

  // Wallet disconnected
  if (lowerMessage.includes('wallet') && lowerMessage.includes('disconnect')) {
    return { type: 'wallet', message: 'Wallet disconnected - please reconnect' };
  }

  // Insufficient balance
  if (lowerMessage.includes('insufficient') || lowerMessage.includes('not enough')) {
    return { type: 'balance', message: errorMessage };
  }

  // Default
  return { type: 'unknown', message: errorMessage || 'Claim failed' };
}

/**
 * Promise wrapper with timeout
 */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

export function ClaimRewards({ rewardId, onSuccess, onError }: ClaimRewardsProps) {
  const { publicKey, sendTransaction, connection } = useWallet();
  const [status, setStatus] = useState<ClaimStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [_errorType, setErrorType] = useState<ErrorType>('unknown');
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleClaim = useCallback(
    async (isRetry = false) => {
      if (!publicKey) {
        setError('Connect your wallet to claim');
        setErrorType('wallet');
        return;
      }

      if (!isRetry) {
        setRetryCount(0);
      }
      setStatus('fetching');
      setError(null);

      try {
        // Check SOL balance for transaction fees
        const balance = await connection.getBalance(publicKey);
        if (balance < MIN_SOL_FOR_TX) {
          const solNeeded = (MIN_SOL_FOR_TX / LAMPORTS_PER_SOL).toFixed(4);
          throw new Error(`Insufficient SOL for transaction fees. Need at least ${solNeeded} SOL.`);
        }

        const proofRes = await fetch(`/api/rewards/claim?wallet=${publicKey.toBase58()}`);
        const proofData = await proofRes.json();

        if (!proofData.claimable) {
          throw new Error(proofData.message || 'No claimable rewards');
        }

        const [configPda] = getConfigPda();
        const [mintPda] = getMintPda();
        const [pendingClaimsPda] = getPendingClaimsPda();
        const [userClaimPda] = getUserClaimPda(publicKey);

        const userAta = await getAssociatedTokenAddress(mintPda, publicKey);
        const ataInfo = await connection.getAccountInfo(userAta);

        const transaction = new Transaction();

        if (!ataInfo) {
          transaction.add(
            createAssociatedTokenAccountInstruction(publicKey, userAta, publicKey, mintPda)
          );
        }

        const proof: Buffer[] = proofData.proof.map((p: string) => Buffer.from(p, 'hex'));
        const amount = BigInt(proofData.amount);
        const claimData = buildClaimInstructionData(amount, proof);

        // Account order must match contract instruction.rs:50-58
        transaction.add({
          programId: YAP_PROGRAM_ID,
          keys: [
            { pubkey: publicKey, isSigner: true, isWritable: true },
            { pubkey: userAta, isSigner: false, isWritable: true },
            { pubkey: userClaimPda, isSigner: false, isWritable: true },
            { pubkey: configPda, isSigner: false, isWritable: false },
            { pubkey: pendingClaimsPda, isSigner: false, isWritable: true },
            { pubkey: mintPda, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
          ],
          data: claimData,
        });

        setStatus('signing');
        const signature = await sendTransaction(transaction);

        setStatus('confirming');
        setTxSignature(signature);

        // Confirm with timeout protection
        const confirmation = await withTimeout(
          connection.confirmTransaction(signature, 'confirmed'),
          CONFIRM_TIMEOUT_MS,
          'Transaction confirmation timed out'
        );

        if (confirmation.value.err) {
          throw new Error('Transaction failed on-chain');
        }

        await fetch('/api/rewards/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rewardId, claimTx: signature }),
        });

        setStatus('success');
        setRetryCount(0);
        onSuccess?.(signature);
      } catch (err) {
        console.error('Claim error:', err);

        const classified = classifyError(err);
        setErrorType(classified.type);

        // Auto-retry for timeout/network errors (not user rejection or balance issues)
        const isRetryable = classified.type === 'timeout' || classified.type === 'network';
        const currentRetry = isRetry ? retryCount : 0;

        if (isRetryable && currentRetry < MAX_RETRIES) {
          const nextRetry = currentRetry + 1;
          setRetryCount(nextRetry);
          setError(`${classified.message} - Retrying (${nextRetry}/${MAX_RETRIES})...`);

          // Schedule automatic retry with backoff
          retryTimeoutRef.current = setTimeout(
            () => {
              handleClaim(true);
            },
            RETRY_DELAYS[currentRetry] || RETRY_DELAYS[RETRY_DELAYS.length - 1]
          );
          return;
        }

        // Final error state
        setStatus('error');
        setError(classified.message);
        setRetryCount(0);
        onError?.(err instanceof Error ? err : new Error(classified.message));
      }
    },
    [publicKey, sendTransaction, connection, rewardId, onSuccess, onError, retryCount]
  );

  // Cleanup retry timeout on unmount
  const cancelRetry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    setRetryCount(0);
    setStatus('idle');
    setError(null);
  }, []);

  const isLoading = ['fetching', 'signing', 'confirming'].includes(status);
  const isRetrying = retryCount > 0;
  const isDisabled = !publicKey || isLoading || status === 'success';

  // Success state
  if (status === 'success') {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle size={14} />
          <span className="text-sm font-medium">Claimed!</span>
        </div>
        {txSignature && (
          <a
            href={getExplorerTxUrl(txSignature)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ExternalLink size={12} className="text-gray-500" />
            <span className="text-xs text-gray-600">View tx</span>
          </a>
        )}
      </div>
    );
  }

  // Error state (with auto-retry in progress or final error)
  if (status === 'error' || isRetrying) {
    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-red-600 min-w-0">
          {isRetrying ? (
            <Loader2 size={14} className="animate-spin shrink-0" />
          ) : (
            <AlertCircle size={14} className="shrink-0" />
          )}
          <span className="text-sm truncate">{error || 'Failed'}</span>
        </div>
        {isRetrying ? (
          <button
            onClick={cancelRetry}
            className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-full text-xs text-gray-600 transition-colors shrink-0"
          >
            Cancel
          </button>
        ) : (
          <button
            onClick={() => handleClaim(false)}
            className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-full text-xs text-gray-600 transition-colors shrink-0"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  // Wallet not connected - show helpful message
  if (!publicKey) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full text-gray-500">
        <Wallet size={14} />
        <span className="text-sm">Connect wallet to claim</span>
      </div>
    );
  }

  // Default idle state - ready to claim
  return (
    <button
      onClick={() => handleClaim(false)}
      disabled={isDisabled}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-full transition-all
        ${
          isDisabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer'
        }
        ${isLoading ? 'opacity-70' : ''}
      `}
    >
      {isLoading ? (
        <>
          <Loader2 size={14} className="animate-spin" />
          <span className="text-sm font-medium">
            {status === 'fetching' && 'Checking balance...'}
            {status === 'signing' && 'Sign in wallet...'}
            {status === 'confirming' && 'Confirming...'}
          </span>
        </>
      ) : (
        <>
          <Coins size={14} />
          <span className="text-sm font-medium">Claim YAP</span>
        </>
      )}
    </button>
  );
}
