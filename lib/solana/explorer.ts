// Solana network config - single source of truth
export const SOLANA_NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet') as
  | 'devnet'
  | 'mainnet-beta';

/**
 * Get Solana Explorer URL for a transaction
 */
export function getExplorerTxUrl(signature: string): string {
  const base = 'https://explorer.solana.com/tx';
  if (SOLANA_NETWORK === 'mainnet-beta') {
    return `${base}/${signature}`;
  }
  return `${base}/${signature}?cluster=${SOLANA_NETWORK}`;
}

/**
 * Get Solana Explorer URL for an address
 */
export function getExplorerAddressUrl(address: string): string {
  const base = 'https://explorer.solana.com/address';
  if (SOLANA_NETWORK === 'mainnet-beta') {
    return `${base}/${address}`;
  }
  return `${base}/${address}?cluster=${SOLANA_NETWORK}`;
}
