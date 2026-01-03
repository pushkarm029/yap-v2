'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Wallet, Loader2 } from 'lucide-react';
import { useWallet } from './WalletProvider';
import { usePlatform } from '@/lib/solana/platform';

export function WalletButton() {
  const { publicKey, connected, connecting, disconnect, connect, walletName } = useWallet();
  const { platform } = usePlatform();

  // Loading state
  if (connecting) {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm font-medium"
      >
        <Loader2 size={16} className="animate-spin" />
        Connecting...
      </button>
    );
  }

  // Connected state
  if (connected && publicKey) {
    return (
      <button
        onClick={() => disconnect()}
        className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
        title={`Connected to ${walletName}. Click to disconnect.`}
      >
        <Wallet size={16} className="text-green-600" />
        <span className="hidden sm:inline">{walletName}: </span>
        {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
      </button>
    );
  }

  // iOS - Use custom connect button for deeplinks
  if (platform === 'ios') {
    return (
      <button
        onClick={() => connect()}
        className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
      >
        <Wallet size={16} />
        Connect Phantom
      </button>
    );
  }

  // Desktop/Android - Use standard wallet button
  return (
    <WalletMultiButton
      style={{
        backgroundColor: '#f3f4f6',
        color: '#374151',
        fontSize: '14px',
        fontWeight: 500,
        borderRadius: '8px',
        padding: '8px 12px',
        height: 'auto',
      }}
    />
  );
}
