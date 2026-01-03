'use client';

import { createContext, useContext, type ReactNode, useMemo, useCallback } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
  useWallet as useSolanaWallet,
  useConnection,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider, useWalletModal } from '@solana/wallet-adapter-react-ui';
import { WalletAdapterNetwork, type WalletError, type Adapter } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl, PublicKey, type Transaction, type Connection } from '@solana/web3.js';
import { SOLANA_NETWORK } from '@/lib/solana';

import '@solana/wallet-adapter-react-ui/styles.css';

// ============================================================================
// Wallet Context
// ============================================================================

interface WalletContextValue {
  publicKey: PublicKey | null;
  connected: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendTransaction: (transaction: Transaction) => Promise<string>;
  connection: Connection;
  walletName: string;
}

const WalletContext = createContext<WalletContextValue | null>(null);

// Default values for SSR
const defaultWalletValue: WalletContextValue = {
  publicKey: null,
  connected: false,
  connecting: false,
  connect: async () => {},
  disconnect: async () => {},
  sendTransaction: async () => {
    throw new Error('Wallet not connected');
  },
  connection: null as unknown as Connection,
  walletName: 'Wallet',
};

/**
 * Hook to access wallet functionality
 * Returns default values during SSR
 */
export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) {
    return defaultWalletValue;
  }
  return context;
}

// ============================================================================
// Wallet Context Bridge
// ============================================================================

function WalletContextBridge({ children }: { children: ReactNode }) {
  const wallet = useSolanaWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  const connect = useCallback(async () => {
    setVisible(true);
  }, [setVisible]);

  const sendTransaction = useCallback(
    async (transaction: Transaction): Promise<string> => {
      if (!wallet.publicKey) {
        throw new Error('Wallet not connected');
      }

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

      if (!transaction.recentBlockhash) {
        transaction.recentBlockhash = blockhash;
      }
      if (!transaction.feePayer) {
        transaction.feePayer = wallet.publicKey;
      }

      const signature = await wallet.sendTransaction(transaction, connection);

      await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        'confirmed'
      );

      return signature;
    },
    [wallet, connection]
  );

  const value = useMemo<WalletContextValue>(
    () => ({
      publicKey: wallet.publicKey,
      connected: wallet.connected,
      connecting: wallet.connecting,
      connect,
      disconnect: wallet.disconnect,
      sendTransaction,
      connection,
      walletName: wallet.wallet?.adapter.name ?? 'Wallet',
    }),
    [wallet, connection, connect, sendTransaction]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

// ============================================================================
// Main Wallet Provider
// ============================================================================

interface WalletProviderProps {
  children: ReactNode;
}

/**
 * Wallet Provider for Solana wallet connectivity
 * Uses standard wallet adapter for all platforms (desktop, mobile, PWA)
 */
export function WalletProvider({ children }: WalletProviderProps) {
  const network =
    SOLANA_NETWORK === 'mainnet-beta' ? WalletAdapterNetwork.Mainnet : WalletAdapterNetwork.Devnet;

  const endpoint = useMemo(() => {
    return process.env.NEXT_PUBLIC_SOLANA_RPC || clusterApiUrl(network);
  }, [network]);

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter({ network })],
    [network]
  );

  const onError = useCallback((error: WalletError, adapter?: Adapter) => {
    console.error('Wallet error:', error.name, error.message);
    if (adapter) {
      console.error('Adapter:', adapter.name);
    }
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: 'confirmed' }}>
      <SolanaWalletProvider
        wallets={wallets}
        onError={onError}
        autoConnect
        localStorageKey="yapWalletAdapter"
      >
        <WalletModalProvider>
          <WalletContextBridge>{children}</WalletContextBridge>
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
